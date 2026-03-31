import Phaser from 'phaser';
import { monsterRegistry } from '../../characters/monsters/MonsterRegistry.js';
import { NPCRegistry } from '../../characters/npcs/NPCRegistry.js';
import { HUD } from './constants.js';

export const entityRenderingMethods = {
  getUiNoSpawnRects() {
    const cam = this.cameras?.main;
    if (!cam) return [];

    const pad = 18;
    const rects = [];
    const pushRect = (x, y, width, height, extraPad = pad) => {
      if (![x, y, width, height].every(Number.isFinite)) return;
      rects.push({
        x: cam.scrollX + x - extraPad,
        y: cam.scrollY + y - extraPad,
        width: width + extraPad * 2,
        height: height + extraPad * 2
      });
    };

    // BACK / SHOP buttons
    pushRect(20, 70, 120, 40);
    pushRect(cam.width - 140, 70, 120, 40);

    // Mission panel
    if (this.missionCardBounds) {
      const missionHeight = Math.max(
        Number(this.missionCardBounds.minHeight || 54),
        Number(this.missionText?.height || 0) + 24
      );
      pushRect(this.missionCardBounds.x, this.missionCardBounds.y, this.missionCardBounds.width, missionHeight, 20);
    }

    // Left banner + event/duel buttons
    if (this.mapBannerCardBounds) {
      const bannerHeight = Math.max(
        Number(this.mapBannerCardBounds.minHeight || 124),
        Math.ceil(((this.mapSignalText?.y || this.mapBannerCardBounds.y) + (this.mapSignalText?.height || 0))
          - this.mapBannerCardBounds.y + 14)
      );
      pushRect(this.mapBannerCardBounds.x, this.mapBannerCardBounds.y, this.mapBannerCardBounds.width, bannerHeight, 20);
    }
    if (this.mapEventButton?.container) {
      pushRect(this.mapEventButton.container.x, this.mapEventButton.container.y, 120, 40);
    }
    if (this.sideChallengeButton?.container) {
      pushRect(this.sideChallengeButton.container.x, this.sideChallengeButton.container.y, 120, 40);
    }

    // Right quest chain panel + claim button
    const questPanelX = cam.width - 290;
    pushRect(questPanelX, 160, 250, 230, 20);
    if (this.claimRewardButton?.container) {
      pushRect(this.claimRewardButton.container.x, this.claimRewardButton.container.y, 120, 40);
    }

    return rects;
  },

  isBlockedByUiAt(x, y, radius = 14) {
    const rects = this.getUiNoSpawnRects();
    if (!rects.length) return false;
    return rects.some((rect) => {
      const left = rect.x - radius;
      const top = rect.y - radius;
      const right = rect.x + rect.width + radius;
      const bottom = rect.y + rect.height + radius;
      return x >= left && x <= right && y >= top && y <= bottom;
    });
  },

  isBlockedByCollisionAt(x, y, radius = 14) {
    const samplePoints = [
      [x, y],
      [x - radius, y],
      [x + radius, y],
      [x, y - radius],
      [x, y + radius]
    ];

    if (Array.isArray(this.collisionLayers) && this.collisionLayers.length) {
      for (const layer of this.collisionLayers) {
        if (!layer?.getTileAtWorldXY) continue;
        for (const [sx, sy] of samplePoints) {
          const tile = layer.getTileAtWorldXY(sx, sy, true);
          if (tile?.collides) return true;
        }
      }
    }

    if (Array.isArray(this.collisionBodies) && this.collisionBodies.length) {
      for (const body of this.collisionBodies) {
        if (!body) continue;
        const left = body.x - body.width / 2;
        const right = body.x + body.width / 2;
        const top = body.y - body.height / 2;
        const bottom = body.y + body.height / 2;
        for (const [sx, sy] of samplePoints) {
          if (sx >= left && sx <= right && sy >= top && sy <= bottom) return true;
        }
      }
    }

    return false;
  },

  isTooCloseToOccupied(x, y, occupied, minDistance) {
    if (!Array.isArray(occupied) || !occupied.length) return false;
    const minDistSq = minDistance * minDistance;
    return occupied.some((point) => {
      if (!point) return false;
      const dx = x - point.x;
      const dy = y - point.y;
      return (dx * dx + dy * dy) < minDistSq;
    });
  },

  getWalkableSpawnPoint(preferredX, preferredY, occupied = [], options = {}) {
    const minDistance = Number.isFinite(options.minDistance) ? options.minDistance : 72;
    const maxRadius = Number.isFinite(options.maxRadius) ? options.maxRadius : 260;
    const maxAttempts = Number.isFinite(options.maxAttempts) ? options.maxAttempts : 120;
    const spawnRadius = Number.isFinite(options.spawnRadius) ? options.spawnRadius : 14;

    const bounds = this.physics?.world?.bounds;
    const minX = Number.isFinite(bounds?.x) ? bounds.x + spawnRadius : spawnRadius;
    const minY = Number.isFinite(bounds?.y) ? bounds.y + spawnRadius : spawnRadius;
    const maxX = Number.isFinite(bounds?.right) ? bounds.right - spawnRadius : this.cameras.main.width - spawnRadius;
    const maxY = Number.isFinite(bounds?.bottom) ? bounds.bottom - spawnRadius : this.cameras.main.height - spawnRadius;

    const clampX = (value) => Phaser.Math.Clamp(value, minX, maxX);
    const clampY = (value) => Phaser.Math.Clamp(value, minY, maxY);
    const fallback = { x: clampX(preferredX), y: clampY(preferredY) };

    for (let i = 0; i < maxAttempts; i += 1) {
      const radius = Phaser.Math.FloatBetween(0, maxRadius);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const x = clampX(preferredX + Math.cos(angle) * radius);
      const y = clampY(preferredY + Math.sin(angle) * radius);
      if (this.isBlockedByCollisionAt(x, y, spawnRadius)) continue;
      if (this.isBlockedByUiAt(x, y, spawnRadius)) continue;
      if (this.isTooCloseToOccupied(x, y, occupied, minDistance)) continue;
      return { x, y };
    }

    if (
      !this.isBlockedByCollisionAt(fallback.x, fallback.y, spawnRadius)
      && !this.isBlockedByUiAt(fallback.x, fallback.y, spawnRadius)
    ) return fallback;

    for (let i = 0; i < maxAttempts; i += 1) {
      const x = Phaser.Math.FloatBetween(minX, maxX);
      const y = Phaser.Math.FloatBetween(minY, maxY);
      if (this.isBlockedByCollisionAt(x, y, spawnRadius)) continue;
      if (this.isBlockedByUiAt(x, y, spawnRadius)) continue;
      if (this.isTooCloseToOccupied(x, y, occupied, minDistance)) continue;
      return { x, y };
    }

    return fallback;
  },

  createNPCs() {
    const columns = 4;
    const spacingX = 170;
    const spacingY = 120;
    const startX = 220;
    const startY = 440;
    const occupied = [];

    this.npcs.forEach((npc, index) => {
      if (!npc || !npc.name) return;

      const col = index % columns;
      const row = Math.floor(index / columns);
      const preferredX = startX + col * spacingX + Phaser.Math.Between(-20, 20);
      const preferredY = startY + row * spacingY + Phaser.Math.Between(-12, 12);
      const { x, y } = this.getWalkableSpawnPoint(preferredX, preferredY, occupied, {
        minDistance: 84,
        maxRadius: 280,
        maxAttempts: 160,
        spawnRadius: 16
      });
      occupied.push({ x, y });

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
      sprite.setData('statusBadgeOffsetY', Number.isFinite(config.statusBadgeOffsetY) ? config.statusBadgeOffsetY : 14);
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
      this.placeStatusBadge(sprite, statusBadge);
      sprite.setData('statusBadge', statusBadge);

      sprite.play(`${npcName}_idle`, true);
      this.npcSprites.push(sprite);
    });
  },

  createMonsters() {
    const mappings = Array.from(this.npcMonsterMap.entries());
    const totalMonsters = mappings.length;
    const occupied = [
      ...(this.npcSprites || []).map((sprite) => ({ x: sprite.x, y: sprite.y }))
    ];

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
      const { x, y } = this.getWalkableSpawnPoint(npcSprite.x + 90, npcSprite.y - 20, occupied, {
        minDistance: 60,
        maxRadius: 150,
        maxAttempts: 120,
        spawnRadius: 16
      });
      occupied.push({ x, y });

      const monsterName = encounterMonster.name;
      const config = monsterRegistry[monsterName] || monsterRegistry.orc;
      if (!this.textures.exists(monsterName)) {
        console.warn(`Missing texture for ${encounterMonster.asset}, fallback to orc`);
      }

      const sprite = this.physics.add.sprite(x, y, monsterName, 0);
      sprite.setScale(config.scale);
      sprite.setDepth(4);
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

  placeStatusBadge(sprite, statusBadge) {
    const nameText = sprite?.getData?.('nameText');
    const offsetY = Number.isFinite(sprite?.getData?.('statusBadgeOffsetY')) ? sprite.getData('statusBadgeOffsetY') : 14;
    if (nameText) {
      statusBadge.setPosition(sprite.x, nameText.y - offsetY);
      return;
    }
    statusBadge.setPosition(sprite.x, sprite.y - 58);
  },

  updateNpcInteraction() {
    const player = this.playerCtrl?.sprite;
    if (!player || !this.interactPrompt) return;

    this.npcSprites = this.npcSprites.filter((sprite) => sprite && sprite.active && sprite.body && sprite.getData('npc'));
    this.monsterSprites = this.monsterSprites.filter((sprite) => sprite && sprite.getData('monster'));

    let closestNpc = null;
    let closestNpcDist = Number.POSITIVE_INFINITY;
    for (const npcSprite of this.npcSprites) {
      const distance = Phaser.Math.Distance.Between(player.x, player.y, npcSprite.x, npcSprite.y);
      if (distance < closestNpcDist) {
        closestNpcDist = distance;
        closestNpc = npcSprite;
      }
    }

    let closestMonster = null;
    let closestMonsterDist = Number.POSITIVE_INFINITY;
    for (const monsterSprite of this.monsterSprites) {
      if (!monsterSprite.visible || !monsterSprite.active) continue;

      const npcKey = monsterSprite.getData('npcKey');
      if (npcKey && !this.isMonsterInteractableForNpcKey(npcKey)) continue;

      const distance = Phaser.Math.Distance.Between(player.x, player.y, monsterSprite.x, monsterSprite.y);
      if (distance < closestMonsterDist) {
        closestMonsterDist = distance;
        closestMonster = monsterSprite;
      }
    }

    const inNpcRange = closestNpc && closestNpcDist <= this.npcInteractDistance;
    const inMonsterRange = closestMonster && closestMonsterDist <= this.monsterInteractDistance;
    this.closestNpcSprite = inNpcRange ? closestNpc : null;
    this.closestMonsterSprite = inMonsterRange ? closestMonster : null;

    if (!inNpcRange && !inMonsterRange) {
      this.interactPromptBg?.setVisible(false);
      this.interactPrompt.setVisible(false);
      return;
    }

    const useMonsterTarget = inMonsterRange && (!inNpcRange || closestMonsterDist <= closestNpcDist);
    this.interactPromptBg?.setVisible(true);
    this.interactPrompt.setVisible(true);

    if (useMonsterTarget) {
      const monster = closestMonster.getData('monster');
      const monsterName = monster?.name || 'monster';
      this.interactPrompt.setText(`Press E to fight ${monsterName}`);

      if (Phaser.Input.Keyboard.JustDown(this.interactKey) && !this.scene.isActive('DialogueScene') && !this.isDomInputFocused()) {
        this.encounterMonster(monster);
        this.interactPromptBg?.setVisible(false);
        this.interactPrompt.setVisible(false);
      }
      return;
    }

    const npc = closestNpc.getData('npc');
    if (!npc || !npc.name) {
      this.interactPromptBg?.setVisible(false);
      this.interactPrompt.setVisible(false);
      return;
    }

    const progressState = this.getProgressState(npc);
    const mapping = this.npcMonsterMap.get(this.getNpcKey(npc));
    const monsterName = mapping?.monster?.name || 'monster';
    const spawned = this.revealedMonsterNpcKeys.has(this.getNpcKey(npc));
    this.interactPrompt.setText(
      `Press E to talk to ${npc.name}  |  ${progressState.toUpperCase()}  |  ${monsterName}: ${spawned ? 'spawned' : 'locked'}`
    );

    if (Phaser.Input.Keyboard.JustDown(this.interactKey) && !this.scene.isActive('DialogueScene') && !this.isDomInputFocused()) {
      this.interactWithNPC(npc);
      this.interactPromptBg?.setVisible(false);
      this.interactPrompt.setVisible(false);
    }
  }
};
