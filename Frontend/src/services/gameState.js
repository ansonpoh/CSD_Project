class GameStateManager {
  constructor() {
    if (GameStateManager.instance) {
      return GameStateManager.instance;
    }
    
    this.learner = null;
    this.currentMap = null;
    this.inventory = [];
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
  addItem(item) {
    this.inventory.push(item);
    this.notify();
  }

  removeItem(itemId) {
    const index = this.inventory.findIndex(item => item.item_id === itemId);
    if (index > -1) {
      this.inventory.splice(index, 1);
      this.notify();
    }
  }

  getInventory() {
    return [...this.inventory];
  }

  hasItem(itemId) {
    return this.inventory.some(item => item.item_id === itemId);
  }

  // Persistence
  saveToStorage() {
    try {
      const state = {
        learner: this.learner,
        currentMap: this.currentMap,
        inventory: this.inventory
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
      }
    } catch (error) {
      console.error('Failed to load game state:', error);
    }
  }

  clearState() {
    this.learner = null;
    this.currentMap = null;
    this.inventory = [];
    localStorage.removeItem('gameState');
    this.notify();
  }
}

export const gameState = GameStateManager.getInstance();
