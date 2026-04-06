import Phaser from 'phaser';
import { apiService } from '../../../services/api.js';

export const combatSceneQuizDataMethods = {
  async loadEncounterQuiz() {
    // Try admin-approved map quiz first
    if (this.mapId) {
      try {
        const response = await apiService.getQuizForLearner(this.mapId);
        if (response?.questions?.length) {
          this.quizEncounter = this.normalizeMapQuiz(response);
          this.mapQuizId = response.quizId;
          this.usingMapQuiz = true;
          this.splitQuestionsForMonster();
          this.setupQuizState();
          return;
        }
      } catch (_err) {
        // No published map quiz — fall through to encounter quiz
      }
    }

    // Fall back to encounter quiz
    this.usingMapQuiz = false;
    this.mapQuizId = null;
    try {
      const payload = {
        mapId: this.mapId,
        monsterId: this.monsterData?.monster_id || this.monsterData?.monsterId || null,
        bossEncounter: this.bossEncounter
      };
      const response = await apiService.generateMonsterEncounterQuiz(payload);
      this.quizEncounter = this.normalizeQuizEncounter(response);
    } catch (error) {
      console.warn('Quiz generation API failed, using fallback quiz:', error);
      this.quizEncounter = this.buildFallbackQuizEncounter();
    }
    this.splitQuestionsForMonster();
    this.setupQuizState();
  },

  /**
   * Splits the full question pool evenly between the two monsters on the map.
   * For map quizzes (mixed types): monster 0 gets multi-select questions, monster 1 gets
   * single-choice. If all questions are the same type, falls back to positional split.
   * For encounter quizzes (all single-choice): positional split — first half vs second half.
   */
  splitQuestionsForMonster() {
    const all = this.quizEncounter?.questions;
    if (!all?.length) return;

    let slotA, slotB;

    if (this.usingMapQuiz) {
      const multi  = all.filter((q) => q.isMultiSelect);
      const single = all.filter((q) => !q.isMultiSelect);
      if (multi.length && single.length) {
        // Type-based split
        slotA = multi;
        slotB = single;
      } else {
        // All same type — split by position
        const half = Math.ceil(all.length / 2);
        slotA = all.slice(0, half);
        slotB = all.slice(half);
      }
    } else {
      // Encounter quiz — always positional
      const half = Math.ceil(all.length / 2);
      slotA = all.slice(0, half);
      slotB = all.slice(half);
    }

    const chosen = this.monsterIndex === 1 ? slotB : slotA;
    // Ensure at least one question even if pool is very small
    this.quizEncounter.questions = chosen.length ? chosen : all;
    const n = this.quizEncounter.questions.length;
    this.quizEncounter.totalQuestions = n;
    // Recalculate pass mark against the sliced pool
    this.quizEncounter.requiredCorrectAnswers = this.usingMapQuiz
      ? Math.max(1, Math.ceil(n * 0.7))
      : n; // encounter quiz requires all correct
  },

  setupQuizState() {
    this.totalQuestions = this.quizEncounter.totalQuestions;
    this.requiredCorrectAnswers = this.quizEncounter.requiredCorrectAnswers;
    this.requiredAccuracyPercent = this.quizEncounter.requiredAccuracyPercent;
    this.startingMonsterHpPercent = 100;
    this.lossStreak = 0;

    if (!this.usingMapQuiz) {
      this.applyEventAssistModifiers();
    }

    this.monsterHP = Phaser.Math.Clamp(this.startingMonsterHpPercent, 1, 100);
    this.damagePerCorrect = Math.max(1, Math.ceil(this.monsterHP / Math.max(1, this.totalQuestions)));
    this.bossEncounter = Boolean(this.quizEncounter.bossEncounter);
    this.syncPlayerHealthToHearts();

    this.refreshQuizMeta();

    if (this.usingMapQuiz) {
      this.addLog('Answer all questions — results submitted at the end.');
    } else {
      this.addLog('Encounter rule: each wrong answer costs 1 heart. Reach 0 hearts and you lose.');
    }

    this.renderCurrentQuestion();
  },

  normalizeMapQuiz(response) {
    const questions = (response.questions || []).map((q) => ({
      questionId: q.questionId,
      prompt: q.scenarioText,
      options: (q.options || []).map((o) => o.optionText),
      optionIds: (q.options || []).map((o) => o.optionId),
      isMultiSelect: Boolean(q.isMultiSelect)
    }));

    const total = questions.length;
    const passingScore = Math.ceil(total * 0.7);

    return {
      quizId: response.quizId,
      bossEncounter: this.bossEncounter,
      totalQuestions: total,
      requiredCorrectAnswers: passingScore,
      requiredAccuracyPercent: 70,
      startingMonsterHpPercent: 100,
      lossStreak: 0,
      questions
    };
  },

  applyEventAssistModifiers() {
    if (!this.eventAssist || !this.quizEncounter?.questions?.length) return;

    const questionReduction = Phaser.Math.Clamp(Number(this.eventAssist.questionReduction || 0), 0, 3);
    if (questionReduction > 0 && this.quizEncounter.questions.length - questionReduction >= 4) {
      this.quizEncounter.questions = this.quizEncounter.questions.slice(
        0,
        this.quizEncounter.questions.length - questionReduction
      );
      this.totalQuestions = this.quizEncounter.questions.length;
      this.quizEncounter.totalQuestions = this.totalQuestions;
      this.requiredCorrectAnswers = this.totalQuestions;
      this.quizEncounter.requiredCorrectAnswers = this.requiredCorrectAnswers;
    }

    const hpOverride = Number(this.eventAssist.startingMonsterHpPercent || 0);
    if (Number.isFinite(hpOverride) && hpOverride > 0) {
      this.startingMonsterHpPercent = Phaser.Math.Clamp(hpOverride, 1, this.startingMonsterHpPercent);
      this.quizEncounter.startingMonsterHpPercent = this.startingMonsterHpPercent;
    }
  },

  normalizeQuizEncounter(payload) {
    const questions = Array.isArray(payload?.questions) ? payload.questions : [];
    const normalizedQuestions = questions
      .map((question) => {
        const options = Array.isArray(question?.options) ? question.options.map((option) => String(option)) : [];
        const correctOptionIndex = Number.isInteger(question?.correctOptionIndex) ? question.correctOptionIndex : 0;
        if (!options.length || correctOptionIndex < 0 || correctOptionIndex >= options.length) return null;

        return {
          questionId: question?.questionId || `q-${Math.random().toString(36).slice(2, 10)}`,
          prompt: String(question?.prompt || 'Answer the question correctly to attack.'),
          options,
          optionIds: [],
          isMultiSelect: false,
          correctOptionIndex
        };
      })
      .filter(Boolean);

    if (!normalizedQuestions.length) return this.buildFallbackQuizEncounter();

    const startingMonsterHpPercent = 100;
    const lossStreak = 0;

    return {
      bossEncounter: Boolean(payload?.bossEncounter),
      totalQuestions: Math.max(1, normalizedQuestions.length),
      requiredCorrectAnswers: Math.max(1, normalizedQuestions.length),
      requiredAccuracyPercent: 0,
      startingMonsterHpPercent,
      lossStreak,
      questions: normalizedQuestions
    };
  },

  buildFallbackQuizEncounter() {
    const boss = this.bossEncounter;
    const totalQuestions = 10;
    const monsterDisplay = this.monsterData?.name || this.monsterName || 'monster';

    const baseQuestions = [
      {
        prompt: 'Which habit helps you learn content reliably over time?',
        options: ['Review regularly', 'Skip practice', 'Ignore feedback'],
        correctOptionIndex: 0
      },
      {
        prompt: 'Pick the strongest study approach for long-term recall.',
        options: ['Active recall', 'Only rereading', 'No revision'],
        correctOptionIndex: 0
      },
      {
        prompt: `To defeat ${monsterDisplay}, what should you prioritize?`,
        options: ['Accuracy', 'Guessing quickly', 'Random clicks'],
        correctOptionIndex: 0
      },
      {
        prompt: 'When you make a mistake, what is best for learning?',
        options: ['Correct and retry', 'Quit immediately', 'Memorize blindly'],
        correctOptionIndex: 0
      },
      {
        prompt: 'Which option best supports understanding context?',
        options: ['Read examples carefully', 'Skip explanations', 'Ignore definitions'],
        correctOptionIndex: 0
      }
    ];

    const questions = [];
    for (let i = 0; i < totalQuestions; i += 1) {
      const source = baseQuestions[i % baseQuestions.length];
      const options = boss ? [...source.options, 'Unrelated answer'] : [...source.options];
      questions.push({
        questionId: `fallback-${i + 1}`,
        prompt: source.prompt,
        options,
        optionIds: [],
        isMultiSelect: false,
        correctOptionIndex: source.correctOptionIndex
      });
    }

    return {
      bossEncounter: boss,
      totalQuestions,
      requiredCorrectAnswers: totalQuestions,
      requiredAccuracyPercent: 0,
      startingMonsterHpPercent: 100,
      lossStreak: 0,
      questions
    };
  }
};
