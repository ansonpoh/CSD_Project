import { apiService } from '../../services/api.js';
import { SHOP_LAYOUT, SHOP_PALETTE } from './constants.js';

export const shopCatalogMethods = {
  async loadItems() {
    try {
      const items = await apiService.getAllItems();
      this.items = items.filter((item) => item.is_active);
      this.displayItems();
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  },

  displayItems() {
    const width = this.cameras.main.width;

    this.itemContainers.forEach((container) => container.destroy(true));
    this.itemContainers = [];

    this.items.forEach((item, index) => {
      const row = Math.floor(index / SHOP_LAYOUT.itemsPerRow);
      const column = index % SHOP_LAYOUT.itemsPerRow;
      const itemsInRow = Math.min(
        SHOP_LAYOUT.itemsPerRow,
        this.items.length - row * SHOP_LAYOUT.itemsPerRow
      );
      const rowStartX = width / 2 - ((itemsInRow - 1) * SHOP_LAYOUT.columnGap) / 2;
      const x = rowStartX + column * SHOP_LAYOUT.columnGap;
      const y = SHOP_LAYOUT.startY + row * SHOP_LAYOUT.rowSpacing;

      const card = this.createItemCard(item, x, y);
      this.itemContainers.push(card);
    });
  },

  createItemCard(item, x, y) {
    const container = this.add.container(x, y);
    const typeColor = this.getTypeColor(item.item_type);
    const cardBg = this.add.graphics();

    cardBg.fillStyle(SHOP_PALETTE.bgCard, 0.94);
    cardBg.fillRoundedRect(
      -SHOP_LAYOUT.cardWidth / 2,
      -SHOP_LAYOUT.cardHeight / 2,
      SHOP_LAYOUT.cardWidth,
      SHOP_LAYOUT.cardHeight,
      5
    );
    cardBg.lineStyle(2, typeColor, 0.7);
    cardBg.strokeRoundedRect(
      -SHOP_LAYOUT.cardWidth / 2,
      -SHOP_LAYOUT.cardHeight / 2,
      SHOP_LAYOUT.cardWidth,
      SHOP_LAYOUT.cardHeight,
      5
    );
    cardBg.fillStyle(0xffffff, 0.03);
    cardBg.fillRoundedRect(
      -SHOP_LAYOUT.cardWidth / 2 + 2,
      -SHOP_LAYOUT.cardHeight / 2 + 2,
      SHOP_LAYOUT.cardWidth - 4,
      SHOP_LAYOUT.cardHeight * 0.35,
      { tl: 4, tr: 4, bl: 0, br: 0 }
    );
    container.add(cardBg);

    this.createItemIcon(container, -SHOP_LAYOUT.cardWidth / 2 + 28, 0, item.item_type);

    container.add(this.add.text(-SHOP_LAYOUT.cardWidth / 2 + 58, -SHOP_LAYOUT.cardHeight / 2 + 12, item.name, {
      fontSize: '17px',
      fontStyle: 'bold',
      color: SHOP_PALETTE.textMain,
      stroke: '#060814',
      strokeThickness: 4
    }));

    container.add(this.add.text(-SHOP_LAYOUT.cardWidth / 2 + 58, -SHOP_LAYOUT.cardHeight / 2 + 34, item.description, {
      fontSize: '12px',
      color: SHOP_PALETTE.textDesc,
      wordWrap: { width: 170, useAdvancedWrap: true },
      stroke: '#060814',
      strokeThickness: 2
    }));

    const goldCost = this.getItemGoldCost(item);

    container.add(this.add.text(-SHOP_LAYOUT.cardWidth / 2 + 58, SHOP_LAYOUT.cardHeight / 2 - 24, `${goldCost} gold`, {
      fontSize: '14px',
      fontStyle: 'bold',
      color: SHOP_PALETTE.textGold,
      stroke: '#060814',
      strokeThickness: 3
    }));

    const buttonX = SHOP_LAYOUT.cardWidth / 2 - 50;
    if (this.gold >= goldCost) {
      container.add(this.createShopButton(buttonX, 0, 84, 36, 'BUY', {
        fill: SHOP_PALETTE.btnSuccess,
        hoverFill: SHOP_PALETTE.btnSuccessHover,
        border: 0x22a855,
        onClick: () => this.purchaseItem(item)
      }));
    } else {
      container.add(this.add.text(buttonX, 0, 'BUY', {
        fontSize: '14px',
        fontStyle: 'bold',
        color: SHOP_PALETTE.textDim,
        stroke: '#060814',
        strokeThickness: 3
      }).setOrigin(0.5));
    }

    return container;
  }
};
