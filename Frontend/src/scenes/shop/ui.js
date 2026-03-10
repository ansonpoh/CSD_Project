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
    return this.createShopButton(100, 100, 100, 50, 'CLOSE', {
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

  showPurchaseFlash(itemName) {
    const width = this.cameras.main.width;
    const flash = this.add.text(width / 2, 120, `Purchased ${itemName}!`, {
      fontSize: '18px',
      fontStyle: 'bold',
      color: SHOP_PALETTE.textGreen,
      stroke: '#060814',
      strokeThickness: 5,
      backgroundColor: 'rgba(8,10,28,0.9)',
      padding: { x: 14, y: 6 }
    }).setOrigin(0.5);

    this.time.delayedCall(1500, () => flash.destroy());
  }
};
