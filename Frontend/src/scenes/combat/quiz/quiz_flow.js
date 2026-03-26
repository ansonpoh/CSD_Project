import { apiService } from '../../../services/api.js';

export const combatSceneQuizFlowMethods = {
  renderCurrentQuestion() {
    if (this.battleOver) return;

    const question = this.quizEncounter?.questions?.[this.currentQuestionIndex];
    if (!question) {
      this.evaluateEncounterState();
      return;
    }

    this.currentSelections = new Set();
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
      btn.draw(btn.fillNormal, btn.borderColor, 0.45);
    });

    // Show confirm button only for multi-select map quiz questions
    const isMulti = this.usingMapQuiz && Boolean(question.isMultiSelect);
    if (this.confirmBtn) {
      this.confirmBtn.container.setVisible(isMulti);
      this.confirmBtn.setEnabled(isMulti);
    }

    this.refreshQuizMeta();
  },

  refreshQuizMeta() {
    const current = Math.min(this.currentQuestionIndex + 1, Math.max(1, this.totalQuestions || 1));
    this.questionMetaText?.setText(`Question ${current}/${Math.max(1, this.totalQuestions || 1)}  |  Answered ${this.currentQuestionIndex}`);

    if (this.usingMapQuiz) {
      this.questionTargetText?.setText(`Pass mark: ${this.requiredCorrectAnswers}/${this.totalQuestions} correct`);
    } else {
      this.questionTargetText?.setText('No target score. Keep answering until the monster falls.');
    }

    this.lifelineText?.setText(`Hearts: ${this.remainingLifelines}/${this.maxLifelines}`);
  },

  async handleAnswerSelection(selectedOptionIndex) {
    if (this.answerLocked || this.battleOver) return;

    const question = this.quizEncounter?.questions?.[this.currentQuestionIndex];
    if (!question) return;

    if (this.usingMapQuiz) {
      if (question.isMultiSelect) {
        // Toggle selection — confirm button submits
        this._toggleMultiSelectOption(selectedOptionIndex, question);
      } else {
        // Single-select: lock immediately and advance
        this.answerLocked = true;
        this.setQuizOptionsEnabled(false);
        this._recordAnswer(question, [selectedOptionIndex]);
        this._highlightSelected(selectedOptionIndex);
        this.playPlayerQuizAttack();
        this.time.delayedCall(600, () => {
          this.answerLocked = false;
          this._advanceQuestion();
        });
      }
      return;
    }

    // --- Encounter quiz (original per-question logic) ---
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

  handleConfirmSelection() {
    if (this.answerLocked || this.battleOver) return;

    const question = this.quizEncounter?.questions?.[this.currentQuestionIndex];
    if (!question || !question.isMultiSelect) return;
    if (this.currentSelections.size === 0) return;

    this.answerLocked = true;
    this.setQuizOptionsEnabled(false);
    if (this.confirmBtn) this.confirmBtn.setEnabled(false);

    this._recordAnswer(question, Array.from(this.currentSelections));
    this.playPlayerQuizAttack();

    this.time.delayedCall(600, () => {
      this.answerLocked = false;
      this._advanceQuestion();
    });
  },

  _toggleMultiSelectOption(idx, question) {
    if (question.options[idx] == null) return;

    if (this.currentSelections.has(idx)) {
      this.currentSelections.delete(idx);
      const btn = this.optionButtons[idx];
      if (btn) btn.draw(btn.fillNormal, btn.borderColor, 0.45);
    } else {
      this.currentSelections.add(idx);
      const btn = this.optionButtons[idx];
      if (btn) btn.draw(0x1f4d7a, 0x60a5fa, 1);
    }

    if (this.confirmBtn) {
      this.confirmBtn.setEnabled(this.currentSelections.size > 0);
    }
  },

  _highlightSelected(idx) {
    const btn = this.optionButtons[idx];
    if (btn) btn.draw(0x1f4d7a, 0x60a5fa, 1);
  },

  _recordAnswer(question, selectedIndices) {
    const selectedOptionIds = selectedIndices
      .map((i) => question.optionIds?.[i])
      .filter(Boolean);

    this.collectedAnswers.push({
      questionId: question.questionId,
      selectedOptionIds
    });
  },

  _advanceQuestion() {
    this.currentQuestionIndex += 1;
    this.monsterHP = Math.max(0, this.monsterHP - this.damagePerCorrect);
    this.updateHealthBars();
    this.evaluateEncounterState();
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

  async evaluateEncounterState() {
    if (this.battleOver) return;

    if (this.usingMapQuiz) {
      if (this.currentQuestionIndex >= this.totalQuestions) {
        await this._submitMapQuizAndResolve();
      } else {
        this.renderCurrentQuestion();
        this.setQuizOptionsEnabled(true);
      }
      return;
    }

    // Encounter quiz
    if (this.monsterHP <= 0 || this.currentQuestionIndex >= this.totalQuestions) {
      this.victory();
      return;
    }

    this.renderCurrentQuestion();
    this.setQuizOptionsEnabled(true);
  },

  async _submitMapQuizAndResolve() {
    this.setQuizOptionsEnabled(false);
    this.addLog('Submitting answers...');

    try {
      const result = await apiService.submitMapQuizAttempt(this.mapQuizId, this.collectedAnswers);
      const { passed, score, totalQuestions } = result;
      this.correctAnswers = score ?? 0;
      this.addLog(`Result: ${this.correctAnswers}/${totalQuestions} correct.`);

      if (passed) {
        this.monsterHP = 0;
        this.updateHealthBars();
        this.victory();
      } else {
        this.defeat(`Quiz failed. Score: ${this.correctAnswers}/${totalQuestions}. Need ${this.requiredCorrectAnswers}.`);
      }
    } catch (err) {
      console.warn('Failed to submit map quiz:', err);
      this.addLog('Submission failed. Please try again.');
      this.defeat('Could not submit quiz answers.');
    }
  }
};
