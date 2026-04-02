import Phaser from 'phaser';
import { SHOP_LAYOUT, SHOP_PALETTE } from './constants.js';

export const shopUiMethods = {
  buildShopScene() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.add.rectangle(0, 0, width, height, 0x000000, 0.82).setOrigin(0);

    const header = this.add.graphics();
    header.fillStyle(SHOP_PALETTE.bgPanel, 0.97);
    header.fillRect(0, 0, width, SHOP_LAYOUT.headerHeight);
    header.lineStyle(1, SHOP_PALETTE.borderGold, 0.6);
    header.beginPath();
    header.moveTo(0, SHOP_LAYOUT.headerHeight - 1);
    header.lineTo(width, SHOP_LAYOUT.headerHeight - 1);
    header.strokePath();

    this.add.text(width / 2, SHOP_LAYOUT.headerHeight / 2, 'ITEM SHOP', {
      fontSize: '30px',
      fontStyle: 'bold',
      color: SHOP_PALETTE.textGold,
      stroke: '#06101a',
      strokeThickness: 7
    }).setOrigin(0.5);

    this.createGoldDisplay(width / 2, 98);
    this.createCloseButton();
  },

  createGoldDisplay(centerX, centerY) {
    const panelX = centerX - SHOP_LAYOUT.goldPanelWidth / 2;
    const panelY = centerY - SHOP_LAYOUT.goldPanelHeight / 2;
    const goldBg = this.add.graphics();

    goldBg.fillStyle(SHOP_PALETTE.btnNormal, 1);
    goldBg.lineStyle(1, SHOP_PALETTE.borderGold, 0.8);
    goldBg.fillRoundedRect(panelX, panelY, SHOP_LAYOUT.goldPanelWidth, SHOP_LAYOUT.goldPanelHeight, 5);
    goldBg.strokeRoundedRect(panelX, panelY, SHOP_LAYOUT.goldPanelWidth, SHOP_LAYOUT.goldPanelHeight, 5);

    this.goldText = this.add.text(centerX, centerY, `Gold: ${this.gold}`, {
      fontSize: '16px',
      fontStyle: 'bold',
      color: SHOP_PALETTE.textGold,
      stroke: '#06101a',
      strokeThickness: 4
    }).setOrigin(0.5);
  },

  createCloseButton() {
    return this.createShopButton(1850, 100, 100, 50, 'CLOSE', {
      fill: SHOP_PALETTE.btnDanger,
      hoverFill: SHOP_PALETTE.btnDangerHover,
      border: 0x8b2020,
      onClick: () => {
        this.scene.stop();
        this.scene.resume('GameMapScene');
      }
    });
  },

  createShopButton(cx, cy, width, height, label, options = {}) {
    const {
      fill,
      hoverFill,
      border,
      onClick,
      disabled = false
    } = options;
    const container = this.add.container(cx, cy);
    const background = this.add.graphics();
    const text = this.add.text(0, 0, label, {
      fontSize: '14px',
      fontStyle: 'bold',
      color: disabled ? SHOP_PALETTE.textDim : SHOP_PALETTE.textMain,
      stroke: '#060814',
      strokeThickness: 4
    }).setOrigin(0.5);

    const draw = (activeFill, activeBorder) => {
      background.clear();
      background.fillStyle(activeFill, disabled ? 0.35 : 1);
      background.fillRoundedRect(-width / 2, -height / 2, width, height, 4);
      background.lineStyle(2, activeBorder, disabled ? 0.3 : 0.9);
      background.strokeRoundedRect(-width / 2, -height / 2, width, height, 4);

      if (!disabled) {
        background.fillStyle(0xffffff, 0.06);
        background.fillRoundedRect(
          -width / 2 + 2,
          -height / 2 + 2,
          width - 4,
          height * 0.42,
          { tl: 3, tr: 3, bl: 0, br: 0 }
        );
      }
    };

    draw(disabled ? SHOP_PALETTE.btnNormal : fill, disabled ? SHOP_PALETTE.borderDim : border);
    container.add([background, text]);

    if (!disabled && onClick) {
      const hit = this.add.rectangle(0, 0, width, height, 0, 0).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => draw(hoverFill, SHOP_PALETTE.borderGlow));
      hit.on('pointerout', () => draw(fill, border));
      hit.on('pointerdown', () => draw(SHOP_PALETTE.btnPress, SHOP_PALETTE.borderDim));
      hit.on('pointerup', () => {
        draw(hoverFill, SHOP_PALETTE.borderGlow);
        onClick();
      });
      container.add(hit);
    }

    return container;
  },

  updateGoldDisplay() {
    if (this.goldText) {
      this.goldText.setText(`Gold: ${this.gold}`);
    }
  },

  dismissPurchaseToast() {
    if (!this.purchaseToast) return;
    const { root, timer } = this.purchaseToast;
    if (timer) timer.remove(false);
    if (root?.active) {
      root.destroy(true);
    }
    this.purchaseToast = null;
  },

  showPurchaseFlash(item) {
    const width = this.cameras.main.width;
    const typeColor = this.getTypeColor(item?.item_type);
    const itemName = item?.name || 'Item';

    this.dismissPurchaseToast();

    const root = this.add.container(width / 2, 126);
    root.setDepth(3000);
    root.setAlpha(0);
    root.setScale(0.94);
    root.y -= 14;

    const panel = this.add.graphics();
    panel.fillStyle(SHOP_PALETTE.bgPanel, 0.96);
    panel.fillRoundedRect(-190, -30, 380, 60, 10);
    panel.lineStyle(2, SHOP_PALETTE.borderGlow, 0.85);
    panel.strokeRoundedRect(-190, -30, 380, 60, 10);
    panel.fillStyle(typeColor, 0.2);
    panel.fillRoundedRect(-188, -28, 376, 24, { tl: 8, tr: 8, bl: 0, br: 0 });
    root.add(panel);

    const title = this.add.text(0, -8, 'Purchase Complete', {
      fontSize: '14px',
      fontStyle: 'bold',
      color: SHOP_PALETTE.textGreen,
      stroke: '#060814',
      strokeThickness: 3
    }).setOrigin(0.5);
    root.add(title);

    const detail = this.add.text(0, 11, itemName, {
      fontSize: '17px',
      fontStyle: 'bold',
      color: SHOP_PALETTE.textMain,
      stroke: '#060814',
      strokeThickness: 3
    }).setOrigin(0.5);
    root.add(detail);

    // Small celebratory burst to make a purchase feel rewarding.
    const particles = [];
    for (let i = 0; i < 7; i += 1) {
      const dot = this.add.circle(-12, -2, 2 + (i % 2), typeColor, 0.95);
      particles.push(dot);
      root.add(dot);

      const angle = Phaser.Math.DegToRad(-35 + i * 12);
      const distance = 28 + i * 6;
      this.tweens.add({
        targets: dot,
        x: dot.x + Math.cos(angle) * distance,
        y: dot.y + Math.sin(angle) * distance - 4,
        alpha: 0,
        scale: 0.45,
        duration: 460,
        ease: 'Cubic.easeOut'
      });
    }

    this.tweens.add({
      targets: root,
      alpha: 1,
      scale: 1,
      y: root.y + 14,
      duration: 220,
      ease: 'Back.easeOut'
    });

    const timer = this.time.delayedCall(1500, () => {
      if (!root.active) return;
      this.tweens.add({
        targets: root,
        alpha: 0,
        y: root.y - 10,
        scale: 0.96,
        duration: 220,
        ease: 'Quad.easeIn',
        onComplete: () => {
          if (root?.active) root.destroy(true);
          if (this.purchaseToast?.root === root) {
            this.purchaseToast = null;
          }
        }
      });
    });

    this.purchaseToast = { root, timer, particles };
  }
};
