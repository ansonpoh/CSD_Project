import Phaser from 'phaser';
import { gameState } from '../services/gameState.js';
import { apiService } from '../services/api.js';
import { monsterRegistry } from "../characters/monsters/MonsterRegistry.js";
import { soldier } from "../characters/soldier/Soldier.js";

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
  btnNeutral:    0x1a1a2e,
  btnNeutralHov: 0x2a2a48,
  borderGold:    0xc8870a,
  borderGlow:    0xf0b030,
  borderDim:     0x604008,
  borderRed:     0x8b2020,
  borderBlue:    0x2a5090,
  accentGlow:    0xffdd60,
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
    const width  = this.cameras.main.width;
    const height = this.cameras.main.height;

    // ── Background ──────────────────────────────────────────────────────────
    this.add.rectangle(width / 2, height / 2, width, height, P.bgDeep);
    // Dramatic vignette sides
    for (let i = 0; i < 5; i++) {
      const a = 0.06 - i * 0.01;
      this.add.rectangle(0,         height / 2, 60 + i * 30, height, 0x8b0000, a).setOrigin(0, 0.5);
      this.add.rectangle(width,     height / 2, 60 + i * 30, height, 0x8b0000, a).setOrigin(1, 0.5);
    }
    // Subtle ambient glow behind combatants
    this.add.circle(width * 0.25, 180, 120, 0x4193d5, 0.06);
    this.add.circle(width * 0.82, 180, 120, 0x8b0000, 0.08);

    // ── Title banner ────────────────────────────────────────────────────────
    const titleBg = this.add.graphics();
    titleBg.fillStyle(0x1a0510, 1);
    titleBg.fillRect(0, 0, width, 62);
    titleBg.lineStyle(1, P.borderRed, 0.7);
    titleBg.beginPath();
    titleBg.moveTo(0, 61);
    titleBg.lineTo(width, 61);
    titleBg.strokePath();

    this.add.text(width / 2, 31, `⚔  BATTLE: ${String(this.monster).toUpperCase()}  ⚔`, {
      fontSize:        '28px',
      fontStyle:       'bold',
      color:           P.textRed,
      stroke:          '#06101a',
      strokeThickness: 7
    }).setOrigin(0.5);

    // ── Sprites ─────────────────────────────────────────────────────────────
    this.createPlayerIcon(width * 0.18, 180);
    this.createMonsterIcon(width * 0.82, 180);

    // ── HP Bars ─────────────────────────────────────────────────────────────
    this.createHealthBars(width);

    // ── Battle log panel ────────────────────────────────────────────────────
    const logY = height - 160;
    const logW = width - 100;
    const logBg = this.add.graphics();
    logBg.fillStyle(P.bgPanel, 0.92);
    logBg.fillRoundedRect(50, logY, logW, 130, 5);
    logBg.lineStyle(1, P.borderGold, 0.4);
    logBg.strokeRoundedRect(50, logY, logW, 130, 5);

    this.logText = this.add.text(66, logY + 12, '', {
      fontSize:    '15px',
      color:       P.textMain,
      lineSpacing: 6,
      stroke:      '#060814',
      strokeThickness: 3
    });

    // ── Action buttons ───────────────────────────────────────────────────────
    this.createActionButtons(width, height);

    this.addLog(`A wild ${this.monster} appeared!`);
  }

  // ── Sprite helpers (logic unchanged) ──────────────────────────────────────

  createMonsterIcon(x, y) {
    if (this.textures.exists(this.monster_key.key)) {
      this.monsterSprite = this.add.sprite(x, y, this.monster_key.key, 0)
        .setScale(Math.max(this.monster_key.scale, 2.2))
        .setDepth(10);
      if (this.anims.exists(`${this.monster}_idle`)) {
        this.monsterSprite.play(`${this.monster}_idle`, true);
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

  // ── HP bars ────────────────────────────────────────────────────────────────

  createHealthBars(width) {
    const barW = 260;
    const barH = 18;
    const y    = 262;

    // ── Player ──
    this.add.text(50, y - 26, 'YOUR HP', {
      fontSize: '13px', fontStyle: 'bold',
      color: P.textSub, stroke: '#060814', strokeThickness: 3
    });

    const playerTrack = this.add.graphics();
    playerTrack.fillStyle(P.hpTrack, 1);
    playerTrack.fillRoundedRect(50, y, barW, barH, 4);
    playerTrack.lineStyle(1, P.borderGold, 0.6);
    playerTrack.strokeRoundedRect(50, y, barW, barH, 4);

    this.playerHPBar = this.add.graphics();
    this._drawHpBar(this.playerHPBar, 50 + 2, y + 2, barW - 4, barH - 4, 1.0, P.hpGreen);

    // ── Monster ──
    this.add.text(width - 50 - barW, y - 26, 'ENEMY HP', {
      fontSize: '13px', fontStyle: 'bold',
      color: P.textSub, stroke: '#060814', strokeThickness: 3
    });

    const monTrack = this.add.graphics();
    monTrack.fillStyle(P.hpTrack, 1);
    monTrack.fillRoundedRect(width - 50 - barW, y, barW, barH, 4);
    monTrack.lineStyle(1, P.borderRed, 0.6);
    monTrack.strokeRoundedRect(width - 50 - barW, y, barW, barH, 4);

    this.monsterHPBar = this.add.graphics();
    this._drawHpBar(this.monsterHPBar, width - 50 - barW + 2, y + 2, barW - 4, barH - 4, 1.0, P.hpRed);

    // Store bar geometry for updates
    this._barW  = barW - 4;
    this._barH  = barH - 4;
    this._pBarX = 50 + 2;
    this._pBarY = y + 2;
    this._mBarX = width - 50 - barW + 2;
    this._mBarY = y + 2;
  }

  _drawHpBar(gfx, x, y, maxW, h, pct, color) {
    gfx.clear();
    const fillW = Math.max(0, Math.floor(maxW * pct));
    if (fillW <= 0) return;
    gfx.fillStyle(color, 1);
    gfx.fillRoundedRect(x, y, fillW, h, 3);
    gfx.fillStyle(0xffffff, 0.18);
    gfx.fillRoundedRect(x, y, fillW, Math.floor(h * 0.45), { tl: 3, tr: 3, bl: 0, br: 0 });
  }

  // ── Action buttons ─────────────────────────────────────────────────────────

  createActionButtons(width, height) {
    const y   = height - 280;
    const btnW = 130;
    const btnH = 50;
    const gap  = 20;
    const totalW = btnW * 3 + gap * 2;
    const startX = width / 2 - totalW / 2;

    const mkBtn = (cx, label, fillN, fillH, border) => {
      const c  = this.add.container(cx, y);
      const bg = this.add.graphics();

      const draw = (fill, brd) => {
        bg.clear();
        bg.fillStyle(fill, 1);
        bg.fillRoundedRect(0, 0, btnW, btnH, 5);
        bg.lineStyle(2, brd, 1);
        bg.strokeRoundedRect(0, 0, btnW, btnH, 5);
        bg.fillStyle(0xffffff, 0.06);
        bg.fillRoundedRect(2, 2, btnW - 4, btnH * 0.4, { tl: 4, tr: 4, bl: 0, br: 0 });
      };

      draw(fillN, border);
      const lbl = this.add.text(btnW / 2, btnH / 2, label, {
        fontSize: '18px', fontStyle: 'bold',
        color: P.textMain, stroke: '#060814', strokeThickness: 5
      }).setOrigin(0.5);

      const hit = this.add.rectangle(btnW / 2, btnH / 2, btnW, btnH, 0, 0)
        .setInteractive({ useHandCursor: true });

      c.add([bg, lbl, hit]);

      hit.on('pointerover',  () => draw(fillH,       P.borderGlow));
      hit.on('pointerout',   () => draw(fillN,       border));
      hit.on('pointerdown',  () => draw(P.btnPress,  P.borderDim));
      hit.on('pointerup',    () => draw(fillH,       P.borderGlow));

      return { container: c, bg, hit };
    };

    const atkPos = startX;
    const defPos = startX + btnW + gap;
    const runPos = startX + (btnW + gap) * 2;

    const atk = mkBtn(atkPos, 'ATTACK',  P.btnDanger,  P.btnDangerHov, P.borderRed);
    const def = mkBtn(defPos, 'DEFEND',  P.btnBlue,    P.btnBlueHov,   P.borderBlue);
    const run = mkBtn(runPos, 'RUN',     P.btnNeutral, P.btnNeutralHov,0x445566);

    atk.hit.on('pointerup', () => { if (!this.battleOver) this.performAttack(); });
    def.hit.on('pointerup', () => { if (!this.battleOver) this.performDefend(); });
    run.hit.on('pointerup', () => { if (!this.battleOver) this.runAway(); });

    // Store containers for enable/disable
    this.attackBtn  = atk;
    this.defendBtn  = def;
    this.runBtn     = run;
  }

  // ── Battle logic (unchanged) ───────────────────────────────────────────────

  performAttack() {
    const damage = Math.floor(Math.random() * 20) + 10;

    if (this.playerSprite && this.playerAttackAnims.length) {
      const atk = Phaser.Utils.Array.GetRandom(this.playerAttackAnims);
      this.playerSprite.play(atk, true);
      this.playerSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this.monsterHP > 0 && this.anims.exists('idle')) this.playerSprite.play('idle', true);
      });
    }

    if (this.monsterSprite && this.anims.exists(`${this.monster}_hurt`)) {
      this.monsterSprite.play(`${this.monster}_hurt`, true);
      this.monsterSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this.monsterHP > 0 && this.anims.exists(`${this.monster}_idle`)) {
          this.monsterSprite.play(`${this.monster}_idle`, true);
        }
      });
    }

    this.monsterHP = Math.max(0, this.monsterHP - damage);
    this.updateHealthBars();
    this.addLog(`You dealt ${damage} damage!`);
    if (this.monsterHP <= 0) { this.victory(); return; }
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
        if (this.playerHP > 0 && this.anims.exists('idle')) this.playerSprite.play('idle', true);
      });
    }
    const damage = Math.floor((Math.random() * 15 + 5) * damageMultiplier);
    this.playerHP = Math.max(0, this.playerHP - damage);
    this.updateHealthBars();
    this.addLog(`${this.monster} dealt ${damage} damage!`);
    if (this.playerHP <= 0) this.defeat();
  }

  getRandomAttackAnim() {
    if (!this.monsterAttackAnims.length) return null;
    return this.monsterAttackAnims[Phaser.Math.Between(0, this.monsterAttackAnims.length - 1)];
  }

  runAway() {
    if (Math.random() > 0.5) {
      this.addLog('You escaped successfully!');
      this.time.delayedCall(1000, () => this.scene.start('GameMapScene', { mapConfig: gameState.getCurrentMap() }));
    } else {
      this.addLog('Failed to escape!');
      this.time.delayedCall(500, () => this.monsterTurn());
    }
  }

  updateHealthBars() {
    this._drawHpBar(this.playerHPBar,  this._pBarX, this._pBarY, this._barW, this._barH, this.playerHP  / 100, P.hpGreen);
    this._drawHpBar(this.monsterHPBar, this._mBarX, this._mBarY, this._barW, this._barH, this.monsterHP / 100, P.hpRed);
  }

  addLog(message) {
    this.battleLog.push(message);
    if (this.battleLog.length > 5) this.battleLog.shift();
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
    if (learner?.learnerId) {
      const savedLearner = await apiService.updateLearner(learner.learnerId, { ...learner, updated_at: new Date().toISOString() });
      gameState.setLearner(savedLearner);
    }

    this.addLog(`Victory! Gained ${xpGained} XP!`);

    this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'VICTORY!', {
      fontSize: '72px', fontStyle: 'bold',
      color: P.textGreen, stroke: '#060814', strokeThickness: 10
    }).setOrigin(0.5);

    this.time.delayedCall(2000, () => this.scene.start('GameMapScene', { mapConfig: gameState.getCurrentMap() }));
  }

  defeat() {
    this.addLog('You were defeated...');
    if (this.battleOver) return;
    this.battleOver = true;
    this.setActionButtonsEnabled(false);

    if (this.playerSprite && this.anims.exists('dead')) this.playerSprite.play('dead', true);

    this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'DEFEAT', {
      fontSize: '72px', fontStyle: 'bold',
      color: P.textRed, stroke: '#060814', strokeThickness: 10
    }).setOrigin(0.5);

    this.time.delayedCall(2000, () => {
      this.playerHP = 100;
      this.scene.start('GameMapScene', { mapConfig: gameState.getCurrentMap() });
    });
  }

  setActionButtonsEnabled(enabled) {
    [this.attackBtn, this.defendBtn, this.runBtn].forEach((btn) => {
      if (!btn) return;
      if (enabled) {
        btn.hit?.setInteractive({ useHandCursor: true });
      } else {
        btn.hit?.disableInteractive();
      }
      btn.container?.setAlpha(enabled ? 1 : 0.4);
    });
  }
}