import Phaser from 'phaser';
import { draftMethods } from './drafts.js';
import { inputMethods } from './input.js';
import { paletteMethods } from './palette.js';
import { createMapEditorScene } from './sceneLifecycle.js';
import { historyMethods, initializeEditorState } from './state.js';
import { tilemapMethods } from './tilemap.js';
import { tilesetMethods } from './tileset.js';
import { uiMethods } from './ui.js';

export class MapEditorScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapEditorScene' });
    initializeEditorState(this);
  }

  create() {
    createMapEditorScene.call(this);
  }
}

Object.assign(
  MapEditorScene.prototype,
  historyMethods,
  tilemapMethods,
  tilesetMethods,
  paletteMethods,
  uiMethods,
  inputMethods,
  draftMethods
);
