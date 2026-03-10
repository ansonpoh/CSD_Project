import { TILE_SIZE } from './constants.js';

export const tilemapMethods = {
  buildTilemap() {
    if (this.map) {
      this.map.destroy();
    }
    this.layerObjs?.forEach((layer) => layer?.destroy());
    this.markerGraphics?.destroy();
    this.gridGraphics?.destroy();

    this.map = this.make.tilemap({
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      width: this.mapWidth,
      height: this.mapHeight
    });
    const tileset = this.map.addTilesetImage(this.tilesetKey, this.tilesetKey, TILE_SIZE, TILE_SIZE, 0, 0);
    this.layerObjs = [];

    this.layerNames.forEach((name) => {
      const layer = this.map.createBlankLayer(name, tileset, 0, 0);
      this.layerObjs.push(layer);
      layer.setDepth(name === 'ground' ? 1 : name === 'decor' ? 2 : 3);
      if (name === 'collision') layer.setAlpha(0.6);

      const sourceLayer = this.mapLayers[name];
      for (let y = 0; y < this.mapHeight; y += 1) {
        for (let x = 0; x < this.mapWidth; x += 1) {
          layer.putTileAt(sourceLayer[y][x], x, y);
        }
      }
      if (name === 'collision') layer.setCollisionByExclusion([-1], true);
    });

    this.markerGraphics = this.add.graphics().setDepth(8);
    this.gridGraphics = this.add.graphics().setDepth(9);
    this.drawGrid();
    this.refreshMarkerGraphics();

    this.cameras.main.setBounds(0, 0, this.mapWidth * TILE_SIZE, this.mapHeight * TILE_SIZE);
  },

  drawGrid() {
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, 0xffffff, 0.12);
    const worldWidth = this.mapWidth * TILE_SIZE;
    const worldHeight = this.mapHeight * TILE_SIZE;

    for (let x = 0; x <= worldWidth; x += TILE_SIZE) {
      this.gridGraphics.lineBetween(x, 0, x, worldHeight);
    }
    for (let y = 0; y <= worldHeight; y += TILE_SIZE) {
      this.gridGraphics.lineBetween(0, y, worldWidth, y);
    }
  },

  refreshMarkerGraphics() {
    if (!this.markerGraphics) return;
    this.markerGraphics.clear();

    this.markers.npcs.forEach(({ x, y }) => {
      this.markerGraphics.fillStyle(0x4ade80, 0.9);
      this.markerGraphics.fillCircle(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, 8);
    });

    this.markers.monsters.forEach(({ x, y }) => {
      this.markerGraphics.fillStyle(0xf97316, 0.9);
      this.markerGraphics.fillCircle(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, 8);
    });
  },

  refreshLayerRender(layerName) {
    const layer = this.layerObjs[this.layerNames.indexOf(layerName)];
    const sourceLayer = this.mapLayers[layerName];

    for (let y = 0; y < this.mapHeight; y += 1) {
      for (let x = 0; x < this.mapWidth; x += 1) {
        layer.putTileAt(sourceLayer[y][x], x, y);
      }
    }
    if (layerName === 'collision') layer.setCollisionByExclusion([-1], true);
  },

  applyRect(start, end) {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    const value = this.activeTool === 'erase' ? -1 : this.selectedTile;
    const layer = this.mapLayers[this.activeLayer];

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        layer[y][x] = value;
      }
    }
  },

  applyFill(startX, startY) {
    const layer = this.mapLayers[this.activeLayer];
    const target = layer[startY][startX];
    const replacement = this.activeTool === 'erase' ? -1 : this.selectedTile;
    if (target === replacement) return;

    const queue = [[startX, startY]];
    const seen = new Set();
    while (queue.length) {
      const [x, y] = queue.shift();
      const key = `${x},${y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (x < 0 || y < 0 || x >= this.mapWidth || y >= this.mapHeight) continue;
      if (layer[y][x] !== target) continue;

      layer[y][x] = replacement;
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  },

  toggleMarker(type, x, y) {
    const markers = this.markers[type];
    const existingIndex = markers.findIndex((marker) => marker.x === x && marker.y === y);
    if (existingIndex >= 0) markers.splice(existingIndex, 1);
    else markers.push({ x, y });
  },

  buildRuntimePayload() {
    return {
      version: 1,
      tileSize: TILE_SIZE,
      width: this.mapWidth,
      height: this.mapHeight,
      tilesetKey: this.tilesetKey,
      layers: {
        ground: this.mapLayers.ground,
        decor: this.mapLayers.decor,
        collision: this.mapLayers.collision
      },
      spawns: {
        npcs: this.markers.npcs,
        monsters: this.markers.monsters
      }
    };
  }
};
