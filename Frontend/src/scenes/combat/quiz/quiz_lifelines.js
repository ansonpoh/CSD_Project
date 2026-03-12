import { MAX_LIFELINES } from '../constants.js';

export const combatSceneQuizLifelineMethods = {
  consumeHeartLifeline() {
    if (this.remainingLifelines <= 0) return false;
    this.remainingLifelines -= 1;
    this.syncPlayerHealthToHearts();
    return true;
  },

  syncPlayerHealthToHearts() {
    const ratio = this.remainingLifelines / MAX_LIFELINES;
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
    return MAX_LIFELINES;
  },

  getHeartInventoryCount() {
    return MAX_LIFELINES;
  },

  findHeartInventoryItem() {
    return null;
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
