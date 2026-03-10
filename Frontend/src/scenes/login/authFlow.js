import { apiService } from '../../services/api.js';
import { gameState } from '../../services/gameState.js';
import { supabase } from '../../config/supabaseClient.js';
import {
  buildPlayerProfile,
  getDefaultPlayerProfile
} from '../../services/playerProfile.js';

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

async function hydrateLearnerSession(profile) {
  const learner = await apiService.getCurrentLearner();
  gameState.setLearner(learner);
  gameState.setPlayerProfile(profile || gameState.getPlayerProfile() || getDefaultPlayerProfile());

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
  gameState.setPlayerProfile(buildPlayerProfile({ presetId: avatarPreset }));
  gameState.setInventory([]);
  gameState.setLessonProgress([]);
}

function isAlreadyRegisteredError(error) {
  const normalizedMessage = error?.message?.toLowerCase?.() || '';
  return (
    normalizedMessage.includes('already registered') ||
    normalizedMessage.includes('already been registered')
  );
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
