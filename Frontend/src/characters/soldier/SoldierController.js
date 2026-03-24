import Phaser from 'phaser';
import { soldier as cfg } from './Soldier.js';
import { gameState } from '../../services/gameState.js';
import { applyPlayerProfileToSprite } from '../../services/playerProfile.js';
// import {slime as cfg} from "../monsters/slime/Slime.js";
// import {lancer as cfg} from "../npcs/lancer/Lancer.js";

export class SoldierController {
  constructor(scene, x, y) {
    this.scene = scene;
    this.ensureFallbackTexture();
    const textureKey = scene.textures.exists(cfg.sheetKey) ? cfg.sheetKey : 'soldier-fallback';
    this.sprite = scene.physics.add.sprite(x / 2, y / 2, textureKey, 0);
    this.speed = 200;
    this.isAttacking = false;

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys({
      atk1: Phaser.Input.Keyboard.KeyCodes.Z,
      atk2: Phaser.Input.Keyboard.KeyCodes.X,
      atk3: Phaser.Input.Keyboard.KeyCodes.C
    });

    this.createAnims();
    if (this.canPlayAnim('idle')) {
      this.sprite.play('idle');
    }
    this.sprite.setScale(cfg.scale);
    this.sprite.body.setSize(
      this.sprite.displayWidth / (cfg.scale * 4),
      this.sprite.displayHeight / (cfg.scale * 4),
      true
    );
    this.sprite.setCollideWorldBounds(true);
    applyPlayerProfileToSprite(this.sprite, gameState.getPlayerProfile());
    this.sprite.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.isAttacking = false;
      this.sprite = null;
    });
  }

  ensureFallbackTexture() {
    if (this.scene.textures.exists('soldier-fallback')) return;

    const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0x4a90e2, 1);
    graphics.fillRoundedRect(12, 8, 76, 84, 18);
    graphics.fillStyle(0xe8f3ff, 1);
    graphics.fillCircle(50, 28, 14);
    graphics.fillStyle(0x17345c, 1);
    graphics.fillRoundedRect(28, 46, 44, 34, 8);
    graphics.generateTexture('soldier-fallback', cfg.frameWidth, cfg.frameHeight);
    graphics.destroy();
  }

  createAnims() {
    if (!this.scene.textures.exists(cfg.sheetKey)) return;

    Object.entries(cfg.anims).forEach(([name, a]) => {
      const key = name;
      if (this.scene.anims.exists(key)) return;
      const frames = Array.from({ length: a.count }, (_, i) => a.row * cfg.maxCols + i);
      this.scene.anims.create({
        key,
        frames: this.scene.anims.generateFrameNumbers(cfg.sheetKey, { frames }),
        frameRate: a.frameRate,
        repeat: a.repeat
      });
    });
  }

  canPlayAnim(name) {
    const anim = this.scene.anims.get(name);
    return Boolean(anim && Array.isArray(anim.frames) && anim.frames.length > 0);
  }

  hasActiveSprite() {
    return Boolean(this.sprite && this.sprite.active && this.sprite.body);
  }

  playAttack(name) {
    const sprite = this.sprite;
    if (this.isAttacking || !this.hasActiveSprite() || !this.canPlayAnim(name)) return;
    this.isAttacking = true;
    sprite.setVelocity(0, 0);
    sprite.play(name, true);
    sprite.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + name,
      () => {
        this.isAttacking = false;
        if (this.sprite !== sprite || !this.hasActiveSprite()) return;
        if (this.canPlayAnim('idle')) {
          sprite.play('idle', true);
        }
      }
    );
  }

  update() {
    const sprite = this.sprite;
    if (!this.hasActiveSprite() || !this.cursors || !this.keys) return;

    if (Phaser.Input.Keyboard.JustDown(this.keys.atk1)) this.playAttack('attack_1');
    if (Phaser.Input.Keyboard.JustDown(this.keys.atk2)) this.playAttack('attack_2');
    if (Phaser.Input.Keyboard.JustDown(this.keys.atk3)) this.playAttack('attack_3');
    if (this.isAttacking) return;

    let vx = 0, vy = 0;
    if (this.cursors.left?.isDown) { vx = -this.speed; sprite.setFlipX(true); }
    else if (this.cursors.right?.isDown) { vx = this.speed; sprite.setFlipX(false); }
    if (this.cursors.up?.isDown) vy = -this.speed;
    else if (this.cursors.down?.isDown) vy = this.speed;

    sprite.setVelocity(vx, vy);
    const nextAnim = vx || vy ? 'move' : 'idle';
    if (this.canPlayAnim(nextAnim)) {
      sprite.play(nextAnim, true);
    }
  }

  destroy() {
    this.isAttacking = false;
    this.cursors = null;
    this.keys = null;
    if (this.sprite?.active) {
      this.sprite.destroy();
    }
    this.sprite = null;
  }
}
