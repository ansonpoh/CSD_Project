class GameStateManager {
  constructor() {
    if (GameStateManager.instance) {
      return GameStateManager.instance;
    }
    
    this.learner = null;
    this.currentMap = null;
    this.inventory = [];
    this.lessonProgress = {};
    this.listeners = new Set();
    
    // Load from localStorage if available
    this.loadFromStorage();
    
    GameStateManager.instance = this;
  }

  static getInstance() {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager();
    }
    return GameStateManager.instance;
  }

  // Subscribe to state changes
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    this.listeners.forEach(callback => callback());
    this.saveToStorage();
  }

  // Learner management
  setLearner(learner) {
    this.learner = learner;
    this.notify();
  }

  normalizeLessonStatus(status) {
    return String(status || '').toUpperCase();
  }
  setLessonProgress(progressList = []) {
    const next = {};
    (Array.isArray(progressList) ? progressList : []).forEach((p) => {
      const contentId = String(p?.contentId || p?.content_id || '');
      if (!contentId) return;
      next[contentId] = {
        ...p,
        contentId,
        status: this.normalizeLessonStatus(p?.status) || 'ENROLLED'
      };
    });
    this.lessonProgress = next;
    this.notify();
  }

  upsertLessonProgress(progress) {
    const contentId = String(progress?.contentId || progress?.content_id || '');
    if (!contentId) return null;

    this.lessonProgress[contentId] = {
      ...(this.lessonProgress[contentId] || {}),
      ...progress,
      contentId,
      status: this.normalizeLessonStatus(progress?.status) || 'ENROLLED'
    };
    this.notify();
    return this.lessonProgress[contentId];
  }

  enrollLesson(contentId, meta = {}) {
    if (!contentId) return null;
    const key = String(contentId);
    const existing = this.lessonProgress[key] || {};
    if (this.normalizeLessonStatus(existing.status) === 'COMPLETED') return existing;

    this.lessonProgress[key] = {
      ...existing,
      ...meta,
      contentId: key,
      status: 'ENROLLED',
      enrolledAt: existing.enrolledAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.notify();
    return this.lessonProgress[key];
  }

  markLessonComplete(contentId, meta = {}) {
    if (!contentId) return null;
    const key = String(contentId);
    const existing = this.lessonProgress[key] || {};

    this.lessonProgress[key] = {
      ...existing,
      ...meta,
      contentId: key,
      status: 'COMPLETED',
      enrolledAt: existing.enrolledAt || new Date().toISOString(),
      completedAt: existing.completedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
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
      
      // Simple level calculation: level = floor(sqrt(xp / 100))
      const newLevel = Math.floor(Math.sqrt(this.learner.total_xp / 100)) + 1;
      if (newLevel > this.learner.level) {
        this.learner.level = newLevel;
        console.log(`Level up! Now level ${newLevel}`);
      }
      
      this.notify();
    }
  }

  // Map management
  setCurrentMap(map) {
    this.currentMap = map;
    this.notify();
  }

  getCurrentMap() {
    return this.currentMap;
  }

  // Inventory management
  setInventory(inventory = []) {
    this.inventory = Array.isArray(inventory) ? inventory : [];
    this.notify();
  }

  addItem(item, quantity = 1) {
    if (!item) return;
    const itemId = item.item_id || item.id;
    if (!itemId) return;

    const index = this.inventory.findIndex((x) => (x.item_id || x.id) === itemId);
    if (index > -1) {
      const currentQty = this.inventory[index].quantity ?? 1;
      this.inventory[index] = {
        ...this.inventory[index],
        quantity: currentQty + quantity
      };
    } else {
      this.inventory.push({
        ...item,
        item_id: item.item_id || item.id,
        quantity: item.quantity ?? quantity
      });
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

    // const index = this.inventory.findIndex(item => item.item_id === itemId);
    // if (index > -1) {
    //   this.inventory.splice(index, 1);
    //   this.notify();
    // }
  }

  getInventory() {
    return [...this.inventory];
  }

  hasItem(itemId) {
    return this.inventory.some((item) => (item.item_id || item.id) === itemId && (item.quantity ?? 1) > 0);
    // return this.inventory.some(item => item.item_id === itemId);
  }

  // Persistence
  saveToStorage() {
    try {
      const state = {
        learner: this.learner,
        currentMap: this.currentMap,
        inventory: this.inventory,
        lessonProgress: this.lessonProgress,
      };
      localStorage.setItem('gameState', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save game state:', error);
    }
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem('gameState');
      if (saved) {
        const state = JSON.parse(saved);
        this.learner = state.learner;
        this.currentMap = state.currentMap;
        this.inventory = state.inventory || [];
        this.lessonProgress = state.lessonProgress || {};
      }
    } catch (error) {
      console.error('Failed to load game state:', error);
    }
  }

  clearState() {
    this.learner = null;
    this.currentMap = null;
    this.inventory = [];
    this.lessonProgress = {};
    localStorage.removeItem('gameState');
    this.notify();
  }

}

export const gameState = GameStateManager.getInstance();
