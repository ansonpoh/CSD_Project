import Phaser from 'phaser';
import { soldier as cfg } from './Soldier.js';
// import {slime as cfg} from "../monsters/slime/Slime.js";
// import {lancer as cfg} from "../npcs/lancer/Lancer.js";

export class SoldierController {
  constructor(scene, x, y) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x/2, y/2, cfg.sheetKey, 0);
    this.speed = 200;
    this.isAttacking = false;

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys({
      atk1: Phaser.Input.Keyboard.KeyCodes.Z,
      atk2: Phaser.Input.Keyboard.KeyCodes.X,
      atk3: Phaser.Input.Keyboard.KeyCodes.C
    });

    this.createAnims();
    this.sprite.play(`idle`);
    this.sprite.setScale(cfg.scale);
    this.sprite.body.setSize(
      this.sprite.displayWidth / (cfg.scale*4),
      this.sprite.displayHeight / (cfg.scale*4),
      true
    );
    this.sprite.setCollideWorldBounds(true);
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
    if (this.isAttacking) return;
    this.isAttacking = true;
    this.sprite.setVelocity(0, 0);
    this.sprite.play(name, true);
    this.sprite.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + name,
      () => {
        this.isAttacking = false;
        this.sprite.play('idle', true);
      }
    );
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.atk1)) this.playAttack('attack_1');
    if (Phaser.Input.Keyboard.JustDown(this.keys.atk2)) this.playAttack('attack_2');
    if (Phaser.Input.Keyboard.JustDown(this.keys.atk3)) this.playAttack('attack_3');
    if (this.isAttacking) return;

    let vx = 0, vy = 0;
    if (this.cursors.left.isDown) { vx = -this.speed; this.sprite.setFlipX(true); }
    else if (this.cursors.right.isDown) { vx = this.speed; this.sprite.setFlipX(false); }
    if (this.cursors.up.isDown) vy = -this.speed;
    else if (this.cursors.down.isDown) vy = this.speed;

    this.sprite.setVelocity(vx, vy);
    this.sprite.play(`${vx || vy ? 'move' : 'idle'}`, true);
  }
}
