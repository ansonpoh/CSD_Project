import { SHOP_PALETTE, SHOP_TYPE_COLORS } from './constants.js';

export const shopItemVisualMethods = {
  createItemIcon(container, x, y, itemOrType) {
    const graphic = this.add.graphics();
    const type = typeof itemOrType === 'string'
      ? itemOrType
      : String(itemOrType?.item_type || '').toLowerCase();
    const itemName = typeof itemOrType === 'string'
      ? ''
      : String(itemOrType?.name || '').toLowerCase();

    if (itemName.includes('insight tome')) {
      graphic.fillStyle(0x5b6ee1, 1);
      graphic.fillRoundedRect(x - 11, y - 12, 22, 24, 3);
      graphic.fillStyle(0x3749b5, 1);
      graphic.fillRect(x - 11, y - 12, 4, 24);
      graphic.fillStyle(0xc7d2fe, 1);
      graphic.fillRoundedRect(x - 6, y - 6, 12, 10, 2);
      graphic.fillStyle(0xe5e7eb, 1);
      graphic.fillRect(x - 1, y - 8, 2, 16);
      container.add(graphic);
      return;
    }

    if (itemName.includes('hint token') || itemName.includes('quiz hint') || itemName.includes('hint')) {
      graphic.fillStyle(0x57539e, 1);
      graphic.fillRoundedRect(x - 11, y - 11, 22, 22, 4);
      graphic.lineStyle(2, 0xa9b1ff, 0.95);
      graphic.strokeRoundedRect(x - 11, y - 11, 22, 22, 4);
      graphic.fillStyle(0x2f2b62, 1);
      graphic.fillCircle(x, y + 4, 2);
      const hintGlyph = this.add.text(x, y - 2, '?', {
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#dbeafe',
        stroke: '#2f2b62',
        strokeThickness: 3
      }).setOrigin(0.5);
      container.add(graphic);
      container.add(hintGlyph);
      return;
    }

    switch (type) {
      case 'potion':
        if (itemName.includes('health') || itemName.includes('heal')) {
          graphic.fillStyle(0xcd3b3b, 1);
          graphic.fillRoundedRect(x - 10, y - 10, 20, 25, 3);
          graphic.fillStyle(0xf87171, 1);
          graphic.fillRect(x - 8, y - 5, 16, 15);
          graphic.fillStyle(0x9f1239, 1);
          graphic.fillRect(x - 6, y - 12, 12, 3);
          break;
        }
        graphic.fillStyle(0x4193d5, 1);
        graphic.fillRoundedRect(x - 10, y - 10, 20, 25, 3);
        graphic.fillStyle(0x60a5fa, 1);
        graphic.fillRect(x - 8, y - 5, 16, 15);
        graphic.fillStyle(0x1e40af, 1);
        graphic.fillRect(x - 6, y - 12, 12, 3);
        break;
      case 'weapon':
        graphic.fillStyle(0xd04040, 1);
        graphic.fillRect(x - 3, y - 15, 6, 20);
        graphic.fillTriangle(x - 5, y - 15, x + 5, y - 15, x, y - 22);
        graphic.fillStyle(0x880000, 1);
        graphic.fillRect(x - 7, y + 5, 14, 5);
        graphic.fillCircle(x, y + 8, 4);
        break;
      case 'armor':
        graphic.fillStyle(0x7040b0, 1);
        graphic.fillRoundedRect(x - 12, y - 14, 24, 28, 5);
        graphic.lineStyle(2, 0xffffff, 0.4);
        graphic.strokeRoundedRect(x - 10, y - 12, 20, 24, 4);
        graphic.lineStyle(2, 0xb080f0);
        graphic.lineBetween(x, y - 8, x, y + 8);
        graphic.lineBetween(x - 7, y, x + 7, y);
        break;
      case 'accessory':
        graphic.lineStyle(3, SHOP_PALETTE.borderGold);
        graphic.strokeCircle(x, y, 11);
        graphic.fillStyle(0xf4c048, 1);
        graphic.fillCircle(x, y - 3, 5);
        graphic.fillStyle(0xffe88a, 1);
        graphic.fillCircle(x - 2, y - 4, 2.5);
        break;
      case 'consumable':
        graphic.fillStyle(0x22c55e, 1);
        graphic.fillCircle(x, y, 11);
        graphic.fillStyle(0x15803d, 1);
        graphic.fillRect(x - 2, y - 14, 4, 7);
        graphic.fillStyle(0x16a34a, 1);
        graphic.fillCircle(x + 7, y - 7, 4);
        break;
      default:
        graphic.fillStyle(0x3a3a5a, 1);
        graphic.fillRoundedRect(x - 11, y - 11, 22, 22, 3);
        graphic.lineStyle(1, 0x6b7280);
        graphic.strokeRoundedRect(x - 11, y - 11, 22, 22, 3);
        break;
    }

    container.add(graphic);
  },

  getTypeColor(type) {
    return SHOP_TYPE_COLORS[type] ?? 0x4a5568;
  }
};
