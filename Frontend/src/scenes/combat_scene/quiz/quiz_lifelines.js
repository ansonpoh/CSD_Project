import { apiService } from '../../../services/api.js';
import { gameState } from '../../../services/gameState.js';
import { MAX_LIFELINES } from '../constants.js';

export const combatSceneQuizLifelineMethods = {
  async consumeHeartLifeline() {
    if (this.remainingLifelines <= 0) return false;
    this.remainingLifelines -= 1;

    const heartItem = this.findHeartInventoryItem();
    if (!heartItem) return true;

    const itemId = heartItem.itemId || heartItem.item_id || heartItem.id;
    if (!itemId) return true;

    try {
      const updatedInventory = await apiService.removeInventoryItem(itemId, 1);
      gameState.setInventory(updatedInventory || []);
    } catch (error) {
      console.warn('Failed to sync heart consumption, applying local fallback.', error);
      gameState.removeItem(itemId, 1);
    }
    return true;
  },

  setQuizOptionsEnabled(enabled) {
    this.optionButtons.forEach((btn) => {
      if (!btn.container.visible) {
        btn.setEnabled(false);
        return;
      }
      btn.setEnabled(enabled);
    });
  },

  getInitialLifelineCount() {
    const totalHearts = this.getHeartInventoryCount();
    return Math.min(MAX_LIFELINES, totalHearts);
  },

  getHeartInventoryCount() {
    const inventory = gameState.getInventory();
    return inventory
      .filter((item) => this.isHeartItem(item))
      .reduce((sum, item) => sum + Math.max(0, Number(item?.quantity ?? 1)), 0);
  },

  findHeartInventoryItem() {
    const inventory = gameState.getInventory();
    return inventory.find((item) => this.isHeartItem(item) && Number(item?.quantity ?? 1) > 0) || null;
  },

  isHeartItem(item) {
    if (!item) return false;
    const name = String(item?.name || '').toLowerCase();
    const description = String(item?.description || '').toLowerCase();
    const blob = `${name} ${description}`;
    return (
      blob.includes('heart') ||
      blob.includes('lifeline') ||
      blob.includes('revive') ||
      blob.includes('extra life')
    );
  }
};
