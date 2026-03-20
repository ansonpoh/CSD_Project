import { WORLD_MAP_PALETTE as P } from './constants.js';

export const worldMapMapPanelMethods = {
  populateMapPanel(panel) {
    this.clearPanelBody(panel);

    const c = this.createScrollableBody(panel, {
      left: panel.pad,
      right: panel.pad,
      top: 12,
      bottom: 14
    });

    const maps = this.catalog.slice(0, 4).map(map => ({ ...map, unlocked: true })); //temp for testing
    const viewportWidth = panel.scrollState?.viewport?.width ?? (panel.width - panel.pad * 2);
    const cardW = viewportWidth;
    const cardH = 88;
    let y = 14;

    maps.forEach((map, index) => {
      const isSelected = String(map.mapId) === String(this.selectedMapId);
      const isLocked = !map.unlocked;
      const card = this.createMapCard(0, y, cardW, cardH, map, isSelected, () => {
        this.selectMap(map.mapId);
      });
      c.add(card);

      const actionLabel = isLocked ? map.unlockText : `Open ${map.name}`;
      const action = this.createButton(
        cardW - 184,
        y + cardH + 6,
        184,
        38,
        actionLabel,
        () => {
          this.enterMap(map);
        },
        isLocked
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
