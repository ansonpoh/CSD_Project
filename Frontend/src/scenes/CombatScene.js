import Phaser from 'phaser';
import { gameState } from '../services/gameState.js';
import { apiService } from '../services/api.js';
import { monsterRegistry } from "../characters/monsters/MonsterRegistry.js";
import { soldier } from "../characters/soldier/Soldier.js";

export class CombatScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CombatScene' });
    this.monster = null;
    this.playerHP = 100;
    this.monsterHP = 100;
    this.playerHPBar = null;
    this.monsterHPBar = null;
    this.battleLog = [];
    this.logText = null;
    this.playerSprite = null;
    this.monsterSprite = null;
    this.playerAttackAnims = [];
    this.monsterAttackAnims = [];
    this.attackAnimIndex = 0; 
    this.battleOver = false;
    this.attackBtn = null;
    this.defendBtn = null;
    this.runBtn = null;
  }

  init(data) {
    this.monster = data.monster;
    this.playerHP = 100;
    this.monsterHP = 100;
    this.battleLog = [];
    this.battleOver = false;

    this.monster = this.monster?.name || 'orc';
    this.monster_key = monsterRegistry[this.monster] || monsterRegistry.orc;

    this.monsterAttackAnims = Object.keys(this.monster_key.anims || {})
      .filter((k) => k.startsWith('attack'))
      .map((k) => `${this.monster}_${k}`)
      .filter((fullKey) => this.anims.exists(fullKey));

    this.attackAnimIndex = 0;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);

    // Title
    this.add.text(width / 2, 40, `BATTLE: ${this.monster}`, {
      fontSize: '32px',
      color: '#ef4444',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Monster display - replaced emoji with icon
    this.createMonsterIcon(width / 1.15 , 150);
    this.createPlayerIcon(width / 7.2, 150);

    this.add.text(width / 2, 220, this.monster.description || 'A fearsome creature!', {
      fontSize: '18px',
      color: '#aaaaaa'
    }).setOrigin(0.5);

    // Health bars
    this.createHealthBars();

    // Battle log
    this.logText = this.add.text(50, height - 150, '', {
      fontSize: '16px',
      color: '#ffffff',
      lineSpacing: 5
    });

    // Action buttons
    this.createActionButtons();

    this.addLog(`A wild ${this.monster} appeared!`);
  }

  createMonsterIcon(x, y) {
    // Create a stylized monster icon using graphics
    if (this.textures.exists(this.monster_key.key)) {
      this.monsterSprite = this.add.sprite(x, y, this.monster_key.key, 0)
        .setScale(Math.max(this.monster_key.scale, 2.2)) // smaller for combat UI
        .setDepth(10);

      if (this.anims.exists(`${this.monster}_idle`)) {
        this.monsterSprite.play(`${this.monster}_idle`, true);
      } else if (this.anims.exists(`orc_idle`)) {
        this.monsterSprite.play(`orc_idle`, true);
      }
      return;
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

    if (this.anims.exists('idle')) {
      this.playerSprite.play('idle', true);
    }
  }

  createPlayerAnimations() {
    Object.entries(soldier.anims).forEach(([name, a]) => {
      if (this.anims.exists(name)) return;
      const frames = Array.from({ length: a.count }, (_, i) => a.row * soldier.maxCols + i);
      this.anims.create({
        key: name,
        frames: this.anims.generateFrameNumbers(soldier.sheetKey, { frames }),
        frameRate: a.frameRate,
        repeat: a.repeat
      });
    });
  }

  createHealthBars() {
    const width = this.cameras.main.width;
    
    // Player HP
    this.add.text(100, 200, 'Your HP:', {
      fontSize: '18px',
      color: '#ffffff'
    });
    
    const playerBg = this.add.rectangle(250, 210, 300, 20, 0x333333);
    this.playerHPBar = this.add.rectangle(250, 210, 300, 20, 0x4ade80);
    
    // Monster HP
    this.add.text(width - 400, 200, 'Enemy HP:', {
      fontSize: '18px',
      color: '#ffffff'
    });
    
    const monsterBg = this.add.rectangle(width - 250, 210, 300, 20, 0x333333);
    this.monsterHPBar = this.add.rectangle(width - 250, 210, 300, 20, 0xef4444);
  }

  createActionButtons() {
    const width = this.cameras.main.width;
    const y = 400;
    const spacing = 150;



    // Attack button
    this.attackBtn = this.add.rectangle(width / 2 - spacing, y, 120, 50, 0xef4444)
      .setInteractive({ useHandCursor: true });
    
    this.add.text(width / 2 - spacing, y, 'ATTACK', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.attackBtn.on('pointerdown', () => {if (!this.battleOver) this.performAttack()});

    // Defend button
    this.defendBtn = this.add.rectangle(width / 2, y, 120, 50, 0x3b82f6)
      .setInteractive({ useHandCursor: true });
    
    this.add.text(width / 2, y, 'DEFEND', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.defendBtn.on('pointerdown', () => {if (!this.battleOver) this.performDefend()});

    // Run button
    this.runBtn = this.add.rectangle(width / 2 + spacing, y, 120, 50, 0x666666)
      .setInteractive({ useHandCursor: true });
    
    this.add.text(width / 2 + spacing, y, 'RUN', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.runBtn.on('pointerdown', () => {if (!this.battleOver) this.runAway()});
  }

  performAttack() {
    const damage = Math.floor(Math.random() * 20) + 10;

    if (this.playerSprite && this.playerAttackAnims.length) {
      const atk = Phaser.Utils.Array.GetRandom(this.playerAttackAnims);
      this.playerSprite.play(atk, true);
      this.playerSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this.monsterHP > 0 && this.anims.exists('idle')) {
          this.playerSprite.play('idle', true);
        }
      });
    }
  
    if (this.monsterSprite && this.anims.exists(`${this.monster}_hurt`)) {
      const key = `${this.monster}_hurt`;
      this.monsterSprite.play(key, true);
      this.monsterSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this.monsterHP > 0 && this.anims.exists(`${this.monster}_idle`)) {
          this.monsterSprite.play(`${this.monster}_idle`, true);
        }
      });
    }

    this.monsterHP = Math.max(0, this.monsterHP - damage);
    this.updateHealthBars();
    this.addLog(`You dealt ${damage} damage!`);

    if (this.monsterHP <= 0) {
      this.victory();
      return;
    }

    this.time.delayedCall(500, () => this.monsterTurn());
  }

  performDefend() {
    this.addLog('You brace for impact...');
    this.time.delayedCall(500, () => this.monsterTurn(0.5));
  }

  monsterTurn(damageMultiplier = 1) {

    const atk = this.getRandomAttackAnim();

    if (this.monsterSprite && atk) {
      this.monsterSprite.play(atk, true);
      this.monsterSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this.anims.exists(`${this.monster}_idle`)) this.monsterSprite.play(`${this.monster}_idle`, true);
      });
    }

    if (this.playerSprite && this.anims.exists('hurt')) {
      this.playerSprite.play('hurt', true);
      this.playerSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this.playerHP > 0 && this.anims.exists('idle')) {
          this.playerSprite.play('idle', true);
        }
      });
    }

    const damage = Math.floor((Math.random() * 15 + 5) * damageMultiplier);
    this.playerHP = Math.max(0, this.playerHP - damage);
    this.updateHealthBars();
    this.addLog(`${this.monster} dealt ${damage} damage!`);

    if (this.playerHP <= 0) {
      this.defeat();
    }
  }

  getRandomAttackAnim() {
    if (!this.monsterAttackAnims.length) return null;
    const i = Phaser.Math.Between(0, this.monsterAttackAnims.length - 1);
    return this.monsterAttackAnims[i];
  }

  runAway() {
    const chance = Math.random();
    if (chance > 0.5) {
      this.addLog('You escaped successfully!');
      this.time.delayedCall(1000, () => {
        this.scene.start('GameMapScene');
      });
    } else {
      this.addLog('Failed to escape!');
      this.time.delayedCall(500, () => this.monsterTurn());
    }
  }

  updateHealthBars() {
    const playerWidth = (this.playerHP / 100) * 300;
    const monsterWidth = (this.monsterHP / 100) * 300;
    
    this.playerHPBar.width = playerWidth;
    this.monsterHPBar.width = monsterWidth;
  }

  addLog(message) {
    this.battleLog.push(message);
    if (this.battleLog.length > 5) {
      this.battleLog.shift();
    }
    this.logText.setText(this.battleLog.join('\n'));
  }

  async victory() {

    if (this.battleOver) return;
    this.battleOver = true;
    this.setActionButtonsEnabled(false);

    if (this.monsterSprite && this.anims.exists(`${this.monster}_dead`)) {
      this.monsterSprite.play(`${this.monster}_dead`, true);
    } 

    const xpGained = Math.floor(Math.random() * 50) + 25;
    gameState.updateXP(xpGained);

    const learner = gameState.getLearner();
    if(learner?.learnerId) {
      const savedLearner = await apiService.updateLearner(learner.learnerId, {...learner, updated_at: new Date().toISOString()});
      gameState.setLearner(savedLearner);
    }
    
    this.addLog(`Victory! Gained ${xpGained} XP!`);
    
    const victoryText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      'VICTORY!',
      {
        fontSize: '64px',
        color: '#4ade80',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    this.time.delayedCall(2000, () => {
      this.scene.start('GameMapScene');
    });
  }

  defeat() {
    this.addLog('You were defeated...');

    if (this.battleOver) return;
    this.battleOver = true;
    this.setActionButtonsEnabled(false);

    if (this.playerSprite && this.anims.exists('dead')) {
      this.playerSprite.play('dead', true);
    }
    
    const defeatText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      'DEFEAT',
      {
        fontSize: '64px',
        color: '#ef4444',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    this.time.delayedCall(2000, () => {
      this.playerHP = 100;
      this.scene.start('GameMapScene');
    });
  }

  setActionButtonsEnabled(enabled) {
    const buttons = [this.attackBtn, this.defendBtn, this.runBtn];
    buttons.forEach((btn) => {
      if (!btn) return;
      if (enabled) btn.setInteractive({ useHandCursor: true });
      else btn.disableInteractive();
      btn.setAlpha(enabled ? 1 : 0.5);
    });
  }

}