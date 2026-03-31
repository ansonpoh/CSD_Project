import { apiService } from '../../../services/api.js';
import { gameState } from '../../../services/gameState.js';

export const combatSceneQuizFlowMethods = {
  renderCurrentQuestion() {
    if (this.battleOver) return;

    const question = this.quizEncounter?.questions?.[this.currentQuestionIndex];
    if (!question) {
      this.evaluateEncounterState();
      return;
    }

    this.currentSelections = new Set();
    this.currentHintQuestionId = null;
    this.hintMessageText?.setText('');
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

    if (this.hintBtn) {
      this.hintBtn.container.setVisible(true);
      this.hintBtn.setEnabled(!this.hintRequestInFlight && this.getHintInventoryCount() > 0);
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

    const hintCount = this.getHintInventoryCount();
    this.lifelineText?.setText(`Hearts: ${this.remainingLifelines}/${this.maxLifelines}  |  Hints: ${hintCount}`);
    if (this.hintBtn?.container?.visible) {
      this.hintBtn.setEnabled(!this.hintRequestInFlight && hintCount > 0 && !this.battleOver);
    }
  },

  async handleUseHint() {
    if (this.battleOver || this.answerLocked || this.hintRequestInFlight) return;

    const question = this.quizEncounter?.questions?.[this.currentQuestionIndex];
    if (!question) return;

    const hintItem = this.findHintInventoryItem();
    if (!hintItem) {
      this.addLog('No hint item available.');
      this.refreshQuizMeta();
      return;
    }

    const itemId = hintItem?.itemId || hintItem?.item_id;
    if (!itemId) {
      this.addLog('Hint item is invalid.');
      return;
    }

    const payload = this.buildQuizHintPayload(question);
    this.hintRequestInFlight = true;
    this.hintBtn?.setEnabled(false);
    this.hintMessageText?.setText('Generating hint...');

    try {
      const hintResponse = await apiService.generateQuizHint(payload);
      const hintText = String(hintResponse?.hintText || '').trim();
      if (!hintText) {
        throw new Error('No hint text returned.');
      }

      const updatedInventory = await apiService.removeInventoryItem(itemId, 1);
      gameState.setInventory(updatedInventory);

      this.currentHintQuestionId = question.questionId;
      this.hintMessageText?.setText(`Hint: ${hintText}`);
      this.addLog('Hint used for this question.');
      this.refreshQuizMeta();
    } catch (error) {
      console.warn('Failed to use hint item:', error);
      this.hintMessageText?.setText('');
      this.addLog('Hint failed. Item was not consumed.');
    } finally {
      this.hintRequestInFlight = false;
      this.refreshQuizMeta();
    }
  },

  buildQuizHintPayload(question) {
    const correctOptionIndexes = [];
    if (!this.usingMapQuiz && Number.isInteger(question?.correctOptionIndex)) {
      correctOptionIndexes.push(question.correctOptionIndex);
    }

    return {
      questionPrompt: String(question?.prompt || ''),
      options: Array.isArray(question?.options) ? question.options : [],
      questionType: question?.isMultiSelect ? 'multi' : 'single',
      correctOptionIndexes,
      mapId: this.mapId || null,
      monsterId: this.monsterData?.monster_id || this.monsterData?.monsterId || null,
      questionId: this.usingMapQuiz ? question?.questionId : null
    };
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
