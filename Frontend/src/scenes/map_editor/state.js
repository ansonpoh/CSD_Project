import { DEFAULT_TILESET, LAYER_NAMES, MAX_HISTORY } from './constants.js';

export function initializeEditorState(scene) {
  scene.layerNames = [...LAYER_NAMES];
  scene.activeLayer = 'ground';
  scene.activeTool = 'paint';
  scene.selectedTile = 0;
  scene.minZoom = 0.5;
  scene.maxZoom = 2.5;
  scene.history = [];
  scene.historyIndex = -1;
  scene.markers = { npcs: [], monsters: [] };
  scene.isPanning = false;
  scene.isPainting = false;
  scene.rectStart = null;
  scene.currentDraftId = null;
  scene.uiModal = null;
  scene.editorRoot = null;
  scene.leftSidebarCollapsed = false;
  scene.rightSidebarCollapsed = false;
  scene.editorFormEl = null;
  scene.statusText = null;
  scene.currentTilesetInfo = null;
  scene.viewportRect = null;
  scene.hoveredTile = null;
  scene.lastStatusMessage = 'Left click to paint. Right click drag or two-finger scroll to pan. Use +/- or Fit to zoom.';
}

export function createEmptyLayer(width, height) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => -1));
}

export const historyMethods = {
  cloneState() {
    return {
      draftId: this.currentDraftId,
      tilesetKey: this.tilesetKey,
      activeLayer: this.activeLayer,
      selectedTile: this.selectedTile,
      mapLayers: {
        ground: this.mapLayers.ground.map((row) => [...row]),
        decor: this.mapLayers.decor.map((row) => [...row]),
        collision: this.mapLayers.collision.map((row) => [...row])
      },
      markers: {
        npcs: this.markers.npcs.map((marker) => ({ ...marker })),
        monsters: this.markers.monsters.map((marker) => ({ ...marker }))
      }
    };
  },

  restoreState(state) {
    this.currentDraftId = state.draftId || null;
    this.tilesetKey = state.tilesetKey || DEFAULT_TILESET;
    this.activeLayer = state.activeLayer || 'ground';
    this.selectedTile = Number.isInteger(state.selectedTile) ? state.selectedTile : 0;
    this.mapLayers = {
      ground: state.mapLayers.ground.map((row) => [...row]),
      decor: state.mapLayers.decor.map((row) => [...row]),
      collision: state.mapLayers.collision.map((row) => [...row])
    };
    this.markers = {
      npcs: state.markers.npcs.map((marker) => ({ ...marker })),
      monsters: state.markers.monsters.map((marker) => ({ ...marker }))
    };
    this.buildTilemap();
    this.refreshMarkerGraphics();
    this.rebuildPaletteTiles?.();
    this.refreshToolbarLabel();
    this.refreshStatusMeta?.();
    this.setStatus(`Restored snapshot (${this.historyIndex + 1}/${this.history.length})`);
  },

  pushHistory(_reason) {
    const snapshot = this.cloneState();
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    this.history.push(snapshot);
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }
    this.historyIndex = this.history.length - 1;
  },

  undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex -= 1;
    this.restoreState(this.history[this.historyIndex]);
  },

  redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex += 1;
    this.restoreState(this.history[this.historyIndex]);
  }
};
