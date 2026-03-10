import Phaser from 'phaser';
import { initializeShopSceneState } from './state.js';
import { shopUiMethods } from './ui.js';
import { shopCatalogMethods } from './catalog.js';
import { shopItemVisualMethods } from './itemVisuals.js';
import { shopPurchaseMethods } from './purchase.js';

export class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ShopScene' });
    initializeShopSceneState(this);
  }

  async create() {
    this.buildShopScene();
    await this.loadItems();
  }
}

Object.assign(
  ShopScene.prototype,
  shopUiMethods,
  shopCatalogMethods,
  shopItemVisualMethods,
  shopPurchaseMethods
);
