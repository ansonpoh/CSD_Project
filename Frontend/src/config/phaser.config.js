import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene.js';
import { LoginScene } from '../scenes/LoginScene.js';
import { WorldMapScene } from '../scenes/WorldMapScene.js';
import { GameMapScene } from '../scenes/GameMapScene.js';
import { CombatScene } from '../scenes/CombatScene.js';
import { ShopScene } from '../scenes/ShopScene.js';
import { DialogueScene } from '../scenes/DialogueScene.js';
import { UIScene } from '../scenes/UIScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 1920,
  height: 1088,
  resolution:window.devicePixelRatio,
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    // mode: Phaser.Scale.ENVELOP,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [
    BootScene,
    LoginScene,
    WorldMapScene,
    GameMapScene,
    CombatScene,
    ShopScene,
    DialogueScene,
    UIScene
  ]
};

export default config;
