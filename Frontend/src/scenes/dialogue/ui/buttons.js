import { P } from '../constants.js';

export const dialogueSceneButtonMethods = {
  _makeDlgNavBtn(x, y, label, cb) {
    const w = 38;
    const h = 28;
    const container = this.add.container(x, y);
    const bg = this.add.graphics();

    const draw = (fill, border) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(0, 0, w, h, 4);
      bg.lineStyle(1, border, 0.9);
      bg.strokeRoundedRect(0, 0, w, h, 4);
    };

    draw(P.btnNormal, P.borderGold);
    container.add(bg);
    container.add(this.add.text(w / 2, h / 2, label, {
      fontSize: '14px',
      fontStyle: 'bold',
      color: P.textMain,
      stroke: '#060814',
      strokeThickness: 4
    }).setOrigin(0.5));

    const hit = this.add.rectangle(w / 2, h / 2, w, h, 0, 0).setInteractive({ useHandCursor: true });
    container.add(hit);
    hit.on('pointerover', () => draw(P.btnHover, P.borderGlow));
    hit.on('pointerout', () => draw(P.btnNormal, P.borderGold));
    hit.on('pointerdown', () => draw(P.btnPress, P.borderDim));
    hit.on('pointerup', () => {
      draw(P.btnHover, P.borderGlow);
      cb();
    });
  },

  _makeActionButton(x, y, w, h, label, cb) {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();

    const draw = (fill, border) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(0, 0, w, h, 4);
      bg.lineStyle(1, border, 0.95);
      bg.strokeRoundedRect(0, 0, w, h, 4);
    };

    draw(P.btnNormal, P.borderGold);
    container.add(bg);
    container.add(this.add.text(w / 2, h / 2, label, {
      fontSize: '13px',
      fontStyle: 'bold',
      color: P.textMain,
      stroke: '#060814',
      strokeThickness: 4
    }).setOrigin(0.5));

    const hit = this.add.rectangle(w / 2, h / 2, w, h, 0, 0).setInteractive({ useHandCursor: true });
    container.add(hit);
    hit.on('pointerover', () => draw(P.btnHover, P.borderGlow));
    hit.on('pointerout', () => draw(P.btnNormal, P.borderGold));
    hit.on('pointerdown', () => draw(P.btnPress, P.borderDim));
    hit.on('pointerup', () => {
      draw(P.btnHover, P.borderGlow);
      cb();
    });

    return container;
  }
};
