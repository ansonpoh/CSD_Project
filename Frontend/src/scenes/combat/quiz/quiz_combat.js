import Phaser from 'phaser';

export const combatSceneQuizCombatMethods = {
  playPlayerQuizAttack({ applyDamage = true, confirmedCorrect = true } = {}) {
    const damage = this.damagePerCorrect;

    if (this.playerSprite && this.playerAttackAnims.length) {
      const attackAnim = Phaser.Utils.Array.GetRandom(this.playerAttackAnims);
      if (this.canPlayAnim(attackAnim)) this.playerSprite.play(attackAnim, true);
      this.playerSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this.monsterHP > 0 && this.canPlayAnim('idle')) this.playerSprite.play('idle', true);
      });
    }

    if (this.monsterSprite && this.canPlayAnim(`${this.monsterName}_hurt`)) {
      this.monsterSprite.play(`${this.monsterName}_hurt`, true);
      this.monsterSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this.monsterHP > 0 && this.canPlayAnim(`${this.monsterName}_idle`)) {
          this.monsterSprite.play(`${this.monsterName}_idle`, true);
        }
      });
    }

    if (applyDamage) {
      this.monsterHP = Math.max(0, this.monsterHP - damage);
      this.updateHealthBars();
      this.addLog(`Correct! Slash landed for ${damage} damage.`);
      return;
    }

    if (!confirmedCorrect) {
      this.addLog('Answer locked in. Final grading happens after all questions.');
    }
  },

  playMonsterCounterAttack({ applyDamage = true } = {}) {
    const attackAnim = this.getRandomMonsterAttackAnim();
    if (this.monsterSprite && attackAnim) {
      if (this.canPlayAnim(attackAnim)) this.monsterSprite.play(attackAnim, true);
      this.monsterSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this.canPlayAnim(`${this.monsterName}_idle`)) this.monsterSprite.play(`${this.monsterName}_idle`, true);
      });
    }

    if (this.playerSprite && this.canPlayAnim('hurt')) {
      this.playerSprite.play('hurt', true);
      this.playerSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this.playerHP > 0 && this.canPlayAnim('idle')) this.playerSprite.play('idle', true);
      });
    }

    if (!applyDamage) return;

    const damage = Phaser.Math.Between(8, 18);
    this.playerHP = Math.max(0, this.playerHP - damage);
    this.updateHealthBars();
    this.addLog(`You took ${damage} damage.`);
  }
};
