import Phaser from 'phaser';
import {
  PALETTE_CELL,
  PALETTE_COLUMNS,
  PALETTE_TILE,
  TILESETS
} from './constants.js';

export const paletteMethods = {
  createPalettePanel() {
    const { width } = this.cameras.main;
    this.paletteX = width - 370;
    this.paletteY = 70;
    this.paletteW = 360;
    this.paletteH = 820;

    const panel = this.add.rectangle(
      this.paletteX + this.paletteW / 2,
      this.paletteY + this.paletteH / 2,
      this.paletteW,
      this.paletteH,
      0x0c1628,
      0.95
    ).setScrollFactor(0).setDepth(120);
    panel.setStrokeStyle(2, 0x35567f, 1);

    this.add.text(this.paletteX + 12, this.paletteY + 10, 'Tile Palette', {
      fontSize: '16px',
      color: '#e3efff'
    }).setScrollFactor(0).setDepth(121);

    this.tilesetLabel = this.add.text(this.paletteX + 12, this.paletteY + 34, `Tileset: ${this.tilesetKey}`, {
      fontSize: '11px',
      color: '#a7c5e9'
    }).setScrollFactor(0).setDepth(121);

    const prevBtn = this.add.rectangle(this.paletteX + this.paletteW - 62, this.paletteY + 34, 28, 20, 0x1f344f, 1)
      .setScrollFactor(0)
      .setDepth(121)
      .setInteractive({ useHandCursor: true });
    this.add.text(prevBtn.x, prevBtn.y, '<', { fontSize: '14px', color: '#e7f2ff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(122);
    prevBtn.on('pointerdown', () => this.switchTileset(-1));

    const nextBtn = this.add.rectangle(this.paletteX + this.paletteW - 28, this.paletteY + 34, 28, 20, 0x1f344f, 1)
      .setScrollFactor(0)
      .setDepth(121)
      .setInteractive({ useHandCursor: true });
    this.add.text(nextBtn.x, nextBtn.y, '>', { fontSize: '14px', color: '#e7f2ff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(122);
    nextBtn.on('pointerdown', () => this.switchTileset(1));

    this.add.rectangle(this.paletteX + 64, this.paletteY + 108, 106, 106, 0x07111f, 1)
      .setScrollFactor(0)
      .setDepth(121)
      .setStrokeStyle(1, 0x365a83, 1);
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
  },

  switchTileset(delta) {
    const currentIndex = TILESETS.indexOf(this.tilesetKey);
    const nextIndex = (currentIndex + delta + TILESETS.length) % TILESETS.length;
    this.tilesetKey = TILESETS[nextIndex];
    this.tilesetLabel.setText(`Tileset: ${this.tilesetKey}`);
    this.buildTilemap();
    this.rebuildPaletteTiles();
    this.pushHistory('tileset');
  },

  rebuildPaletteTiles() {
    this.paletteContainer.removeAll(true);
    const info = this.getTilesetInfo(this.tilesetKey);
    const source = info?.source;
    if (!source) {
      this.setStatus(`Missing tileset texture: ${this.tilesetKey}`);
      return;
    }

    const padX = this.paletteX + 12;
    const padY = this.paletteViewportY + 8;
    this.paletteButtons = [];

    for (let slot = 0; slot < info.entries.length; slot += 1) {
      const tileIndex = info.entries[slot];
      const col = slot % PALETTE_COLUMNS;
      const row = Math.floor(slot / PALETTE_COLUMNS);
      const x = padX + col * PALETTE_CELL;
      const y = padY + row * PALETTE_CELL;

      const image = this.add.image(x, y, this.tilesetKey, info.frameName(tileIndex))
        .setOrigin(0, 0)
        .setDisplaySize(PALETTE_TILE, PALETTE_TILE)
        .setScrollFactor(0)
        .setDepth(123)
        .setInteractive({ useHandCursor: true });

      image.on('pointerdown', () => {
        this.selectedTile = tileIndex;
        this.updatePaletteSelection();
      });
      this.paletteContainer.add(image);
      this.paletteButtons.push({ tileIndex, x, y });
    }

    if (!info.entries.includes(this.selectedTile)) {
      this.selectedTile = info.entries[0] ?? 0;
    }

    const totalRows = Math.ceil(info.entries.length / PALETTE_COLUMNS);
    const contentHeight = totalRows * PALETTE_CELL + 8;
    this.maxPaletteScroll = Math.max(0, contentHeight - this.paletteViewportH);
    this.paletteScroll = Phaser.Math.Clamp(this.paletteScroll, 0, this.maxPaletteScroll);
    this.updatePaletteTransform();
    this.updatePaletteSelection();
  },

  updatePaletteSelection() {
    const selected = this.paletteButtons?.find((button) => button.tileIndex === this.selectedTile);
    this.paletteSelection.setVisible(Boolean(selected));
    if (selected) {
      this.paletteSelection.setPosition(
        selected.x + (PALETTE_TILE / 2),
        selected.y + (PALETTE_TILE / 2) - this.paletteScroll
      );
    }
    this.selectedTileText.setText(`Tile #${this.selectedTile}`);
    this.renderSelectedPreview();
  },

  updatePaletteTransform() {
    if (this.paletteContainer) {
      this.paletteContainer.y = -this.paletteScroll;
    }
  }
};
