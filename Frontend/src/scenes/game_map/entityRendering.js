import Phaser from 'phaser';
import { monsterRegistry } from '../../characters/monsters/MonsterRegistry.js';
import { NPCRegistry } from '../../characters/npcs/NPCRegistry.js';
import { HUD } from './constants.js';

export const entityRenderingMethods = {
  createNPCs() {
    const columns = 4;
    const spacingX = 170;
    const spacingY = 120;
    const startX = 220;
    const startY = 440;

    this.npcs.forEach((npc, index) => {
      if (!npc || !npc.name) return;

      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = startX + col * spacingX + Phaser.Math.Between(-20, 20);
      const y = startY + row * spacingY + Phaser.Math.Between(-12, 12);

      const npcName = npc.name;
      const config = NPCRegistry[npcName] || NPCRegistry.orc;
      if (!this.textures.exists(npcName)) {
        console.warn(`Missing texture for ${npc.asset}`);
      }

      const sprite = this.physics.add.sprite(x, y, npcName, 0);
      sprite.setScale(config.scale);
      sprite.setDepth(5);
      sprite.setData('npc', npc);
      sprite.setData('labelOffsetY', config.labelOffsetY);
      sprite.setData('npcKey', this.getNpcKey(npc));

      const nameText = this.add.text(x, y, npcName, {
        fontSize: '14px',
        fontFamily: 'Trebuchet MS, Verdana, sans-serif',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 6, y: 3 }
      }).setOrigin(0.5, 1);
      this.placeNameLabel(sprite, nameText, config.labelOffsetY);
      sprite.setData('nameText', nameText);

      const statusBadge = this.add.text(x, y - 56, '', {
        fontSize: '12px',
        fontFamily: 'Trebuchet MS, Verdana, sans-serif',
        fontStyle: 'bold',
        color: HUD.textSub,
        backgroundColor: '#0a1128',
        padding: { x: 6, y: 2 }
      }).setOrigin(0.5, 1).setDepth(6);
      sprite.setData('statusBadge', statusBadge);

      sprite.play(`${npcName}_idle`, true);
      this.npcSprites.push(sprite);
    });
  },

  createMonsters() {
    const mappings = Array.from(this.npcMonsterMap.entries());
    const totalMonsters = mappings.length;

    mappings.forEach(([npcKey, mapping], index) => {
      const monster = mapping.monster;
      const npcSprite = this.npcSprites.find((sprite) => sprite.getData('npcKey') === npcKey);
      if (!monster || !npcSprite) return;

      const encounterMonster = {
        ...monster,
        npcId: this.getNpcId(mapping.npc),
        encounterIndex: index,
        totalMonsters,
        isBossEncounter: Boolean(mapping?.pair?.bossEncounter) || (totalMonsters > 0 && index === totalMonsters - 1)
      };
      const x = npcSprite.x + 90;
      const y = npcSprite.y - 20;

      const monsterName = encounterMonster.name;
      const config = monsterRegistry[monsterName] || monsterRegistry.orc;
      if (!this.textures.exists(monsterName)) {
        console.warn(`Missing texture for ${encounterMonster.asset}, fallback to orc`);
      }

      const sprite = this.physics.add.sprite(x, y, monsterName, 0);
      sprite.setScale(config.scale);
      sprite.setDepth(4);
      sprite.setInteractive();
      sprite.setData('monster', encounterMonster);
      sprite.setData('npcKey', npcKey);
      sprite.setVisible(false);
      sprite.setActive(false);
      sprite.body.enable = false;
      sprite.disableInteractive();

      const labelName = encounterMonster.isBossEncounter ? `${monsterName} [BOSS]` : monsterName;
      const nameText = this.add.text(x, y, labelName, {
        fontSize: '14px',
        fontFamily: 'Trebuchet MS, Verdana, sans-serif',
        fontStyle: 'bold',
        color: '#ffe8cc',
        backgroundColor: '#2a1010',
        padding: { x: 6, y: 3 }
      }).setOrigin(0.5, 1);
      this.placeNameLabel(sprite, nameText, config.labelOffsetY);
      nameText.setVisible(false);
      sprite.setData('nameText', nameText);
      sprite.setData('labelOffsetY', config.labelOffsetY);
      sprite.setData('baseLabel', labelName);

      sprite.play(`${monsterName}_idle`, true);
      sprite.on('pointerdown', () => this.encounterMonster(encounterMonster));
      this.monsterSprites.push(sprite);
      this.monsterSpriteByNpcKey.set(npcKey, sprite);

      if (this.shouldMonsterBeUnlockedForNpc(mapping.npc)) {
        this.revealMonsterForNpc(mapping.npc, { animate: false, silent: true });
      }
      this.updateMonsterVisualState(sprite);
    });
  },

  createMonsterAnimations() {
    Object.entries(monsterRegistry).forEach(([monsterType, definition]) => {
      Object.entries(definition.anims || {}).forEach(([animName, anim]) => {
        const key = `${monsterType}_${animName}`;
        if (this.anims.exists(key)) return;

        const frames = Array.from({ length: anim.count }, (_, index) => definition.maxCols * anim.row + index);
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(definition.key, { frames }),
          frameRate: anim.frameRate,
          repeat: anim.repeat
        });
      });
    });
  },

  createNPCAnimations() {
    Object.entries(NPCRegistry).forEach(([npcType, definition]) => {
      Object.entries(definition.anims || {}).forEach(([animName, anim]) => {
        const key = `${npcType}_${animName}`;
        if (this.anims.exists(key)) return;

        const frames = Array.from({ length: anim.count }, (_, index) => definition.maxCols * anim.row + index);
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(definition.key, { frames }),
          frameRate: anim.frameRate,
          repeat: anim.repeat
        });
      });
    });
  },

  placeNameLabel(sprite, nameText, offsetY) {
    const topY = sprite.y - (sprite.displayHeight * sprite.originY);
    nameText.setPosition(sprite.x, topY + offsetY);
  },

  updateNpcInteraction() {
    const player = this.playerCtrl?.sprite;
    if (!player || !this.interactPrompt) return;

    this.npcSprites = this.npcSprites.filter((sprite) => sprite && sprite.active && sprite.body && sprite.getData('npc'));

    let closest = null;
    let closestDist = Number.POSITIVE_INFINITY;
    for (const npcSprite of this.npcSprites) {
      const distance = Phaser.Math.Distance.Between(player.x, player.y, npcSprite.x, npcSprite.y);
      if (distance < closestDist) {
        closestDist = distance;
        closest = npcSprite;
      }
    }

    const inRange = closest && closestDist <= this.npcInteractDistance;
    if (!inRange) {
      this.closestNpcSprite = null;
      this.interactPromptBg?.setVisible(false);
      this.interactPrompt.setVisible(false);
      return;
    }

    const npc = closest.getData('npc');
    if (!npc || !npc.name) {
      this.closestNpcSprite = null;
      this.interactPrompt.setVisible(false);
      return;
    }

    this.closestNpcSprite = closest;
    const progressState = this.getProgressState(npc);
    const mapping = this.npcMonsterMap.get(this.getNpcKey(npc));
    const monsterName = mapping?.monster?.name || 'monster';
    const spawned = this.revealedMonsterNpcKeys.has(this.getNpcKey(npc));
    this.interactPrompt.setText(
      `Press E to talk to ${npc.name}  |  ${progressState.toUpperCase()}  |  ${monsterName}: ${spawned ? 'spawned' : 'locked'}`
    );
    this.interactPromptBg?.setVisible(true);
    this.interactPrompt.setVisible(true);

    if (Phaser.Input.Keyboard.JustDown(this.interactKey) && !this.scene.isActive('DialogueScene') && !this.isDomInputFocused()) {
      this.interactWithNPC(npc);
      this.interactPromptBg?.setVisible(false);
      this.interactPrompt.setVisible(false);
    }
  }
};
