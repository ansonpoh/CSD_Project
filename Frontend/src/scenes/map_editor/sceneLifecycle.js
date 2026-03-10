import { DEFAULT_MAP_HEIGHT, DEFAULT_MAP_WIDTH, DEFAULT_TILESET } from './constants.js';
import { createEmptyLayer } from './state.js';

export function createMapEditorScene() {
  const { width, height } = this.cameras.main;
  this.cameras.main.setBackgroundColor(0x101827);
  this.add.rectangle(width / 2, height / 2, width, height, 0x101827);

  this.mapWidth = DEFAULT_MAP_WIDTH;
  this.mapHeight = DEFAULT_MAP_HEIGHT;
  this.paletteScroll = 0;
  this.maxPaletteScroll = 0;
  this.tilesetKey = DEFAULT_TILESET;
  this.mapLayers = {
    ground: createEmptyLayer(this.mapWidth, this.mapHeight),
    decor: createEmptyLayer(this.mapWidth, this.mapHeight),
    collision: createEmptyLayer(this.mapWidth, this.mapHeight)
  };

  this.buildTilemap();
  this.createToolbar();
  this.createPalettePanel();
  this.createStatusLine();
  this.createEditorForm();
  this.installInputHandlers();
  this.pushHistory('init');

  this.events.once('shutdown', () => this.cleanupDom());
  this.events.once('destroy', () => this.cleanupDom());
}
