import { P, UI_FONT } from '../constants.js';

export const combatSceneUiControlMethods = {
  getCombatTextStyle(overrides = {}) {
    return {
      fontFamily: UI_FONT,
      stroke: '#060814',
      strokeThickness: 2,
      ...overrides
    };
  },

  makeButton(x, y, w, h, label, fillNormal, fillHover, borderColor, onClick) {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();

    const draw = (fill, border, alpha = 1) => {
      bg.clear();
      bg.fillStyle(fill, alpha);
      bg.fillRoundedRect(0, 0, w, h, 5);
      bg.lineStyle(2, border, alpha);
      bg.strokeRoundedRect(0, 0, w, h, 5);
      bg.fillStyle(0xffffff, 0.06 * alpha);
      bg.fillRoundedRect(2, 2, w - 4, h * 0.42, { tl: 4, tr: 4, bl: 0, br: 0 });
    };

    draw(fillNormal, borderColor, 1);

    const labelText = this.add.text(w / 2, h / 2, label, {
      fontFamily: UI_FONT,
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#f7fbff',
      stroke: '#030915',
      strokeThickness: 2,
      align: 'center',
      wordWrap: { width: w - 22, useAdvancedWrap: true }
    }).setOrigin(0.5);

    const hit = this.add.rectangle(w / 2, h / 2, w, h, 0, 0).setInteractive({ useHandCursor: true });

    container.add([bg, labelText, hit]);

    hit.on('pointerover', () => draw(fillHover, P.borderGlow, 1));
    hit.on('pointerout', () => draw(fillNormal, borderColor, 1));
    hit.on('pointerdown', () => draw(P.btnPress, P.borderDim, 1));
    hit.on('pointerup', () => {
      draw(fillHover, P.borderGlow, 1);
      onClick();
    });

    return {
      container,
      labelText,
      hit,
      draw,
      fillNormal,
      fillHover,
      borderColor,
      width: w,
      height: h,
      setEnabled: (enabled) => {
        if (enabled) {
          hit.setInteractive({ useHandCursor: true });
          draw(fillNormal, borderColor, 1);
          container.setAlpha(1);
        } else {
          hit.disableInteractive();
          draw(fillNormal, borderColor, 0.45);
          container.setAlpha(0.8);
        }
      },
      setText: (text) => {
        labelText.setText(text);
      }
    };
  }
};
