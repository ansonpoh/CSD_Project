import { apiService } from '../../services/api.js';
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
    return JSON.parse(raw);
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
  const profileState = await apiService.getMyProfileState().catch(() => null);
  const resolvedPreset = profileState?.avatarPreset || profile?.presetId || gameState.getPlayerProfile()?.presetId;
  gameState.setPlayerProfile(buildPlayerProfile({ presetId: resolvedPreset || getDefaultPlayerProfile().presetId }));
  dailyQuestService.hydrateFromSnapshot(profileState?.dailyQuests || null);

  const inventory = await apiService.getMyInventory().catch(() => []);
  gameState.setInventory(inventory || []);

  const lessonProgress = await apiService.getMyLessonProgress().catch(() => []);
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

  const learner = await apiService.addLearner(learnerPayload);
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
  return buildMessageResult('Unsupported role');
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

function buildEmailNotInSystemMessage(email = '') {
  if (!email) return 'Email not in system. Please register first.';
  return `Email ${email} is not in system. Please register first.`;
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

  const userHasRole = await apiService.hasRole(role);
  if (!userHasRole) {
    await supabase.auth.signOut();
    return buildMessageResult('Invalid Credentials');
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

  return buildMessageResult('Unsupported role');
}

export async function registerWithRole({ role, username, fullname, bio, avatarPreset, email, password }) {
  const userId = await resolveUserIdForRegistration({ email, password, fullname });

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
    });
    return buildSceneResult('ContributorScene');
  }

  return buildMessageResult('Unsupported role');
}

export async function loginWithGoogle({ role }) {
  persistOAuthIntent({
    kind: 'login',
    role
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

export async function registerWithGoogle({ role, username, fullname, bio, avatarPreset }) {
  persistOAuthIntent({
    kind: 'register',
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

  if (intent.kind === 'login') {
    clearOAuthIntent();

    if (!roleInfo?.role) {
      await supabase.auth.signOut();
      return buildRerenderResult(buildEmailNotInSystemMessage(email));
    }

    if (intent.role && roleInfo.role !== intent.role) {
      await supabase.auth.signOut();
      return buildMessageResult('Invalid Credentials');
    }

    if (roleInfo.role === 'learner') {
      await hydrateLearnerSession();
    }

    return buildRouteResultFromRole(roleInfo.role);
  }

  if (intent.kind !== 'register') {
    clearOAuthIntent();
    return buildRerenderResult('Unsupported OAuth flow.');
  }

  if (roleInfo?.role) {
    clearOAuthIntent();
    if (roleInfo.role === 'learner') {
      await hydrateLearnerSession();
    }
    return buildRouteResultFromRole(roleInfo.role);
  }

  const role = intent.role || 'learner';
  const resolvedFullName = (intent.fullname || '').trim() || deriveFullName(user, email);

  if (role === 'learner') {
    const resolvedUsername = (intent.username || '').trim() || deriveUsernameFromEmail(email);
    await createLearnerAccount({
      userId,
      username: resolvedUsername,
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
    });
    clearOAuthIntent();
    return buildSceneResult('ContributorScene');
  }

  clearOAuthIntent();
  await supabase.auth.signOut();
  return buildRerenderResult('Unsupported role');
}
