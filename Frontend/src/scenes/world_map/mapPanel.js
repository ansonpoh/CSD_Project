import Phaser from 'phaser';
import { WORLD_MAP_PALETTE as P } from './constants.js';

export const worldMapMapPanelMethods = {
  getSearchHitInputConfig(width, height, clickGuard = null) {
    return {
      useHandCursor: true,
      hitArea: new Phaser.Geom.Rectangle(0, 0, width, height),
      hitAreaCallback: (hitArea, x, y) => {
        if (!hitArea.contains(x, y)) return false;
        if (!clickGuard) return true;
        const pointer = this.input?.activePointer;
        return Boolean(pointer && clickGuard(pointer));
      }
    };
  },

  setupMapSearchHandlers() {
    if (this._mapSearchHandlersReady || !this.input?.keyboard) return;

    this._mapSearchHandlersReady = true;
    this._mapSearchKeydownHandler = (event) => this.handleMapSearchKeydown(event);
    this._mapSearchPointerDownHandler = (_pointer, currentlyOver) => this.handleMapSearchPointerDown(currentlyOver);

    this.input.keyboard.on('keydown', this._mapSearchKeydownHandler);
    this.input.on('pointerdown', this._mapSearchPointerDownHandler);

    this.events.once('shutdown', () => this.teardownMapSearchHandlers());
    this.events.once('destroy', () => this.teardownMapSearchHandlers());
  },

  teardownMapSearchHandlers() {
    if (!this._mapSearchHandlersReady) return;

    if (this._mapSearchKeydownHandler) {
      this.input?.keyboard?.off('keydown', this._mapSearchKeydownHandler);
    }
    if (this._mapSearchPointerDownHandler) {
      this.input?.off('pointerdown', this._mapSearchPointerDownHandler);
    }

    this._mapSearchHandlersReady = false;
    this._mapSearchKeydownHandler = null;
    this._mapSearchPointerDownHandler = null;
    this.isMapSearchFocused = false;
  },

  handleMapSearchPointerDown(currentlyOver = []) {
    if (this._skipNextMapSearchBlur) {
      this._skipNextMapSearchBlur = false;
      return;
    }

    if (!this.isMapSearchFocused) return;

    const clickedSearch = currentlyOver.some((obj) => obj?.getData?.('map-search-hit') || obj?.getData?.('map-search-clear'));
    if (clickedSearch) return;

    this.isMapSearchFocused = false;
    if (this.panels?.gates) this.populateMapPanel(this.panels.gates);
  },

  handleMapSearchKeydown(event) {
    if (!this.isMapSearchFocused) return;

    const key = String(event?.key || '');
    const previousQuery = this.mapSearchQuery || '';
    let nextQuery = previousQuery;
    let shouldBlur = false;

    if (key === 'Escape' || key === 'Enter') {
      shouldBlur = true;
    } else if (key === 'Backspace') {
      nextQuery = previousQuery.slice(0, -1);
    } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      nextQuery = `${previousQuery}${key}`.slice(0, 40);
    }

    if (nextQuery !== previousQuery) {
      this.mapSearchQuery = nextQuery;
    }

    if (shouldBlur) {
      this.isMapSearchFocused = false;
    }

    if (nextQuery !== previousQuery || shouldBlur) {
      if (typeof event?.preventDefault === 'function') event.preventDefault();
      if (this.panels?.gates) this.populateMapPanel(this.panels.gates);
    }
  },

  getFilteredMaps() {
    const query = String(this.mapSearchQuery || '').trim().toLowerCase();
    if (!query) return this.catalog;

    return this.catalog.filter((map) => String(map?.name || '').toLowerCase().includes(query));
  },

  createMapSearchBar(x, y, width, clickGuard = null) {
    const barHeight = 44;
    const query = this.mapSearchQuery || '';
    const hasQuery = Boolean(query.trim());
    const frameFill = this.isMapSearchFocused ? 0x242a50 : 0x161934;
    const frameBorder = this.isMapSearchFocused ? P.borderGlow : P.borderGold;
    const display = hasQuery ? this.truncate(query, 36) : 'Search maps by name...';
    const textColor = hasQuery ? P.textMain : P.textDisabled;

    const bar = this.add.container(x, y);
    const frame = this.add.graphics();
    frame.fillStyle(frameFill, 0.95);
    frame.fillRoundedRect(0, 0, width, barHeight, 6);
    frame.lineStyle(2, frameBorder, 1);
    frame.strokeRoundedRect(0, 0, width, barHeight, 6);
    bar.add(frame);

    bar.add(this.add.text(14, barHeight / 2, display, {
      fontSize: '14px',
      color: textColor,
      stroke: '#060814',
      strokeThickness: 3
    }).setOrigin(0, 0.5));

    const searchHit = this.add.rectangle(width / 2, barHeight / 2, width, barHeight, 0, 0)
      .setInteractive(this.getSearchHitInputConfig(width, barHeight, clickGuard))
      .setData('map-search-hit', true);
    searchHit.on('pointerdown', (pointer) => {
      if (clickGuard && !clickGuard(pointer)) return;
      this._skipNextMapSearchBlur = true;
      this.isMapSearchFocused = true;
      if (this.panels?.gates) this.populateMapPanel(this.panels.gates);
    });
    bar.add(searchHit);

    if (hasQuery) {
      const clearLabel = this.add.text(width - 12, barHeight / 2, 'Clear', {
        fontSize: '13px',
        color: P.warn,
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 3
      }).setOrigin(1, 0.5);
      bar.add(clearLabel);

      const clearHit = this.add.rectangle(width - 40, barHeight / 2, 64, barHeight, 0, 0)
        .setInteractive(this.getSearchHitInputConfig(64, barHeight, clickGuard))
        .setData('map-search-clear', true);
      clearHit.on('pointerdown', (pointer) => {
        if (clickGuard && !clickGuard(pointer)) return;
        this._skipNextMapSearchBlur = true;
        this.mapSearchQuery = '';
        this.isMapSearchFocused = true;
        if (this.panels?.gates) this.populateMapPanel(this.panels.gates);
      });
      bar.add(clearHit);
    }

    return { bar, barHeight };
  },

  populateMapPanel(panel) {
    this.clearPanelBody(panel);

    const c = this.createScrollableBody(panel, {
      left: panel.pad,
      right: panel.pad,
      top: 12,
      bottom: 14
    });

    const maps = this.catalog.slice(0, 5).map(map => ({ ...map, unlocked: true })); //temp for testing
    //uncomment once testing is done
    // const maps = this.getFilteredMaps();
    const viewportWidth = panel.scrollState?.viewport?.width ?? (panel.width - panel.pad * 2);
    const clickGuard = (pointer) => this.isPointerInsidePanelViewport(panel, pointer);
    const cardW = viewportWidth;
    const cardH = 88;
    let y = 14;

    const searchBar = this.createMapSearchBar(0, y, viewportWidth, clickGuard);
    c.add(searchBar.bar);
    y += searchBar.barHeight + 12;

    c.add(this.add.text(2, y, `${maps.length} result${maps.length === 1 ? '' : 's'}`, {
      fontSize: '12px',
      color: P.textDesc,
      stroke: '#060814',
      strokeThickness: 3
    }));
    y += 24;

    if (!maps.length) {
      const hasQuery = Boolean(String(this.mapSearchQuery || '').trim());
      const message = this.isMapCatalogLoading
        ? 'Loading discovery gates...'
        : hasQuery
          ? 'No maps match that name.'
          : 'No discovery gates available.';

      c.add(this.add.text(0, y, message, {
        fontSize: '16px',
        color: P.textMain,
        stroke: '#060814',
        strokeThickness: 4
      }));

      this.setPanelScrollMetrics(panel, y + 80);
      return;
    }

    maps.forEach((map, index) => {
      const isSelected = String(map.mapId) === String(this.selectedMapId);
      const isLocked = !map.unlocked;
      const card = this.createMapCard(0, y, cardW, cardH, map, isSelected, () => {
        this.selectMap(map.mapId);
      }, clickGuard);
      c.add(card);

      const actionLabel = isLocked ? map.unlockText : `Open ${map.name}`;
      const estimatedButtonWidth = Math.ceil(actionLabel.length * 8.1) + 36;
      const actionButtonWidth = Phaser.Math.Clamp(estimatedButtonWidth, 184, Math.max(184, cardW - 24));
      const action = this.createButton(
        cardW - actionButtonWidth,
        y + cardH + 6,
        actionButtonWidth,
        38,
        actionLabel,
        () => {
          this.enterMap(map);
        },
        isLocked,
        clickGuard
      );
      c.add(action);

      y += cardH + 52;
      if (index >= maps.length - 1) return;

      const divider = this.add.graphics();
      divider.lineStyle(1, P.borderGold, 0.2);
      divider.beginPath();
      divider.moveTo(0, y - 14);
      divider.lineTo(cardW, y - 14);
      divider.strokePath();
      c.add(divider);
    });

    this.setPanelScrollMetrics(panel, y + 24);
  }
};
