import { TILE_SIZE } from './constants.js';

export const tilemapMethods = {
  buildTilemap() {
    const cam = this.cameras.main;
    const previousView = this.map ? {
      zoom: cam.zoom,
      scrollX: cam.scrollX,
      scrollY: cam.scrollY
    } : null;

    if (this.map) {
      this.map.destroy();
    }
    this.layerObjs?.forEach((layer) => layer?.destroy());
    this.markerGraphics?.destroy();
    this.gridGraphics?.destroy();
    this.hoverGraphics?.destroy();

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
    this.hoverGraphics = this.add.graphics().setDepth(10);
    this.refreshMarkerGraphics();

    cam.setBounds(0, 0, this.mapWidth * TILE_SIZE, this.mapHeight * TILE_SIZE);
    if (previousView) {
      cam.setZoom(previousView.zoom);
      cam.scrollX = previousView.scrollX;
      cam.scrollY = previousView.scrollY;
      this.clampCameraScroll();
    } else {
      this.resetCameraView();
    }

    this.refreshViewportDecor(true);
    this.refreshStatusMeta();
  },

  resetCameraView() {
    const cam = this.cameras.main;
    const worldWidth = this.mapWidth * TILE_SIZE;
    const worldHeight = this.mapHeight * TILE_SIZE;
    const fitZoom = Math.min(cam.width / worldWidth, cam.height / worldHeight);
    this.minZoom = Phaser.Math.Clamp(fitZoom, 0.12, 1);
    this.maxZoom = Math.max(2.5, this.minZoom * 4.5);

    cam.setZoom(this.minZoom);
    cam.centerOn(worldWidth / 2, worldHeight / 2);
    this.clampCameraScroll();
  },

  drawGrid() {
    if (!this.gridGraphics) return;
    this.gridGraphics.clear();

    const cam = this.cameras.main;
    const lineWidth = Math.max(1 / cam.zoom, 0.7 / cam.zoom);
    const worldWidth = this.mapWidth * TILE_SIZE;
    const worldHeight = this.mapHeight * TILE_SIZE;

    this.gridGraphics.lineStyle(lineWidth, 0xffffff, cam.zoom >= 0.6 ? 0.12 : 0.08);
    for (let x = 0; x <= this.mapWidth; x += 1) {
      const worldX = x * TILE_SIZE;
      this.gridGraphics.lineBetween(worldX, 0, worldX, worldHeight);
    }
    for (let y = 0; y <= this.mapHeight; y += 1) {
      const worldY = y * TILE_SIZE;
      this.gridGraphics.lineBetween(0, worldY, worldWidth, worldY);
    }

    this.gridGraphics.lineStyle(lineWidth * 1.1, 0x90b9ff, 0.18);
    for (let x = 0; x <= this.mapWidth; x += 4) {
      const worldX = x * TILE_SIZE;
      this.gridGraphics.lineBetween(worldX, 0, worldX, worldHeight);
    }
    for (let y = 0; y <= this.mapHeight; y += 4) {
      const worldY = y * TILE_SIZE;
      this.gridGraphics.lineBetween(0, worldY, worldWidth, worldY);
    }

    this.gridGraphics.lineStyle(lineWidth * 1.4, 0xb8d3ff, 0.26);
    this.gridGraphics.strokeRect(0, 0, worldWidth, worldHeight);
  },

  drawHoverTile() {
    if (!this.hoverGraphics) return;
    this.hoverGraphics.clear();
    const cam = this.cameras.main;
    const lineWidth = 2 / cam.zoom;

    if (this.rectStart) {
      this.hoverGraphics.lineStyle(lineWidth, 0xf6c563, 0.95);
      this.hoverGraphics.strokeRect(
        this.rectStart.x * TILE_SIZE,
        this.rectStart.y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE
      );
    }

    if (!this.hoveredTile) {
      this.refreshHoverOverlay?.(false);
      return;
    }

    this.hoverGraphics.lineStyle(lineWidth, 0x64d2ff, 0.95);
    this.hoverGraphics.strokeRect(
      this.hoveredTile.x * TILE_SIZE,
      this.hoveredTile.y * TILE_SIZE,
      TILE_SIZE,
      TILE_SIZE
    );
    this.hoverGraphics.fillStyle(0x64d2ff, 0.12);
    this.hoverGraphics.fillRect(
      this.hoveredTile.x * TILE_SIZE,
      this.hoveredTile.y * TILE_SIZE,
      TILE_SIZE,
      TILE_SIZE
    );
    this.refreshHoverOverlay?.(false);
  },

  refreshViewportDecor(force = false) {
    const cam = this.cameras.main;
    const key = [
      cam.scrollX.toFixed(2),
      cam.scrollY.toFixed(2),
      cam.zoom.toFixed(2),
      this.hoveredTile?.x ?? '',
      this.hoveredTile?.y ?? '',
      this.rectStart?.x ?? '',
      this.rectStart?.y ?? ''
    ].join('|');

    if (!force && this.lastViewportDecorKey === key) return;
    this.lastViewportDecorKey = key;
    this.drawGrid();
    this.drawHoverTile();
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
    this.refreshViewportDecor(true);
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
    this.refreshStatusMeta();
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
