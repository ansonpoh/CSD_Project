import { MAX_LIFELINES } from '../constants.js';
import { gameState } from '../../../services/gameState.js';

export const combatSceneQuizLifelineMethods = {
  consumeHeartLifeline() {
    if (this.remainingLifelines <= 0) return false;
    this.remainingLifelines -= 1;
    this.consumeQuizHeartBonus(1);
    this.syncPlayerHealthToHearts();
    return true;
  },

  syncPlayerHealthToHearts() {
    const maxHearts = Math.max(1, this.maxLifelines || MAX_LIFELINES);
    const ratio = this.remainingLifelines / maxHearts;
    this.playerHP = Math.max(0, Math.min(100, ratio * 100));
    this.updateHealthBars();
  },

  setQuizOptionsEnabled(enabled) {
    this.optionButtons = (this.optionButtons || []).filter((btn) => {
      const container = btn?.container;
      const setEnabled = btn?.setEnabled;
      if (!container || typeof setEnabled !== 'function' || !container.scene || !btn.hit?.scene) return false;

      if (!container.visible) {
        setEnabled(false);
        return true;
      }

      setEnabled(enabled);
      return true;
    });
  },

  getInitialLifelineCount() {
    const effects = gameState.getActiveEffects();
    const quizHeartBonus = Math.max(0, Number(effects.quizHeartBonus || 0));
    return MAX_LIFELINES + quizHeartBonus;
  },

  getHeartInventoryCount() {
    return this.remainingLifelines;
  },

  findHeartInventoryItem() {
    return null;
  },

  getHintInventoryCount() {
    const inventory = gameState.getInventory();
    return inventory
      .filter((item) => this.isHintItem(item))
      .reduce((total, item) => total + Math.max(0, Number(item?.quantity || 0)), 0);
  },

  findHintInventoryItem() {
    const inventory = gameState.getInventory();
    return inventory.find((item) => this.isHintItem(item) && Math.max(0, Number(item?.quantity || 0)) > 0) || null;
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
  },

  isHintItem(item) {
    if (!item) return false;
    const name = String(item?.name || '').toLowerCase();
    const description = String(item?.description || '').toLowerCase();
    const itemType = String(item?.item_type || '').toLowerCase();
    const blob = `${name} ${description}`;
    return (
      itemType === 'quiz_hint' ||
      blob.includes('quiz hint') ||
      blob.includes('hint token') ||
      (blob.includes('hint') && blob.includes('quiz'))
    );
  },

  consumeQuizHeartBonus(amount = 1) {
    const effects = gameState.getActiveEffects();
    const currentBonus = Math.max(0, Number(effects.quizHeartBonus || 0));
    if (currentBonus <= 0) return;

    const nextBonus = Math.max(0, currentBonus - Math.max(0, Number(amount || 0)));
    gameState.setActiveEffects({
      ...effects,
      quizHeartBonus: nextBonus
    });
  }
};
