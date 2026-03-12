import Phaser from 'phaser';

const UI_FONT = 'Trebuchet MS, Verdana, sans-serif';

const P = {
  bgDeep: 0x090f24,
  bgPanel: 0x0d1530,
  bgScenario: 0x081832,
  btnNormal: 0x2a0f42,
  btnHover: 0x3d1860,
  btnPress: 0x2a1043,
  btnBlue: 0x1a2a52,
  btnBlueHov: 0x2a4278,
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

export class ScenarioQuizScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ScenarioQuizScene' });

    this.quiz = null;
    this.currentQuestionIndex = 0;
    this.totalQuestions = 0;

    this.correctAnswers = 0;
    this.wrongAnswers = 0;

    this.selectedOptionIndex = null;
    this.answerLocked = false;
    this.quizCompleted = false;

    this.questionMetaText = null;
    this.scenarioTitleText = null;
    this.scenarioText = null;
    this.questionPromptText = null;
    this.feedbackText = null;

    this.optionButtons = [];
    this.submitBtn = null;
    this.nextBtn = null;
  }

  init() {
    // Dummy values
    this.quiz = this.buildDummyScenarioQuiz();
    this.currentQuestionIndex = 0;
    this.totalQuestions = this.quiz.questions.length;
    this.correctAnswers = 0;
    this.wrongAnswers = 0;
    this.selectedOptionIndex = null;
    this.answerLocked = false;
    this.quizCompleted = false;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.drawBackdrop(width, height);
    this.createQuestionPanel(width, height);
    this.createOptionButtons(width, height);
    this.createControlButtons(width, height);

    this.renderCurrentQuestion();
    this.refreshMeta();
  }

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

    this.add.text(width / 2, 34, 'SCENARIO QUIZ', {
      fontFamily: UI_FONT,
      fontSize: '32px',
      fontStyle: 'bold',
      color: P.textGold,
      stroke: '#06101a',
      strokeThickness: 6
    }).setOrigin(0.5);
  }

  createQuestionPanel(width, height) {
    const panelW = Math.min(1120, width - 180);
    const panelH = Math.min(720, height - 140);
    const panelX = width / 2 - panelW / 2;
    const panelY = height / 2 - panelH / 2;

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

    const scenarioBoxX = panelX + 16;
    const scenarioBoxY = panelY + 52;
    const scenarioBoxW = panelW - 32;
    const scenarioBoxH = 170;

    const scenarioBg = this.add.graphics();
    scenarioBg.fillStyle(P.bgScenario, 0.95);
    scenarioBg.fillRoundedRect(scenarioBoxX, scenarioBoxY, scenarioBoxW, scenarioBoxH, 6);
    scenarioBg.lineStyle(1, P.borderBlue, 0.7);
    scenarioBg.strokeRoundedRect(scenarioBoxX, scenarioBoxY, scenarioBoxW, scenarioBoxH, 6);

    this.scenarioTitleText = this.add.text(scenarioBoxX + 14, scenarioBoxY + 12, 'SCENARIO', {
      fontFamily: UI_FONT,
      fontSize: '18px',
      fontStyle: 'bold',
      color: P.textGold,
      stroke: '#060814',
      strokeThickness: 2
    });

    this.scenarioText = this.add.text(scenarioBoxX + 14, scenarioBoxY + 44, '', {
      fontFamily: UI_FONT,
      fontSize: '19px',
      fontStyle: 'bold',
      color: P.textMain,
      stroke: '#060814',
      strokeThickness: 2,
      wordWrap: { width: scenarioBoxW - 28, useAdvancedWrap: true },
      lineSpacing: 6
    });

    this.questionPromptText = this.add.text(panelX + 16, scenarioBoxY + scenarioBoxH + 18, '', {
      fontFamily: UI_FONT,
      fontSize: '26px',
      fontStyle: 'bold',
      color: P.textMain,
      stroke: '#060814',
      strokeThickness: 2,
      wordWrap: { width: panelW - 32, useAdvancedWrap: true },
      lineSpacing: 8
    });

    this.feedbackText = this.add.text(panelX + 16, panelY + panelH - 450, '', {
      fontFamily: UI_FONT,
      fontSize: '18px',
      fontStyle: 'bold',
      color: P.textGreen,
      stroke: '#060814',
      strokeThickness: 2,
      wordWrap: { width: panelW - 32, useAdvancedWrap: true }
    });

    this.layout = {
      panelX,
      panelY,
      panelW,
      panelH
    };
  }

  createOptionButtons(width) {
    const { panelX, panelY, panelW, panelH } = this.layout;
    const optionW = Math.floor((panelW - 20) / 2);
    const optionH = 72;
    const optionStartY = panelY + panelH - 220;

    this.optionButtons = [];
    for (let i = 0; i < 4; i += 1) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = panelX + col * (optionW + 20);
      const y = optionStartY + row * (optionH + 14);

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
  }

  createControlButtons(width, height) {
    const { panelY, panelH } = this.layout;
    const btnY = panelY + panelH - 56;

    this.submitBtn = this.makeButton(
      width / 2 - 500,
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
      width / 2 + 300,
      btnY,
      180,
      46,
      'NEXT',
      P.btnBlue,
      P.btnBlueHov,
      P.borderBlue,
      () => this.handleNext()
    );

    this.submitBtn.setEnabled(false);
    this.nextBtn.setEnabled(false);
  }

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
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#f7fbff',
      stroke: '#030915',
      strokeThickness: 2,
      align: 'center',
      wordWrap: { width: w - 22, useAdvancedWrap: true }
    }).setOrigin(0.5);

    const hit = this.add.rectangle(w / 2, h / 2, w, h, 0, 0)
      .setInteractive({ useHandCursor: true });

    container.add([bg, labelText, hit]);

    hit.on('pointerover', () => draw(fillHover, P.borderGlow, 1));
    hit.on('pointerout', () => draw(fillNormal, borderColor, 1));
    hit.on('pointerdown', () => draw(P.btnPress, P.borderDim, 1));
    hit.on('pointerup', () => {
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

  buildDummyScenarioQuiz() {
    return {
      type: 'SCENARIO',
      totalQuestions: 3,
      questions: [
        {
          id: 'sc-1',
          type: 'SCENARIO',
          scenario:
            'A 10/10 baddie passes by you and you want to rizz her up.',
          prompt: 'What\'s the best gyat move to win her over?',
          options: [
            'Full send it and hope she catches the vibe.',
            'Stay bet, let her make the first move, then cook.',
            'NPC out and regen your social battery.',
            'Cap hard and pretend you\'re the main character.'
          ],
          correctIndex: 1,
          explanation: '[Translation: Playing it cool and letting her show interest first is less risky than going too hard too fast. Think of it like waiting for the right moment instead of rushing in.]'
        },
        {
          id: 'sc-2',
          type: 'SCENARIO',
          scenario:
            'You and the squad are holding it down at the function. An ally clocks that some hater is throwing shade from the corner. You could go confront them, but you might leave your friend alone in the convo.',
          prompt: 'What\'s the most sigma move to protect the squad\'s vibes?',
          options: [
            'Ghost your friend and go confront - haters can\'t be sliding.',
            'Hold it down and signal your other homie to deal with the hater.',
            'Yolo it and push through the whole crowd.',
            'Touch grass and wait for the hater to get bored.'
          ],
          correctIndex: 1,
          explanation: '[Translation: Stay with your friend - that\'s your priority. Just text or signal someone else to handle the problem. Don\'t leave your friend alone just to deal with something else.]'
        },
        {
          id: 'sc-3',
          type: 'SCENARIO',
          scenario:
            'You just got hit with some major side-eye from the group. They\'re looking to cook you next. You\'re not sure if they\'re about to come for you, but you notice them pause for a sec.',
          prompt: 'What\'s the best "no cap" move when you\'re not sure what\'s about to go down?',
          options: [
            'Start beef immediately - only way to not look mid.',
            'Lowkey back up, read the room, then decide.',
            'Flex your fit even if it\'s not hitting.',
            'Freeze up and hope they don\'t notice you.'
          ],
          correctIndex: 1,
          explanation: '[Translation: When you\'re unsure what\'s about to happen, the smart move is to create some space and watch for a second. This way you don\'t make things worse and you can figure out what\'s really going on before you act.]'
        }
      ]
    };
  }

  get currentQuestion() {
    return this.quiz?.questions?.[this.currentQuestionIndex] || null;
  }

  renderCurrentQuestion() {
    const q = this.currentQuestion;
    if (!q) {
      this.finishQuiz();
      return;
    }

    this.selectedOptionIndex = null;
    this.answerLocked = false;
    this.quizCompleted = false;
    this.feedbackText.setText('');

    this.scenarioText.setText(q.scenario || '');
    this.questionPromptText.setText(q.prompt || '');

    this.optionButtons.forEach((btn, idx) => {
      btn.setEnabled(true);
      btn.draw(btn.fillNormal, btn.borderColor, 1);
      btn.container.setAlpha(1);
      btn.setText(q.options?.[idx] ?? `Option ${idx + 1}`);
      btn.container.setVisible(Boolean(q.options?.[idx]));
    });

    this.submitBtn.setEnabled(false);
    this.nextBtn.setEnabled(false);
    this.refreshMeta();
  }

  handleAnswerSelection(optionIndex) {
    if (this.quizCompleted || this.answerLocked) return;
    if (!this.currentQuestion) return;
    if (!this.optionButtons[optionIndex]?.container?.visible) return;

    this.selectedOptionIndex = optionIndex;
    this.submitBtn.setEnabled(true);
    this.feedbackText.setText('');

    this.optionButtons.forEach((btn, idx) => {
    if (!btn?.container?.visible) return;
        btn.hit.off('pointerout');
        btn.hit.off('pointerover');

        if (idx === optionIndex) {
            btn.draw(P.btnPress, P.borderGlow, 1);
            btn.hit.on('pointerover', () => btn.draw(P.btnHover, P.borderGlow, 1));
            btn.hit.on('pointerout', () => btn.draw(P.btnPress, P.borderGlow, 1));
        } else {
            btn.draw(btn.fillNormal, btn.borderColor, 0.9);
            btn.hit.on('pointerover', () => btn.draw(btn.fillHover, P.borderGlow, 1));
            btn.hit.on('pointerout', () => btn.draw(btn.fillNormal, btn.borderColor, 0.9));
        }
    });
  }

  handleSubmit() {
    if (this.quizCompleted || this.answerLocked) return;
    const q = this.currentQuestion;
    if (!q) return;
    if (this.selectedOptionIndex === null) {
      this.feedbackText.setColor(P.textRed);
      this.feedbackText.setText('Select an option before submitting.');
      return;
    }

    this.answerLocked = true;
    const isCorrect = this.selectedOptionIndex === q.correctIndex;

    if (isCorrect) {
      this.correctAnswers += 1;
      this.feedbackText.setColor(P.textGreen);
      this.feedbackText.setText(`Correct! ${q.explanation ? `\n${q.explanation}` : ''}`.trim());
    } else {
      this.wrongAnswers += 1;
      this.feedbackText.setColor(P.textRed);
      const correctText = q.options?.[q.correctIndex] ?? 'the correct option';
      this.feedbackText.setText(
        `Not quite. Correct answer: ${correctText}.${q.explanation ? `\n${q.explanation}` : ''}`.trim()
      );
    }

    this.optionButtons.forEach((btn, idx) => {
      if (!btn?.container?.visible) return;
      btn.setEnabled(false);
      if (idx === q.correctIndex) {
        btn.draw(0x1f6d34, 0x4ade80, 1);
      } else if (idx === this.selectedOptionIndex) {
        btn.draw(0x7a1f2b, 0xf87171, 1);
      } else {
        btn.draw(btn.fillNormal, btn.borderColor, 0.65);
      }
    });

    this.submitBtn.setEnabled(false);
    this.nextBtn.setEnabled(true);
    this.refreshMeta();
  }

  handleNext() {
    if (this.quizCompleted) return;
    this.currentQuestionIndex += 1;
    if (this.currentQuestionIndex >= this.totalQuestions) {
      this.finishQuiz();
      return;
    }
    this.renderCurrentQuestion();
  }

  finishQuiz() {
    if (this.quizCompleted) return;
    this.quizCompleted = true;

    this.optionButtons.forEach((btn) => btn?.setEnabled?.(false));
    this.submitBtn.setEnabled(false);
    this.nextBtn.setEnabled(false);

    const answered = Math.max(1, this.correctAnswers + this.wrongAnswers);
    const accuracy = Math.round((this.correctAnswers / answered) * 100);
    this.feedbackText.setColor(P.textSub);
    this.feedbackText.setText(
      `Quiz complete.\nCorrect: ${this.correctAnswers}/${this.totalQuestions}\nAccuracy: ${accuracy}%`
    );

    this.refreshMeta();
  }

  refreshMeta() {
    const current = Math.min(this.currentQuestionIndex + 1, Math.max(1, this.totalQuestions || 1));
    this.questionMetaText?.setText(
      `SCENARIO  ·  Question ${current}/${Math.max(1, this.totalQuestions || 1)}  |  Correct ${this.correctAnswers}`
    );
  }
}

