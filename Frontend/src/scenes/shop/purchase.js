import { gameState } from '../../services/gameState.js';
import { apiService } from '../../services/api.js';

export const shopPurchaseMethods = {
  async purchaseItem(item) {
    if (this.gold < item.price) {
      return;
    }

    const learner = gameState.getLearner();
    const itemId = item.itemId;

    this.gold -= item.price;
    this.updateGoldDisplay();
    this.displayItems();
    this.showPurchaseFlash(item.name);

    try {
      if (learner?.learnerId && itemId) {
        const updatedInventory = await apiService.addInventoryItem(itemId, 1, false);
        gameState.setInventory(updatedInventory);
        void apiService.createPurchase([{ itemId: item.itemId, quantity: 1 }]);
        return;
      }

      gameState.addItem(item, 1);
    } catch (error) {
      this.gold += item.price;
      this.updateGoldDisplay();
      this.displayItems();
      console.error('Purchase failed:', error);
    }
  }
};
