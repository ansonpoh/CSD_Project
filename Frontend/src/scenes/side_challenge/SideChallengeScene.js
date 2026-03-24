import Phaser from 'phaser';
import { sideChallengeBoardMethods } from './board.js';
import { createSideChallengeScene } from './sceneLifecycle.js';
import { initializeSideChallengeState, resetSideChallengeState } from './state.js';
import { sideChallengeUiMethods } from './ui.js';

export class SideChallengeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SideChallengeScene' });
    initializeSideChallengeState(this);
  }

  init(data) {
    resetSideChallengeState(this, data);
  }

  create() {
    createSideChallengeScene.call(this);
  }
}

Object.assign(
  SideChallengeScene.prototype,
  sideChallengeUiMethods,
  sideChallengeBoardMethods
);
