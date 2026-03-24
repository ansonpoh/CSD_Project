import { apiService } from './api.js';
import { gameState } from './gameState.js';
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
    learningStreak: previous?.learningStreak || 0,
    lastLessonCompletedDate: previous?.lastLessonCompletedDate || null,
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
    lastCompletedDate: saved.lastCompletedDate || null,
    learningStreak: saved.learningStreak || 0,
    lastLessonCompletedDate: saved.lastLessonCompletedDate || null
  });
}

function updateLearningStreakIfNeeded(state, eventType) {
  if (eventType !== 'lesson_completed') return state;
  if (state.lastLessonCompletedDate === state.dateKey) return state;

  const nextLearningStreak = state.lastLessonCompletedDate === yesterdayKey()
    ? Math.max(1, Number(state.learningStreak || 0) + 1)
    : 1;

  return {
    ...state,
    learningStreak: nextLearningStreak,
    lastLessonCompletedDate: state.dateKey
  };
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

function normalizeRemoteSnapshot(snapshot = null) {
  if (!snapshot) return updateStreakIfCompleted(ensureCurrentState());

  const quests = Array.isArray(snapshot.quests) ? snapshot.quests : [];
  const progress = {};
  quests.forEach((quest) => {
    if (!quest?.id) return;
    progress[quest.id] = Math.max(0, Number(quest.progress || 0));
  });

  const normalized = updateStreakIfCompleted({
    dateKey: snapshot.dateKey || todayKey(),
    streak: Math.max(0, Number(snapshot.streak || 0)),
    lastCompletedDate: snapshot.lastCompletedDate || null,
    learningStreak: Math.max(0, Number(snapshot.learningStreak || 0)),
    lastLessonCompletedDate: snapshot.lastLessonCompletedDate || null,
    progress
  });

  return saveRawState({
    dateKey: normalized.dateKey,
    streak: normalized.streak,
    lastCompletedDate: normalized.lastCompletedDate,
    learningStreak: normalized.learningStreak || 0,
    lastLessonCompletedDate: normalized.lastLessonCompletedDate || null,
    progress: normalized.progress || {}
  });
}

export const dailyQuestService = {
  hydrateFromSnapshot(snapshot = null) {
    return normalizeRemoteSnapshot(snapshot);
  },

  async hydrate() {
    if (!gameState.getLearner()) {
      return this.getSnapshot();
    }

    try {
      const profileState = await apiService.getMyProfileState();
      return this.hydrateFromSnapshot(profileState?.dailyQuests || null);
    } catch (error) {
      console.warn('Daily quest hydration failed:', error);
      return this.getSnapshot();
    }
  },

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

    const withLearning = updateLearningStreakIfNeeded(saved, eventType);
    const withStreak = updateStreakIfCompleted(withLearning);
    if (
      withStreak.streak !== saved.streak ||
      withStreak.lastCompletedDate !== saved.lastCompletedDate ||
      withStreak.learningStreak !== saved.learningStreak ||
      withStreak.lastLessonCompletedDate !== saved.lastLessonCompletedDate
    ) {
      saveRawState({
        dateKey: withStreak.dateKey,
        streak: withStreak.streak,
        lastCompletedDate: withStreak.lastCompletedDate,
        learningStreak: withStreak.learningStreak || 0,
        lastLessonCompletedDate: withStreak.lastLessonCompletedDate || null,
        progress: withStreak.progress
      });
    }

    if (gameState.getLearner()) {
      void apiService.recordDailyQuestEvent(eventType, amount)
        .then((profileState) => {
          if (profileState?.dailyQuests) {
            normalizeRemoteSnapshot(profileState.dailyQuests);
          }
        })
        .catch((error) => {
          console.warn('Daily quest sync failed:', error);
        });
    }

    return withStreak;
  }
};
