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

  // Role management
  setRole(role) {
    this.role = role;
    this.notify();
  }

  getRole() {
    return this.role;
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

  // Contributor management
  setContributor(contributor) {
    this.contributor = contributor;
    this.notify();
  }

  getContributor() {
    return this.contributor;
  }

  // Administrator management
  setAdministrator(administrator) {
    this.administrator = administrator;
    this.notify();
  }

  getAdministrator() {
    return this.administrator;
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
  }

  getInventory() {
    return [...this.inventory];
  }

  hasItem(itemId) {
    return this.inventory.some((item) => (item.item_id || item.id) === itemId && (item.quantity ?? 1) > 0);
  }

  // Persistence
  saveToStorage() {
    try {
      const state = {
        learner: this.learner,
        contributor: this.contributor,
        administrator: this.administrator,
        role: this.role,
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
        this.learner = state.learner || null;
        this.contributor = state.contributor || null;
        this.administrator = state.administrator || null;
        this.role = state.role || null;
        this.currentMap = state.currentMap || null;
        this.inventory = state.inventory || [];
      }
    } catch (error) {
      console.error('Failed to load game state:', error);
    }
  }

  clearState() {
    this.learner = null;
    this.contributor = null;
    this.administrator = null;
    this.role = null;
    this.currentMap = null;
    this.inventory = [];
    localStorage.removeItem('gameState');
    this.notify();
  }
}

export const gameState = GameStateManager.getInstance();