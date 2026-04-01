import { gameState } from '../../services/gameState.js';
import { apiService } from '../../services/api.js';
import { mapDiscoveryService } from '../../services/mapDiscovery.js';
import { getChallengeSnapshot } from '../../services/sideChallenges.js';
import { HUD } from './constants.js';

export const encounterStateMethods = {
  interactWithNPC(npc) {
    const mapping = this.npcMonsterMap.get(this.getNpcKey(npc));
    if (mapping) {
      this.queueMonsterUnlockForNpc(npc);
      void this.syncNpcInteraction(npc);
    }

    const contentId = npc?.contentId || npc?.content_id;
    const payload = {
      contentId,
      topicId: npc?.topicId || npc?.topic_id || null,
      npcId: npc?.npcId || npc?.npc_id || null
    };

    if (contentId) {
      gameState.enrollLesson(contentId, payload);
      void apiService.enrollLessonProgress(payload)
        .then((saved) => gameState.upsertLessonProgress(saved))
        .catch((error) => console.warn('Enroll sync failed:', error));
    }

    const lessonPages = this.buildLessonPages(npc);
    this.scene.launch('DialogueScene', { npc, lessonPages });
    this.scene.pause();
  },

  buildLessonPages(npc) {
    const title = npc.contentTitle || 'Lesson';
    const topic = npc.topicName || 'Topic';
    const rawBody = (npc.contentBody || '').trim();
    const videoUrl = npc.videoUrl || null;
    const pages = [];

    let lines = [];
    if (rawBody) {
      try {
        const parsed = JSON.parse(rawBody);
        if (Array.isArray(parsed)) {
          lines = parsed.map((line) => String(line).trim()).filter(Boolean);
        }
      } catch {
        lines = rawBody
          .replace(/\\r\\n/g, '\n')
          .replace(/\\n/g, '\n')
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean);
      }
    }

    if (!lines.length) {
      pages.push({
        lessonTitle: title,
        lessonBody: 'No lesson content yet.',
        narration: `Today we learn: ${topic}`,
        mediaType: 'text'
      });
    } else {
      lines.forEach((line, index) => {
        pages.push({
          lessonTitle: `${title} (${index + 1}/${lines.length})`,
          lessonBody: line,
          narration: `Today we learn: ${topic}`,
          mediaType: 'text'
        });
      });
    }

    if (videoUrl) {
      pages.splice(Math.max(0, pages.length), 0, {
        lessonTitle: `${title} (Video)`,
        lessonBody: '',
        narration: 'Watch this short lesson clip.',
        mediaType: 'video',
        videoUrl
      });
    }

    return pages;
  },

  getLessonKey(npc) {
    return String(
      npc?.contentId ||
      npc?.content_id ||
      npc?.npcId ||
      npc?.npc_id ||
      `${npc?.name || 'npc'}:${npc?.topicName || 'topic'}`
    );
  },

  encounterMonster(monster) {
    if (!this.areAllNpcsCompleted()) {
      this.showMapToast('Monsters unlock only after all NPC lessons are completed.');
      return;
    }

    const npcId = monster?.npcId || null;
    const npcKey = npcId ? String(npcId) : null;
    if (npcKey && !this.isMonsterInteractableForNpcKey(npcKey)) {
      // Allow re-fighting already-defeated monsters even if out of quest order
      const monsterState = this.getEncounterMonsterState(monster);
      if (!monsterState?.monsterDefeated) {
        this.showMapToast('Clear the current quest step before facing this monster.');
        return;
      }
    }

    const currentMap = gameState.getCurrentMap();
    const mapId = currentMap?.mapId || currentMap?.id || this.mapConfig?.mapId || null;
    let eventAssist = null;
    if ((this.mapConfig?.playerState?.assistCharges || 0) > 0) {
      mapDiscoveryService.consumeAssist(this.mapConfig);
      this.mapConfig = mapDiscoveryService.buildCatalog([this.mapConfig], gameState.getLearner())[0] || this.mapConfig;
      gameState.setCurrentMap(this.mapConfig);
      this.refreshMapSignalPanel();
      eventAssist = {
        label: 'Oracle support',
        questionReduction: 2,
        startingMonsterHpPercent: 82
      };
    }

    // Determine which monster slot this is (0 = first, 1 = second) for question splitting
    const sortedPairs = (this.encounterState?.pairs || [])
      .slice()
      .sort((a, b) => (a?.encounterOrder ?? 0) - (b?.encounterOrder ?? 0));
    let monsterIndex = 0;
    if (sortedPairs.length) {
      const monsterNpcId = String(npcId || monster?.npcId || '');
      const idx = sortedPairs.findIndex((p) => String(p?.npcId || '') === monsterNpcId);
      monsterIndex = idx >= 0 ? idx : 0;
    } else {
      // Fallback pairing: use position in the monsters array
      const idx = this.monsters.findIndex(
        (m) => String(this.getMonsterId(m) || '') === String(this.getMonsterId(monster) || '')
      );
      monsterIndex = idx >= 0 ? idx : 0;
    }

    const monsterState = this.getEncounterMonsterState(monster);
    const isRematch = Boolean(monsterState?.monsterDefeated);

    this.scene.start('CombatScene', { monster, mapId, npcId, eventAssist, monsterIndex, isRematch });
  },

  createNpcMonsterMapping() {
    this.npcMonsterMap.clear();
    const pairRows = Array.isArray(this.encounterState?.pairs) ? [...this.encounterState.pairs] : [];

    if (pairRows.length) {
      const npcById = new Map(this.npcs.map((npc) => [String(this.getNpcId(npc) || ''), npc]));
      const monsterById = new Map(this.monsters.map((monster) => [String(this.getMonsterId(monster) || ''), monster]));
      let resolvedPairs = 0;

      pairRows
        .sort((a, b) => (a?.encounterOrder ?? 0) - (b?.encounterOrder ?? 0))
        .forEach((pair) => {
          const npc = npcById.get(String(pair?.npcId || ''));
          const monster = monsterById.get(String(pair?.monsterId || ''));
          if (!npc || !monster) return;

          resolvedPairs += 1;
          this.npcMonsterMap.set(this.getNpcKey(npc), {
            npc,
            monster: {
              ...monster,
              name: pair?.monsterName || monster?.name
            },
            pair
          });
        });

      if (resolvedPairs > 0) return;
    }

    const maxPairs = Math.min(this.npcs.length, this.monsters.length);
    for (let index = 0; index < maxPairs; index += 1) {
      const npc = this.npcs[index];
      const monster = this.monsters[index];
      if (!npc || !monster) continue;
      this.npcMonsterMap.set(this.getNpcKey(npc), { npc, monster, pair: null });
    }
  },

  getNpcKey(npc) {
    return String(this.getNpcId(npc) || npc?.name || 'npc-unknown');
  },

  getCurrentMapId() {
    const currentMap = gameState.getCurrentMap();
    return currentMap?.mapId || currentMap?.id || this.mapConfig?.mapId || null;
  },

  getNpcId(npc) {
    return npc?.npcId || npc?.npc_id || null;
  },

  getMonsterId(monster) {
    return monster?.monster_id || monster?.monsterId || null;
  },

  getEncounterMonsterState(monster) {
    const monsterId = this.getMonsterId(monster);
    if (!monsterId) return null;
    const rows = Array.isArray(this.encounterState?.monsters) ? this.encounterState.monsters : [];
    return rows.find((row) => String(row?.monsterId || '') === String(monsterId)) || null;
  },

  applyEncounterProgress(progress) {
    if (!progress?.npcId) return;
    const npcKey = String(progress.npcId);
    const existing = this.encounterProgressByNpcKey.get(npcKey) || {};
    this.encounterProgressByNpcKey.set(npcKey, { ...existing, ...progress });
  },

  hydrateEncounterProgress() {
    const previous = new Map(this.encounterProgressByNpcKey || []);
    const next = new Map(previous);

    // Backward-compatible: some backends expose per-NPC progress rows.
    const rows = Array.isArray(this.encounterState?.progress) ? this.encounterState.progress : [];
    rows.forEach((progress) => {
      if (!progress?.npcId) return;
      const npcKey = String(progress.npcId);
      const existing = next.get(npcKey) || {};
      next.set(npcKey, { ...existing, ...progress });
    });

    // Current encounter state includes completed NPC IDs in summary, not per-NPC rows.
    // Treat these as interacted at minimum so UI does not regress on resume.
    const completedNpcIds = Array.isArray(this.encounterState?.npc?.completedNpcIds)
      ? this.encounterState.npc.completedNpcIds
      : [];
    completedNpcIds.forEach((npcId) => {
      const npcKey = String(npcId);
      const existing = next.get(npcKey) || {};
      next.set(npcKey, {
        ...existing,
        npcId,
        npcInteracted: true
      });
    });

    this.encounterProgressByNpcKey = next;
  },

  getEncounterProgress(npc) {
    return this.encounterProgressByNpcKey.get(this.getNpcKey(npc)) || null;
  },

  getProgressState(npc) {
    const encounter = this.getEncounterProgress(npc);
    const lessonKey = this.getLessonKey(npc);
    const progress = gameState.lessonProgress?.[lessonKey];
    if (encounter?.rewardClaimed || encounter?.monsterDefeated) return 'completed';
    if (gameState.isLessonComplete(lessonKey)) return 'completed';
    if (encounter?.npcInteracted || encounter?.monsterUnlocked) return 'interacted';
    if (progress) return 'interacted';
    return 'new';
  },

  updateAllNpcVisualStates() {
    this.npcSprites.forEach((sprite) => this.updateNpcVisualState(sprite));
  },

  updateNpcVisualState(npcSprite) {
    const npc = npcSprite?.getData('npc');
    const badge = npcSprite?.getData('statusBadge');
    const nameText = npcSprite?.getData('nameText');
    if (!npc || !badge || !nameText) return;

    const state = this.getProgressState(npc);
    const encounter = this.getEncounterProgress(npc);
    if (encounter?.rewardClaimed) {
      badge.setText('CLAIMED');
      badge.setColor(HUD.textGood);
      npcSprite.setTint(0xb8ffd8);
      nameText.setColor('#d9ffe8');
      return;
    }

    if (state === 'completed') {
      badge.setText('DONE');
      badge.setColor(HUD.textGood);
      npcSprite.setTint(0xb8ffd8);
      nameText.setColor('#d9ffe8');
      return;
    }

    if (state === 'interacted') {
      badge.setText('TALKED');
      badge.setColor(HUD.textWarn);
      npcSprite.clearTint();
      nameText.setColor('#ffe6ad');
      return;
    }

    badge.setText('NEW');
    badge.setColor(HUD.textSub);
    npcSprite.clearTint();
    nameText.setColor('#ffffff');
  },

  updateMonsterVisualStates() {
    this.monsterSprites.forEach((sprite) => this.updateMonsterVisualState(sprite));
  },

  updateMonsterVisualState(monsterSprite) {
    const npcKey = monsterSprite?.getData('npcKey');
    if (!npcKey) return;

    const monster = monsterSprite.getData('monster');
    const progress = this.getEncounterMonsterState(monster);
    const nameText = monsterSprite.getData('nameText');
    const baseLabel = monsterSprite.getData('baseLabel') || monsterSprite.getData('monster')?.name || 'Monster';
    const interactable = this.isMonsterInteractableForNpcKey(npcKey);

    if (progress?.monsterDefeated) {
      monsterSprite.setTint(0x97b59d);
      monsterSprite.setInteractive();
      if (monsterSprite.body) monsterSprite.body.enable = true;
      if (nameText) {
        nameText.setText(`${baseLabel} [DEFEATED]`);
        nameText.setColor('#b8ffd8');
      }
      return;
    }

    monsterSprite.clearTint();
    if (nameText) {
      nameText.setText(interactable ? baseLabel : `${baseLabel} [LOCKED]`);
      nameText.setColor(interactable ? '#ffe8cc' : '#c0a8e0');
    }

    if (monsterSprite.visible && interactable) {
      if (monsterSprite.body) monsterSprite.body.enable = true;
      return;
    }

    monsterSprite.disableInteractive();
    if (monsterSprite.body) monsterSprite.body.enable = false;
    monsterSprite.setTint(0x6f7392);
  },

  isMonsterInteractableForNpcKey(npcKey) {
    if (!this.areAllNpcsCompleted()) return false;
    const progress = this.encounterProgressByNpcKey.get(npcKey);
    if (progress?.monsterDefeated || progress?.rewardClaimed) return true;
    return true;
  },

  areAllNpcsCompleted() {
    const backendFlag = this.encounterState?.npc?.allCompleted;
    if (typeof backendFlag === 'boolean') return backendFlag;
    if (!Array.isArray(this.npcs) || !this.npcs.length) return false;
    return this.npcs.every((npc) => this.getProgressState(npc) === 'completed');
  },

  shouldMonsterBeUnlockedForNpc(npc) {
    if (!this.areAllNpcsCompleted()) return false;
    return this.npcMonsterMap.has(this.getNpcKey(npc));
  },

  queueMonsterUnlockForNpc(npc) {
    if (!this.areAllNpcsCompleted()) return;
    this.npcMonsterMap.forEach((_, key) => {
      if (this.revealedMonsterNpcKeys.has(key)) return;
      if (this.pendingMonsterUnlockNpcKeys.includes(key)) return;
      this.pendingMonsterUnlockNpcKeys.push(key);
    });
    const npcKey = this.getNpcKey(npc);
    this.updateNpcVisualState(this.npcSprites.find((sprite) => sprite.getData('npcKey') === npcKey));
    this.updateQuestPanel();
  },

  async syncNpcInteraction(npc) {
    const mapId = this.getCurrentMapId();
    const npcId = this.getNpcId(npc);
    if (!mapId || !npcId) return;

    const npcKey = this.getNpcKey(npc);
    const existing = this.encounterProgressByNpcKey.get(npcKey) || {};
    this.encounterProgressByNpcKey.set(npcKey, {
      ...existing,
      npcId,
      monsterId: existing.monsterId || this.getMonsterId(this.npcMonsterMap.get(npcKey)?.monster),
      npcInteracted: true
    });
    this.updateAllNpcVisualStates();
    this.updateMissionPanel();
    this.updateQuestPanel();

    try {
      const saved = await apiService.markEncounterNpcInteracted(mapId, npcId);
      if (saved?.state) {
        this.encounterState = saved.state;
        this.hydrateEncounterProgress();
      } else {
        this.applyEncounterProgress(saved);
      }
      this.queueMonsterUnlockForNpc(npc);
      this.updateAllNpcVisualStates();
      this.updateMissionPanel();
      this.updateQuestPanel();
    } catch (error) {
      console.warn('Failed to sync NPC interaction:', error);
    }
  },

  async refreshEncounterState() {
    const mapId = this.getCurrentMapId();
    if (!mapId) return;

    try {
      const state = await apiService.getEncounterState(mapId);
      this.encounterState = state;
      this.hydrateEncounterProgress();
      this.revealedMonsterNpcKeys.clear();
      this.npcMonsterMap.forEach((mapping) => {
        if (this.shouldMonsterBeUnlockedForNpc(mapping?.npc)) {
          this.revealMonsterForNpc(mapping.npc, { animate: false, silent: true });
        }
      });
    } catch (error) {
      console.warn('Encounter state refresh failed:', error);
    }
  },

  async handleSceneResume() {
    const hasQueuedSpawns = this.pendingMonsterUnlockNpcKeys.length > 0;
    if (!hasQueuedSpawns) {
      await this.refreshEncounterState();
    }
    this.processQueuedMonsterSpawns();
    this.updateAllNpcVisualStates();
    this.updateMonsterVisualStates();
    this.updateMissionPanel();
    this.updateQuestPanel();
    this.refreshMapSignalPanel();
  },

  async openSideChallenge() {
    const theme = String(this.mapConfig?.theme || this.mapConfig?.name || 'forest').toLowerCase();
    let serverChallenge = null;
    try {
      serverChallenge = await apiService.getSideChallengeByTheme(theme);
    } catch (_e) {
      // Fall back to hardcoded data in SideChallengeScene
    }
    const snapshot = getChallengeSnapshot(this.mapConfig);
    const title = serverChallenge?.title || snapshot.challenge.title;
    const suffix = snapshot.completed ? ' Practice mode only.' : '';
    this.showMapToast(`${title} ready.${suffix}`, 1200);
    this.scene.launch('SideChallengeScene', { mapConfig: this.mapConfig, serverChallenge });
    this.scene.pause();
  }
};
