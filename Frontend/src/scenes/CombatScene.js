import Phaser from 'phaser';
import { gameState } from '../services/gameState.js';
import { apiService } from '../services/api.js';
import { monsterRegistry } from '../characters/monsters/MonsterRegistry.js';
import { soldier } from '../characters/soldier/Soldier.js';

const UI_FONT = 'Trebuchet MS, Verdana, sans-serif';

const P = {
  bgDeep:        0x090f24,
  bgPanel:       0x0d1530,
  btnNormal:     0x2a0f42,
  btnHover:      0x3d1860,
  btnPress:      0x100520,
  btnDanger:     0x3a0e0e,
  btnDangerHov:  0x601818,
  btnBlue:       0x1a2a52,
  btnBlueHov:    0x2a4278,
  borderGold:    0xc8870a,
  borderGlow:    0xf0b030,
  borderDim:     0x604008,
  borderRed:     0x8b2020,
  borderBlue:    0x2a5090,
  textMain:      '#f0ecff',
  textSub:       '#c0a8e0',
  textGold:      '#f4c048',
  textGreen:     '#4ade80',
  textRed:       '#f87171',
  hpGreen:       0x22a855,
  hpRed:         0xc03030,
  hpTrack:       0x0a1020,
};

export class CombatScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CombatScene' });
    this.monsterData = null;
    this.mapId = null;
    this.npcId = null;
    this.monsterName = 'orc';
    this.monsterKey = monsterRegistry.orc;
    this.bossEncounter = false;
    this.submittedCombatResult = false;

    this.playerHP = 100;
    this.monsterHP = 100;
    this.playerHPBar = null;
    this.monsterHPBar = null;

    this.playerSprite = null;
    this.monsterSprite = null;
    this.playerAttackAnims = [];
    this.monsterAttackAnims = [];

    this.battleLog = [];
    this.logText = null;
    this.battleOver = false;

    this.questionText = null;
    this.questionMetaText = null;
    this.questionTargetText = null;
    this.lifelineText = null;
    this.optionButtons = [];
    this.runBtn = null;
    this.answerLocked = false;

    this.quizEncounter = null;
    this.totalQuestions = 0;
    this.requiredCorrectAnswers = 0;
    this.requiredAccuracyPercent = 90;
    this.damagePerCorrect = 10;
    this.currentQuestionIndex = 0;
    this.correctAnswers = 0;
    this.wrongAnswers = 0;
    this.remainingLifelines = 0;
    this.startingMonsterHpPercent = 100;
    this.lossStreak = 0;
  }

  init(data) {
    this.monsterData = data?.monster || {};
    this.mapId = data?.mapId || gameState.getCurrentMap()?.mapId || gameState.getCurrentMap()?.id || null;
    this.npcId = data?.npcId || this.monsterData?.npcId || null;
    this.bossEncounter = Boolean(this.monsterData?.isBossEncounter);
    this.submittedCombatResult = false;

    this.playerHP = 100;
    this.monsterHP = 100;
    this.battleLog = [];
    this.battleOver = false;
    this.answerLocked = false;
    this.quizEncounter = null;
    this.totalQuestions = 0;
    this.requiredCorrectAnswers = 0;
    this.requiredAccuracyPercent = this.bossEncounter ? 100 : 90;
    this.damagePerCorrect = 10;
    this.currentQuestionIndex = 0;
    this.correctAnswers = 0;
    this.wrongAnswers = 0;
    this.remainingLifelines = this.getInitialLifelineCount();
    this.startingMonsterHpPercent = 100;
    this.lossStreak = 0;

    this.monsterName = this.resolveMonsterKey(this.monsterData?.name);
    this.monsterKey = monsterRegistry[this.monsterName] || monsterRegistry.orc;
    this.monsterAttackAnims = Object.keys(this.monsterKey.anims || {})
      .filter((key) => key.startsWith('attack'))
      .map((key) => `${this.monsterName}_${key}`)
      .filter((fullKey) => this.anims.exists(fullKey));
  }

  async create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.drawBackdrop(width, height);

    const titleMonsterName = this.monsterData?.name || this.monsterName;
    const titleSuffix = this.bossEncounter ? ' [BOSS]' : '';
    this.add.text(width / 2, 31, `BATTLE: ${String(titleMonsterName).toUpperCase()}${titleSuffix}`, {
      fontFamily: UI_FONT,
      fontSize: '34px',
      fontStyle: 'bold',
      color: P.textRed,
      stroke: '#06101a',
      strokeThickness: 6
    }).setOrigin(0.5);

    this.createPlayerIcon(width * 0.18, 180);
    this.createMonsterIcon(width * 0.82, 180);
    this.createHealthBars(width);
    this.createQuizPanel(width, height);
    this.createActionButtons(width, height);
    this.createBattleLog(width, height);

    this.addLog(`Encounter started against ${titleMonsterName}.`);
    this.addLog(`Hearts available: ${this.remainingLifelines}/3`);
    await this.loadEncounterQuiz();
  }

  drawBackdrop(width, height) {
    this.add.rectangle(width / 2, height / 2, width, height, P.bgDeep);
    for (let i = 0; i < 5; i += 1) {
      const alpha = 0.06 - i * 0.01;
      this.add.rectangle(0, height / 2, 60 + i * 30, height, 0x8b0000, alpha).setOrigin(0, 0.5);
      this.add.rectangle(width, height / 2, 60 + i * 30, height, 0x8b0000, alpha).setOrigin(1, 0.5);
    }
    this.add.circle(width * 0.25, 180, 120, 0x4193d5, 0.06);
    this.add.circle(width * 0.82, 180, 120, 0x8b0000, 0.08);

    const titleBg = this.add.graphics();
    titleBg.fillStyle(0x1a0510, 1);
    titleBg.fillRect(0, 0, width, 62);
    titleBg.lineStyle(1, P.borderRed, 0.7);
    titleBg.beginPath();
    titleBg.moveTo(0, 61);
    titleBg.lineTo(width, 61);
    titleBg.strokePath();
  }

  createBattleLog(width, height) {
    const logY = height - 160;
    const logW = width - 100;

    const logBg = this.add.graphics();
    logBg.fillStyle(P.bgPanel, 0.92);
    logBg.fillRoundedRect(50, logY, logW, 130, 5);
    logBg.lineStyle(1, P.borderGold, 0.4);
    logBg.strokeRoundedRect(50, logY, logW, 130, 5);

    this.logText = this.add.text(66, logY + 12, '', {
      fontFamily: UI_FONT,
      fontSize: '19px',
      fontStyle: 'bold',
      color: P.textMain,
      lineSpacing: 8,
      stroke: '#060814',
      strokeThickness: 2
    });
  }

  createQuizPanel(width, height) {
    const panelX = 50;
    const panelY = height - 560;
    const panelW = width - 100;
    const panelH = 205;

    const qBg = this.add.graphics();
    qBg.fillStyle(0x081832, 0.98);
    qBg.fillRoundedRect(panelX, panelY, panelW, panelH, 5);
    qBg.lineStyle(2, P.borderBlue, 0.9);
    qBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 5);

    this.questionMetaText = this.add.text(panelX + 16, panelY + 14, 'Preparing quiz...', {
      fontFamily: UI_FONT,
      fontSize: '20px',
      fontStyle: 'bold',
      color: P.textSub,
      stroke: '#060814',
      strokeThickness: 2
    });

    this.questionTargetText = this.add.text(panelX + 16, panelY + 44, '', {
      fontFamily: UI_FONT,
      fontSize: '20px',
      fontStyle: 'bold',
      color: P.textGold,
      stroke: '#060814',
      strokeThickness: 2
    });

    this.lifelineText = this.add.text(panelX + panelW - 16, panelY + 14, '', {
      fontFamily: UI_FONT,
      fontSize: '20px',
      fontStyle: 'bold',
      color: P.textMain,
      stroke: '#060814',
      strokeThickness: 2
    }).setOrigin(1, 0);

    this.questionText = this.add.text(panelX + 16, panelY + 82, 'Loading questions...', {
      fontFamily: UI_FONT,
      fontSize: '30px',
      fontStyle: 'bold',
      color: P.textMain,
      stroke: '#060814',
      strokeThickness: 2,
      lineSpacing: 8,
      wordWrap: { width: panelW - 32, useAdvancedWrap: true }
    });

    const optionW = Math.floor((panelW - 20) / 2);
    const optionH = 64;
    const optionStartY = panelY + panelH + 18;

    for (let i = 0; i < 4; i += 1) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = panelX + col * (optionW + 20);
      const y = optionStartY + row * (optionH + 12);
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

    this.refreshQuizMeta();
  }

  createActionButtons(width, height) {
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
      fontSize: '24px',
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

  createMonsterIcon(x, y) {
    if (this.textures.exists(this.monsterKey.key)) {
      this.monsterSprite = this.add.sprite(x, y, this.monsterKey.key, 0)
        .setScale(Math.max(this.monsterKey.scale, 2.2))
        .setDepth(10);
      if (this.anims.exists(`${this.monsterName}_idle`)) {
        this.monsterSprite.play(`${this.monsterName}_idle`, true);
      } else if (this.anims.exists('orc_idle')) {
        this.monsterSprite.play('orc_idle', true);
      }
    }
  }

  createPlayerIcon(x, y) {
    this.createPlayerAnimations();
    this.playerAttackAnims = ['attack_1', 'attack_2', 'attack_3']
      .filter((key) => this.anims.exists(key));

    this.playerSprite = this.add.sprite(x, y, soldier.sheetKey, 0)
      .setScale(Math.max(soldier.scale, 2.2))
      .setDepth(10)
      .setFlipX(false);

    if (this.anims.exists('idle')) this.playerSprite.play('idle', true);
  }

  createPlayerAnimations() {
    Object.entries(soldier.anims).forEach(([name, anim]) => {
      if (this.anims.exists(name)) return;
      const frames = Array.from({ length: anim.count }, (_, i) => anim.row * soldier.maxCols + i);
      this.anims.create({
        key: name,
        frames: this.anims.generateFrameNumbers(soldier.sheetKey, { frames }),
        frameRate: anim.frameRate,
        repeat: anim.repeat
      });
    });
  }

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

  drawHpBar(gfx, x, y, maxW, h, pct, color) {
    gfx.clear();
    const fillW = Math.max(0, Math.floor(maxW * pct));
    if (fillW <= 0) return;
    gfx.fillStyle(color, 1);
    gfx.fillRoundedRect(x, y, fillW, h, 3);
    gfx.fillStyle(0xffffff, 0.18);
    gfx.fillRoundedRect(x, y, fillW, Math.floor(h * 0.45), { tl: 3, tr: 3, bl: 0, br: 0 });
  }

  updateHealthBars() {
    this.drawHpBar(this.playerHPBar, this._pBarX, this._pBarY, this._barW, this._barH, this.playerHP / 100, P.hpGreen);
    this.drawHpBar(this.monsterHPBar, this._mBarX, this._mBarY, this._barW, this._barH, this.monsterHP / 100, P.hpRed);
  }

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
    this.monsterHP = Phaser.Math.Clamp(this.startingMonsterHpPercent, 1, 100);
    this.damagePerCorrect = Math.max(1, Math.ceil(this.monsterHP / Math.max(1, this.requiredCorrectAnswers)));
    this.bossEncounter = Boolean(this.quizEncounter.bossEncounter);
    this.updateHealthBars();

    this.refreshQuizMeta();
    this.addLog(
      `Answer ${this.requiredCorrectAnswers}/${this.totalQuestions} correctly (${this.requiredAccuracyPercent}%) to slay the monster.`
    );
    if (this.monsterHP < 100) this.addLog(`Retry assist active: monster starts at ${this.monsterHP}% HP.`);
    if (this.lossStreak > 0) this.addLog(`Current loss streak: ${this.lossStreak}`);
    if (this.bossEncounter) this.addLog('Boss encounter: perfect score required unless hearts save your mistakes.');
    this.renderCurrentQuestion();
  }

  normalizeQuizEncounter(payload) {
    const questions = Array.isArray(payload?.questions) ? payload.questions : [];
    const normalizedQuestions = questions
      .map((question) => {
        const options = Array.isArray(question?.options)
          ? question.options.map((option) => String(option))
          : [];
        const correctOptionIndex = Number.isInteger(question?.correctOptionIndex)
          ? question.correctOptionIndex
          : 0;
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
    const requiredCorrectAnswers = Number.isInteger(payload?.requiredCorrectAnswers)
      ? payload.requiredCorrectAnswers
      : Math.ceil(totalQuestions * ((payload?.requiredAccuracyPercent || 90) / 100));
    const requiredAccuracyPercent = Number.isInteger(payload?.requiredAccuracyPercent)
      ? payload.requiredAccuracyPercent
      : 90;
    const startingMonsterHpPercent = Number.isFinite(payload?.startingMonsterHpPercent)
      ? Phaser.Math.Clamp(Number(payload.startingMonsterHpPercent), 1, 100)
      : 100;
    const lossStreak = Number.isInteger(payload?.lossStreak)
      ? Math.max(0, payload.lossStreak)
      : 0;

    return {
      bossEncounter: Boolean(payload?.bossEncounter),
      totalQuestions: Math.max(1, normalizedQuestions.length),
      requiredCorrectAnswers: Phaser.Math.Clamp(requiredCorrectAnswers, 1, normalizedQuestions.length),
      requiredAccuracyPercent,
      startingMonsterHpPercent,
      lossStreak,
      questions: normalizedQuestions
    };
  }

  buildFallbackQuizEncounter() {
    const boss = this.bossEncounter;
    const passPercent = boss ? 100 : 90;
    const totalQuestions = 10;
    const requiredCorrectAnswers = Math.ceil(totalQuestions * (passPercent / 100));
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
      const options = boss
        ? [...source.options, 'Unrelated answer']
        : [...source.options];
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
      requiredCorrectAnswers,
      requiredAccuracyPercent: passPercent,
      startingMonsterHpPercent: 100,
      lossStreak: 0,
      questions
    };
  }

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
  }

  refreshQuizMeta() {
    const current = Math.min(this.currentQuestionIndex + 1, Math.max(1, this.totalQuestions || 1));
    this.questionMetaText?.setText(
      `Question ${current}/${Math.max(1, this.totalQuestions || 1)}  |  Correct ${this.correctAnswers}`
    );
    this.questionTargetText?.setText(
      `Target: ${this.requiredCorrectAnswers || 1} correct (${this.requiredAccuracyPercent}%)`
    );
    this.lifelineText?.setText(`Hearts: ${this.remainingLifelines}/3`);
  }

  async handleAnswerSelection(selectedOptionIndex) {
    if (this.answerLocked || this.battleOver) return;
    const question = this.quizEncounter?.questions?.[this.currentQuestionIndex];
    if (!question) return;

    this.answerLocked = true;
    this.setQuizOptionsEnabled(false);
    const isCorrect = selectedOptionIndex === question.correctOptionIndex;

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
  }

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
  }

  playPlayerQuizAttack() {
    const damage = this.damagePerCorrect;

    if (this.playerSprite && this.playerAttackAnims.length) {
      const attackAnim = Phaser.Utils.Array.GetRandom(this.playerAttackAnims);
      this.playerSprite.play(attackAnim, true);
      this.playerSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this.monsterHP > 0 && this.anims.exists('idle')) this.playerSprite.play('idle', true);
      });
    }

    if (this.monsterSprite && this.anims.exists(`${this.monsterName}_hurt`)) {
      this.monsterSprite.play(`${this.monsterName}_hurt`, true);
      this.monsterSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this.monsterHP > 0 && this.anims.exists(`${this.monsterName}_idle`)) {
          this.monsterSprite.play(`${this.monsterName}_idle`, true);
        }
      });
    }

    this.monsterHP = Math.max(0, this.monsterHP - damage);
    this.updateHealthBars();
    this.addLog(`Correct! Slash landed for ${damage} damage.`);
  }

  playMonsterCounterAttack() {
    const attackAnim = this.getRandomMonsterAttackAnim();
    if (this.monsterSprite && attackAnim) {
      this.monsterSprite.play(attackAnim, true);
      this.monsterSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this.anims.exists(`${this.monsterName}_idle`)) this.monsterSprite.play(`${this.monsterName}_idle`, true);
      });
    }

    if (this.playerSprite && this.anims.exists('hurt')) {
      this.playerSprite.play('hurt', true);
      this.playerSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this.playerHP > 0 && this.anims.exists('idle')) this.playerSprite.play('idle', true);
      });
    }

    const damage = Phaser.Math.Between(8, 18);
    this.playerHP = Math.max(0, this.playerHP - damage);
    this.updateHealthBars();
    this.addLog(`You took ${damage} damage.`);
  }

  getRandomMonsterAttackAnim() {
    if (!this.monsterAttackAnims.length) return null;
    return this.monsterAttackAnims[Phaser.Math.Between(0, this.monsterAttackAnims.length - 1)];
  }

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

  async consumeHeartLifeline() {
    if (this.remainingLifelines <= 0) return false;
    this.remainingLifelines -= 1;

    const heartItem = this.findHeartInventoryItem();
    if (!heartItem) return true;

    const itemId = heartItem.itemId || heartItem.item_id || heartItem.id;
    if (!itemId) return true;

    try {
      const updatedInventory = await apiService.removeInventoryItem(itemId, 1);
      gameState.setInventory(updatedInventory || []);
    } catch (error) {
      console.warn('Failed to sync heart consumption, applying local fallback.', error);
      gameState.removeItem(itemId, 1);
    }
    return true;
  }

  setQuizOptionsEnabled(enabled) {
    this.optionButtons.forEach((btn) => {
      if (!btn.container.visible) {
        btn.setEnabled(false);
        return;
      }
      btn.setEnabled(enabled);
    });
  }

  addLog(message) {
    this.battleLog.push(message);
    if (this.battleLog.length > 5) this.battleLog.shift();
    this.logText.setText(this.battleLog.join('\n'));
  }

  async submitCombatResult(won) {
    if (this.submittedCombatResult) return;
    const mapId = this.mapId;
    const monsterId = this.monsterData?.monster_id || this.monsterData?.monsterId || null;
    if (!mapId || !monsterId) return;

    this.submittedCombatResult = true;
    try {
      await apiService.submitEncounterCombatResult({
        mapId,
        npcId: this.npcId,
        monsterId,
        won: Boolean(won)
      });
    } catch (error) {
      this.submittedCombatResult = false;
      console.warn('Failed to sync combat result:', error);
    }
  }

  runAway() {
    if (this.battleOver) return;
    this.battleOver = true;
    this.setQuizOptionsEnabled(false);
    this.runBtn?.setEnabled(false);
    this.addLog('You fled the encounter.');
    void this.submitCombatResult(false);
    this.time.delayedCall(900, () => {
      this.scene.start('GameMapScene', { mapConfig: gameState.getCurrentMap() });
    });
  }

  async victory() {
    if (this.battleOver) return;
    this.battleOver = true;
    this.setQuizOptionsEnabled(false);
    this.runBtn?.setEnabled(false);
    await this.submitCombatResult(true);

    if (this.monsterSprite && this.anims.exists(`${this.monsterName}_dead`)) {
      this.monsterSprite.play(`${this.monsterName}_dead`, true);
    }

    this.addLog('Victory! Quiz threshold cleared.');
    this.addLog('Return to the map and claim your quest reward.');
    this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'VICTORY!', {
      fontSize: '72px',
      fontStyle: 'bold',
      color: P.textGreen,
      stroke: '#060814',
      strokeThickness: 10
    }).setOrigin(0.5);

    this.time.delayedCall(2000, () => {
      this.scene.start('GameMapScene', { mapConfig: gameState.getCurrentMap() });
    });
  }

  defeat(reason = 'You were defeated...') {
    if (this.battleOver) return;
    this.battleOver = true;
    this.setQuizOptionsEnabled(false);
    this.runBtn?.setEnabled(false);
    this.addLog(reason);
    this.addLog('Retry assist will strengthen your next attempt.');
    void this.submitCombatResult(false);

    if (this.playerSprite && this.anims.exists('dead')) this.playerSprite.play('dead', true);

    this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'DEFEAT', {
      fontSize: '72px',
      fontStyle: 'bold',
      color: P.textRed,
      stroke: '#060814',
      strokeThickness: 10
    }).setOrigin(0.5);

    this.time.delayedCall(2200, () => {
      this.scene.start('GameMapScene', { mapConfig: gameState.getCurrentMap() });
    });
  }

  getInitialLifelineCount() {
    const totalHearts = this.getHeartInventoryCount();
    return Math.min(3, totalHearts);
  }

  getHeartInventoryCount() {
    const inventory = gameState.getInventory();
    return inventory
      .filter((item) => this.isHeartItem(item))
      .reduce((sum, item) => sum + Math.max(0, Number(item?.quantity ?? 1)), 0);
  }

  findHeartInventoryItem() {
    const inventory = gameState.getInventory();
    return inventory.find((item) => this.isHeartItem(item) && Number(item?.quantity ?? 1) > 0) || null;
  }

  isHeartItem(item) {
    if (!item) return false;
    const name = String(item?.name || '').toLowerCase();
    const description = String(item?.description || '').toLowerCase();
    const blob = `${name} ${description}`;
    return (
      blob.includes('heart') ||
      blob.includes('lifeline') ||
      blob.includes('revive') ||
      blob.includes('extra life')
    );
  }

  resolveMonsterKey(rawName) {
    const direct = String(rawName || '').trim();
    if (direct && monsterRegistry[direct]) return direct;

    const normalized = direct.toLowerCase().replace(/[^a-z0-9]/g, '');
    const match = Object.keys(monsterRegistry).find(
      (key) => key.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized
    );
    return match || 'orc';
  }
}
