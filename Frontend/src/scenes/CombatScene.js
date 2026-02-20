import Phaser from 'phaser';
import { gameState } from '../services/gameState.js';
import { apiService } from '../services/api.js';
import { monsterRegistry } from "../characters/monsters/MonsterRegistry.js";

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
    this.monsterSprite = null;
    this.monsterAttackAnims = [];
    this.attackAnimIndex = 0; 
  }

  init(data) {
    this.monster = data.monster;
    this.playerHP = 100;
    this.monsterHP = 100;
    this.battleLog = [];

    this.base = this.monster?.name?.toLowerCase?.() || 'orc';
    this.def = monsterRegistry[this.base] || monsterRegistry.orc;

    this.monsterAttackAnims = Object.keys(this.def.anims || {})
      .filter((k) => k.startsWith('attack'))
      .map((k) => `${this.base}_${k}`)
      .filter((fullKey) => this.anims.exists(fullKey));

    this.attackAnimIndex = 0;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);

    // Title
    this.add.text(width / 2, 40, `BATTLE: ${this.monster.name}`, {
      fontSize: '32px',
      color: '#ef4444',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Monster display - replaced emoji with icon
    this.createMonsterIcon(width / 2, 150);

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

    this.addLog(`A wild ${this.monster.name} appeared!`);
  }

  createMonsterIcon(x, y) {
    // Create a stylized monster icon using graphics

    // const def = monsterRegistry[this.base] || monsterRegistry.orc;

    if (this.textures.exists(this.def.key)) {
      this.monsterSprite = this.add.sprite(x, y, this.def.key, 0)
        .setScale(Math.max(this.def.scale, 2.2)) // smaller for combat UI
        .setDepth(10);

      if (this.anims.exists(`${this.base}_idle`)) {
        this.monsterSprite.play(`${this.base}_idle`, true);
      } else if (this.anims.exists(`orc_idle`)) {
        this.monsterSprite.play(`orc_idle`, true);
      }
      return;
  }
  }

  createHealthBars() {
    const width = this.cameras.main.width;
    
    // Player HP
    this.add.text(100, 300, 'Your HP:', {
      fontSize: '18px',
      color: '#ffffff'
    });
    
    const playerBg = this.add.rectangle(250, 310, 300, 20, 0x333333);
    this.playerHPBar = this.add.rectangle(250, 310, 300, 20, 0x4ade80);
    
    // Monster HP
    this.add.text(width - 400, 300, 'Enemy HP:', {
      fontSize: '18px',
      color: '#ffffff'
    });
    
    const monsterBg = this.add.rectangle(width - 250, 310, 300, 20, 0x333333);
    this.monsterHPBar = this.add.rectangle(width - 250, 310, 300, 20, 0xef4444);
  }

  createActionButtons() {
    const width = this.cameras.main.width;
    const y = 400;
    const spacing = 150;

    // Attack button
    const attackBtn = this.add.rectangle(width / 2 - spacing, y, 120, 50, 0xef4444)
      .setInteractive({ useHandCursor: true });
    
    this.add.text(width / 2 - spacing, y, 'ATTACK', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    attackBtn.on('pointerdown', () => this.performAttack());

    // Defend button
    const defendBtn = this.add.rectangle(width / 2, y, 120, 50, 0x3b82f6)
      .setInteractive({ useHandCursor: true });
    
    this.add.text(width / 2, y, 'DEFEND', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    defendBtn.on('pointerdown', () => this.performDefend());

    // Run button
    const runBtn = this.add.rectangle(width / 2 + spacing, y, 120, 50, 0x666666)
      .setInteractive({ useHandCursor: true });
    
    this.add.text(width / 2 + spacing, y, 'RUN', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    runBtn.on('pointerdown', () => this.runAway());
  }

  performAttack() {
    const damage = Math.floor(Math.random() * 20) + 10;

    if (this.monsterSprite && this.anims.exists(`${this.monster.name.toLowerCase()}_hurt`)) {
      const key = `${this.monster.name.toLowerCase()}_hurt`;
      this.monsterSprite.play(key, true);
      this.monsterSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this.monsterHP > 0 && this.anims.exists(`${this.monster.name.toLowerCase()}_idle`)) {
          this.monsterSprite.play(`${this.monster.name.toLowerCase()}_idle`, true);
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
        if (this.anims.exists(`${this.base}_idle`)) this.monsterSprite.play(`${this.base}_idle`, true);
      });
    }

    const damage = Math.floor((Math.random() * 15 + 5) * damageMultiplier);
    this.playerHP = Math.max(0, this.playerHP - damage);
    this.updateHealthBars();
    this.addLog(`${this.monster.name} dealt ${damage} damage!`);

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

    if (this.monsterSprite && this.anims.exists(`${this.base}_dead`)) {
      this.monsterSprite.play(`${this.base}_dead`, true);
    }
    console.log(this.base);
    console.log(this.anims.exists(`${this.base}_dead`))

    const xpGained = Math.floor(Math.random() * 50) + 25;
    gameState.updateXP(xpGained);

    const learner = gameState.getLearner();
    if(learner?.learner_id) {
      const savedLearner = await apiService.updateLearner(learner.learner_id, {...learner, updated_at: new Date().toISOString()});
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
}