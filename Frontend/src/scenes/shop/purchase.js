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
        // Update UI immediately after purchase success, then reconcile in background.
        gameState.addItem(item, 1);
        this.gold = Math.max(0, this.gold - goldCost);
        const currentLearner = gameState.getLearner();
        if (currentLearner) {
          gameState.setLearner({
            ...currentLearner,
            gold: this.gold
          });
        }

        this.updateGoldDisplay();
        this.displayItems();
        this.showPurchaseFlash(item);

        void Promise.all([
          apiService.getMyInventory().catch(() => null),
          apiService.getCurrentLearner().catch(() => null)
        ])
          .then(([updatedInventory, refreshedLearner]) => {
            if (updatedInventory) {
              gameState.setInventory(updatedInventory);
            }

            if (refreshedLearner) {
              gameState.setLearner(refreshedLearner);
              const refreshedGold = Number(refreshedLearner.gold ?? this.gold);
              this.gold = Number.isFinite(refreshedGold) ? Math.max(0, Math.floor(refreshedGold)) : this.gold;
              this.updateGoldDisplay();
              this.displayItems();
            }
          })
          .catch(() => {});

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
