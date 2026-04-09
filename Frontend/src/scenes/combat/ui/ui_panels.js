import { P } from '../constants.js';

export const combatSceneUiPanelMethods = {
  showQuizLoadingScreen(message = 'Preparing quiz encounter...') {
    if (this.quizLoadingUi?.container?.active) return;

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const container = this.add.container(0, 0).setDepth(10000);

    const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x030712, 0.88)
      .setInteractive({ useHandCursor: false });

    const cardW = Math.min(620, width - 80);
    const cardH = 210;
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;

    const card = this.add.graphics();
    card.fillStyle(0x0b1730, 0.98);
    card.fillRoundedRect(cardX, cardY, cardW, cardH, 10);
    card.lineStyle(2, P.borderBlue, 0.95);
    card.strokeRoundedRect(cardX, cardY, cardW, cardH, 10);

    const title = this.add.text(width / 2, cardY + 64, 'LOADING QUIZ', this.getCombatTextStyle({
      fontSize: '36px',
      fontStyle: 'bold',
      color: P.textGold
    })).setOrigin(0.5);

    const subtitle = this.add.text(width / 2, cardY + 128, message, this.getCombatTextStyle({
      fontSize: '20px',
      fontStyle: 'bold',
      color: P.textMain
    })).setOrigin(0.5);

    const dotSpacing = 26;
    const centerDotX = width / 2;
    const dotY = cardY + 172;
    const dots = [-1, 0, 1].map((offset) => this.add.circle(centerDotX + (offset * dotSpacing), dotY, 6, 0xf4c048, 1));

    container.add([backdrop, card, title, subtitle, ...dots]);
    const pulseTween = this.tweens.add({
      targets: dots,
      alpha: 0.2,
      duration: 350,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
      delay: this.tweens.stagger(130)
    });

    this.quizLoadingUi = { container, pulseTween };
  },

  hideQuizLoadingScreen() {
    const loadingUi = this.quizLoadingUi;
    if (!loadingUi) return;

    loadingUi.pulseTween?.stop?.();
    loadingUi.container?.destroy?.(true);
    this.quizLoadingUi = null;
  },

  createBattleLog(width, height) {
    const logY = height - 160;
    const logW = width - 100;
    const logH = 130;
    const logPaddingY = 12;
    const logFontSize = 19;
    const logLineSpacing = 8;
    this.maxBattleLogLines = 3;

    const logBg = this.add.graphics();
    logBg.fillStyle(P.bgPanel, 0.92);
    logBg.fillRoundedRect(50, logY, logW, logH, 5);
    logBg.lineStyle(1, P.borderGold, 0.4);
    logBg.strokeRoundedRect(50, logY, logW, logH, 5);

    this.logText = this.add.text(66, logY + logPaddingY, '', this.getCombatTextStyle({
      fontSize: `${logFontSize}px`,
      fontStyle: 'bold',
      color: P.textMain,
      lineSpacing: logLineSpacing
    }));
    this.battleLogTopY = logY;
  },

  drawHpBar(gfx, x, y, maxW, h, pct, color) {
    gfx.clear();
    const fillW = Math.max(0, Math.floor(maxW * pct));
    if (fillW <= 0) return;
    gfx.fillStyle(color, 1);
    gfx.fillRoundedRect(x, y, fillW, h, 3);
    gfx.fillStyle(0xffffff, 0.18);
    gfx.fillRoundedRect(x, y, fillW, Math.floor(h * 0.45), { tl: 3, tr: 3, bl: 0, br: 0 });
  },

  updateHealthBars() {
    this.drawHpBar(this.playerHPBar, this._pBarX, this._pBarY, this._barW, this._barH, this.playerHP / 100, P.hpGreen);
    this.drawHpBar(this.monsterHPBar, this._mBarX, this._mBarY, this._barW, this._barH, this.monsterHP / 100, P.hpRed);
  },

  addLog(message) {
    this.battleLog.push(message);
    const maxLines = Number.isFinite(this.maxBattleLogLines) ? this.maxBattleLogLines : 4;
    while (this.battleLog.length > maxLines) this.battleLog.shift();
    this.logText.setText(this.battleLog.join('\n'));
  },

  showAnswerFeedback(selectedOptionIndex, isCorrect) {
    const selected = this.optionButtons[selectedOptionIndex];
    if (!selected) return;

    const fill = isCorrect ? 0x1f6d34 : 0x7a1f2b;
    const border = isCorrect ? 0x4ade80 : 0xf87171;
    selected.draw(fill, border, 1);

    this.time.delayedCall(300, () => {
      if (!selected.container?.active) return;
      selected.draw(selected.fillNormal, selected.borderColor, 0.45);
    });
  },

  renderOutcomeSummary(won, reason = '') {
    const attempts = Math.max(1, this.correctAnswers + this.wrongAnswers);
    const accuracy = Math.round((this.correctAnswers / attempts) * 100);
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const title = won ? 'VICTORY' : 'DEFEAT';
    const titleColor = won ? P.textGreen : P.textRed;
    const headerBorder = won ? 0x2f855a : P.borderRed;
    const headerFill = won ? 0x0d2a1b : 0x2a0f16;
    const cardW = Math.min(760, width - 90);
    const cardH = 452;
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;
    const message = won
      ? (this.isRematch ? 'Practice complete. Rematches do not grant rewards.' : 'Reward is ready on the map.')
      : String(reason || 'You were defeated. Try again from the map.');

    const overlay = this.add.container(0, 0).setDepth(9500);
    const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x030712, 0.82);

    const card = this.add.graphics();
    card.fillStyle(P.bgPanel, 0.98);
    card.fillRoundedRect(cardX, cardY, cardW, cardH, 10);
    card.lineStyle(2, P.borderBlue, 0.95);
    card.strokeRoundedRect(cardX, cardY, cardW, cardH, 10);
    card.fillStyle(headerFill, 1);
    card.fillRoundedRect(cardX + 2, cardY + 2, cardW - 4, 96, { tl: 8, tr: 8, bl: 0, br: 0 });
    card.lineStyle(2, headerBorder, 0.95);
    card.beginPath();
    card.moveTo(cardX + 2, cardY + 98);
    card.lineTo(cardX + cardW - 2, cardY + 98);
    card.strokePath();

    const titleText = this.add.text(width / 2, cardY + 42, title, this.getCombatTextStyle({
      fontSize: '58px',
      fontStyle: 'bold',
      color: titleColor
    })).setOrigin(0.5);

    const statusText = this.add.text(width / 2, cardY + 80, won ? 'Encounter cleared' : 'Encounter failed', this.getCombatTextStyle({
      fontSize: '22px',
      fontStyle: 'bold',
      color: P.textSub
    })).setOrigin(0.5);

    const statRows = [
      ['Score', `${this.correctAnswers}/${this.totalQuestions}`],
      ['Wrong attempts', `${this.wrongAnswers}`],
      ['Accuracy', `${accuracy}%`],
      ['Hearts left', `${this.remainingLifelines}/${this.maxLifelines}`]
    ];

    const rowX = cardX + 26;
    const rowW = cardW - 52;
    const rowStartY = cardY + 116;
    const rowH = 48;
    const rowGap = 10;
    const rowItems = [];

    statRows.forEach(([label, value], idx) => {
      const y = rowStartY + idx * (rowH + rowGap);
      const rowBg = this.add.graphics();
      rowBg.fillStyle(0x111a36, 0.9);
      rowBg.fillRoundedRect(rowX, y, rowW, rowH, 6);
      rowBg.lineStyle(1, P.borderBlue, 0.75);
      rowBg.strokeRoundedRect(rowX, y, rowW, rowH, 6);

      const labelText = this.add.text(rowX + 16, y + rowH / 2, label, this.getCombatTextStyle({
        fontSize: '22px',
        fontStyle: 'bold',
        color: P.textSub
      })).setOrigin(0, 0.5);

      const valueText = this.add.text(rowX + rowW - 16, y + rowH / 2, value, this.getCombatTextStyle({
        fontSize: '24px',
        fontStyle: 'bold',
        color: P.textMain
      })).setOrigin(1, 0.5);

      rowItems.push(rowBg, labelText, valueText);
    });

    const rowsBottomY = rowStartY + (statRows.length * rowH) + ((statRows.length - 1) * rowGap);
    const footerY = cardY + cardH - 28;
    const messageY = rowsBottomY + 18;

    const messageText = this.add.text(width / 2, messageY, message, this.getCombatTextStyle({
      fontSize: '21px',
      fontStyle: 'bold',
      color: won ? P.textGreen : P.textRed,
      align: 'center',
      wordWrap: { width: cardW - 44, useAdvancedWrap: true }
    })).setOrigin(0.5, 0);

    const maxMessageBottom = footerY - 26;
    if (messageText.getBottomCenter().y > maxMessageBottom) {
      messageText.setFontSize(18);
      if (messageText.getBottomCenter().y > maxMessageBottom) {
        messageText.setY(Math.max(messageY, maxMessageBottom - messageText.height));
      }
    }

    const footerText = this.add.text(width / 2, footerY, 'Select EXIT to return to the map.', this.getCombatTextStyle({
      fontSize: '18px',
      fontStyle: 'bold',
      color: P.textSub
    })).setOrigin(0.5);

    overlay.add([backdrop, card, titleText, statusText, ...rowItems, messageText, footerText]);
  }
};
