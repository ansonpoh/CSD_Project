import { TILESETS } from './constants.js';

export const paletteMethods = {
  createPalettePanel() {
    this.rebuildPaletteTiles();
  },

  switchTileset(delta) {
    const currentIndex = TILESETS.indexOf(this.tilesetKey);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (safeIndex + delta + TILESETS.length) % TILESETS.length;
    this.tilesetKey = TILESETS[nextIndex];
    if (this.tilesetLabel) {
      this.tilesetLabel.textContent = this.tilesetKey;
    }
    this.buildTilemap();
    this.rebuildPaletteTiles();
    this.refreshToolbarLabel();
    this.pushHistory('tileset');
    this.setStatus(`Switched tileset to ${this.tilesetKey}.`);
  },

  rebuildPaletteTiles() {
    const info = this.getTilesetInfo(this.tilesetKey);
    if (!info?.source || !this.paletteGridEl) {
      this.setStatus(`Missing tileset texture: ${this.tilesetKey}`);
      return;
    }

    if (!info.entries.includes(this.selectedTile)) {
      this.selectedTile = info.entries[0] ?? 0;
    }

    this.paletteGridEl.innerHTML = '';
    const fragment = document.createDocumentFragment();
    this.paletteButtons = [];

    info.entries.forEach((tileIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'me-palette__button';
      button.dataset.tile = String(tileIndex);

      const canvas = document.createElement('canvas');
      canvas.className = 'me-palette__canvas';
      canvas.width = 32;
      canvas.height = 32;

      const label = document.createElement('span');
      label.className = 'me-palette__index';
      label.textContent = `#${tileIndex}`;

      button.appendChild(canvas);
      button.appendChild(label);
      button.addEventListener('click', () => {
        this.selectedTile = tileIndex;
        this.updatePaletteSelection();
      });

      this.drawTileToCanvas(canvas, tileIndex, 32);

      this.paletteButtons.push({ tileIndex, button, canvas });
      fragment.appendChild(button);
    });

    this.paletteGridEl.appendChild(fragment);
    this.updatePaletteSelection();
  },

  updatePaletteSelection() {
    this.paletteButtons?.forEach(({ tileIndex, button }) => {
      button.classList.toggle('is-active', tileIndex === this.selectedTile);
    });

    if (this.selectedTileText) {
      this.selectedTileText.textContent = `Tile #${this.selectedTile}`;
    }

    this.renderSelectedPreview();
    this.refreshStatusMeta();
  },

  updatePaletteTransform() {
    return undefined;
  }
};
