import { loadJsonFromStorage, saveJsonToStorage } from './storage.js';
import { apiService } from './api.js';

const STORAGE_KEY = 'sideChallengeProgress';
const DAILY_REWARD_STORAGE_KEY = 'sideChallengeDailyReward';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const progressCache = new Map();
const serverChallengeCacheByTheme = new Map();

const CHALLENGES = [
  {
    id: 'forest-basics',
    theme: 'forest',
    title: 'Scout Syntax',
    prompt: 'Arrange the Gen Alpha fact.',
    orderedTokens: ['They', 'were', 'born', 'into', 'smartphones'],
    rewardXp: 40,
    rewardAssist: 0
  },
  {
    id: 'cave-memory',
    theme: 'cave',
    title: 'Echo Match',
    prompt: 'How does Gen Alpha consume media?',
    orderedTokens: ['Skipping', 'ads', 'is', 'their', 'default'],
    rewardXp: 50,
    rewardAssist: 1
  },
  {
    id: 'mountain-mastery',
    theme: 'mountain',
    title: 'Summit Sequence',
    prompt: 'Who shapes Gen Alpha opinions?',
    orderedTokens: ['They', 'trust', 'creators', 'not', 'brands'],
    rewardXp: 60,
    rewardAssist: 1
  },
  {
    id: 'garden-remix',
    theme: 'garden',
    title: 'Remix Relay',
    prompt: 'Where did Gen Alpha learn to connect?',
    orderedTokens: ['Roblox', 'shaped', 'how', 'they', 'socialise'],
    rewardXp: 55,
    rewardAssist: 1
  }
];

function loadProgress() {
  return loadJsonFromStorage(STORAGE_KEY, {}, 'side challenge progress');
}

function saveProgress(progress) {
  return saveJsonToStorage(STORAGE_KEY, progress, 'side challenge progress');
}

function getLocalDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadDailyRewardState() {
  const today = getLocalDateKey();
  const saved = loadJsonFromStorage(DAILY_REWARD_STORAGE_KEY, null, 'side challenge daily reward');
  if (!saved || saved.date !== today) {
    return {
      date: today,
      completions: 0
    };
  }
  return {
    date: today,
    completions: Number(saved.completions || 0)
  };
}

function saveDailyRewardState(state) {
  saveJsonToStorage(DAILY_REWARD_STORAGE_KEY, {
    date: state.date,
    completions: Number(state.completions || 0)
  }, 'side challenge daily reward');
}

function calculateDailyReward(challenge, won) {
  const state = loadDailyRewardState();
  if (!won) {
    return {
      xpAwarded: 0,
      assistAwarded: 0,
      dailyRewardClaimedToday: state.completions > 0,
      dailyCompletionsToday: state.completions
    };
  }

  const claimedMainRewardToday = state.completions > 0;
  const xpAwarded = claimedMainRewardToday ? 1 : Math.max(0, Number(challenge.rewardXp || 0));
  const assistAwarded = claimedMainRewardToday ? 0 : Math.max(0, Number(challenge.rewardAssist || 0));
  const nextState = {
    ...state,
    completions: state.completions + 1
  };
  saveDailyRewardState(nextState);

  return {
    xpAwarded,
    assistAwarded,
    dailyRewardClaimedToday: true,
    dailyCompletionsToday: nextState.completions
  };
}

export function getDailySideChallengeRewardState() {
  const state = loadDailyRewardState();
  return {
    dailyRewardClaimedToday: state.completions > 0,
    dailyCompletionsToday: state.completions
  };
}

function isUuid(value) {
  return UUID_REGEX.test(String(value || ''));
}

function normalizeProgress(raw) {
  if (!raw) {
    return {
      completed: false,
      attempts: 0,
      lastResult: null
    };
  }
  return {
    completed: Boolean(raw.completed),
    attempts: Number(raw.attempts || 0),
    lastResult: raw.lastResult || null
  };
}

function normalizeServerChallenge(serverChallenge) {
  if (!serverChallenge) return null;
  const challengeId = serverChallenge.challengeId || serverChallenge.sideChallengeId || serverChallenge.id;
  if (!challengeId) return null;
  return {
    id: String(challengeId),
    theme: String(serverChallenge.mapTheme || serverChallenge.theme || '').toLowerCase(),
    title: serverChallenge.title,
    prompt: serverChallenge.prompt,
    orderedTokens: Array.isArray(serverChallenge.orderedTokens) ? serverChallenge.orderedTokens : [],
    rewardXp: Number(serverChallenge.rewardXp || 0),
    rewardAssist: Number(serverChallenge.rewardAssist || 0)
  };
}

function pickRandomChallenge() {
  return CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
}

function saveLocalProgressByChallengeId(challengeId, state) {
  if (!challengeId) return;
  const progress = loadProgress();
  progress[String(challengeId)] = {
    completed: Boolean(state.completed),
    attempts: Number(state.attempts || 0),
    lastResult: state.lastResult || null
  };
  saveProgress(progress);
}

function saveProgressState(challengeId, state) {
  if (!challengeId) return;
  const normalized = normalizeProgress(state);
  progressCache.set(String(challengeId), normalized);
  saveLocalProgressByChallengeId(challengeId, normalized);
}

function getSavedProgress(challengeId) {
  if (!challengeId) return normalizeProgress(null);
  const id = String(challengeId);
  if (progressCache.has(id)) return progressCache.get(id);
  const progress = loadProgress();
  const normalized = normalizeProgress(progress[id] || null);
  progressCache.set(id, normalized);
  return normalized;
}

function resolveChallenge(map, serverChallenge) {
  const normalizedServer = normalizeServerChallenge(serverChallenge);
  if (normalizedServer) {
    const themeKey = normalizedServer.theme || normalizedServer.id;
    serverChallengeCacheByTheme.set(themeKey, normalizedServer);
    return normalizedServer;
  }

  return pickRandomChallenge();
}

export function getChallengeForMap(map) {
  return pickRandomChallenge();
}

export function getChallengeSnapshot(map, options = {}) {
  const challenge = resolveChallenge(map, options.serverChallenge);
  const state = options.serverProgress
    ? normalizeProgress(options.serverProgress)
    : getSavedProgress(challenge.id);
  const dailyRewardState = getDailySideChallengeRewardState();

  if (options.serverProgress) {
    saveProgressState(challenge.id, state);
  }

  return {
    challenge,
    ...state,
    ...dailyRewardState
  };
}

export async function hydrateChallengeSnapshot(map, serverChallenge = null) {
  const challenge = resolveChallenge(map, serverChallenge);
  if (!isUuid(challenge.id)) {
    return getChallengeSnapshot(map, { serverChallenge });
  }

  try {
    const serverProgress = await apiService.getMySideChallengeProgress(challenge.id);
    return getChallengeSnapshot(map, { serverChallenge: challenge, serverProgress });
  } catch (_e) {
    return getChallengeSnapshot(map, { serverChallenge: challenge });
  }
}

function recordLocalAttempt(challengeId, won) {
  const progress = loadProgress();
  const existing = progress[String(challengeId)] || {};
  const next = {
    completed: Boolean(existing.completed || won),
    attempts: Number(existing.attempts || 0) + 1,
    lastResult: won ? 'won' : 'lost'
  };
  progress[String(challengeId)] = next;
  saveProgress(progress);
  return normalizeProgress(next);
}

export async function recordChallengeAttempt(map, won, options = {}) {
  const challenge = resolveChallenge(map, options.serverChallenge);
  const reward = calculateDailyReward(challenge, won);
  if (isUuid(challenge.id)) {
    try {
      const serverProgress = await apiService.recordMySideChallengeAttempt(challenge.id, won);
      const normalized = normalizeProgress(serverProgress);
      saveProgressState(challenge.id, normalized);
      return {
        challenge,
        ...normalized,
        ...reward
      };
    } catch (_e) {
      // Fall through to local fallback.
    }
  }

  const localProgress = recordLocalAttempt(challenge.id, won);
  progressCache.set(String(challenge.id), localProgress);
  return {
    challenge,
    ...localProgress,
    ...reward
  };
}
