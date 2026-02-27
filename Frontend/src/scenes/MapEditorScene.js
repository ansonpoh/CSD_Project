import Phaser from 'phaser';
import { apiService } from '../services/api.js';

const TILE_SIZE = 32;
const MAX_HISTORY = 80;
const DEFAULT_TILESET = 'terrain_tiles_v2.1';
const PALETTE_CELL = 44;
const PALETTE_TILE = 40;
const PALETTE_COLUMNS = 7;
const TILESETS = [
  'terrain_tiles_v2.1',
  'stone_tiles_v2.1',
  'tiles-all-32x32',
  'assets-all',
  'water_and_island_tiles_v2.1',
  'fence_tiles',
  '1_Terrains_and_Fences_32x32',
  '7_Villas_32x32',
  '17_Garden_32x32'
];

export class MapEditorScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapEditorScene' });
    this.layerNames = ['ground', 'decor', 'collision'];
    this.activeLayer = 'ground';
    this.activeTool = 'paint';
    this.selectedTile = 0;
    this.history = [];
    this.historyIndex = -1;
    this.markers = { npcs: [], monsters: [] };
    this.isPanning = false;
    this.isPainting = false;
    this.rectStart = null;
    this.currentDraftId = null;
    this.uiModal = null;
    this.editorFormEl = null;
    this.statusText = null;
    this.currentTilesetInfo = null;
  }

  create() {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor(0x101827);
    this.add.rectangle(width / 2, height / 2, width, height, 0x101827);

    this.mapWidth = 80;
    this.mapHeight = 45;
    this.paletteScroll = 0;
    this.maxPaletteScroll = 0;
    this.tilesetKey = DEFAULT_TILESET;
    this.mapLayers = {
      ground: this.createEmptyLayer(this.mapWidth, this.mapHeight),
      decor: this.createEmptyLayer(this.mapWidth, this.mapHeight),
      collision: this.createEmptyLayer(this.mapWidth, this.mapHeight)
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

  createEmptyLayer(width, height) {
    return Array.from({ length: height }, () => Array.from({ length: width }, () => -1));
  }

  cloneState() {
    return {
      draftId: this.currentDraftId,
      tilesetKey: this.tilesetKey,
      activeLayer: this.activeLayer,
      selectedTile: this.selectedTile,
      mapLayers: {
        ground: this.mapLayers.ground.map((r) => [...r]),
        decor: this.mapLayers.decor.map((r) => [...r]),
        collision: this.mapLayers.collision.map((r) => [...r])
      },
      markers: {
        npcs: this.markers.npcs.map((m) => ({ ...m })),
        monsters: this.markers.monsters.map((m) => ({ ...m }))
      }
    };
  }

  restoreState(state) {
    this.currentDraftId = state.draftId || null;
    this.tilesetKey = state.tilesetKey || DEFAULT_TILESET;
    this.activeLayer = state.activeLayer || 'ground';
    this.selectedTile = Number.isInteger(state.selectedTile) ? state.selectedTile : 0;
    this.mapLayers = {
      ground: state.mapLayers.ground.map((r) => [...r]),
      decor: state.mapLayers.decor.map((r) => [...r]),
      collision: state.mapLayers.collision.map((r) => [...r])
    };
    this.markers = {
      npcs: state.markers.npcs.map((m) => ({ ...m })),
      monsters: state.markers.monsters.map((m) => ({ ...m }))
    };
    this.buildTilemap();
    this.refreshMarkerGraphics();
    this.refreshToolbarLabel();
    this.setStatus(`Restored snapshot (${this.historyIndex + 1}/${this.history.length})`);
  }

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
  }

  undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex -= 1;
    this.restoreState(this.history[this.historyIndex]);
  }

  redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex += 1;
    this.restoreState(this.history[this.historyIndex]);
  }

  buildTilemap() {
    if (this.map) {
      this.map.destroy();
    }
    this.layerObjs?.forEach((l) => l?.destroy());
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

      const src = this.mapLayers[name];
      for (let y = 0; y < this.mapHeight; y += 1) {
        for (let x = 0; x < this.mapWidth; x += 1) {
          layer.putTileAt(src[y][x], x, y);
        }
      }
      if (name === 'collision') layer.setCollisionByExclusion([-1], true);
    });

    this.markerGraphics = this.add.graphics().setDepth(8);
    this.gridGraphics = this.add.graphics().setDepth(9);
    this.drawGrid();
    this.refreshMarkerGraphics();

    this.cameras.main.setBounds(0, 0, this.mapWidth * TILE_SIZE, this.mapHeight * TILE_SIZE);
  }

  drawGrid() {
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, 0xffffff, 0.12);
    const worldW = this.mapWidth * TILE_SIZE;
    const worldH = this.mapHeight * TILE_SIZE;
    for (let x = 0; x <= worldW; x += TILE_SIZE) this.gridGraphics.lineBetween(x, 0, x, worldH);
    for (let y = 0; y <= worldH; y += TILE_SIZE) this.gridGraphics.lineBetween(0, y, worldW, y);
  }

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
  }

  createToolbar() {
    const { width } = this.cameras.main;
    const bar = this.add.rectangle(width / 2, 30, width - 22, 52, 0x0b1320, 0.88).setScrollFactor(0).setDepth(100);
    bar.setStrokeStyle(2, 0x33527a, 1);

    const tools = [
      ['paint', 'Paint'],
      ['erase', 'Erase'],
      ['fill', 'Fill'],
      ['rect', 'Rect'],
      ['npc_spawn', 'NPC'],
      ['monster_spawn', 'Monster']
    ];

    this.toolButtons = [];
    tools.forEach(([id, label], index) => {
      const x = 78 + index * 92;
      const btn = this.add.rectangle(x, 30, 84, 30, 0x1f344f, 1)
        .setScrollFactor(0)
        .setDepth(101)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(x, 30, label, { fontSize: '12px', color: '#dfeeff' })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(102);
      btn.on('pointerdown', () => {
        this.activeTool = id;
        this.rectStart = null;
        this.refreshToolbarLabel();
      });
      this.toolButtons.push({ id, btn, txt });
    });

    this.add.text(700, 30, 'Layers', {
      fontSize: '12px',
      color: '#9ec1e7'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(102);

    this.layerButtons = this.layerNames.map((layer, index) => {
      const x = 790 + index * 102;
      const btn = this.add.rectangle(x, 30, 96, 30, 0x1b2f4a, 1)
        .setScrollFactor(0).setDepth(101).setInteractive({ useHandCursor: true });
      const txt = this.add.text(x, 30, layer.toUpperCase(), { fontSize: '11px', color: '#d8e9ff' })
        .setOrigin(0.5).setScrollFactor(0).setDepth(102);
      btn.on('pointerdown', () => {
        this.activeLayer = layer;
        this.refreshToolbarLabel();
      });
      return { layer, btn, txt };
    });

    this.undoBtn = this.add.rectangle(1130, 30, 64, 30, 0x1f344f, 1)
      .setScrollFactor(0).setDepth(101).setInteractive({ useHandCursor: true });
    this.add.text(1130, 30, 'Undo', { fontSize: '12px', color: '#dfeeff' }).setOrigin(0.5).setScrollFactor(0).setDepth(102);
    this.undoBtn.on('pointerdown', () => this.undo());

    this.redoBtn = this.add.rectangle(1204, 30, 64, 30, 0x1f344f, 1)
      .setScrollFactor(0).setDepth(101).setInteractive({ useHandCursor: true });
    this.add.text(1204, 30, 'Redo', { fontSize: '12px', color: '#dfeeff' }).setOrigin(0.5).setScrollFactor(0).setDepth(102);
    this.redoBtn.on('pointerdown', () => this.redo());

    this.refreshToolbarLabel();
  }

  refreshToolbarLabel() {
    this.toolButtons?.forEach(({ id, btn }) => {
      btn.setFillStyle(this.activeTool === id ? 0x2a7fb5 : 0x1f344f, 1);
    });
    this.layerButtons?.forEach(({ layer, btn }) => {
      btn.setFillStyle(this.activeLayer === layer ? 0x2d5b90 : 0x1b2f4a, 1);
    });
  }

  createPalettePanel() {
    const { width } = this.cameras.main;
    this.paletteX = width - 370;
    this.paletteY = 70;
    this.paletteW = 360;
    this.paletteH = 820;

    const panel = this.add.rectangle(this.paletteX + this.paletteW / 2, this.paletteY + this.paletteH / 2, this.paletteW, this.paletteH, 0x0c1628, 0.95)
      .setScrollFactor(0).setDepth(120);
    panel.setStrokeStyle(2, 0x35567f, 1);

    this.add.text(this.paletteX + 12, this.paletteY + 10, 'Tile Palette', {
      fontSize: '16px',
      color: '#e3efff'
    }).setScrollFactor(0).setDepth(121);

    this.tilesetLabel = this.add.text(this.paletteX + 12, this.paletteY + 34, `Tileset: ${this.tilesetKey}`, {
      fontSize: '11px', color: '#a7c5e9'
    }).setScrollFactor(0).setDepth(121);

    const prevBtn = this.add.rectangle(this.paletteX + this.paletteW - 62, this.paletteY + 34, 28, 20, 0x1f344f, 1)
      .setScrollFactor(0).setDepth(121).setInteractive({ useHandCursor: true });
    this.add.text(prevBtn.x, prevBtn.y, '<', { fontSize: '14px', color: '#e7f2ff' }).setOrigin(0.5).setScrollFactor(0).setDepth(122);
    prevBtn.on('pointerdown', () => this.switchTileset(-1));

    const nextBtn = this.add.rectangle(this.paletteX + this.paletteW - 28, this.paletteY + 34, 28, 20, 0x1f344f, 1)
      .setScrollFactor(0).setDepth(121).setInteractive({ useHandCursor: true });
    this.add.text(nextBtn.x, nextBtn.y, '>', { fontSize: '14px', color: '#e7f2ff' }).setOrigin(0.5).setScrollFactor(0).setDepth(122);
    nextBtn.on('pointerdown', () => this.switchTileset(1));

    this.add.rectangle(this.paletteX + 64, this.paletteY + 108, 106, 106, 0x07111f, 1)
      .setScrollFactor(0).setDepth(121).setStrokeStyle(1, 0x365a83, 1);
    this.selectedPreview = this.add.image(this.paletteX + 64, this.paletteY + 108, this.tilesetKey)
      .setDisplaySize(110, 110)
      .setScrollFactor(0)
      .setDepth(122);
    this.selectedTileText = this.add.text(this.paletteX + 122, this.paletteY + 86, 'Tile #0', {
      fontSize: '12px',
      color: '#e2efff'
    }).setScrollFactor(0).setDepth(122);
    this.paletteHint = this.add.text(this.paletteX + 122, this.paletteY + 106, 'Wheel here: scroll palette', {
      fontSize: '11px',
      color: '#9fc0e3'
    }).setScrollFactor(0).setDepth(122);

    this.paletteViewportY = this.paletteY + 168;
    this.paletteViewportH = this.paletteH - 178;
    this.paletteClip = this.add.rectangle(
      this.paletteX + this.paletteW / 2,
      this.paletteViewportY + this.paletteViewportH / 2,
      this.paletteW - 12,
      this.paletteViewportH,
      0x000000,
      0
    ).setScrollFactor(0).setDepth(120);

    this.paletteContainer = this.add.container(0, 0).setDepth(122);
    this.paletteContainer.setScrollFactor(0);
    this.paletteMask = this.paletteClip.createGeometryMask();
    this.paletteContainer.setMask(this.paletteMask);

    this.paletteSelection = this.add.rectangle(0, 0, PALETTE_TILE + 4, PALETTE_TILE + 4)
      .setStrokeStyle(2, 0xf59e0b)
      .setScrollFactor(0)
      .setDepth(124);
    this.rebuildPaletteTiles();
  }

  switchTileset(delta) {
    const currentIndex = TILESETS.indexOf(this.tilesetKey);
    const nextIndex = (currentIndex + delta + TILESETS.length) % TILESETS.length;
    this.tilesetKey = TILESETS[nextIndex];
    this.tilesetLabel.setText(`Tileset: ${this.tilesetKey}`);
    this.buildTilemap();
    this.rebuildPaletteTiles();
    this.pushHistory('tileset');
  }

  rebuildPaletteTiles() {
    this.paletteContainer.removeAll(true);
    const info = this.getTilesetInfo(this.tilesetKey);
    const source = info?.source;
    if (!source) {
      this.setStatus(`Missing tileset texture: ${this.tilesetKey}`);
      return;
    }

    const entries = info.entries;
    const padX = this.paletteX + 12;
    const padY = this.paletteViewportY + 8;

    this.paletteButtons = [];
    for (let slot = 0; slot < entries.length; slot += 1) {
      const tileIndex = entries[slot];
      const col = slot % PALETTE_COLUMNS;
      const row = Math.floor(slot / PALETTE_COLUMNS);
      const x = padX + col * PALETTE_CELL;
      const y = padY + row * PALETTE_CELL;

      const img = this.add.image(x, y, this.tilesetKey, info.frameName(tileIndex))
        .setOrigin(0, 0)
        .setDisplaySize(PALETTE_TILE, PALETTE_TILE)
        .setScrollFactor(0)
        .setDepth(123)
        .setInteractive({ useHandCursor: true });

      img.on('pointerdown', () => {
        this.selectedTile = tileIndex;
        this.updatePaletteSelection();
      });
      this.paletteContainer.add(img);
      this.paletteButtons.push({ tileIndex, x, y });
    }
    if (!entries.includes(this.selectedTile)) {
      this.selectedTile = entries[0] ?? 0;
    }

    const totalRows = Math.ceil(entries.length / PALETTE_COLUMNS);
    const contentHeight = totalRows * PALETTE_CELL + 8;
    this.maxPaletteScroll = Math.max(0, contentHeight - this.paletteViewportH);
    this.paletteScroll = Phaser.Math.Clamp(this.paletteScroll, 0, this.maxPaletteScroll);
    this.updatePaletteTransform();
    this.updatePaletteSelection();
  }

  updatePaletteSelection() {
    const found = this.paletteButtons?.find((b) => b.tileIndex === this.selectedTile);
    this.paletteSelection.setVisible(Boolean(found));
    if (found) {
      this.paletteSelection.setPosition(
        found.x + (PALETTE_TILE / 2),
        found.y + (PALETTE_TILE / 2) - this.paletteScroll
      );
    }
    this.selectedTileText.setText(`Tile #${this.selectedTile}`);
    this.renderSelectedPreview();
  }

  updatePaletteTransform() {
    if (this.paletteContainer) {
      this.paletteContainer.y = -this.paletteScroll;
    }
  }

  createEditorForm() {
    const form = document.createElement('div');
    form.style.position = 'absolute';
    form.style.left = '16px';
    form.style.top = '84px';
    form.style.width = '340px';
    form.style.padding = '12px';
    form.style.background = 'rgba(7, 18, 35, 0.95)';
    form.style.border = '1px solid #36547c';
    form.style.borderRadius = '8px';
    form.style.zIndex = '1000';
    form.innerHTML = `
      <div style="color:#e5f0ff;font-weight:700;margin-bottom:8px;">Map Editor</div>
      <input id="me-name" placeholder="Map Name" style="width:100%;margin-bottom:6px;padding:8px;background:#0f203a;border:1px solid #35557f;color:#e5f0ff;border-radius:4px;" />
      <input id="me-bio" placeholder="Biome (e.g. forest)" style="width:100%;margin-bottom:6px;padding:8px;background:#0f203a;border:1px solid #35557f;color:#e5f0ff;border-radius:4px;" />
      <input id="me-diff" placeholder="Difficulty (easy/med/hard)" style="width:100%;margin-bottom:6px;padding:8px;background:#0f203a;border:1px solid #35557f;color:#e5f0ff;border-radius:4px;" />
      <textarea id="me-desc" rows="3" placeholder="Description" style="width:100%;margin-bottom:8px;padding:8px;background:#0f203a;border:1px solid #35557f;color:#e5f0ff;border-radius:4px;resize:vertical;"></textarea>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button id="me-save" style="flex:1;min-width:98px;padding:8px 10px;background:#14532d;color:#eaffef;border:1px solid #3d8f63;border-radius:4px;cursor:pointer;">Save Draft</button>
        <button id="me-load" style="flex:1;min-width:98px;padding:8px 10px;background:#1e3a8a;color:#e9f1ff;border:1px solid #4f6ec2;border-radius:4px;cursor:pointer;">Load Draft</button>
        <button id="me-publish" style="flex:1;min-width:98px;padding:8px 10px;background:#7c2d12;color:#fff1e9;border:1px solid #bd6f54;border-radius:4px;cursor:pointer;">Publish</button>
        <button id="me-play" style="flex:1;min-width:98px;padding:8px 10px;background:#2d3748;color:#edf2ff;border:1px solid #66758f;border-radius:4px;cursor:pointer;">Play-test</button>
        <button id="me-back" style="flex:1;min-width:98px;padding:8px 10px;background:#4b1d1d;color:#ffe8e8;border:1px solid #9d6666;border-radius:4px;cursor:pointer;">Back</button>
      </div>
    `;
    document.body.appendChild(form);
    this.editorFormEl = form;

    const on = (id, fn) => form.querySelector(id)?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fn();
    });

    on('#me-save', () => this.saveDraft());
    on('#me-load', () => this.openLoadDraftModal());
    on('#me-publish', () => this.publishDraft());
    on('#me-play', () => this.playTest());
    on('#me-back', () => this.scene.start('ContributorScene'));
  }

  createStatusLine() {
    this.statusText = this.add.text(16, this.cameras.main.height - 24,
      'LMB draw | RMB/Middle drag camera | Wheel zoom | Z/Y undo/redo | 1/2/3 layer',
      { fontSize: '12px', color: '#b7cde8' })
      .setScrollFactor(0).setDepth(200);
  }

  setStatus(message) {
    if (this.statusText) this.statusText.setText(message);
  }

  installInputHandlers() {
    this.input.mouse?.disableContextMenu();

    this.input.on('wheel', (pointer, _go, _dx, dy) => {
      if (this.isPointerInPalette(pointer)) {
        this.paletteScroll = Phaser.Math.Clamp(this.paletteScroll + dy * 0.35, 0, this.maxPaletteScroll);
        this.updatePaletteTransform();
        this.updatePaletteSelection();
        return;
      }
      this.zoomAtPointer(pointer, dy);
    });

    this.input.on('pointerdown', (pointer) => {
      if (this.isPointerInEditorUI(pointer)) return;
      if (pointer.rightButtonDown() || pointer.middleButtonDown()) {
        this.isPanning = true;
        this.panStart = { x: pointer.x, y: pointer.y, scrollX: this.cameras.main.scrollX, scrollY: this.cameras.main.scrollY };
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

    this.input.keyboard.on('keydown-Z', (e) => { if (e.ctrlKey || e.metaKey) this.undo(); });
    this.input.keyboard.on('keydown-Y', (e) => { if (e.ctrlKey || e.metaKey) this.redo(); });
    this.input.keyboard.on('keydown-ONE', () => { this.activeLayer = 'ground'; this.refreshToolbarLabel(); });
    this.input.keyboard.on('keydown-TWO', () => { this.activeLayer = 'decor'; this.refreshToolbarLabel(); });
    this.input.keyboard.on('keydown-THREE', () => { this.activeLayer = 'collision'; this.refreshToolbarLabel(); });
    this.input.keyboard.on('keydown-EQUALS', () => this.zoomAtPointer({ x: this.cameras.main.centerX, y: this.cameras.main.centerY }, -120));
    this.input.keyboard.on('keydown-MINUS', () => this.zoomAtPointer({ x: this.cameras.main.centerX, y: this.cameras.main.centerY }, 120));
  }

  isPointerInEditorUI(pointer) {
    return (pointer.x < 380 && pointer.y > 64) || this.isPointerInPalette(pointer);
  }

  isPointerInPalette(pointer) {
    return pointer.x >= this.paletteX
      && pointer.x <= this.paletteX + this.paletteW
      && pointer.y >= this.paletteY
      && pointer.y <= this.paletteY + this.paletteH;
  }

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
  }

  clampCameraScroll() {
    const cam = this.cameras.main;
    const maxX = Math.max(0, this.mapWidth * TILE_SIZE - (cam.width / cam.zoom));
    const maxY = Math.max(0, this.mapHeight * TILE_SIZE - (cam.height / cam.zoom));
    cam.scrollX = Phaser.Math.Clamp(cam.scrollX, 0, maxX);
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, maxY);
  }

  applyToolAtPointer(pointer, isFirstPress) {
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tx = Math.floor(world.x / TILE_SIZE);
    const ty = Math.floor(world.y / TILE_SIZE);
    if (tx < 0 || ty < 0 || tx >= this.mapWidth || ty >= this.mapHeight) return;

    if (this.activeTool === 'rect') {
      if (isFirstPress && this.rectStart == null) {
        this.rectStart = { x: tx, y: ty };
        this.setStatus(`Rect start: (${tx}, ${ty}). Click second point.`);
        return;
      }
      if (this.rectStart) {
        this.applyRect(this.rectStart, { x: tx, y: ty });
        this.rectStart = null;
        this.refreshLayerRender(this.activeLayer);
        this.pushHistory('rect');
      }
      return;
    }

    if (this.activeTool === 'fill' && isFirstPress) {
      this.applyFill(tx, ty);
      this.refreshLayerRender(this.activeLayer);
      this.pushHistory('fill');
      return;
    }

    if (this.activeTool === 'npc_spawn' || this.activeTool === 'monster_spawn') {
      if (!isFirstPress) return;
      this.toggleMarker(this.activeTool === 'npc_spawn' ? 'npcs' : 'monsters', tx, ty);
      this.refreshMarkerGraphics();
      this.pushHistory('marker');
      return;
    }

    const value = this.activeTool === 'erase' ? -1 : this.selectedTile;
    const layer = this.mapLayers[this.activeLayer];
    if (layer[ty][tx] !== value) {
      layer[ty][tx] = value;
      const l = this.layerObjs[this.layerNames.indexOf(this.activeLayer)];
      l.putTileAt(value, tx, ty);
      if (this.activeLayer === 'collision') l.setCollisionByExclusion([-1], true);
      if (isFirstPress) this.pushHistory('paint');
    }
  }

  applyRect(a, b) {
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    const value = this.activeTool === 'erase' ? -1 : this.selectedTile;
    const layer = this.mapLayers[this.activeLayer];
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) layer[y][x] = value;
    }
  }

  applyFill(startX, startY) {
    const layer = this.mapLayers[this.activeLayer];
    const target = layer[startY][startX];
    const replacement = this.activeTool === 'erase' ? -1 : this.selectedTile;
    if (target === replacement) return;

    const q = [[startX, startY]];
    const seen = new Set();
    while (q.length) {
      const [x, y] = q.shift();
      const key = `${x},${y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (x < 0 || y < 0 || x >= this.mapWidth || y >= this.mapHeight) continue;
      if (layer[y][x] !== target) continue;
      layer[y][x] = replacement;
      q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }

  refreshLayerRender(layerName) {
    const layer = this.layerObjs[this.layerNames.indexOf(layerName)];
    const src = this.mapLayers[layerName];
    for (let y = 0; y < this.mapHeight; y += 1) {
      for (let x = 0; x < this.mapWidth; x += 1) {
        layer.putTileAt(src[y][x], x, y);
      }
    }
    if (layerName === 'collision') layer.setCollisionByExclusion([-1], true);
  }

  toggleMarker(type, x, y) {
    const arr = this.markers[type];
    const idx = arr.findIndex((m) => m.x === x && m.y === y);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push({ x, y });
  }

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

  getFormValue(selector) {
    return this.editorFormEl?.querySelector(selector)?.value?.trim() || '';
  }

  setFormValue(selector, value) {
    const el = this.editorFormEl?.querySelector(selector);
    if (el) el.value = value || '';
  }

  async saveDraft() {
    try {
      const payload = {
        draftId: this.currentDraftId,
        name: this.getFormValue('#me-name') || 'Untitled Draft',
        description: this.getFormValue('#me-desc'),
        biome: this.getFormValue('#me-bio'),
        difficulty: this.getFormValue('#me-diff'),
        mapData: this.buildRuntimePayload()
      };
      const saved = await apiService.saveMapDraft(payload);
      this.currentDraftId = saved?.draftId || this.currentDraftId;
      this.setStatus(`Draft saved: ${this.currentDraftId}`);
      this.pushHistory('save');
    } catch (e) {
      this.setStatus(`Save failed: ${e?.response?.data?.message || e?.message || 'unknown error'}`);
    }
  }

  async openLoadDraftModal() {
    if (this.uiModal) return;
    try {
      const rows = await apiService.getMyMapDrafts();
      const modal = document.createElement('div');
      modal.style.position = 'absolute';
      modal.style.left = '50%';
      modal.style.top = '50%';
      modal.style.transform = 'translate(-50%, -50%)';
      modal.style.width = '520px';
      modal.style.maxHeight = '70vh';
      modal.style.overflowY = 'auto';
      modal.style.padding = '14px';
      modal.style.background = 'rgba(8,18,34,0.98)';
      modal.style.border = '1px solid #436795';
      modal.style.borderRadius = '8px';
      modal.style.zIndex = '1001';

      const list = (rows || []).map((r) => `
        <button data-draft-id="${r.draftId}" style="width:100%;text-align:left;padding:10px;margin-bottom:8px;background:#122743;border:1px solid #35567f;color:#e7f2ff;border-radius:6px;cursor:pointer;">
          <div style="font-weight:700;">${this.escapeHtml(r.name || 'Untitled')}</div>
          <div style="font-size:12px;color:#a8c5e8;">${this.escapeHtml(r.description || '')}</div>
          <div style="font-size:11px;color:#8fb1d8;">Updated: ${this.escapeHtml(String(r.updatedAt || 'unknown'))}</div>
        </button>
      `).join('');

      modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="color:#e7f2ff;font-weight:700;">Load Draft</div>
          <button id="me-close-load" style="padding:6px 10px;background:#3f1a1a;border:1px solid #8f5e5e;color:#ffecec;border-radius:4px;cursor:pointer;">Close</button>
        </div>
        ${list || '<div style="color:#c4d9f2;">No drafts yet.</div>'}
      `;

      document.body.appendChild(modal);
      this.uiModal = modal;

      modal.querySelector('#me-close-load')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.closeLoadDraftModal();
      });

      modal.querySelectorAll('[data-draft-id]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const draftId = btn.getAttribute('data-draft-id');
          await this.loadDraftById(draftId);
          this.closeLoadDraftModal();
        });
      });
    } catch (e) {
      this.setStatus(`Failed to load drafts: ${e?.response?.data?.message || e?.message || 'unknown error'}`);
    }
  }

  closeLoadDraftModal() {
    if (this.uiModal?.parentNode) this.uiModal.parentNode.removeChild(this.uiModal);
    this.uiModal = null;
  }

  async loadDraftById(draftId) {
    try {
      const row = await apiService.getMapDraft(draftId);
      const mapData = row?.mapData;
      if (!mapData?.layers) throw new Error('Draft payload missing layers');

      this.currentDraftId = row.draftId;
      this.tilesetKey = mapData.tilesetKey || DEFAULT_TILESET;
      this.mapWidth = mapData.width || 80;
      this.mapHeight = mapData.height || 45;
      this.mapLayers = {
        ground: mapData.layers.ground || this.createEmptyLayer(this.mapWidth, this.mapHeight),
        decor: mapData.layers.decor || this.createEmptyLayer(this.mapWidth, this.mapHeight),
        collision: mapData.layers.collision || this.createEmptyLayer(this.mapWidth, this.mapHeight)
      };
      this.markers = {
        npcs: mapData.spawns?.npcs || [],
        monsters: mapData.spawns?.monsters || []
      };
      this.buildTilemap();
      this.rebuildPaletteTiles();
      this.refreshToolbarLabel();
      this.setFormValue('#me-name', row.name || '');
      this.setFormValue('#me-desc', row.description || '');
      this.setFormValue('#me-bio', row.biome || '');
      this.setFormValue('#me-diff', row.difficulty || '');
      this.setStatus(`Loaded draft: ${row.name || row.draftId}`);
      this.pushHistory('load');
    } catch (e) {
      this.setStatus(`Load failed: ${e?.response?.data?.message || e?.message || 'unknown error'}`);
    }
  }

  async publishDraft() {
    if (!this.currentDraftId) {
      this.setStatus('Save draft first before publishing.');
      return;
    }
    try {
      const published = await apiService.publishMapDraft(this.currentDraftId, {
        name: this.getFormValue('#me-name') || 'Contributor Map',
        description: this.getFormValue('#me-desc')
      });
      this.setStatus(`Published map: ${published?.mapId || published?.id || 'success'}`);
    } catch (e) {
      this.setStatus(`Publish failed: ${e?.response?.data?.message || e?.message || 'unknown error'}`);
    }
  }

  playTest() {
    const runtime = this.buildRuntimePayload();
    this.scene.start('GameMapScene', {
      mapConfig: {
        name: this.getFormValue('#me-name') || 'Playtest Map',
        editorMapData: runtime
      }
    });
  }

  cleanupDom() {
    if (this.uiModal?.parentNode) this.uiModal.parentNode.removeChild(this.uiModal);
    this.uiModal = null;
    if (this.editorFormEl?.parentNode) this.editorFormEl.parentNode.removeChild(this.editorFormEl);
    this.editorFormEl = null;
    this.paletteMask = null;
  }

  getTilesetInfo(tilesetKey) {
    const tex = this.textures.get(tilesetKey);
    const source = tex?.getSourceImage?.();
    if (!source) return null;

    const tilePx = TILE_SIZE;
    const cols = Math.max(1, Math.floor(source.width / tilePx));
    const rows = Math.max(1, Math.floor(source.height / tilePx));
    const maxTiles = cols * rows;
    const framePrefix = `${tilesetKey}__tile_`;

    for (let i = 0; i < maxTiles; i += 1) {
      const frame = `${framePrefix}${i}`;
      if (!tex.has(frame)) {
        const x = (i % cols) * tilePx;
        const y = Math.floor(i / cols) * tilePx;
        tex.add(frame, 0, x, y, tilePx, tilePx);
      }
    }

    const entries = this.buildVisibleEntries(source, cols, rows, tilePx);
    const info = {
      source,
      tilePx,
      cols,
      rows,
      maxTiles,
      entries,
      frameName: (tileIndex) => `${framePrefix}${Phaser.Math.Clamp(tileIndex, 0, maxTiles - 1)}`
    };
    this.currentTilesetInfo = info;
    return info;
  }

  renderSelectedPreview() {
    const frameName = this.currentTilesetInfo?.frameName(this.selectedTile);
    if (!this.selectedPreview || !frameName) return;

    this.selectedPreview.setTexture(this.tilesetKey);
    this.selectedPreview.setFrame(frameName);
    this.selectedPreview.setCrop();
    this.selectedPreview.setOrigin(0.5, 0.5);
    this.selectedPreview.setDisplaySize(110, 110);
  }

  buildVisibleEntries(source, cols, rows, tilePx) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = source.width;
      canvas.height = source.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return Array.from({ length: cols * rows }, (_, i) => i);
      ctx.drawImage(source, 0, 0);

      const visible = [];
      const sampleOffsets = [4, 12, 20, 28];
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const tileIndex = row * cols + col;
          let alphaHits = 0;
          for (let sy = 0; sy < sampleOffsets.length; sy += 1) {
            for (let sx = 0; sx < sampleOffsets.length; sx += 1) {
              const px = col * tilePx + sampleOffsets[sx];
              const py = row * tilePx + sampleOffsets[sy];
              if (px >= source.width || py >= source.height) continue;
              const alpha = ctx.getImageData(px, py, 1, 1).data[3];
              if (alpha > 8) alphaHits += 1;
            }
          }
          if (alphaHits > 0) visible.push(tileIndex);
        }
      }
      return visible.length > 0 ? visible : Array.from({ length: cols * rows }, (_, i) => i);
    } catch {
      return Array.from({ length: cols * rows }, (_, i) => i);
    }
  }

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
