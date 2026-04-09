import { apiService, getFriendlyErrorMessage } from '../../services/api.js';
import { dailyQuestService } from '../../services/dailyQuests.js';
import { gameState } from '../../services/gameState.js';
import { supabase } from '../../config/supabaseClient.js';
import {
  buildPlayerProfile,
  getDefaultPlayerProfile
} from '../../services/playerProfile.js';

const OAUTH_INTENT_STORAGE_KEY = 'google_oauth_intent';

function buildMessageResult(message) {
  return {
    action: 'message',
    message
  };
}

function buildRerenderResult(message, mode = 'login') {
  return {
    action: 'rerender',
    mode,
    message
  };
}

function buildSceneResult(sceneKey) {
  return {
    action: 'scene',
    sceneKey
  };
}

function buildStartGameResult() {
  return {
    action: 'startGame'
  };
}

function persistOAuthIntent(intent) {
  window.localStorage.setItem(OAUTH_INTENT_STORAGE_KEY, JSON.stringify(intent));
}

function getPersistedOAuthIntent() {
  const raw = window.localStorage.getItem(OAUTH_INTENT_STORAGE_KEY);
  if (!raw) return null;

  try {
    const intent = JSON.parse(raw);
    if (!intent || typeof intent !== 'object') return null;

    if (intent.kind === 'continue' || intent.kind === 'login' || intent.kind === 'register') {
      return intent;
    }

    // Backward compatibility for old stored intents that missed kind.
    if (!intent.kind) {
      return {
        kind: 'register',
        role: intent.role,
        username: intent.username,
        fullname: intent.fullname,
        bio: intent.bio,
        avatarPreset: intent.avatarPreset
      };
    }

    return null;
  } catch {
    return null;
  }
}

function clearOAuthIntent() {
  window.localStorage.removeItem(OAUTH_INTENT_STORAGE_KEY);
}

async function hydrateLearnerSession(profile) {
  const learner = await apiService.getCurrentLearner();
  gameState.setLearner(learner);
  const [profileState, inventory, lessonProgress] = await Promise.all([
    apiService.getMyProfileState().catch(() => null),
    apiService.getMyInventory().catch(() => []),
    apiService.getMyLessonProgress().catch(() => [])
  ]);

  const resolvedPreset = profileState?.avatarPreset || profile?.presetId || gameState.getPlayerProfile()?.presetId;
  gameState.setPlayerProfile(buildPlayerProfile({ presetId: resolvedPreset || getDefaultPlayerProfile().presetId }));
  dailyQuestService.hydrateFromSnapshot(profileState?.dailyQuests || null);
  gameState.setInventory(inventory || []);
  gameState.setLessonProgress(lessonProgress || []);
}

async function createLearnerAccount({ userId, username, email, fullname, avatarPreset }) {
  const learnerPayload = {
    supabaseUserId: userId,
    username,
    email,
    full_name: fullname,
    total_xp: 0,
    level: 1,
    is_active: true
  };

  const learner = await apiService.addLearner(learnerPayload).catch((error) => {
    throw new Error(extractErrorMessage(error));
  });
  gameState.setLearner(learner);
  const profileState = await apiService.updateMyAvatarPreset(avatarPreset).catch(() => null);
  gameState.setPlayerProfile(buildPlayerProfile({
    presetId: profileState?.avatarPreset || avatarPreset
  }));
  dailyQuestService.hydrateFromSnapshot(profileState?.dailyQuests || null);
  gameState.setInventory([]);
  gameState.setLessonProgress([]);
}

function buildRouteResultFromRole(role) {
  if (role === 'learner') return buildStartGameResult();
  if (role === 'contributor') return buildSceneResult('ContributorScene');
  if (role === 'admin') return buildSceneResult('AdminScene');
  return buildMessageResult('This account type is not supported here.');
}

function isAlreadyRegisteredError(error) {
  const normalizedMessage = error?.message?.toLowerCase?.() || '';
  return (
    normalizedMessage.includes('already registered') ||
    normalizedMessage.includes('already been registered')
  );
}

function isNotFoundError(error) {
  return error?.response?.status === 404;
}

function deriveFullName(user, fallback = '') {
  const metadataName = user?.user_metadata?.full_name || user?.user_metadata?.name;
  return metadataName || fallback || '';
}

function deriveUsernameFromEmail(email = '') {
  const localPart = email.split('@')[0] || 'player';
  return localPart.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 30) || 'player';
}

function normalizeRegistrationConflictMessage(message = '') {
  const normalized = String(message).toLowerCase();
  if (normalized.includes('username') && (normalized.includes('already') || normalized.includes('duplicate') || normalized.includes('in use'))) {
    return 'Username is already in use.';
  }
  if (normalized.includes('email') && (normalized.includes('already') || normalized.includes('duplicate') || normalized.includes('in use') || normalized.includes('registered'))) {
    return 'Email is already in use.';
  }
  return null;
}

function isRegistrationConflictError(error) {
  const backendMessage = error?.response?.data?.message;
  const directMessage = error?.message;
  return Boolean(
    normalizeRegistrationConflictMessage(backendMessage) ||
    normalizeRegistrationConflictMessage(directMessage)
  );
}

function extractErrorMessage(error, fallbackMessage = 'Registration failed. Please try again.') {
  const backendMessage = error?.response?.data?.message;
  const normalizedBackendMessage = normalizeRegistrationConflictMessage(backendMessage);
  if (normalizedBackendMessage) return normalizedBackendMessage;
  if (typeof backendMessage === 'string' && backendMessage.trim()) {
    return getFriendlyErrorMessage(error, fallbackMessage);
  }

  const directMessage = error?.message;
  const normalizedDirectMessage = normalizeRegistrationConflictMessage(directMessage);
  if (normalizedDirectMessage) return normalizedDirectMessage;
  if (typeof directMessage === 'string' && directMessage.trim()) {
    return getFriendlyErrorMessage(error, fallbackMessage);
  }

  return getFriendlyErrorMessage(error, fallbackMessage);
}

function withUsernameSuffix(base, suffix) {
  const safeBase = (base || 'player').replace(/[^a-zA-Z0-9._-]/g, '') || 'player';
  const maxBaseLength = Math.max(1, 30 - suffix.length);
  return `${safeBase.slice(0, maxBaseLength)}${suffix}`;
}

async function createLearnerAccountWithRetries({ userId, username, email, fullname, avatarPreset }) {
  const baseUsername = (username || '').trim() || deriveUsernameFromEmail(email);
  const candidates = [
    baseUsername,
    withUsernameSuffix(baseUsername, '_1'),
    withUsernameSuffix(baseUsername, '_2'),
    withUsernameSuffix(baseUsername, '_3'),
    withUsernameSuffix(baseUsername, '_4')
  ];

  let lastConflictError = null;
  for (const candidate of candidates) {
    try {
      await createLearnerAccount({
        userId,
        username: candidate,
        email,
        fullname,
        avatarPreset
      });
      return;
    } catch (error) {
      if (!isRegistrationConflictError(error)) {
        throw error;
      }
      lastConflictError = error;
    }
  }

  throw new Error(extractErrorMessage(lastConflictError));
}

async function tryHydrateExistingLearnerSession() {
  try {
    await hydrateLearnerSession();
    return true;
  } catch (error) {
    if (isNotFoundError(error)) {
      return false;
    }
    throw error;
  }
}

async function resolveContributorBanMessage(userId) {
  if (!userId) return null;
  try {
    const contributor = await apiService.getContributorBySupabaseId(userId);
    if (contributor?.isActive === false) {
      return 'Your contributor account has been banned.';
    }
    return null;
  } catch (error) {
    if (isNotFoundError(error)) return null;
    return null;
  }
}

async function resolveUserIdForRegistration({ email, password, fullname }) {
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: fullname } }
  });

  if (!signUpError) {
    return signUpData.user?.id || signUpData.session?.user?.id || null;
  }

  if (!isAlreadyRegisteredError(signUpError)) {
    throw signUpError;
  }

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) throw signInError;
  return signInData.user?.id || null;
}

export async function loginWithRole({ role, email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  let userHasRole = false;
  try {
    userHasRole = await apiService.hasRole(role);
  } catch {
    const roleInfo = await apiService.getMyRole().catch(() => null);
    userHasRole = roleInfo?.role === role;
  }
  if (!userHasRole) {
    const userId = data.user?.id || data.session?.user?.id;
    if (role === 'contributor') {
      const banMessage = await resolveContributorBanMessage(userId);
      if (banMessage) {
        await supabase.auth.signOut();
        return buildMessageResult(banMessage);
      }
    }
    await supabase.auth.signOut();
    return buildMessageResult('You are not authorized to access this portal with this account.');
  }

  if (!data.session?.access_token) {
    return buildRerenderResult('Check your email to confirm account, then login.');
  }

  const userId = data.user?.id || data.session?.user?.id;
  if (!userId) {
    throw new Error('No Supabase user id returned');
  }

  if (role === 'learner') {
    await hydrateLearnerSession();
    return buildStartGameResult();
  }

  if (role === 'contributor') {
    return buildSceneResult('ContributorScene');
  }

  if (role === 'admin') {
    return buildSceneResult('AdminScene');
  }

  return buildMessageResult('This account type is not supported here.');
}

export async function registerWithRole({ role, username, fullname, bio, avatarPreset, email, password }) {
  const userId = await resolveUserIdForRegistration({ email, password, fullname })
    .catch((error) => {
      throw new Error(extractErrorMessage(error));
    });

  if (!userId) {
    return buildRerenderResult('Check your email to confirm account, then login.');
  }

  if (role === 'learner') {
    await createLearnerAccount({
      userId,
      username,
      email,
      fullname,
      avatarPreset
    });
    return buildStartGameResult();
  }

  if (role === 'contributor') {
    await apiService.createContributor({
      email,
      fullName: fullname,
      bio
    }).catch((error) => {
      throw new Error(extractErrorMessage(error));
    });
    return buildSceneResult('ContributorScene');
  }

  return buildMessageResult('This account type is not supported here.');
}

async function beginGoogleOAuth({ kind, role, username, fullname, bio, avatarPreset }) {
  persistOAuthIntent({
    kind,
    role,
    username,
    fullname,
    bio,
    avatarPreset
  });

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });

  if (error) {
    clearOAuthIntent();
    throw error;
  }
}

export async function continueWithGoogle({ role, username, fullname, bio, avatarPreset }) {
  // Legacy path; keep behavior compatible for in-flight sessions.
  return beginGoogleOAuth({ kind: 'continue', role, username, fullname, bio, avatarPreset });
}

export async function loginWithGoogle({ role }) {
  return beginGoogleOAuth({ kind: 'login', role });
}

export async function registerWithGoogle({ role, username, fullname, bio, avatarPreset }) {
  return beginGoogleOAuth({ kind: 'register', role, username, fullname, bio, avatarPreset });
}

export async function resumeGoogleOAuthIntent() {
  const intent = getPersistedOAuthIntent();
  if (!intent) return null;

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.access_token) {
    // Session can still be finalizing right after OAuth redirect.
    return null;
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const userId = user?.id;
  const email = user?.email || '';

  if (!userId || !email) {
    clearOAuthIntent();
    await supabase.auth.signOut();
    return buildRerenderResult('Unable to read Google account details. Please try again.');
  }

  let roleInfo = null;
  try {
    roleInfo = await apiService.getMyRole();
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
  }

  const intentKind = intent.kind || 'continue';

  if (intentKind === 'login') {
    clearOAuthIntent();
    if (!roleInfo?.role) {
      await supabase.auth.signOut();
      return buildRerenderResult('No account found. Please register first.', 'register');
    }
    if (intent.role && roleInfo.role !== intent.role) {
      await supabase.auth.signOut();
      return buildMessageResult('You are not authorized to access this portal with this account.');
    }
    if (roleInfo.role === 'learner') {
      await hydrateLearnerSession();
    }
    return buildRouteResultFromRole(roleInfo.role);
  }

  if (intentKind === 'register') {
    if (roleInfo?.role) {
      clearOAuthIntent();
      await supabase.auth.signOut();
      return buildRerenderResult('Account already exists. Please login instead.', 'login');
    }

    const role = intent.role || 'learner';
    const resolvedFullName = (intent.fullname || '').trim() || deriveFullName(user, email);

    if (role === 'learner') {
      await createLearnerAccountWithRetries({
        userId,
        username: intent.username,
        email,
        fullname: resolvedFullName,
        avatarPreset: intent.avatarPreset
      });
      clearOAuthIntent();
      return buildStartGameResult();
    }

    if (role === 'contributor') {
      await apiService.createContributor({
        email,
        fullName: resolvedFullName,
        bio: intent.bio || ''
      }).catch((error) => {
        throw new Error(extractErrorMessage(error));
      });
      clearOAuthIntent();
      return buildSceneResult('ContributorScene');
    }

    clearOAuthIntent();
    await supabase.auth.signOut();
    return buildRerenderResult('This account type is not supported here.');
  }

  // Legacy "continue" behavior for users returning with older stored OAuth intent.
  if (roleInfo?.role) {
    clearOAuthIntent();
    if (intent.role && roleInfo.role !== intent.role) {
      await supabase.auth.signOut();
      return buildMessageResult('You are not authorized to access this portal with this account.');
    }
    if (roleInfo.role === 'learner') {
      await hydrateLearnerSession();
    }
    return buildRouteResultFromRole(roleInfo.role);
  }

  const role = intent.role || 'learner';
  const resolvedFullName = (intent.fullname || '').trim() || deriveFullName(user, email);

  if (role === 'learner') {
    const hasExistingLearner = await tryHydrateExistingLearnerSession();
    if (!hasExistingLearner) {
      await createLearnerAccountWithRetries({
        userId,
        username: intent.username,
        email,
        fullname: resolvedFullName,
        avatarPreset: intent.avatarPreset
      });
    }
    clearOAuthIntent();
    return buildStartGameResult();
  }

  if (role === 'contributor') {
    const existingContributor = await apiService.getContributorBySupabaseId(userId).catch((lookupError) => {
      if (isNotFoundError(lookupError)) return null;
      throw lookupError;
    });

    if (existingContributor) {
      clearOAuthIntent();
      if (existingContributor.isActive === false) {
        await supabase.auth.signOut();
        return buildMessageResult('Your contributor account has been banned.');
      }
      return buildSceneResult('ContributorScene');
    }

    await apiService.createContributor({
      email,
      fullName: resolvedFullName,
      bio: intent.bio || ''
    }).catch((error) => {
      throw new Error(extractErrorMessage(error));
    });
    clearOAuthIntent();
    return buildSceneResult('ContributorScene');
  }

  clearOAuthIntent();
  await supabase.auth.signOut();
  return buildRerenderResult('This account type is not supported here.');
}
