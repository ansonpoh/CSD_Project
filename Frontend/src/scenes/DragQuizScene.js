import Phaser from 'phaser';

const UI_FONT = 'Trebuchet MS, Verdana, sans-serif';

const P = {
  bgDeep: 0x090f24,
  bgPanel: 0x0d1530,
  btnNormal: 0x2a0f42,
  btnHover: 0x3d1860,
  btnPress: 0x100520,
  borderGold: 0xc8870a,
  borderGlow: 0xf0b030,
  borderDim: 0x604008,
  borderBlue: 0x2a5090,
  textMain: '#f0ecff',
  textSub: '#c0a8e0',
  textGold: '#f4c048',
  textGreen: '#4ade80',
  textRed: '#f87171'
};

export class DragQuizScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DragQuizScene' });

    this.quiz = null;
    this.currentQuestionIndex = 0;

    this.correctAnswers = 0;
    this.wrongAnswers = 0;
    this.totalQuestions = 0;
    this.questionMetaText = null;
    this.questionPromptText = null;
    this.instructionText = null;
    this.feedbackText = null;

    this.submitBtn = null;
    this.nextBtn = null;

    this.slots = [];
    this.tiles = [];

    this.quizCompleted = false;
  }

  init(data) {
    // Optional hooks for future wiring from CombatScene
    this.quiz = this.buildDummyDragDropQuiz();
    this.currentQuestionIndex = 0;
    this.correctAnswers = 0;
    this.wrongAnswers = 0;
    this.quizCompleted = false;

    this.totalQuestions = this.quiz.questions.length;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.drawBackdrop(width, height);
    this.createQuestionPanel(width, height);
    this.createControlButtons(width, height);

    this.renderCurrentQuestion();
    this.refreshMeta();
  }

  //layout

  drawBackdrop(width, height) {
    this.add.rectangle(width / 2, height / 2, width, height, P.bgDeep);

    const titleBg = this.add.graphics();
    titleBg.fillStyle(0x1a0510, 1);
    titleBg.fillRect(0, 0, width, 68);
    titleBg.lineStyle(1, P.borderGold, 0.7);
    titleBg.beginPath();
    titleBg.moveTo(0, 67);
    titleBg.lineTo(width, 67);
    titleBg.strokePath();

    this.add.text(width / 2, 34, 'DRAG & DROP QUIZ', {
      fontFamily: UI_FONT,
      fontSize: '32px',
      fontStyle: 'bold',
      color: P.textGold,
      stroke: '#06101a',
      strokeThickness: 6
    }).setOrigin(0.5);
  }

  createQuestionPanel(width, height) {
    const panelX = 60;
    const panelY = 150;
    const panelW = width - 120;
    const panelH = 160;

    const qBg = this.add.graphics();
    qBg.fillStyle(P.bgPanel, 0.98);
    qBg.fillRoundedRect(panelX, panelY, panelW, panelH, 6);
    qBg.lineStyle(2, P.borderBlue, 0.9);
    qBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 6);

    this.questionMetaText = this.add.text(panelX + 16, panelY + 16, '', {
      fontFamily: UI_FONT,
      fontSize: '18px',
      fontStyle: 'bold',
      color: P.textSub,
      stroke: '#060814',
      strokeThickness: 2
    });

    this.instructionText = this.add.text(panelX + panelW - 16, panelY + 16, '', {
      fontFamily: UI_FONT,
      fontSize: '16px',
      fontStyle: 'bold',
      color: P.textGold,
      stroke: '#060814',
      strokeThickness: 2
    }).setOrigin(1, 0);

    this.questionPromptText = this.add.text(panelX + 16, panelY + 54, '', {
      fontFamily: UI_FONT,
      fontSize: '26px',
      fontStyle: 'bold',
      color: P.textMain,
      stroke: '#060814',
      strokeThickness: 2,
      wordWrap: { width: panelW - 32, useAdvancedWrap: true },
      lineSpacing: 8
    });

    this.feedbackText = this.add.text(panelX + 16, panelY + panelH + 6, '', {
      fontFamily: UI_FONT,
      fontSize: '18px',
      fontStyle: 'bold',
      color: P.textGreen,
      stroke: '#060814',
      strokeThickness: 2
    });

    const slotsAreaY = panelY + panelH + 46;
    const slotsAreaH = 84;
    const tilesAreaY = slotsAreaY + slotsAreaH + 40;

    const slotsBg = this.add.graphics();
    slotsBg.fillStyle(0x081832, 0.95);
    slotsBg.fillRoundedRect(panelX, slotsAreaY, panelW, slotsAreaH, 6);
    slotsBg.lineStyle(1, P.borderBlue, 0.7);
    slotsBg.strokeRoundedRect(panelX, slotsAreaY, panelW, slotsAreaH, 6);

    const tilesBg = this.add.graphics();
    tilesBg.fillStyle(0x050b18, 0.95);
    tilesBg.fillRoundedRect(panelX, tilesAreaY, panelW, 100, 6);
    tilesBg.lineStyle(1, P.borderDim, 0.6);
    tilesBg.strokeRoundedRect(panelX, tilesAreaY, panelW, 100, 6);

    this.layout = {
      panelX,
      panelW,
      slotsAreaY,
      slotsAreaH,
      tilesAreaY
    };
  }

  createControlButtons(width, height) {
    const btnY = height - 80;

    this.submitBtn = this.makeButton(
      width / 2 - 120,
      btnY,
      180,
      46,
      'SUBMIT',
      P.btnNormal,
      P.btnHover,
      P.borderGold,
      () => this.handleSubmit()
    );

    this.nextBtn = this.makeButton(
      width / 2 + 120,
      btnY,
      180,
      46,
      'NEXT',
      0x1a2a52,
      0x2a4278,
      P.borderBlue,
      () => this.handleNext()
    );

    this.nextBtn.setEnabled(false);
  }

  makeButton(x, y, w, h, label, fillNormal, fillHover, borderColor, onClick) {
    const container = this.add.container(x - w / 2, y - h / 2);
    const bg = this.add.graphics();

    const draw = (fill, border, alpha = 1) => {
      bg.clear();
      bg.fillStyle(fill, alpha);
      bg.fillRoundedRect(0, 0, w, h, 5);
      bg.lineStyle(2, border, alpha);
      bg.strokeRoundedRect(0, 0, w, h, 5);
      bg.fillStyle(0xffffff, 0.08 * alpha);
      bg.fillRoundedRect(2, 2, w - 4, h * 0.42, { tl: 4, tr: 4, bl: 0, br: 0 });
    };

    draw(fillNormal, borderColor, 1);

    const labelText = this.add.text(w / 2, h / 2, label, {
      fontFamily: UI_FONT,
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#f7fbff',
      stroke: '#030915',
      strokeThickness: 2
    }).setOrigin(0.5);

    const hit = this.add.rectangle(w / 2, h / 2, w, h, 0, 0)
      .setInteractive({ useHandCursor: true });

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
      setEnabled: (enabled) => {
        if (enabled) {
          hit.setInteractive({ useHandCursor: true });
          container.setAlpha(1);
          draw(fillNormal, borderColor, 1);
        } else {
          hit.disableInteractive();
          container.setAlpha(0.65);
          draw(fillNormal, borderColor, 0.45);
        }
      },
      setText: (text) => {
        labelText.setText(text);
      }
    };
  }

  //build
  buildDummyDragDropQuiz() {
    //dummy data
    return {
      type: 'DRAG_DROP',
      totalQuestions: 3,
      questions: [
        {
          id: 'dd-1',
          type: 'DRAG_DROP',
          prompt: 'Drag the words to build a proper sentence.',
          items: ['Review', 'regularly', 'over', 'time'],
          correctOrder: ['Review', 'regularly', 'over', 'time']
        },
        {
          id: 'dd-2',
          type: 'DRAG_DROP',
          prompt: 'Drag the words to build a proper sentence.',
          items: ['Practice', 'active', 'recall'],
          correctOrder: ['Practice', 'active', 'recall']
        },
        {
          id: 'dd-3',
          type: 'DRAG_DROP',
          prompt: 'Drag the words to build a proper sentence.',
          items: ['accuracy', 'over', 'guessing'],
          correctOrder: ['accuracy', 'over', 'guessing']
        }
      ]
    };
  }

  get currentQuestion() {
    return this.quiz?.questions?.[this.currentQuestionIndex] || null;
  }

  renderCurrentQuestion() {
    this.clearSlotsAndTiles();
    const question = this.currentQuestion;
    if (!question) {
      this.finishQuiz();
      return;
    }

    this.questionPromptText.setText(question.prompt);
    this.instructionText.setText('Drag every tile into a slot');
    this.feedbackText.setText('');

    this.createSlotsForQuestion(question);
    this.createTilesForQuestion(question);

    this.updateSubmitEnabled();
    this.nextBtn.setEnabled(false);
    this.refreshMeta();
  }

  clearSlotsAndTiles() {
    this.slots.forEach((slot) => {
      slot.rect.destroy();
      slot.label.destroy();
    });
    this.tiles.forEach((tile) => {
      tile.container.destroy();
    });
    this.slots = [];
    this.tiles = [];
  }

  createSlotsForQuestion(question) {
    const { panelX, panelW, slotsAreaY, slotsAreaH } = this.layout;
    const count = question.correctOrder.length;
    const slotW = Math.max(90, Math.min(180, Math.floor((panelW - 40) / count)));
    const totalW = slotW * count + 16 * (count - 1);
    const startX = panelX + (panelW - totalW) / 2;
    const centerY = slotsAreaY + slotsAreaH / 2;

    for (let i = 0; i < count; i += 1) {
      const x = startX + i * (slotW + 16);
      const rect = this.add.rectangle(x + slotW / 2, centerY, slotW, 52, 0x050b18, 0.8)
        .setStrokeStyle(2, P.borderBlue, 0.9);

      const label = this.add.text(rect.x, rect.y, `${i + 1}`, {
        fontFamily: UI_FONT,
        fontSize: '18px',
        fontStyle: 'bold',
        color: P.textSub
      }).setOrigin(0.5);

      this.slots.push({
        rect,
        label,
        assignedTile: null,
        index: i
      });
    }
  }

  createTilesForQuestion(question) {
    const { panelX, panelW, tilesAreaY } = this.layout;
    const items = [...question.items];
    Phaser.Utils.Array.Shuffle(items);

    const tileW = 140;
    const tileH = 46;
    const padding = 14;
    const tilesPerRow = Math.max(1, Math.floor((panelW - padding) / (tileW + padding)));
    const totalRows = Math.ceil(items.length / tilesPerRow);

    let row = 0;
    let col = 0;

    items.forEach((word, idx) => {
      const baseX = panelX + padding + col * (tileW + padding);
      const baseY = tilesAreaY + 16 + row * (tileH + 12);

      const container = this.add.container(baseX, baseY);
      const bg = this.add.graphics();

      bg.fillStyle(P.btnNormal, 1);
      bg.fillRoundedRect(0, 0, tileW, tileH, 6);
      bg.lineStyle(2, P.borderGold, 0.8);
      bg.strokeRoundedRect(0, 0, tileW, tileH, 6);
      bg.fillStyle(0xffffff, 0.08);
      bg.fillRoundedRect(2, 2, tileW - 4, tileH * 0.45, { tl: 5, tr: 5, bl: 0, br: 0 });

      const label = this.add.text(tileW / 2, tileH / 2, word, {
        fontFamily: UI_FONT,
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#f7fbff',
        stroke: '#030915',
        strokeThickness: 2
      }).setOrigin(0.5);

      const hit = this.add.rectangle(tileW / 2, tileH / 2, tileW, tileH, 0x000000, 0)
        .setInteractive({ draggable: true, useHandCursor: true });

      container.add([bg, label, hit]);

      container.originalX = baseX;
      container.originalY = baseY;
      container.word = word;
      container.assignedSlot = null;

      this.input.setDraggable(hit);

      hit.on('dragstart', () => {
        container.setDepth(10);
      });

      hit.on('drag', (pointer, dragX, dragY) => {
        container.x = dragX - tileW / 2;
        container.y = dragY - tileH / 2;
      });

      hit.on('dragend', () => {
        this.handleTileDrop(container, tileW, tileH);
      });

      this.tiles.push({
        container,
        bg,
        label,
        hit,
        word,
        index: idx
      });

      col += 1;
      if (col >= tilesPerRow) {
        col = 0;
        row += 1;
      }

      if (row >= totalRows) {
        row = totalRows - 1;
      }
    });
  }

  handleTileDrop(container, tileW, tileH) {
    if (!this.slots.length) return;

    if (container.assignedSlot) {
      container.assignedSlot.assignedTile = null;
      container.assignedSlot = null;
    }

    const tileCenterX = container.x + tileW / 2;
    const tileCenterY = container.y + tileH / 2;

    let bestSlot = null;
    let bestDistanceSq = Number.POSITIVE_INFINITY;

    this.slots.forEach((slot) => {
      const dx = tileCenterX - slot.rect.x;
      const dy = tileCenterY - slot.rect.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDistanceSq) {
        bestDistanceSq = distSq;
        bestSlot = slot;
      }
    });

    const maxSnapDistSq = 160 * 160;

    if (bestSlot && bestDistanceSq <= maxSnapDistSq) {
      if (bestSlot.assignedTile) {
        const other = bestSlot.assignedTile;
        other.container.x = other.container.originalX;
        other.container.y = other.container.originalY;
        other.container.assignedSlot = null;
      }

      container.x = bestSlot.rect.x - tileW / 2;
      container.y = bestSlot.rect.y - tileH / 2;
      container.assignedSlot = bestSlot;
      bestSlot.assignedTile = this.tiles.find((t) => t.container === container);
    } else {
      container.x = container.originalX;
      container.y = container.originalY;
      container.assignedSlot = null;
    }

    this.updateSubmitEnabled();
  }

  updateSubmitEnabled() {
    const allPlaced = this.slots.length > 0 && this.slots.every((slot) => slot.assignedTile);
    this.submitBtn.setEnabled(allPlaced && !this.quizCompleted);

    if (!allPlaced) {
      this.instructionText.setText('Place every tile into a slot to submit');
    } else {
      this.instructionText.setText('Press SUBMIT to lock your answer');
    }
  }

  handleSubmit() {
    if (this.quizCompleted) return;
    const question = this.currentQuestion;
    if (!question) return;

    const allPlaced = this.slots.length > 0 && this.slots.every((slot) => slot.assignedTile);
    if (!allPlaced) {
      this.feedbackText.setColor(P.textRed);
      this.feedbackText.setText('You must place all tiles before submitting.');
      return;
    }

    const userOrder = this.slots.map((slot) => slot.assignedTile.word);
    const isCorrect = userOrder.length === question.correctOrder.length &&
      userOrder.every((word, index) => word === question.correctOrder[index]);

    if (isCorrect) {
      this.handleCorrect();
    } else {
      this.handleWrong();
    }

    this.submitBtn.setEnabled(false);
    this.nextBtn.setEnabled(!this.quizCompleted);
  }

  handleCorrect() {
    this.correctAnswers += 1;

    this.feedbackText.setColor(P.textGreen);
    this.feedbackText.setText('Correct!');

    this.tintSlots(true);
    this.refreshMeta();
  }

  handleWrong() {
    this.wrongAnswers += 1;

    this.feedbackText.setColor(P.textRed);
    this.feedbackText.setText('Not quite, try the next one.');

    this.tintSlots(false);
    this.refreshMeta();
  }

  tintSlots(isCorrect) {
    const fill = isCorrect ? 0x1f6d34 : 0x7a1f2b;
    const border = isCorrect ? 0x4ade80 : 0xf87171;

    this.slots.forEach((slot) => {
      slot.rect.setFillStyle(fill, 0.95);
      slot.rect.setStrokeStyle(2, border, 1);
    });
  }

  handleNext() {
    if (this.quizCompleted) return;
    this.currentQuestionIndex += 1;
    if (this.currentQuestionIndex >= this.totalQuestions) {
      this.finishQuiz(this.correctAnswers > this.wrongAnswers);
      return;
    }

    this.renderCurrentQuestion();
  }

  finishQuiz(playerWon = false) {
    if (this.quizCompleted) return;
    this.quizCompleted = true;
    this.submitBtn.setEnabled(false);
    this.nextBtn.setEnabled(false);

    const answered = Math.max(1, this.correctAnswers + this.wrongAnswers);
    const accuracy = Math.round((this.correctAnswers / answered) * 100);
    const summary = playerWon
      ? `Quiz complete! Nice work.\nCorrect: ${this.correctAnswers}/${this.totalQuestions}\nAccuracy: ${accuracy}%`
      : `Quiz complete.\nCorrect: ${this.correctAnswers}/${this.totalQuestions}\nAccuracy: ${accuracy}%`;

    this.feedbackText.setColor(playerWon ? P.textGreen : P.textSub);
    this.feedbackText.setText(summary);

    this.refreshMeta();
  }

  refreshMeta() {
    const current = Math.min(this.currentQuestionIndex + 1, Math.max(1, this.totalQuestions || 1));
    const answered = Math.max(1, this.correctAnswers + this.wrongAnswers);
    const accuracy = Math.round((this.correctAnswers / answered) * 100);

    this.questionMetaText?.setText(
      `DRAG_DROP  ·  Question ${current}/${Math.max(1, this.totalQuestions || 1)}  |  Correct ${this.correctAnswers}`
    );
  }
}

