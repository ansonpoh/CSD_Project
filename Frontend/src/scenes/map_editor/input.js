import Phaser from 'phaser';
import { TILE_SIZE } from './constants.js';

export const inputMethods = {
  installInputHandlers() {
    this.input.mouse?.disableContextMenu();

    this.input.on('wheel', (pointer, _gameObjects, _deltaX, deltaY) => {
      if (this.isPointerInPalette(pointer)) {
        this.paletteScroll = Phaser.Math.Clamp(this.paletteScroll + deltaY * 0.35, 0, this.maxPaletteScroll);
        this.updatePaletteTransform();
        this.updatePaletteSelection();
        return;
      }
      this.zoomAtPointer(pointer, deltaY);
    });

    this.input.on('pointerdown', (pointer) => {
      if (this.isPointerInEditorUI(pointer)) return;
      if (pointer.rightButtonDown() || pointer.middleButtonDown()) {
        this.isPanning = true;
        this.panStart = {
          x: pointer.x,
          y: pointer.y,
          scrollX: this.cameras.main.scrollX,
          scrollY: this.cameras.main.scrollY
        };
        return;
      }
      this.isPainting = true;
      this.applyToolAtPointer(pointer, true);
    });

    this.input.on('pointermove', (pointer) => {
      if (this.isPanning && this.panStart) {
        const cam = this.cameras.main;
        const dx = (pointer.x - this.panStart.x) / cam.zoom;
        const dy = (pointer.y - this.panStart.y) / cam.zoom;
        cam.scrollX = this.panStart.scrollX - dx;
        cam.scrollY = this.panStart.scrollY - dy;
        this.clampCameraScroll();
        return;
      }
      if (this.isPainting && pointer.leftButtonDown()) {
        this.applyToolAtPointer(pointer, false);
      }
    });

    this.input.on('pointerup', () => {
      this.isPanning = false;
      this.panStart = null;
      this.isPainting = false;
    });

    this.input.keyboard.on('keydown-Z', (event) => {
      if (event.ctrlKey || event.metaKey) this.undo();
    });
    this.input.keyboard.on('keydown-Y', (event) => {
      if (event.ctrlKey || event.metaKey) this.redo();
    });
    this.input.keyboard.on('keydown-ONE', () => {
      this.activeLayer = 'ground';
      this.refreshToolbarLabel();
    });
    this.input.keyboard.on('keydown-TWO', () => {
      this.activeLayer = 'decor';
      this.refreshToolbarLabel();
    });
    this.input.keyboard.on('keydown-THREE', () => {
      this.activeLayer = 'collision';
      this.refreshToolbarLabel();
    });
    this.input.keyboard.on('keydown-EQUALS', () => {
      this.zoomAtPointer({ x: this.cameras.main.centerX, y: this.cameras.main.centerY }, -120);
    });
    this.input.keyboard.on('keydown-MINUS', () => {
      this.zoomAtPointer({ x: this.cameras.main.centerX, y: this.cameras.main.centerY }, 120);
    });
  },

  isPointerInEditorUI(pointer) {
    return (pointer.x < 380 && pointer.y > 64) || this.isPointerInPalette(pointer);
  },

  isPointerInPalette(pointer) {
    return pointer.x >= this.paletteX
      && pointer.x <= this.paletteX + this.paletteW
      && pointer.y >= this.paletteY
      && pointer.y <= this.paletteY + this.paletteH;
  },

  zoomAtPointer(pointerLike, deltaY) {
    const cam = this.cameras.main;
    const pointerX = pointerLike.x ?? cam.centerX;
    const pointerY = pointerLike.y ?? cam.centerY;
    const worldBefore = cam.getWorldPoint(pointerX, pointerY);
    const nextZoom = Phaser.Math.Clamp(cam.zoom - deltaY * 0.0012, 0.5, 2.2);
    cam.setZoom(nextZoom);
    const worldAfter = cam.getWorldPoint(pointerX, pointerY);
    cam.scrollX += worldBefore.x - worldAfter.x;
    cam.scrollY += worldBefore.y - worldAfter.y;
    this.clampCameraScroll();
  },

  clampCameraScroll() {
    const cam = this.cameras.main;
    const maxX = Math.max(0, this.mapWidth * TILE_SIZE - (cam.width / cam.zoom));
    const maxY = Math.max(0, this.mapHeight * TILE_SIZE - (cam.height / cam.zoom));
    cam.scrollX = Phaser.Math.Clamp(cam.scrollX, 0, maxX);
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, maxY);
  },

  applyToolAtPointer(pointer, isFirstPress) {
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(world.x / TILE_SIZE);
    const tileY = Math.floor(world.y / TILE_SIZE);
    if (tileX < 0 || tileY < 0 || tileX >= this.mapWidth || tileY >= this.mapHeight) return;

    if (this.activeTool === 'rect') {
      if (isFirstPress && this.rectStart == null) {
        this.rectStart = { x: tileX, y: tileY };
        this.setStatus(`Rect start: (${tileX}, ${tileY}). Click second point.`);
        return;
      }
      if (this.rectStart) {
        this.applyRect(this.rectStart, { x: tileX, y: tileY });
        this.rectStart = null;
        this.refreshLayerRender(this.activeLayer);
        this.pushHistory('rect');
      }
      return;
    }

    if (this.activeTool === 'fill' && isFirstPress) {
      this.applyFill(tileX, tileY);
      this.refreshLayerRender(this.activeLayer);
      this.pushHistory('fill');
      return;
    }

    if (this.activeTool === 'npc_spawn' || this.activeTool === 'monster_spawn') {
      if (!isFirstPress) return;
      this.toggleMarker(this.activeTool === 'npc_spawn' ? 'npcs' : 'monsters', tileX, tileY);
      this.refreshMarkerGraphics();
      this.pushHistory('marker');
      return;
    }

    const value = this.activeTool === 'erase' ? -1 : this.selectedTile;
    const layer = this.mapLayers[this.activeLayer];
    if (layer[tileY][tileX] !== value) {
      layer[tileY][tileX] = value;
      const tileLayer = this.layerObjs[this.layerNames.indexOf(this.activeLayer)];
      tileLayer.putTileAt(value, tileX, tileY);
      if (this.activeLayer === 'collision') tileLayer.setCollisionByExclusion([-1], true);
      if (isFirstPress) this.pushHistory('paint');
    }
  }
};
