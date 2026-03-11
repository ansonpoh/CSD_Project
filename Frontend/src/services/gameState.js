import { loadJsonFromStorage, removeStorageKey, saveJsonToStorage } from './storage.js';

const STORAGE_KEY = 'gameState';

function nowIso() {
  return new Date().toISOString();
}

function resolveItemId(item) {
  return item?.item_id || item?.id || null;
}

function normalizeLessonStatus(status) {
  return String(status || '').toUpperCase();
}

function normalizeLessonEntry(progress = {}, fallbackStatus = 'ENROLLED') {
  const contentId = String(progress?.contentId || progress?.content_id || '');
  if (!contentId) return null;

  return {
    ...progress,
    contentId,
    status: normalizeLessonStatus(progress?.status) || fallbackStatus
  };
}

function normalizeInventoryEntry(item, fallbackQuantity = 1) {
  const itemId = resolveItemId(item);
  if (!itemId) return null;

  return {
    ...item,
    item_id: itemId,
    quantity: item?.quantity ?? fallbackQuantity
  };
}

class GameStateManager {
  constructor() {
    if (GameStateManager.instance) {
      return GameStateManager.instance;
    }

    this.learner = null;
    this.contributor = null;
    this.administrator = null;
    this.role = null;
    this.currentMap = null;
    this.inventory = [];
    this.lessonProgress = {};
    this.playerProfile = null;
    this.activeEffects = {};
    this.listeners = new Set();
    this.loadFromStorage();
    GameStateManager.instance = this;
  }

  static getInstance() {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager();
    }
    return GameStateManager.instance;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(options = {}) {
    const { persist = true } = options;
    if (persist) {
      this.saveToStorage();
    }
    this.listeners.forEach((callback) => callback());
  }

  setRole(role) {
    this.role = role;
    this.notify();
  }

  getRole() {
    return this.role;
  }

  setLearner(learner) {
    this.learner = learner;
    this.notify();
  }

  setPlayerProfile(profile) {
    this.playerProfile = profile;
    this.notify();
  }

  getPlayerProfile() {
    return this.playerProfile;
  }

  setActiveEffects(effects = {}) {
    this.activeEffects = { ...(effects || {}) };
    this.notify();
  }

  getActiveEffects() {
    return { ...this.activeEffects };
  }

  consumeActiveEffect(key) {
    if (!key || !(key in this.activeEffects)) return null;
    const value = this.activeEffects[key];
    delete this.activeEffects[key];
    this.notify();
    return value;
  }

  normalizeLessonStatus(status) {
    return normalizeLessonStatus(status);
  }

  setLessonProgress(progressList = []) {
    const next = {};
    (Array.isArray(progressList) ? progressList : []).forEach((p) => {
      const normalized = normalizeLessonEntry(p);
      if (!normalized) return;
      next[normalized.contentId] = normalized;
    });
    this.lessonProgress = next;
    this.notify();
  }

  upsertLessonProgress(progress) {
    const normalized = normalizeLessonEntry(progress);
    if (!normalized) return null;
    const { contentId } = normalized;

    this.lessonProgress[contentId] = {
      ...(this.lessonProgress[contentId] || {}),
      ...normalized
    };
    this.notify();
    return this.lessonProgress[contentId];
  }

  enrollLesson(contentId, meta = {}) {
    if (!contentId) return null;
    const key = String(contentId);
    const existing = this.lessonProgress[key] || {};
    if (this.normalizeLessonStatus(existing.status) === 'COMPLETED') return existing;
    const timestamp = nowIso();

    this.lessonProgress[key] = {
      ...existing,
      ...meta,
      contentId: key,
      status: 'ENROLLED',
      enrolledAt: existing.enrolledAt || timestamp,
      updatedAt: timestamp
    };
    this.notify();
    return this.lessonProgress[key];
  }

  markLessonComplete(contentId, meta = {}) {
    if (!contentId) return null;
    const key = String(contentId);
    const existing = this.lessonProgress[key] || {};
    const timestamp = nowIso();

    this.lessonProgress[key] = {
      ...existing,
      ...meta,
      contentId: key,
      status: 'COMPLETED',
      enrolledAt: existing.enrolledAt || timestamp,
      completedAt: existing.completedAt || timestamp,
      updatedAt: timestamp
    };
    this.notify();
    return this.lessonProgress[key];
  }

  isLessonComplete(contentId) {
    if (!contentId) return false;
    return this.lessonProgress[String(contentId)]?.status === 'COMPLETED';
  }

  getLearner() {
    return this.learner;
  }

  updateXP(amount) {
    if (this.learner) {
      this.learner.total_xp += amount;
      const newLevel = Math.floor(Math.sqrt(this.learner.total_xp / 100)) + 1;
      if (newLevel > this.learner.level) {
        this.learner.level = newLevel;
        console.log(`Level up! Now level ${newLevel}`);
      }

      this.notify();
    }
  }

  setContributor(contributor) {
    this.contributor = contributor;
    this.notify();
  }

  getContributor() {
    return this.contributor;
  }

  setAdministrator(administrator) {
    this.administrator = administrator;
    this.notify();
  }

  getAdministrator() {
    return this.administrator;
  }

  setCurrentMap(map) {
    this.currentMap = map;
    this.notify();
  }

  getCurrentMap() {
    return this.currentMap;
  }

  setInventory(inventory = []) {
    this.inventory = (Array.isArray(inventory) ? inventory : [])
      .map((item) => normalizeInventoryEntry(item))
      .filter(Boolean);
    this.notify();
  }

  addItem(item, quantity = 1) {
    const normalizedItem = normalizeInventoryEntry(item, quantity);
    const itemId = resolveItemId(normalizedItem);
    if (!itemId) return;

    const index = this.inventory.findIndex((x) => (x.item_id || x.id) === itemId);
    if (index > -1) {
      const currentQty = this.inventory[index].quantity ?? 1;
      this.inventory[index] = {
        ...this.inventory[index],
        quantity: currentQty + quantity
      };
    } else {
      this.inventory.push(normalizedItem);
    }
    this.notify();
  }

  removeItem(item_id, quantity = 1) {
    const index = this.inventory.findIndex((item) => (item.item_id || item.id) === item_id);
    if (index > -1) {
      const currentQty = this.inventory[index].quantity ?? 1;
      const nextQty = currentQty - quantity;
      if (nextQty <= 0) this.inventory.splice(index, 1);
      else this.inventory[index] = { ...this.inventory[index], quantity: nextQty };
      this.notify();
    }
  }

  getInventory() {
    return [...this.inventory];
  }

  hasItem(itemId) {
    return this.inventory.some((item) => (item.item_id || item.id) === itemId && (item.quantity ?? 1) > 0);
  }

  saveToStorage() {
    saveJsonToStorage(
      STORAGE_KEY,
      {
        learner: this.learner,
        contributor: this.contributor,
        administrator: this.administrator,
        role: this.role,
        currentMap: this.currentMap,
        inventory: this.inventory,
        playerProfile: this.playerProfile,
        activeEffects: this.activeEffects
      },
      'game state'
    );
  }

  loadFromStorage() {
    const state = loadJsonFromStorage(STORAGE_KEY, null, 'game state');
    if (!state) return;

    this.learner = state.learner || null;
    this.contributor = state.contributor || null;
    this.administrator = state.administrator || null;
    this.role = state.role || null;
    this.currentMap = state.currentMap || null;
    this.inventory = (state.inventory || []).map((item) => normalizeInventoryEntry(item)).filter(Boolean);
    this.lessonProgress = {};
    this.playerProfile = state.playerProfile || null;
    this.activeEffects = state.activeEffects || {};
  }

  clearState() {
    this.learner = null;
    this.contributor = null;
    this.administrator = null;
    this.role = null;
    this.currentMap = null;
    this.inventory = [];
    this.lessonProgress = {};
    this.playerProfile = null;
    this.activeEffects = {};
    removeStorageKey(STORAGE_KEY, 'game state');
    this.notify({ persist: false });
  }
}

export const gameState = GameStateManager.getInstance();

