import Phaser from 'phaser';
import { initializeShopSceneState } from './state.js';
import { shopUiMethods } from './ui.js';
import { shopCatalogMethods } from './catalog.js';
import { shopItemVisualMethods } from './itemVisuals.js';
import { shopPurchaseMethods } from './purchase.js';
import { apiService } from '../../services/api.js';
import { gameState } from '../../services/gameState.js';

export class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ShopScene' });
    initializeShopSceneState(this);
  }

  async create() {
    initializeShopSceneState(this);
    this.buildShopScene();
    await this.refreshLearnerGold();
    await this.loadItems();
  }

  async refreshLearnerGold() {
    try {
      const learner = await apiService.getCurrentLearner();
      if (learner) {
        gameState.setLearner(learner);
        const parsedGold = Number(learner.gold);
        this.gold = Number.isFinite(parsedGold) ? Math.max(0, Math.floor(parsedGold)) : 0;
        this.updateGoldDisplay();
      }
    } catch (error) {
      console.warn('Failed to refresh learner gold for shop:', error);
      const fallbackGold = Number(gameState.getLearner()?.gold);
      if (Number.isFinite(fallbackGold)) {
        this.gold = Math.max(0, Math.floor(fallbackGold));
        this.updateGoldDisplay();
      }
    }
  }
}

Object.assign(
  ShopScene.prototype,
  shopUiMethods,
  shopCatalogMethods,
  shopItemVisualMethods,
  shopPurchaseMethods
);
