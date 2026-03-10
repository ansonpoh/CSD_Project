import { MAX_LIFELINES, P } from '../constants.js';

export const combatSceneUiPanelMethods = {
  createBattleLog(width, height) {
    const logY = height - 160;
    const logW = width - 100;

    const logBg = this.add.graphics();
    logBg.fillStyle(P.bgPanel, 0.92);
    logBg.fillRoundedRect(50, logY, logW, 130, 5);
    logBg.lineStyle(1, P.borderGold, 0.4);
    logBg.strokeRoundedRect(50, logY, logW, 130, 5);

    this.logText = this.add.text(66, logY + 12, '', this.getCombatTextStyle({
      fontSize: '19px',
      fontStyle: 'bold',
      color: P.textMain,
      lineSpacing: 8
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
    if (this.battleLog.length > 5) this.battleLog.shift();
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
    const answered = Math.max(1, this.currentQuestionIndex);
    const accuracy = Math.round((this.correctAnswers / answered) * 100);
    const summary = [
      `Correct: ${this.correctAnswers}/${this.totalQuestions}`,
      `Accuracy: ${accuracy}%`,
      `Hearts left: ${this.remainingLifelines}/${MAX_LIFELINES}`,
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
