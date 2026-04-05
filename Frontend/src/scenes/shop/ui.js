import { SHOP_LAYOUT, SHOP_PALETTE } from './constants.js';
import { createUiButton } from '../ui/shared.js';

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
    const width = this.cameras.main.width;
    const buttonWidth = 100;
    const rightPadding = Math.max(16, Math.round(width * 0.02));

    return this.createShopButton(width - rightPadding - (buttonWidth / 2), 100, buttonWidth, 50, 'CLOSE', {
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
    return createUiButton(this, {
      x: cx,
      y: cy,
      width,
      height,
      anchor: 'center',
      label,
      fillNormal: fill,
      fillHover: hoverFill,
      borderNormal: border,
      borderHover: SHOP_PALETTE.borderGlow,
      pressFill: SHOP_PALETTE.btnPress,
      pressBorder: SHOP_PALETTE.borderDim,
      disabled,
      disabledFill: SHOP_PALETTE.btnNormal,
      disabledBorder: SHOP_PALETTE.borderDim,
      disabledTextColor: SHOP_PALETTE.textDim,
      textStyle: {
        fontSize: '14px',
        fontStyle: 'bold',
        color: SHOP_PALETTE.textMain,
        stroke: '#060814',
        strokeThickness: 4
      },
      onPress: onClick
    });
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
