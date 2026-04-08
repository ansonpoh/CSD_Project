import Phaser from 'phaser';
import { gameState } from '../../services/gameState.js';
import { apiService } from '../../services/api.js';
import { dailyQuestService } from '../../services/dailyQuests.js';
import { monsterRegistry } from '../../characters/monsters/MonsterRegistry.js';
import { combatSceneEntityMethods } from './entities.js';
import { P, UI_FONT } from './constants.js';
import { combatSceneQuizMethods } from './quiz/index.js';
import { combatSceneUiMethods } from './ui/index.js';
import { transitionToScene } from '../shared/sceneTransition.js';

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
    this.hintMessageText = null;
    this.lifelineText = null;
    this.optionButtons = [];
    this.hintBtn = null;
    this.runBtn = null;
    this.exitBtn = null;
    this.answerLocked = false;
    this.answerKeys = [];

    this.quizEncounter = null;
    this.totalQuestions = 0;
    this.requiredCorrectAnswers = 0;
    this.requiredAccuracyPercent = 90;
    this.damagePerCorrect = 10;
    this.currentQuestionIndex = 0;
    this.correctAnswers = 0;
    this.wrongAnswers = 0;
    this.remainingLifelines = 0;
    this.maxLifelines = 0;
    this.startingMonsterHpPercent = 100;
    this.lossStreak = 0;
    this.eventAssist = null;
    this.preCombatHpBonus = 0;

    this.mapQuizId = null;
    this.usingMapQuiz = false;
    this.collectedAnswers = [];
    this.currentSelections = new Set();
    this.confirmBtn = null;
    this.hintRequestInFlight = false;
    this.currentHintQuestionId = null;
    this.monsterIndex = 0;
    this.isRematch = false;
    this.quizLoadingUi = null;
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
    this.maxLifelines = this.remainingLifelines;
    this.startingMonsterHpPercent = 100;
    this.lossStreak = 0;
    this.monsterIndex = data?.monsterIndex ?? 0;
    this.isRematch = Boolean(data?.isRematch);
    this.eventAssist = data?.eventAssist || null;
    this.preCombatHpBonus = Number(gameState.consumeActiveEffect('nextCombatHpBonus') || 0);

    this.monsterName = this.resolveMonsterKey(this.monsterData?.name);
    this.monsterKey = monsterRegistry[this.monsterName] || monsterRegistry.orc;
    this.monsterAttackAnims = Object.keys(this.monsterKey.anims || {})
      .filter((key) => key.startsWith('attack'))
      .map((key) => `${this.monsterName}_${key}`)
      .filter((fullKey) => this.anims.exists(fullKey));

    this.mapQuizId = null;
    this.usingMapQuiz = false;
    this.collectedAnswers = [];
    this.currentSelections = new Set();
    this.confirmBtn = null;
    this.hintRequestInFlight = false;
    this.currentHintQuestionId = null;
    this.quizLoadingUi = null;

    // Scene objects are recreated on each entry; clear old references first.
    this.optionButtons = [];
    this.hintBtn = null;
    this.runBtn = null;
    this.exitBtn = null;
    this.questionText = null;
    this.questionMetaText = null;
    this.questionTargetText = null;
    this.hintMessageText = null;
    this.lifelineText = null;
  }

  async create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const playerBattleY = 180;
    const playerBarStartX = 50;
    const playerBarWidth = 260;
    const playerBattleX = playerBarStartX + (playerBarWidth / 2);
    const monsterBarStartX = width - 50 - playerBarWidth;
    const monsterBattleX = monsterBarStartX + (playerBarWidth / 2);
    const monsterBattleY = 180;

    this.drawBackdrop(width, height, {
      playerX: playerBattleX,
      playerY: playerBattleY,
      monsterX: monsterBattleX,
      monsterY: monsterBattleY
    });

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

    this.createPlayerIcon(playerBattleX, playerBattleY);
    this.createMonsterIcon(monsterBattleX, monsterBattleY);
    this.createHealthBars(width);
    this.createQuizPanel(width, height);
    this.createActionButtons(width);
    this.createBattleLog(width, height);
    this.bindAnswerKeys();

    this.addLog(`Encounter started against ${titleMonsterName}.`);
    this.addLog(`Hearts available: ${this.remainingLifelines}/${this.maxLifelines}`);
    if (this.preCombatHpBonus > 0) {
      this.playerHP = Phaser.Math.Clamp(this.playerHP + this.preCombatHpBonus, 0, 150);
      this.updateHealthBars();
      this.addLog(`Prepared item effect: +${this.preCombatHpBonus} bonus HP this battle.`);
    }

    this.showQuizLoadingScreen();
    try {
      await this.loadEncounterQuiz();
    } finally {
      this.hideQuizLoadingScreen();
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.hideQuizLoadingScreen();
      this.answerKeys.forEach((key) => key?.destroy?.());
      this.answerKeys = [];
    });
  }

  bindAnswerKeys() {
    const codes = [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
      Phaser.Input.Keyboard.KeyCodes.FOUR
    ];

    this.answerKeys = codes.map((code, index) => {
      const key = this.input.keyboard.addKey(code);
      key.on('down', () => {
        if (this.optionButtons[index]?.container?.visible) {
          void this.handleAnswerSelection(index);
        }
      });
      return key;
    });
  }

  async submitCombatResult({ won = false } = {}) {
    if (this.submittedCombatResult) return;

    const mapId = this.mapId;
    const monsterId = this.monsterData?.monster_id || this.monsterData?.monsterId || null;
    if (!mapId || !monsterId) return;

    this.submittedCombatResult = true;
    try {
      await apiService.submitEncounterCombatResult({
        mapId,
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
    void this.submitCombatResult({ won: false });
    this.time.delayedCall(900, () => {
      this.exitBattle();
    });
  }

  async victory() {
    if (this.battleOver) return;

    this.battleOver = true;
    this.setQuizOptionsEnabled(false);
    this.runBtn?.setEnabled(false);
    if (!this.isRematch) {
      await this.submitCombatResult({ won: true });
    }

    if (this.monsterSprite && this.canPlayAnim(`${this.monsterName}_dead`)) {
      this.monsterSprite.play(`${this.monsterName}_dead`, true);
    }

    if (this.isRematch) {
      this.addLog('Practice complete! No rewards for rematches.');
    } else {
      this.addLog('Victory! Quiz threshold cleared.');
      this.addLog('Return to the map and claim your quest reward.');
      dailyQuestService.recordEvent('monster_defeated');
    }
    this.renderOutcomeSummary(true);
    this.showExitButton();
  }

  defeat(reason = 'You were defeated...') {
    if (this.battleOver) return;

    this.battleOver = true;
    this.setQuizOptionsEnabled(false);
    this.runBtn?.setEnabled(false);
    this.addLog(reason);
    void this.submitCombatResult({ won: false });

    if (this.playerSprite && this.canPlayAnim('dead')) this.playerSprite.play('dead', true);

    this.renderOutcomeSummary(false, reason);
    this.showExitButton();
  }

  showExitButton() {
    this.runBtn?.container?.setVisible(false);
    this.runBtn?.setEnabled(false);
    this.exitBtn?.container?.setVisible(true);
    this.exitBtn?.setEnabled(true);
    this.exitBtn?.container?.setDepth(9800);
    this.exitBtn?.container?.setPosition(
      Math.round((this.cameras.main.width - this.exitBtn.width) / 2),
      this.cameras.main.height - 92
    );
  }

  exitBattle() {
    const gameMapScene = this.scene.manager?.getScene?.('GameMapScene');
    const canResumeGameMap = Boolean(gameMapScene?.scene?.isPaused?.());

    this.scene.stop();
    if (canResumeGameMap) {
      this.scene.resume('GameMapScene');
      return;
    }

    transitionToScene(this, 'GameMapScene', { mapConfig: gameState.getCurrentMap() });
  }
}

Object.assign(
  CombatScene.prototype,
  combatSceneUiMethods,
  combatSceneEntityMethods,
  combatSceneQuizMethods
);


