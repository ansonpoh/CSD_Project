import { loadJsonFromStorage, saveJsonToStorage } from './storage.js';

const STORAGE_KEY = 'sideChallengeProgress';

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

export function getChallengeForMap(map) {
  const raw = String(map?.mapKey || map?.name || map?.theme || '').toLowerCase();
  if (raw.includes('map2') || raw.includes('cave')) return CHALLENGES[1];
  if (raw.includes('map3') || raw.includes('mountain')) return CHALLENGES[2];
  if (raw.includes('map4') || raw.includes('garden') || raw.includes('test')) return CHALLENGES[3];
  return CHALLENGES[0];
}

export function getChallengeSnapshot(map) {
  const challenge = getChallengeForMap(map);
  const progress = loadProgress();
  const state = progress[challenge.id] || {};
  return {
    challenge,
    completed: Boolean(state.completed),
    attempts: Number(state.attempts || 0),
    lastResult: state.lastResult || null
  };
}

export function recordChallengeAttempt(map, won) {
  const challenge = getChallengeForMap(map);
  const progress = loadProgress();
  const existing = progress[challenge.id] || {};
  progress[challenge.id] = {
    completed: Boolean(existing.completed || won),
    attempts: Number(existing.attempts || 0) + 1,
    lastResult: won ? 'won' : 'lost'
  };
  saveProgress(progress);
  return {
    challenge,
    ...progress[challenge.id]
  };
}
