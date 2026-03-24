import Phaser from 'phaser';
import { gameState } from '../../services/gameState.js';
import { applyPlayerProfileToSprite } from '../../services/playerProfile.js';
import { monsterRegistry } from '../../characters/monsters/MonsterRegistry.js';
import { soldier } from '../../characters/soldier/Soldier.js';

export const combatSceneEntityMethods = {
  createMonsterIcon(x, y) {
    if (!this.textures.exists(this.monsterKey.key)) return;

    this.monsterSprite = this.add.sprite(x, y, this.monsterKey.key, 0)
      .setScale(Math.max(this.monsterKey.scale, 2.2))
      .setDepth(10)
      .setFlipX(true);

    if (this.canPlayAnim(`${this.monsterName}_idle`)) {
      this.monsterSprite.play(`${this.monsterName}_idle`, true);
    } else if (this.canPlayAnim('orc_idle')) {
      this.monsterSprite.play('orc_idle', true);
    }
  },

  createPlayerIcon(x, y) {
    this.createPlayerAnimations();
    this.playerAttackAnims = ['attack_1', 'attack_2', 'attack_3'].filter((key) => this.anims.exists(key));

    this.playerSprite = this.add.sprite(x, y, soldier.sheetKey, 0)
      .setScale(Math.max(soldier.scale, 2.2))
      .setDepth(10)
      .setFlipX(false);

    applyPlayerProfileToSprite(this.playerSprite, gameState.getPlayerProfile());

    if (this.canPlayAnim('idle')) this.playerSprite.play('idle', true);
  },

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
  },

  canPlayAnim(key) {
    const anim = this.anims.get(key);
    return Boolean(anim && Array.isArray(anim.frames) && anim.frames.length > 0);
  },

  getRandomMonsterAttackAnim() {
    if (!this.monsterAttackAnims.length) return null;
    return this.monsterAttackAnims[Phaser.Math.Between(0, this.monsterAttackAnims.length - 1)];
  },

  resolveMonsterKey(rawName) {
    const direct = String(rawName || '').trim();
    if (direct && monsterRegistry[direct]) return direct;

    const normalized = direct.toLowerCase().replace(/[^a-z0-9]/g, '');
    const match = Object.keys(monsterRegistry).find(
      (key) => key.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized
    );

    return match || 'orc';
  }
};
