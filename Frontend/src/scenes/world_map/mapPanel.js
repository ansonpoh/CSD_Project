import { WORLD_MAP_PALETTE as P } from './constants.js';

export const worldMapMapPanelMethods = {
  populateMapPanel(panel) {
    this.clearPanelBody(panel);

    const c = panel.body;
    const maps = this.catalog.slice(0, 4);
    const cardW = panel.width - panel.pad * 2;
    const cardH = 88;
    let y = 14;

    maps.forEach((map, index) => {
      const isSelected = String(map.mapId) === String(this.selectedMapId);
      const isLocked = !map.unlocked;
      const card = this.createMapCard(panel.pad, y, cardW, cardH, map, isSelected, () => {
        this.scene.restart({ selectedMapId: map.mapId });
      });
      c.add(card);

      const actionLabel = isLocked ? map.unlockText : `Open ${map.name}`;
      const action = this.createButton(
        panel.pad + cardW - 184,
        y + cardH + 6,
        184,
        38,
        actionLabel,
        () => {
          if (map.unlocked) this.enterMap(map);
        },
        isLocked
      );
      c.add(action);

      y += cardH + 52;
      if (index >= maps.length - 1) return;

      const divider = this.add.graphics();
      divider.lineStyle(1, P.borderGold, 0.2);
      divider.beginPath();
      divider.moveTo(panel.pad, y - 14);
      divider.lineTo(panel.width - panel.pad, y - 14);
      divider.strokePath();
      c.add(divider);
    });
  }
};
