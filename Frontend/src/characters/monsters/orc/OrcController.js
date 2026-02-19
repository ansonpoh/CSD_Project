import Phaser from 'phaser';
import { orc as cfg } from './Orc.js';

export class OrcController {
  constructor(scene, x, y, target = null) {
    this.scene = scene;
    this.isDead = false;
    this.isAttacking = false;
    this.lastAttackAt = 0;

    this.sprite = scene.physics.add.sprite(x/2, y/2, cfg.sheetKey, 0);
    this.sprite.setScale(cfg.scale);
    this.sprite.setDepth(5);

    this.createAnims();
    this.sprite.play('idle');
  }

  createAnims() {
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

  playAttack(name) {
    if (this.isAttacking || this.isDead) return;
    this.isAttacking = true;
    this.sprite.setVelocity(0, 0);
    this.sprite.play(name, true);
    this.sprite.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + name,
      () => {
        this.isAttacking = false;
        if (!this.isDead) this.sprite.play('idle', true);
      }
    );
  }

  takeDamage() {
    if (this.isDead) return;
    this.sprite.play('hurt', true);
    this.sprite.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + 'hurt',
      () => {
        if (!this.isDead) this.sprite.play('idle', true);
      }
    );
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.sprite.setVelocity(0, 0);
    this.sprite.play('dead', true);
    this.sprite.body.enable = false;
  }

  update() {
    if (this.isDead || this.isAttacking) return;

    const dx = this.target.x - this.sprite.x;
    const dy = this.target.y - this.sprite.y;

    if (dx < 0) this.sprite.setFlipX(true);
    else this.sprite.setFlipX(false);

    this.sprite.setVelocity(0, 0);
    this.sprite.play('idle', true);
  }
}
