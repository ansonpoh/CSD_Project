import { loadJsonFromStorage, saveJsonToStorage } from './storage.js';

const STORAGE_KEY = 'dailyQuestState';

const QUEST_DEFS = [
  {
    id: 'complete-lesson',
    label: 'Finish 1 lesson',
    goal: 1,
    eventType: 'lesson_completed'
  },
  {
    id: 'defeat-monster',
    label: 'Defeat 1 monster',
    goal: 1,
    eventType: 'monster_defeated'
  },
  {
    id: 'claim-reward',
    label: 'Claim 1 quest reward',
    goal: 1,
    eventType: 'reward_claimed'
  }
];

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function yesterdayKey() {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildQuestState(progress = {}) {
  return QUEST_DEFS.map((quest) => {
    const current = Math.max(0, Number(progress?.[quest.id] || 0));
    return {
      ...quest,
      progress: current,
      completed: current >= quest.goal
    };
  });
}

function loadRawState() {
  return loadJsonFromStorage(STORAGE_KEY, null, 'daily quest state');
}

function saveRawState(state) {
  return saveJsonToStorage(STORAGE_KEY, state, 'daily quest state');
}

function createFreshState(previous = {}) {
  return {
    dateKey: todayKey(),
    streak: 0,
    lastCompletedDate: previous?.lastCompletedDate || null,
    progress: {}
  };
}

function ensureCurrentState() {
  const currentDate = todayKey();
  const saved = loadRawState();
  if (!saved) return saveRawState(createFreshState());
  if (saved.dateKey === currentDate) return saved;
  return saveRawState({
    ...createFreshState(saved),
    streak: saved.streak || 0,
    lastCompletedDate: saved.lastCompletedDate || null
  });
}

function updateStreakIfCompleted(state) {
  const quests = buildQuestState(state.progress);
  const allComplete = quests.every((quest) => quest.completed);
  if (!allComplete || state.lastCompletedDate === state.dateKey) {
    return { ...state, quests, completedToday: allComplete };
  }

  const nextStreak = state.lastCompletedDate === yesterdayKey()
    ? Math.max(1, Number(state.streak || 0) + 1)
    : 1;

  const next = {
    ...state,
    streak: nextStreak,
    lastCompletedDate: state.dateKey
  };
  return {
    ...next,
    quests,
    completedToday: true
  };
}

export const dailyQuestService = {
  getSnapshot() {
    const state = ensureCurrentState();
    return updateStreakIfCompleted(state);
  },

  recordEvent(eventType, amount = 1) {
    const state = ensureCurrentState();
    const progress = { ...(state.progress || {}) };

    QUEST_DEFS
      .filter((quest) => quest.eventType === eventType)
      .forEach((quest) => {
        progress[quest.id] = Math.max(0, Number(progress[quest.id] || 0) + Number(amount || 0));
      });

    const saved = saveRawState({
      ...state,
      progress
    });

    const withStreak = updateStreakIfCompleted(saved);
    if (withStreak.streak !== saved.streak || withStreak.lastCompletedDate !== saved.lastCompletedDate) {
      saveRawState({
        dateKey: saved.dateKey,
        streak: withStreak.streak,
        lastCompletedDate: withStreak.lastCompletedDate,
        progress: saved.progress
      });
    }
    return withStreak;
  }
};
