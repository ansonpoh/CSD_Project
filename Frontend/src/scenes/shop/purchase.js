import { gameState } from '../../services/gameState.js';
import { apiService } from '../../services/api.js';

export const shopPurchaseMethods = {
  getItemGoldCost(item) {
    const price = Number(item?.price ?? 0);
    if (!Number.isFinite(price)) return 0;
    return Math.max(0, Math.round(price));
  },

  async purchaseItem(item) {
    const goldCost = this.getItemGoldCost(item);
    if (this.gold < goldCost) {
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
          const refreshedGold = Number(refreshedLearner.gold ?? this.gold);
          this.gold = Number.isFinite(refreshedGold) ? Math.max(0, Math.floor(refreshedGold)) : this.gold;
        } else {
          this.gold = Math.max(0, this.gold - goldCost);
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
