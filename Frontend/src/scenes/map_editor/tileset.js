import Phaser from 'phaser';
import { TILE_SIZE } from './constants.js';

export const tilesetMethods = {
  getTilesetInfo(tilesetKey) {
    const texture = this.textures.get(tilesetKey);
    const source = texture?.getSourceImage?.();
    if (!source) return null;

    const cols = Math.max(1, Math.floor(source.width / TILE_SIZE));
    const rows = Math.max(1, Math.floor(source.height / TILE_SIZE));
    const maxTiles = cols * rows;
    const framePrefix = `${tilesetKey}__tile_`;

    for (let index = 0; index < maxTiles; index += 1) {
      const frame = `${framePrefix}${index}`;
      if (!texture.has(frame)) {
        const x = (index % cols) * TILE_SIZE;
        const y = Math.floor(index / cols) * TILE_SIZE;
        texture.add(frame, 0, x, y, TILE_SIZE, TILE_SIZE);
      }
    }

    const info = {
      source,
      cols,
      rows,
      maxTiles,
      entries: this.buildVisibleEntries(source, cols, rows, TILE_SIZE),
      frameName: (tileIndex) => `${framePrefix}${Phaser.Math.Clamp(tileIndex, 0, maxTiles - 1)}`
    };
    this.currentTilesetInfo = info;
    return info;
  },

  renderSelectedPreview() {
    if (!this.selectedPreview) return;
    this.drawTileToCanvas(this.selectedPreview, this.selectedTile, this.selectedPreview.width || 96);
  },

  drawTileToCanvas(canvas, tileIndex, size = 32) {
    const info = this.currentTilesetInfo || this.getTilesetInfo(this.tilesetKey);
    const source = info?.source;
    if (!source || !canvas) return;

    const context = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
    if (!context || typeof context.drawImage !== 'function') return;

    const clamped = Phaser.Math.Clamp(tileIndex, 0, info.maxTiles - 1);
    const sx = (clamped % info.cols) * TILE_SIZE;
    const sy = Math.floor(clamped / info.cols) * TILE_SIZE;
    const width = canvas.width || size;
    const height = canvas.height || size;

    try {
      context.clearRect(0, 0, width, height);
      context.imageSmoothingEnabled = false;
      context.drawImage(source, sx, sy, TILE_SIZE, TILE_SIZE, 0, 0, width, height);
    } catch {
      // Ignore transient canvas teardown race conditions during scene/account switches.
    }
  },

  buildVisibleEntries(source, cols, rows, tilePx) {
    try {
      if (!source?.width || !source?.height) {
        return Array.from({ length: cols * rows }, (_, index) => index);
      }
      const canvas = document.createElement('canvas');
      canvas.width = source.width;
      canvas.height = source.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context || typeof context.drawImage !== 'function') {
        return Array.from({ length: cols * rows }, (_, index) => index);
      }
      context.drawImage(source, 0, 0);

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
              const alpha = context.getImageData(px, py, 1, 1).data[3];
              if (alpha > 8) alphaHits += 1;
            }
          }

          if (alphaHits > 0) visible.push(tileIndex);
        }
      }

      if (visible.length > 0) return visible;
    } catch {
      return Array.from({ length: cols * rows }, (_, index) => index);
    }

    return Array.from({ length: cols * rows }, (_, index) => index);
  }
};
