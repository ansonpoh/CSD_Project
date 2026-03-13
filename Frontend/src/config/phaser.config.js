import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene.js';
import { LoginScene } from '../scenes/login/LoginScene.js';
import { WorldMapScene } from '../scenes/world_map/WorldMapScene.js';
import { GameMapScene } from '../scenes/game_map/GameMapScene.js';
import { CombatScene } from '../scenes/combat/CombatScene.js';
import { ShopScene } from '../scenes/shop/ShopScene.js';
import { DialogueScene } from '../scenes/dialogue/DialogueScene.js';
import { UIScene } from '../scenes/ui/UIScene.js';
import { ContributorScene } from '../scenes/contributor/ContributorScene.js';
import { AdminScene } from '../scenes/admin/AdminScene.js';
import { MapEditorScene } from '../scenes/map_editor/MapEditorScene.js';
import { SideChallengeScene } from '../scenes/side_challenge/SideChallengeScene.js';
import { DragQuizScene } from '../scenes/DragQuizScene.js';
import { ScenarioQuizScene } from '../scenes/ScenarioQuizScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 1920,
  dom: {
    createContainer: true
  },
  height: 1088,
  // resolution:window.devicePixelRatio,
  backgroundColor: '#1a2e4c', // Solid navy color from mockup
  pixelArt: true, // Ensures crisp pixelated rendering
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
    DragQuizScene,
    ScenarioQuizScene,
    ShopScene,
    DialogueScene,
    SideChallengeScene,
    UIScene,
    ContributorScene,
    AdminScene,
    MapEditorScene
  ]
};

export default config;
