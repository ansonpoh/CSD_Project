import { gameState } from '../../services/gameState.js';

export function initializeShopSceneState(scene) {
  const learner = gameState.getLearner();
  scene.items = [];
  scene.gold = Number(learner?.gold ?? 0);
  scene.goldText = null;
  scene.itemContainers = [];
}
