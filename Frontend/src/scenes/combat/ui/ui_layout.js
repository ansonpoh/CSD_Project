import Phaser from 'phaser';
import { P } from '../constants.js';

export const combatSceneUiLayoutMethods = {
  drawBackdrop(width, height, layout = {}) {
    const topHudInset = Number.isFinite(layout.topHudInset) ? layout.topHudInset : 62;
    const playerAuraX = Number.isFinite(layout.playerX) ? layout.playerX : width * 0.22;
    const playerAuraY = Number.isFinite(layout.playerY) ? layout.playerY : 180;
    const monsterAuraX = Number.isFinite(layout.monsterX) ? layout.monsterX : width * 0.82;
    const monsterAuraY = Number.isFinite(layout.monsterY) ? layout.monsterY : 180;
    this.add.rectangle(width / 2, height / 2, width, height, P.bgDeep);
    for (let i = 0; i < 5; i += 1) {
      const alpha = 0.06 - i * 0.01;
      this.add.rectangle(0, height / 2, 60 + i * 30, height, 0x8b0000, alpha).setOrigin(0, 0.5);
      this.add.rectangle(width, height / 2, 60 + i * 30, height, 0x8b0000, alpha).setOrigin(1, 0.5);
    }
    this.add.circle(playerAuraX, playerAuraY, 120, 0x4193d5, 0.06);
    this.add.circle(monsterAuraX, monsterAuraY, 120, 0x8b0000, 0.08);

    const titleBg = this.add.graphics();
    titleBg.fillStyle(0x1a0510, 1);
    titleBg.fillRect(0, topHudInset, width, 62);
    titleBg.lineStyle(1, P.borderRed, 0.7);
    titleBg.beginPath();
    titleBg.moveTo(0, topHudInset + 61);
    titleBg.lineTo(width, topHudInset + 61);
    titleBg.strokePath();
  },

  createQuizPanel(width, height) {
    const panelX = 50;
    const panelY = height - 560;
    const panelW = width - 100;
    const panelH = 205;

    this.quizPanelLayout = {
      panelX,
      panelY,
      panelW,
      minPanelH: panelH,
      panelBottomPad: 16,
      optionTopGap: 18,
      optionW: Math.floor((panelW - 20) / 2),
      optionH: 64,
      optionGapX: 20,
      optionGapY: 12
    };
    this.quizPanelBg = this.add.graphics();

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

    this.hintMessageText = this.add.text(panelX + 16, panelY + 68, '', this.getCombatTextStyle({
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#93c5fd',
      wordWrap: { width: panelW - 32, useAdvancedWrap: true }
    }));

    this.lifelineText = this.add.text(panelX + panelW - 16, panelY + 14, '', this.getCombatTextStyle({
      fontSize: '20px',
      fontStyle: 'bold',
      color: P.textMain
    })).setOrigin(1, 0);

    this.questionText = this.add.text(panelX + 16, panelY + 94, 'Loading questions...', this.getCombatTextStyle({
      fontSize: '28px',
      fontStyle: 'bold',
      color: P.textMain,
      lineSpacing: 8,
      wordWrap: { width: panelW - 32, useAdvancedWrap: true }
    }));
    this.quizQuestionBaseFontSize = 28;
    this.quizQuestionMinFontSize = 20;

    const {
      optionW,
      optionH
    } = this.quizPanelLayout;
    const optionStartY = panelY + panelH + this.quizPanelLayout.optionTopGap;
    this.quizDefaultOptionStartY = optionStartY;
    this.quizCurrentOptionStartY = optionStartY;

    for (let i = 0; i < 4; i += 1) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = panelX + col * (optionW + this.quizPanelLayout.optionGapX);
      const y = optionStartY + row * (optionH + this.quizPanelLayout.optionGapY);
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

    // Confirm button for multi-select questions (hidden by default)
    const confirmY = optionStartY + 2 * (optionH + this.quizPanelLayout.optionGapY);
    const hintW = 220;
    const hintH = 50;
    const hintX = panelX + panelW - hintW;
    const hintY = panelY - hintH - 10;
    this.hintBtn = this.makeButton(
      hintX,
      hintY,
      hintW,
      hintH,
      'Use Hint',
      0x4a3414,
      0x6b4b1c,
      0xf4c048,
      () => this.handleUseHint()
    );

    this.confirmBtn = this.makeButton(
      panelX + optionW + this.quizPanelLayout.optionGapX,
      confirmY,
      optionW,
      optionH,
      'Confirm Selection',
      0x1a5c2a,
      0x27803d,
      0x4ade80,
      () => this.handleConfirmSelection()
    );
    this.confirmBtn.container.setVisible(false);
    this.confirmBtn.setEnabled(false);

    this.reflowQuizPanelLayout();
    this.refreshQuizMeta();
  },

  reflowQuizPanelLayout() {
    const layout = this.quizPanelLayout;
    if (!layout || !this.quizPanelBg || !this.questionText) return;

    this.questionText.setFontSize(this.quizQuestionBaseFontSize || 28);
    this.questionText.setLineSpacing(8);

    const maxOptionStartY = this.getQuizOptionMaxStartY();
    let metrics = this.computeQuizPanelMetrics(layout);

    while (metrics.minOptionStartY > maxOptionStartY
      && Number(this.questionText.style.fontSize) > (this.quizQuestionMinFontSize || 20)) {
      const nextSize = Math.max((this.quizQuestionMinFontSize || 20), Number(this.questionText.style.fontSize) - 2);
      this.questionText.setFontSize(nextSize);
      this.questionText.setLineSpacing(nextSize >= 26 ? 8 : 6);
      metrics = this.computeQuizPanelMetrics(layout);
    }

    const optionStartY = Phaser.Math.Clamp(
      metrics.minOptionStartY,
      this.quizDefaultOptionStartY,
      maxOptionStartY
    );

    this.quizCurrentOptionStartY = optionStartY;
    this.redrawQuizPanelBackground(layout, metrics.panelH);
    this.positionQuizOptionButtons(optionStartY);
  },

  computeQuizPanelMetrics(layout) {
    const textBottoms = [
      this.questionMetaText ? this.questionMetaText.y + this.questionMetaText.height : layout.panelY,
      this.questionTargetText ? this.questionTargetText.y + this.questionTargetText.height : layout.panelY,
      this.hintMessageText ? this.hintMessageText.y + this.hintMessageText.height : layout.panelY,
      this.questionText ? this.questionText.y + this.questionText.height : layout.panelY
    ];

    const contentBottom = Math.max(...textBottoms);
    const panelH = Math.max(layout.minPanelH, Math.ceil(contentBottom - layout.panelY + layout.panelBottomPad));
    const minOptionStartY = layout.panelY + panelH + layout.optionTopGap;
    return { panelH, minOptionStartY };
  },

  redrawQuizPanelBackground(layout, panelH) {
    this.quizPanelBg.clear();
    this.quizPanelBg.fillStyle(0x081832, 0.98);
    this.quizPanelBg.fillRoundedRect(layout.panelX, layout.panelY, layout.panelW, panelH, 5);
    this.quizPanelBg.lineStyle(2, P.borderBlue, 0.9);
    this.quizPanelBg.strokeRoundedRect(layout.panelX, layout.panelY, layout.panelW, panelH, 5);
  },

  positionQuizOptionButtons(optionStartY) {
    const layout = this.quizPanelLayout;
    if (!layout) return;

    this.optionButtons.forEach((btn, i) => {
      if (!btn?.container) return;
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = layout.panelX + col * (layout.optionW + layout.optionGapX);
      const y = optionStartY + row * (layout.optionH + layout.optionGapY);
      btn.container.setPosition(x, y);
    });

    if (this.confirmBtn?.container) {
      const confirmY = optionStartY + 2 * (layout.optionH + layout.optionGapY);
      this.confirmBtn.container.setPosition(layout.panelX + layout.optionW + layout.optionGapX, confirmY);
    }
  },

  getQuizOptionMaxStartY() {
    const layout = this.quizPanelLayout;
    if (!layout) return Number.POSITIVE_INFINITY;

    const logTop = Number.isFinite(this.battleLogTopY)
      ? this.battleLogTopY
      : this.cameras.main.height - 160;

    const optionsBlockHeight = (2 * layout.optionH) + layout.optionGapY;
    return logTop - optionsBlockHeight - 12;
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


