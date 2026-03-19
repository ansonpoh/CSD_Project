import { gameState } from '../../services/gameState.js';
import { apiService } from '../../services/api.js';

export const shopPurchaseMethods = {
  async purchaseItem(item) {
    if (this.gold < item.price) {
      return;
    }

    const learner = gameState.getLearner();

    try {
      if (learner?.learnerId && item?.itemId) {
        await apiService.createPurchase([{ itemId: item.itemId, quantity: 1 }]);
        const [updatedInventory, refreshedLearner] = await Promise.all([
          apiService.getMyInventory().catch(() => null),
          apiService.getCurrentLearner().catch(() => null)
        ]);

        if (updatedInventory) {
          gameState.setInventory(updatedInventory);
        }

        if (refreshedLearner) {
          gameState.setLearner(refreshedLearner);
          this.gold = Number(refreshedLearner.gold ?? this.gold);
        } else {
          this.gold = Math.max(0, this.gold - Number(item.price || 0));
        }

        this.updateGoldDisplay();
        this.displayItems();
        this.showPurchaseFlash(item.name);

        return;
      }

      if (item?.itemId) {
        const updatedInventory = await apiService.addInventoryItem(item.itemId, 1, false);
        gameState.setInventory(updatedInventory);
        return;
      }

      gameState.addItem(item, 1);
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  }
};
