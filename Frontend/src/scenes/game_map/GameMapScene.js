import Phaser from 'phaser';
import { initializeSceneState, resetSceneState } from './state.js';
import { createGameMapScene, updateGameMapScene } from './sceneLifecycle.js';
import { uiMethods } from './ui.js';
import { mapRuntimeMethods } from './mapRuntime.js';
import { entityRenderingMethods } from './entityRendering.js';
import { encounterStateMethods } from './encounterState.js';
import { questPanelMethods } from './questPanels.js';
import { mapEventMethods } from './mapEvents.js';
export class GameMapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameMapScene' });
    initializeSceneState(this);
  }

  init(data) {
    resetSceneState(this, data);
  }

  async create() {
    await createGameMapScene.call(this);
  }

  update() {
    updateGameMapScene.call(this);
  }

  
}

Object.assign(
  GameMapScene.prototype,
  uiMethods,
  mapRuntimeMethods,
  entityRenderingMethods,
  encounterStateMethods,
  questPanelMethods,
  mapEventMethods
);
