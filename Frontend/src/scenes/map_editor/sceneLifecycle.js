import { DEFAULT_MAP_HEIGHT, DEFAULT_MAP_WIDTH, DEFAULT_TILESET } from './constants.js';
import { createEmptyLayer } from './state.js';

export function createMapEditorScene() {
  const { width, height } = this.cameras.main;
  this.cameras.main.setBackgroundColor(0x101827);
  this.add.rectangle(width / 2, height / 2, width, height, 0x101827);

  this.mapWidth = DEFAULT_MAP_WIDTH;
  this.mapHeight = DEFAULT_MAP_HEIGHT;
  this.tilesetKey = DEFAULT_TILESET;
  this.mapLayers = {
    ground: createEmptyLayer(this.mapWidth, this.mapHeight),
    decor: createEmptyLayer(this.mapWidth, this.mapHeight),
    collision: createEmptyLayer(this.mapWidth, this.mapHeight)
  };

  this.createToolbar();
  this.createEditorForm();
  this.buildTilemap();
  this.createPalettePanel();
  this.createStatusLine();
  this.installInputHandlers();
  this.pushHistory('init');
  this.setStatus(this.lastStatusMessage);
  this.scale.on('resize', this.refreshEditorLayout, this);

  const cleanup = () => {
    this.scale.off('resize', this.refreshEditorLayout, this);
    this.cleanupDom();
  };

  this.events.once('shutdown', cleanup);
  this.events.once('destroy', cleanup);
}
