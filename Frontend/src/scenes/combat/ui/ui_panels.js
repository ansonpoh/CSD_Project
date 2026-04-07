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
    const usableHeight = logH - (logPaddingY * 2);
    const lineAdvance = logFontSize + logLineSpacing;
    this.maxBattleLogLines = Math.max(1, Math.floor((usableHeight - logFontSize) / lineAdvance) + 1);

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
    const summary = [
      `Correct: ${this.correctAnswers}/${this.totalQuestions}`,
      `Wrong attempts: ${this.wrongAnswers}`,
      `Accuracy: ${accuracy}%`,
      `Hearts left: ${this.remainingLifelines}/${this.maxLifelines}`,
      won ? 'Reward ready on the map.' : reason
    ].join('\n');

    this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 92, summary, {
      fontSize: '24px',
      align: 'center',
      color: P.textMain,
      stroke: '#060814',
      strokeThickness: 5
    }).setOrigin(0.5);
  }
};
