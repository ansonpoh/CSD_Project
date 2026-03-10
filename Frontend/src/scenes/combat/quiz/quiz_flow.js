import { MAX_LIFELINES } from '../constants.js';

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
    this.questionTargetText?.setText(`Target: ${this.requiredCorrectAnswers || 1} correct (${this.requiredAccuracyPercent}%)`);
    this.lifelineText?.setText(`Hearts: ${this.remainingLifelines}/${MAX_LIFELINES}`);
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

    if (this.remainingLifelines > 0) {
      await this.consumeHeartLifeline();
      this.addLog('Wrong answer. A heart was consumed. Try this question again.');
      this.refreshQuizMeta();
      this.time.delayedCall(450, () => {
        if (this.battleOver) return;

        this.answerLocked = false;
        this.renderCurrentQuestion();
        this.setQuizOptionsEnabled(true);
      });
      return;
    }

    this.wrongAnswers += 1;
    this.currentQuestionIndex += 1;
    this.addLog('Wrong answer. The monster counterattacks.');
    this.playMonsterCounterAttack();
    this.refreshQuizMeta();

    this.time.delayedCall(700, () => {
      this.answerLocked = false;
      if (this.playerHP <= 0) {
        this.defeat('You were overwhelmed before clearing the quiz gate.');
        return;
      }

      this.evaluateEncounterState();
    });
  },

  handleCorrectAnswer() {
    this.correctAnswers += 1;
    this.currentQuestionIndex += 1;
    this.playPlayerQuizAttack();
    this.refreshQuizMeta();

    if (this.correctAnswers >= this.requiredCorrectAnswers) {
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

    if (this.correctAnswers >= this.requiredCorrectAnswers) {
      this.victory();
      return;
    }

    if (this.currentQuestionIndex >= this.totalQuestions) {
      this.defeat(`Quiz complete. You needed ${this.requiredCorrectAnswers}/${this.totalQuestions} correct.`);
      return;
    }

    const remainingQuestions = this.totalQuestions - this.currentQuestionIndex;
    const maxReachable = this.correctAnswers + remainingQuestions;
    if (maxReachable < this.requiredCorrectAnswers) {
      this.defeat('Not enough questions remain to reach the required score.');
      return;
    }

    this.renderCurrentQuestion();
    this.setQuizOptionsEnabled(true);
  }
};
