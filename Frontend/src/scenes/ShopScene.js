import Phaser from 'phaser';
import { gameState } from '../services/gameState.js';
import { apiService } from '../services/api.js';

const P = {
  bgDeep:        0x090f24,
  bgPanel:       0x0d1530,
  bgCard:        0x080e22,
  btnNormal:     0x2a0f42,
  btnHover:      0x3d1860,
  btnPress:      0x100520,
  btnSuccess:    0x0e3020,
  btnSuccessHov: 0x1a5030,
  btnDanger:     0x3a0e0e,
  btnDangerHov:  0x601818,
  borderGold:    0xc8870a,
  borderGlow:    0xf0b030,
  borderDim:     0x604008,
  accentGlow:    0xffdd60,
  textMain:      '#f0ecff',
  textSub:       '#c0a8e0',
  textGold:      '#f4c048',
  textGreen:     '#4ade80',
  textRed:       '#f87171',
  textDim:       '#5a4a72',
  textDesc:      '#9e88c0',
};

// Item type accent colours (borders + icon tints)
const TYPE_COLOR = {
  potion:     0x4193d5,
  weapon:     0xc03030,
  armor:      0x7040b0,
  accessory:  0xc8870a,
  consumable: 0x22a855,
};

export class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ShopScene' });
    this.items = [];
    this.gold = 1000;
    this.iconGraphics = {};
    this.goldText = null;
    this.itemContainers = [];
  }

  async create() {
    const width  = this.cameras.main.width;
    const height = this.cameras.main.height;

    // ── Dark overlay ──────────────────────────────────────────────────────
    this.add.rectangle(0, 0, width, height, 0x000000, 0.82).setOrigin(0);

    // ── Header bar ────────────────────────────────────────────────────────
    const hdr = this.add.graphics();
    hdr.fillStyle(P.bgPanel, 0.97);
    hdr.fillRect(0, 0, width, 72);
    hdr.lineStyle(1, P.borderGold, 0.6);
    hdr.beginPath(); hdr.moveTo(0, 71); hdr.lineTo(width, 71); hdr.strokePath();

    this.add.text(width / 2, 36, '✦  ITEM SHOP  ✦', {
      fontSize:        '30px',
      fontStyle:       'bold',
      color:           P.textGold,
      stroke:          '#06101a',
      strokeThickness: 7
    }).setOrigin(0.5);

    // ── Gold display ──────────────────────────────────────────────────────
    const goldBg = this.add.graphics();
    goldBg.fillStyle(P.btnNormal, 1);
    goldBg.lineStyle(1, P.borderGold, 0.8);
    goldBg.fillRoundedRect(width / 2 - 90, 82, 180, 32, 5);
    goldBg.strokeRoundedRect(width / 2 - 90, 82, 180, 32, 5);

    this.goldText = this.add.text(width / 2, 98, `✦  Gold: ${this.gold}`, {
      fontSize:        '16px',
      fontStyle:       'bold',
      color:           P.textGold,
      stroke:          '#06101a',
      strokeThickness: 4
    }).setOrigin(0.5);

    // ── Close button ──────────────────────────────────────────────────────
    this._makeBtn(100, 100, 100, 50, 'CLOSE', P.btnDanger, P.btnDangerHov, 0x8b2020, () => {
      this.scene.stop();
      this.scene.resume('GameMapScene');
    });

    await this.loadItems();
  }

  // ── Button factory ─────────────────────────────────────────────────────────

  _makeBtn(cx, cy, w, h, label, fillN, fillH, border, onClick, disabled = false) {
    const c  = this.add.container(cx - w / 2, cy - h / 2);
    const bg = this.add.graphics();

    const draw = (fill, brd) => {
      bg.clear();
      bg.fillStyle(fill, disabled ? 0.35 : 1);
      bg.fillRoundedRect(0, 0, w, h, 4);
      bg.lineStyle(2, brd, disabled ? 0.3 : 0.9);
      bg.strokeRoundedRect(0, 0, w, h, 4);
      if (!disabled) {
        bg.fillStyle(0xffffff, 0.06);
        bg.fillRoundedRect(2, 2, w - 4, h * 0.42, { tl: 3, tr: 3, bl: 0, br: 0 });
      }
    };

    draw(disabled ? P.btnNormal : fillN, disabled ? P.borderDim : border);
    c.add(bg);
    c.add(this.add.text(w / 2, h / 2, label, {
      fontSize:        '14px',
      fontStyle:       'bold',
      color:           disabled ? P.textDim : P.textMain,
      stroke:          '#060814',
      strokeThickness: 4
    }).setOrigin(0.5));

    if (!disabled && onClick) {
      const hit = this.add.rectangle(w / 2, h / 2, w, h, 0, 0).setInteractive({ useHandCursor: true });
      c.add(hit);
      hit.on('pointerover',  () => draw(fillH,       P.borderGlow));
      hit.on('pointerout',   () => draw(fillN,       border));
      hit.on('pointerdown',  () => draw(P.btnPress,  P.borderDim));
      hit.on('pointerup',    () => { draw(fillH, P.borderGlow); onClick(); });
    }

    return c;
  }

  // ── Item loading / display (logic unchanged) ───────────────────────────────

  async loadItems() {
    try {
      const items = await apiService.getAllItems();
      this.items = items.filter((item) => item.is_active);
      this.displayItems();
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  }

  displayItems() {
    const width       = this.cameras.main.width;
    const startY      = 200;
    const spacing     = 116;
    const itemsPerRow = 2;
    const colGap      = 390;
    const cardW       = 360;
    const cardH       = 90;

    this.itemContainers.forEach((c) => c.destroy(true));
    this.itemContainers = [];

    this.items.forEach((item, index) => {
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;
      const itemsInRow = Math.min(itemsPerRow, this.items.length - row * itemsPerRow);
      const rowStartX  = width / 2 - ((itemsInRow - 1) * colGap) / 2;
      const x = rowStartX + col * colGap;
      const y = startY + row * spacing;

      const container = this.add.container(x, y);
      const typeColor  = TYPE_COLOR[item.item_type] ?? 0x4a5568;

      // ── Card background ──
      const cardBg = this.add.graphics();
      cardBg.fillStyle(P.bgCard, 0.94);
      cardBg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 5);
      cardBg.lineStyle(2, typeColor, 0.7);
      cardBg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 5);
      // subtle top shine
      cardBg.fillStyle(0xffffff, 0.03);
      cardBg.fillRoundedRect(-cardW / 2 + 2, -cardH / 2 + 2, cardW - 4, cardH * 0.35, { tl: 4, tr: 4, bl: 0, br: 0 });
      container.add(cardBg);

      // Icon
      this.createItemIcon(container, -cardW / 2 + 28, 0, item.item_type);

      // Name
      container.add(this.add.text(-cardW / 2 + 58, -cardH / 2 + 12, item.name, {
        fontSize: '17px', fontStyle: 'bold',
        color: P.textMain, stroke: '#060814', strokeThickness: 4
      }));

      // Description
      container.add(this.add.text(-cardW / 2 + 58, -cardH / 2 + 34, item.description, {
        fontSize: '12px', color: P.textDesc,
        wordWrap: { width: 170, useAdvancedWrap: true },
        stroke: '#060814', strokeThickness: 2
      }));

      // Price
      container.add(this.add.text(-cardW / 2 + 58, cardH / 2 - 24, `✦ ${item.price} gold`, {
        fontSize: '14px', fontStyle: 'bold',
        color: P.textGold, stroke: '#060814', strokeThickness: 3
      }));

      // BUY button
      const canAfford = this.gold >= item.price;
      const btnX = cardW / 2 - 50;

      if (canAfford) {
        const buyBtn = this._makeBtn(
          x + btnX, y, 84, 36,
          'BUY',
          P.btnSuccess, P.btnSuccessHov, 0x22a855,
          () => this.purchaseItem(item)
        );
        // Adjust to local container coords
        buyBtn.x = btnX - 84 / 2;
        buyBtn.y = -18;
        container.add(buyBtn);
      } else {
        container.add(this.add.text(btnX - 84 / 2 + 16, -18, 'BUY', {
          fontSize: '14px', fontStyle: 'bold',
          color: P.textDim, stroke: '#060814', strokeThickness: 3
        }));
      }

      this.itemContainers.push(container);
    });
  }

  createItemIcon(container, x, y, type) {
    const g = this.add.graphics();

    switch (type) {
      case 'potion':
        g.fillStyle(0x4193d5, 1); g.fillRoundedRect(x - 10, y - 10, 20, 25, 3);
        g.fillStyle(0x60a5fa, 1); g.fillRect(x - 8, y - 5, 16, 15);
        g.fillStyle(0x1e40af, 1); g.fillRect(x - 6, y - 12, 12, 3);
        break;
      case 'weapon':
        g.fillStyle(0xd04040, 1); g.fillRect(x - 3, y - 15, 6, 20);
        g.fillTriangle(x - 5, y - 15, x + 5, y - 15, x, y - 22);
        g.fillStyle(0x880000, 1); g.fillRect(x - 7, y + 5, 14, 5); g.fillCircle(x, y + 8, 4);
        break;
      case 'armor':
        g.fillStyle(0x7040b0, 1); g.fillRoundedRect(x - 12, y - 14, 24, 28, 5);
        g.lineStyle(2, 0xffffff, 0.4); g.strokeRoundedRect(x - 10, y - 12, 20, 24, 4);
        g.lineStyle(2, 0xb080f0); g.lineBetween(x, y - 8, x, y + 8); g.lineBetween(x - 7, y, x + 7, y);
        break;
      case 'accessory':
        g.lineStyle(3, P.borderGold); g.strokeCircle(x, y, 11);
        g.fillStyle(0xf4c048, 1); g.fillCircle(x, y - 3, 5);
        g.fillStyle(0xffe88a, 1); g.fillCircle(x - 2, y - 4, 2.5);
        break;
      case 'consumable':
        g.fillStyle(0x22c55e, 1); g.fillCircle(x, y, 11);
        g.fillStyle(0x15803d, 1); g.fillRect(x - 2, y - 14, 4, 7);
        g.fillStyle(0x16a34a, 1); g.fillCircle(x + 7, y - 7, 4);
        break;
      default:
        g.fillStyle(0x3a3a5a, 1); g.fillRoundedRect(x - 11, y - 11, 22, 22, 3);
        g.lineStyle(1, 0x6b7280); g.strokeRoundedRect(x - 11, y - 11, 22, 22, 3);
        break;
    }

    container.add(g);
  }

  getTypeColor(type) {
    return TYPE_COLOR[type] ?? 0x4a5568;
  }

  async purchaseItem(item) {
    if (this.gold < item.price) return;

    const learner = gameState.getLearner();
    const itemId  = item.itemId;

    this.gold -= item.price;
    this.updateGoldDisplay();
    this.displayItems();

    const width = this.cameras.main.width;
    const flash = this.add.text(width / 2, 120, `✦  Purchased ${item.name}!  ✦`, {
      fontSize:        '18px',
      fontStyle:       'bold',
      color:           P.textGreen,
      stroke:          '#060814',
      strokeThickness: 5,
      backgroundColor: 'rgba(8,10,28,0.9)',
      padding:         { x: 14, y: 6 }
    }).setOrigin(0.5);

    this.time.delayedCall(1500, () => flash.destroy());

    try {
      if (learner?.learnerId && itemId) {
        const updatedInventory = await apiService.addInventoryItem(itemId, 1, false);
        gameState.setInventory(updatedInventory);
        apiService.createPurchase([{ itemId: item.itemId, quantity: 1 }]);
      } else {
        gameState.addItem(item, 1);
      }
    } catch (error) {
      this.gold += item.price;
      this.updateGoldDisplay();
      console.error('Purchase failed:', error);
    }
  }

  updateGoldDisplay() {
    if (this.goldText) this.goldText.setText(`✦  Gold: ${this.gold}`);
  }
}