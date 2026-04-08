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

    // Reserve top-left and top-right HUD quadrants so NPC/monster spawns never
    // hide behind BACK/EVENT/MINIGAME (left) or SHOP/QUEST (right) overlays.
    const topQuadrantHeight = Math.max(250, Math.floor(cam.height * 0.58));
    const leftQuadrantWidth = Math.max(300, Math.floor(cam.width * 0.42));
    const rightQuadrantWidth = Math.max(300, Math.floor(cam.width * 0.40));
    pushRect(0, 0, leftQuadrantWidth, topQuadrantHeight, 0);
    pushRect(cam.width - rightQuadrantWidth, 0, rightQuadrantWidth, topQuadrantHeight, 0);

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
    if (this.questCardBounds) {
      // Reserve a taller area than current text height, since quest content can
      // expand after entities are already spawned.
      const questHeight = Math.max(
        Number(this.questCardBounds.minHeight || 230),
        Number(this.questCardBounds.height || 0),
        Math.floor(cam.height * 0.58)
      );
      pushRect(this.questCardBounds.x, this.questCardBounds.y, this.questCardBounds.width, questHeight, 20);
    }
    if (this.claimRewardButton?.container) {
      pushRect(this.claimRewardButton.container.x, this.claimRewardButton.container.y, 120, 40);
    }

    // Bottom interaction bar ("Press E to ...")
    const interactBarWidth = 760;
    const interactBarHeight = 44;
    const interactBarY = cam.height - 40;
    const interactBarX = Math.floor((cam.width - interactBarWidth) / 2);
    pushRect(interactBarX, interactBarY - (interactBarHeight / 2), interactBarWidth, interactBarHeight, 18);

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

  getEntityFootprintRadius(config, fallback = 16) {
    const frameWidth = Number(config?.frameWidth);
    const frameHeight = Number(config?.frameHeight);
    const scale = Number(config?.scale);
    if (!Number.isFinite(frameWidth) || !Number.isFinite(frameHeight) || !Number.isFinite(scale)) {
      return fallback;
    }

    const maxDimension = Math.max(frameWidth, frameHeight) * Math.max(scale, 0.1);
    return Math.max(fallback, Math.round(maxDimension * 0.5));
  },

  isTooCloseToOccupied(x, y, candidateRadius, occupied, minGap) {
    if (!Array.isArray(occupied) || !occupied.length) return false;
    return occupied.some((point) => {
      if (!point) return false;
      const dx = x - point.x;
      const dy = y - point.y;
      const otherRadius = Number.isFinite(point.radius) ? point.radius : 0;
      const requiredDistance = candidateRadius + otherRadius + Math.max(0, minGap);
      return (dx * dx + dy * dy) < (requiredDistance * requiredDistance);
    });
  },

  getSpawnReachabilityCache() {
    if (this._spawnReachabilityCache) return this._spawnReachabilityCache;

    const mapWidth = Number(this.map?.width || 0);
    const mapHeight = Number(this.map?.height || 0);
    const tileWidth = Number(this.map?.tileWidth || 0);
    const tileHeight = Number(this.map?.tileHeight || 0);
    if (!mapWidth || !mapHeight || !tileWidth || !tileHeight) return null;

    const toTile = (worldX, worldY) => ({
      tileX: Phaser.Math.Clamp(Math.floor(worldX / tileWidth), 0, mapWidth - 1),
      tileY: Phaser.Math.Clamp(Math.floor(worldY / tileHeight), 0, mapHeight - 1)
    });

    const toWorldCenter = (tileX, tileY) => ({
      x: tileX * tileWidth + tileWidth / 2,
      y: tileY * tileHeight + tileHeight / 2
    });

    const worldBounds = this.physics?.world?.bounds;
    const isBlockedTile = (tileX, tileY) => {
      const { x, y } = toWorldCenter(tileX, tileY);
      if (worldBounds) {
        const left = Number.isFinite(worldBounds.x) ? worldBounds.x : Number.NEGATIVE_INFINITY;
        const right = Number.isFinite(worldBounds.right) ? worldBounds.right : Number.POSITIVE_INFINITY;
        const top = Number.isFinite(worldBounds.y) ? worldBounds.y : Number.NEGATIVE_INFINITY;
        const bottom = Number.isFinite(worldBounds.bottom) ? worldBounds.bottom : Number.POSITIVE_INFINITY;
        if (x < left || x > right || y < top || y > bottom) return true;
      }

      if (Array.isArray(this.collisionLayers) && this.collisionLayers.length) {
        for (const layer of this.collisionLayers) {
          if (!layer?.getTileAt) continue;
          const tile = layer.getTileAt(tileX, tileY, false);
          if (tile?.collides) return true;
        }
      }

      if (Array.isArray(this.collisionBodies) && this.collisionBodies.length) {
        for (const body of this.collisionBodies) {
          if (!body) continue;
          const left = body.x - body.width / 2;
          const right = body.x + body.width / 2;
          const top = body.y - body.height / 2;
          const bottom = body.y + body.height / 2;
          if (x >= left && x <= right && y >= top && y <= bottom) return true;
        }
      }

      return false;
    };

    const totalTiles = mapWidth * mapHeight;
    const blocked = new Uint8Array(totalTiles);
    for (let tileY = 0; tileY < mapHeight; tileY += 1) {
      for (let tileX = 0; tileX < mapWidth; tileX += 1) {
        const index = tileY * mapWidth + tileX;
        blocked[index] = isBlockedTile(tileX, tileY) ? 1 : 0;
      }
    }

    const anchor = this.playerCtrl?.sprite || this.player;
    const defaultX = this.cameras?.main?.worldView?.centerX ?? this.cameras?.main?.centerX ?? 0;
    const defaultY = this.cameras?.main?.worldView?.centerY ?? this.cameras?.main?.centerY ?? 0;
    let { tileX: startX, tileY: startY } = toTile(anchor?.x ?? defaultX, anchor?.y ?? defaultY);
    let startIndex = startY * mapWidth + startX;

    if (blocked[startIndex]) {
      let found = false;
      const maxRadius = Math.max(mapWidth, mapHeight);
      for (let radius = 1; radius <= maxRadius && !found; radius += 1) {
        const minX = Math.max(0, startX - radius);
        const maxX = Math.min(mapWidth - 1, startX + radius);
        const minY = Math.max(0, startY - radius);
        const maxY = Math.min(mapHeight - 1, startY + radius);
        for (let tileY = minY; tileY <= maxY && !found; tileY += 1) {
          for (let tileX = minX; tileX <= maxX && !found; tileX += 1) {
            const onRing = tileX === minX || tileX === maxX || tileY === minY || tileY === maxY;
            if (!onRing) continue;
            const index = tileY * mapWidth + tileX;
            if (blocked[index]) continue;
            startX = tileX;
            startY = tileY;
            startIndex = index;
            found = true;
          }
        }
      }
      if (!found) return null;
    }

    const reachable = new Uint8Array(totalTiles);
    const queue = [startIndex];
    reachable[startIndex] = 1;
    let head = 0;

    while (head < queue.length) {
      const index = queue[head++];
      const tileX = index % mapWidth;
      const tileY = Math.floor(index / mapWidth);
      const neighbors = [
        [tileX + 1, tileY],
        [tileX - 1, tileY],
        [tileX, tileY + 1],
        [tileX, tileY - 1]
      ];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= mapWidth || ny >= mapHeight) continue;
        const nIndex = ny * mapWidth + nx;
        if (blocked[nIndex] || reachable[nIndex]) continue;
        reachable[nIndex] = 1;
        queue.push(nIndex);
      }
    }

    this._spawnReachabilityCache = {
      mapWidth,
      mapHeight,
      tileWidth,
      tileHeight,
      reachable
    };
    return this._spawnReachabilityCache;
  },

  isReachableFromPlayerAt(x, y) {
    const cache = this.getSpawnReachabilityCache();
    if (!cache) return true;
    const tileX = Phaser.Math.Clamp(Math.floor(x / cache.tileWidth), 0, cache.mapWidth - 1);
    const tileY = Phaser.Math.Clamp(Math.floor(y / cache.tileHeight), 0, cache.mapHeight - 1);
    return Boolean(cache.reachable[tileY * cache.mapWidth + tileX]);
  },

  getSpawnWorldBounds(spawnRadius = 16) {
    const worldBounds = this.physics?.world?.bounds;
    const fallbackWidth = Number(this.map?.widthInPixels) || this.cameras.main.width;
    const fallbackHeight = Number(this.map?.heightInPixels) || this.cameras.main.height;
    const left = Number.isFinite(worldBounds?.x) ? worldBounds.x : 0;
    const top = Number.isFinite(worldBounds?.y) ? worldBounds.y : 0;
    const right = Number.isFinite(worldBounds?.right) ? worldBounds.right : fallbackWidth;
    const bottom = Number.isFinite(worldBounds?.bottom) ? worldBounds.bottom : fallbackHeight;
    const minX = left + spawnRadius;
    const minY = top + spawnRadius;
    const maxX = right - spawnRadius;
    const maxY = bottom - spawnRadius;
    return { minX, minY, maxX, maxY };
  },

  getWalkableSpawnPoint(preferredX, preferredY, occupied = [], options = {}) {
    const minGap = Number.isFinite(options.minGap) ? options.minGap : 18;
    const maxRadius = Number.isFinite(options.maxRadius) ? options.maxRadius : 260;
    const maxAttempts = Number.isFinite(options.maxAttempts) ? options.maxAttempts : 120;
    const spawnRadius = Number.isFinite(options.spawnRadius) ? options.spawnRadius : 14;
    const footprintRadius = Number.isFinite(options.footprintRadius) ? options.footprintRadius : spawnRadius;

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
      if (!this.isReachableFromPlayerAt(x, y)) continue;
      if (this.isBlockedByCollisionAt(x, y, spawnRadius)) continue;
      if (this.isBlockedByUiAt(x, y, spawnRadius)) continue;
      if (this.isTooCloseToOccupied(x, y, footprintRadius, occupied, minGap)) continue;
      return { x, y };
    }

    if (
      this.isReachableFromPlayerAt(fallback.x, fallback.y)
      && !this.isBlockedByCollisionAt(fallback.x, fallback.y, spawnRadius)
      && !this.isBlockedByUiAt(fallback.x, fallback.y, spawnRadius)
      && !this.isTooCloseToOccupied(fallback.x, fallback.y, footprintRadius, occupied, minGap)
    ) return fallback;

    for (let i = 0; i < maxAttempts; i += 1) {
      const x = Phaser.Math.FloatBetween(minX, maxX);
      const y = Phaser.Math.FloatBetween(minY, maxY);
      if (!this.isReachableFromPlayerAt(x, y)) continue;
      if (this.isBlockedByCollisionAt(x, y, spawnRadius)) continue;
      if (this.isBlockedByUiAt(x, y, spawnRadius)) continue;
      if (this.isTooCloseToOccupied(x, y, footprintRadius, occupied, minGap)) continue;
      return { x, y };
    }

    const cache = this.getSpawnReachabilityCache();
    if (cache) {
      const prefTileX = Phaser.Math.Clamp(Math.floor(fallback.x / cache.tileWidth), 0, cache.mapWidth - 1);
      const prefTileY = Phaser.Math.Clamp(Math.floor(fallback.y / cache.tileHeight), 0, cache.mapHeight - 1);
      const maxTileRadius = Math.max(cache.mapWidth, cache.mapHeight);
      for (let radius = 0; radius <= maxTileRadius; radius += 1) {
        const minTileX = Math.max(0, prefTileX - radius);
        const maxTileX = Math.min(cache.mapWidth - 1, prefTileX + radius);
        const minTileY = Math.max(0, prefTileY - radius);
        const maxTileY = Math.min(cache.mapHeight - 1, prefTileY + radius);
        for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
          for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
            const onRing = tileX === minTileX || tileX === maxTileX || tileY === minTileY || tileY === maxTileY;
            if (!onRing) continue;
            const index = tileY * cache.mapWidth + tileX;
            if (!cache.reachable[index]) continue;
            const x = tileX * cache.tileWidth + cache.tileWidth / 2;
            const y = tileY * cache.tileHeight + cache.tileHeight / 2;
            if (this.isBlockedByCollisionAt(x, y, spawnRadius)) continue;
            if (this.isBlockedByUiAt(x, y, spawnRadius)) continue;
            if (this.isTooCloseToOccupied(x, y, footprintRadius, occupied, minGap)) continue;
            return { x, y };
          }
        }
      }
    }

    if (
      !this.isBlockedByCollisionAt(fallback.x, fallback.y, spawnRadius)
      && !this.isBlockedByUiAt(fallback.x, fallback.y, spawnRadius)
      && !this.isTooCloseToOccupied(fallback.x, fallback.y, footprintRadius, occupied, minGap)
    ) return fallback;

    console.warn('Could not satisfy non-overlap spawn spacing; using clamped fallback position.');
    return fallback;
  },

  createNPCs() {
    const totalNpcs = Array.isArray(this.npcs) ? this.npcs.length : 0;
    const spawnRadius = 16;
    const { minX, minY, maxX, maxY } = this.getSpawnWorldBounds(spawnRadius);
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    const columns = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, totalNpcs))));
    const rows = Math.max(1, Math.ceil(Math.max(1, totalNpcs) / columns));
    const occupied = [];

    this.npcs.forEach((npc, index) => {
      if (!npc || !npc.name) return;

      const col = index % columns;
      const row = Math.min(rows - 1, Math.floor(index / columns));
      const cellWidth = width / columns;
      const cellHeight = height / rows;
      const baseX = minX + (col + 0.5) * cellWidth;
      const baseY = minY + (row + 0.5) * cellHeight;
      const jitterX = Phaser.Math.FloatBetween(-cellWidth * 0.28, cellWidth * 0.28);
      const jitterY = Phaser.Math.FloatBetween(-cellHeight * 0.28, cellHeight * 0.28);
      const preferredX = Phaser.Math.Clamp(baseX + jitterX, minX, maxX);
      const preferredY = Phaser.Math.Clamp(baseY + jitterY, minY, maxY);
      const npcName = npc.name;
      const config = NPCRegistry[npcName] || NPCRegistry.orc;
      const footprintRadius = this.getEntityFootprintRadius(config, 28);
      const { x, y } = this.getWalkableSpawnPoint(preferredX, preferredY, occupied, {
        minGap: 20,
        maxRadius: Math.max(220, Math.floor(Math.min(width, height) * 0.45)),
        maxAttempts: 160,
        spawnRadius,
        footprintRadius
      });
      occupied.push({ x, y, radius: footprintRadius });
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
      sprite.setData('footprintRadius', footprintRadius);

      const nameText = this.add.text(x, y, npcName, {
        fontSize: '14px',
        fontFamily: HUD.fontUi,
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 6, y: 3 }
      }).setOrigin(0.5, 1);
      this.placeNameLabel(sprite, nameText, config.labelOffsetY);
      sprite.setData('nameText', nameText);

      const statusBadge = this.add.text(x, y - 56, '', {
        fontSize: '12px',
        fontFamily: HUD.fontUi,
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
      ...(this.npcSprites || []).map((sprite) => ({
        x: sprite.x,
        y: sprite.y,
        radius: Number.isFinite(sprite.getData('footprintRadius')) ? sprite.getData('footprintRadius') : 28
      }))
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
      const monsterName = encounterMonster.name;
      const config = monsterRegistry[monsterName] || monsterRegistry.orc;
      const footprintRadius = this.getEntityFootprintRadius(config, 28);
      const { x, y } = this.getWalkableSpawnPoint(npcSprite.x + 90, npcSprite.y - 20, occupied, {
        minGap: 16,
        maxRadius: 150,
        maxAttempts: 120,
        spawnRadius: 16,
        footprintRadius
      });
      occupied.push({ x, y, radius: footprintRadius });
      if (!this.textures.exists(monsterName)) {
        console.warn(`Missing texture for ${encounterMonster.asset}, fallback to orc`);
      }

      const sprite = this.physics.add.sprite(x, y, monsterName, 0);
      sprite.setScale(config.scale);
      sprite.setDepth(4);
      sprite.setData('monster', encounterMonster);
      sprite.setData('npcKey', npcKey);
      sprite.setData('footprintRadius', footprintRadius);
      sprite.setVisible(false);
      sprite.setActive(false);
      sprite.body.enable = false;
      sprite.disableInteractive();

      const labelName = encounterMonster.isBossEncounter ? `${monsterName} [BOSS]` : monsterName;
      const nameText = this.add.text(x, y, labelName, {
        fontSize: '14px',
        fontFamily: HUD.fontUi,
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
    const configuredOffsetY = Number.isFinite(sprite?.getData?.('statusBadgeOffsetY')) ? sprite.getData('statusBadgeOffsetY') : 14;
    if (nameText) {
      // Keep a consistent gap above the name, regardless of font/padding differences.
      const minGap = 4;
      const requiredOffsetY = Math.ceil(nameText.height + minGap);
      const offsetY = Math.max(configuredOffsetY, requiredOffsetY);
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
