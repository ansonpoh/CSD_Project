import { P } from '../constants.js';

export const combatSceneUiLayoutMethods = {
  drawBackdrop(width, height) {
    this.add.rectangle(width / 2, height / 2, width, height, P.bgDeep);
    for (let i = 0; i < 5; i += 1) {
      const alpha = 0.06 - i * 0.01;
      this.add.rectangle(0, height / 2, 60 + i * 30, height, 0x8b0000, alpha).setOrigin(0, 0.5);
      this.add.rectangle(width, height / 2, 60 + i * 30, height, 0x8b0000, alpha).setOrigin(1, 0.5);
    }
    this.add.circle(width * 0.25, 180, 120, 0x4193d5, 0.06);
    this.add.circle(width * 0.82, 180, 120, 0x8b0000, 0.08);

    const titleBg = this.add.graphics();
    titleBg.fillStyle(0x1a0510, 1);
    titleBg.fillRect(0, 0, width, 62);
    titleBg.lineStyle(1, P.borderRed, 0.7);
    titleBg.beginPath();
    titleBg.moveTo(0, 61);
    titleBg.lineTo(width, 61);
    titleBg.strokePath();
  },

  createQuizPanel(width, height) {
    const panelX = 50;
    const panelY = height - 560;
    const panelW = width - 100;
    const panelH = 205;

    const qBg = this.add.graphics();
    qBg.fillStyle(0x081832, 0.98);
    qBg.fillRoundedRect(panelX, panelY, panelW, panelH, 5);
    qBg.lineStyle(2, P.borderBlue, 0.9);
    qBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 5);

    this.questionMetaText = this.add.text(panelX + 16, panelY + 14, 'Preparing quiz...', this.getCombatTextStyle({
      fontSize: '20px',
      fontStyle: 'bold',
      color: P.textSub
    }));

    this.questionTargetText = this.add.text(panelX + 16, panelY + 44, '', this.getCombatTextStyle({
      fontSize: '20px',
      fontStyle: 'bold',
      color: P.textGold
    }));

    this.lifelineText = this.add.text(panelX + panelW - 16, panelY + 14, '', this.getCombatTextStyle({
      fontSize: '20px',
      fontStyle: 'bold',
      color: P.textMain
    })).setOrigin(1, 0);

    this.questionText = this.add.text(panelX + 16, panelY + 82, 'Loading questions...', this.getCombatTextStyle({
      fontSize: '30px',
      fontStyle: 'bold',
      color: P.textMain,
      lineSpacing: 8,
      wordWrap: { width: panelW - 32, useAdvancedWrap: true }
    }));

    const optionW = Math.floor((panelW - 20) / 2);
    const optionH = 64;
    const optionStartY = panelY + panelH + 18;

    for (let i = 0; i < 4; i += 1) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = panelX + col * (optionW + 20);
      const y = optionStartY + row * (optionH + 12);
      const btn = this.makeButton(
        x,
        y,
        optionW,
        optionH,
        `Option ${i + 1}`,
        P.btnBlue,
        P.btnBlueHov,
        P.borderBlue,
        () => this.handleAnswerSelection(i)
      );
      this.optionButtons.push(btn);
    }

    this.refreshQuizMeta();
  },

  createActionButtons(width) {
    this.runBtn = this.makeButton(
      width - 170,
      74,
      140,
      44,
      'RUN',
      P.btnDanger,
      P.btnDangerHov,
      P.borderRed,
      () => this.runAway()
    );

    this.exitBtn = this.makeButton(
      width - 170,
      74,
      140,
      44,
      'EXIT',
      P.btnBlue,
      P.btnBlueHov,
      P.borderBlue,
      () => this.exitBattle()
    );
    this.exitBtn.container.setVisible(false);
    this.exitBtn.setEnabled(false);
  },

  createHealthBars(width) {
    const barW = 260;
    const barH = 18;
    const y = 262;

    this.add.text(50, y - 26, 'YOUR HP', {
      fontSize: '13px',
      fontStyle: 'bold',
      color: P.textSub,
      stroke: '#060814',
      strokeThickness: 3
    });

    const playerTrack = this.add.graphics();
    playerTrack.fillStyle(P.hpTrack, 1);
    playerTrack.fillRoundedRect(50, y, barW, barH, 4);
    playerTrack.lineStyle(1, P.borderGold, 0.6);
    playerTrack.strokeRoundedRect(50, y, barW, barH, 4);

    this.playerHPBar = this.add.graphics();
    this.drawHpBar(this.playerHPBar, 52, y + 2, barW - 4, barH - 4, 1, P.hpGreen);

    this.add.text(width - 50 - barW, y - 26, 'ENEMY HP', {
      fontSize: '13px',
      fontStyle: 'bold',
      color: P.textSub,
      stroke: '#060814',
      strokeThickness: 3
    });

    const monsterTrack = this.add.graphics();
    monsterTrack.fillStyle(P.hpTrack, 1);
    monsterTrack.fillRoundedRect(width - 50 - barW, y, barW, barH, 4);
    monsterTrack.lineStyle(1, P.borderRed, 0.6);
    monsterTrack.strokeRoundedRect(width - 50 - barW, y, barW, barH, 4);

    this.monsterHPBar = this.add.graphics();
    this.drawHpBar(this.monsterHPBar, width - 50 - barW + 2, y + 2, barW - 4, barH - 4, 1, P.hpRed);

    this._barW = barW - 4;
    this._barH = barH - 4;
    this._pBarX = 52;
    this._pBarY = y + 2;
    this._mBarX = width - 50 - barW + 2;
    this._mBarY = y + 2;
  }
};


