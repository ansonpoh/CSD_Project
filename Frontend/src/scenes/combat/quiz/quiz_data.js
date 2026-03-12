import Phaser from 'phaser';
import { apiService } from '../../../services/api.js';

export const combatSceneQuizDataMethods = {
  async loadEncounterQuiz() {
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

    this.totalQuestions = this.quizEncounter.totalQuestions;
    this.requiredCorrectAnswers = this.quizEncounter.requiredCorrectAnswers;
    this.requiredAccuracyPercent = this.quizEncounter.requiredAccuracyPercent;
    this.startingMonsterHpPercent = this.quizEncounter.startingMonsterHpPercent;
    this.lossStreak = this.quizEncounter.lossStreak;
    this.applyEventAssistModifiers();
    this.monsterHP = Phaser.Math.Clamp(this.startingMonsterHpPercent, 1, 100);
    this.damagePerCorrect = Math.max(1, Math.ceil(this.monsterHP / Math.max(1, this.totalQuestions)));
    this.bossEncounter = Boolean(this.quizEncounter.bossEncounter);
    this.syncPlayerHealthToHearts();

    this.refreshQuizMeta();
    this.addLog(`Encounter rule: each wrong answer costs 1 heart. Reach 0 hearts and you lose.`);
    if (this.monsterHP < 100) this.addLog(`Retry assist active: monster starts at ${this.monsterHP}% HP.`);
    if (this.eventAssist) this.addLog(`Map event assist active: ${this.eventAssist.label || 'authored modifier applied'}.`);
    if (this.lossStreak > 0) this.addLog(`Current loss streak: ${this.lossStreak}`);
    this.renderCurrentQuestion();
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
          correctOptionIndex
        };
      })
      .filter(Boolean);

    if (!normalizedQuestions.length) return this.buildFallbackQuizEncounter();

    const totalQuestions = Number.isInteger(payload?.totalQuestions) ? payload.totalQuestions : normalizedQuestions.length;
    const startingMonsterHpPercent = Number.isFinite(payload?.startingMonsterHpPercent)
      ? Phaser.Math.Clamp(Number(payload.startingMonsterHpPercent), 1, 100)
      : 100;
    const lossStreak = Number.isInteger(payload?.lossStreak) ? Math.max(0, payload.lossStreak) : 0;

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

