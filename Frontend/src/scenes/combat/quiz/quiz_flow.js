export const combatSceneQuizFlowMethods = {
  renderCurrentQuestion() {
    if (this.battleOver) return;

    const question = this.quizEncounter?.questions?.[this.currentQuestionIndex];
    if (!question) {
      this.evaluateEncounterState();
      return;
    }

    this.questionText.setText(question.prompt);
    this.optionButtons.forEach((btn, idx) => {
      const option = question.options[idx];
      if (option == null) {
        btn.container.setVisible(false);
        btn.setEnabled(false);
        return;
      }

      btn.container.setVisible(true);
      btn.setText(`${String.fromCharCode(65 + idx)}. ${option}`);
      btn.setEnabled(true);
    });

    this.refreshQuizMeta();
  },

  refreshQuizMeta() {
    const current = Math.min(this.currentQuestionIndex + 1, Math.max(1, this.totalQuestions || 1));
    this.questionMetaText?.setText(`Question ${current}/${Math.max(1, this.totalQuestions || 1)}  |  Correct ${this.correctAnswers}`);
    this.questionTargetText?.setText('No target score. Keep answering until the monster falls.');
    this.lifelineText?.setText(`Hearts: ${this.remainingLifelines}/${this.maxLifelines}`);
  },

  async handleAnswerSelection(selectedOptionIndex) {
    if (this.answerLocked || this.battleOver) return;

    const question = this.quizEncounter?.questions?.[this.currentQuestionIndex];
    if (!question) return;

    this.answerLocked = true;
    this.setQuizOptionsEnabled(false);

    const isCorrect = selectedOptionIndex === question.correctOptionIndex;
    this.showAnswerFeedback(selectedOptionIndex, isCorrect);

    if (isCorrect) {
      this.handleCorrectAnswer();
      return;
    }

    this.consumeHeartLifeline();
    this.playMonsterCounterAttack({ applyDamage: false });
    this.addLog('Wrong answer. A heart was lost.');
    this.refreshQuizMeta();

    if (this.remainingLifelines <= 0) {
      this.time.delayedCall(450, () => {
        this.answerLocked = false;
        this.defeat('You ran out of hearts.');
      });
      return;
    }

    this.time.delayedCall(450, () => {
      if (this.battleOver) return;

      this.answerLocked = false;
      this.renderCurrentQuestion();
      this.setQuizOptionsEnabled(true);
    });
  },

  handleCorrectAnswer() {
    this.correctAnswers += 1;
    this.currentQuestionIndex += 1;
    this.playPlayerQuizAttack();
    this.refreshQuizMeta();

    if (this.currentQuestionIndex >= this.totalQuestions) {
      this.monsterHP = 0;
      this.updateHealthBars();
    }

    this.time.delayedCall(680, () => {
      this.answerLocked = false;
      this.evaluateEncounterState();
    });
  },

  evaluateEncounterState() {
    if (this.battleOver) return;

    if (this.monsterHP <= 0 || this.currentQuestionIndex >= this.totalQuestions) {
      this.victory();
      return;
    }

    this.renderCurrentQuestion();
    this.setQuizOptionsEnabled(true);
  }
};

