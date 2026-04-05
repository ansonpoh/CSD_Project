import Phaser from 'phaser';
import { gameState } from '../../services/gameState.js';
import { apiService } from '../../services/api.js';
import { dailyQuestService } from '../../services/dailyQuests.js';
import { HUD } from './constants.js';

export const questPanelMethods = {
  resetMapCursor() {
    const canvas = this.input?.manager?.canvas;
    if (canvas?.style) {
      canvas.style.cursor = 'default';
    }
  },

  dismissRewardClaimCelebration() {
    if (this.rewardClaimFxTimer) {
      this.rewardClaimFxTimer.remove(false);
      this.rewardClaimFxTimer = null;
    }

    if (this.rewardClaimFx) {
      this.rewardClaimFx.destroy(true);
      this.rewardClaimFx = null;
    }
  },

  showRewardClaimCelebration({ xp = 0, gold = 0 } = {}) {
    this.dismissRewardClaimCelebration();

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(260);
    const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x020611, 0.35).setScrollFactor(0);

    const card = this.add.container(width / 2, height / 2).setScrollFactor(0).setScale(0.72).setAlpha(0);
    const cardBg = this.add.graphics().setScrollFactor(0);
    cardBg.fillStyle(0x0d1f16, 0.95);
    cardBg.fillRoundedRect(-210, -84, 420, 168, 12);
    cardBg.lineStyle(2, 0xf2c14b, 0.95);
    cardBg.strokeRoundedRect(-210, -84, 420, 168, 12);

    const title = this.add.text(0, -36, 'Reward Claimed!', {
      fontSize: '32px',
      fontFamily: HUD.fontUi,
      fontStyle: 'bold',
      color: '#ffecc3',
      stroke: '#04110b',
      strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0);

    const amountText = this.add.text(
      0,
      6,
      `+${Math.max(0, Number(xp || 0))} XP   |   +${Math.max(0, Number(gold || 0))} Gold`,
      {
        fontSize: '22px',
        fontFamily: HUD.fontUi,
        fontStyle: 'bold',
        color: '#c8ffd6',
        stroke: '#04110b',
        strokeThickness: 5
      }
    ).setOrigin(0.5).setScrollFactor(0);

    const hint = this.add.text(0, 44, 'Quest chain progress updated', {
      fontSize: '14px',
      fontFamily: HUD.fontUi,
      color: '#9cd8b0',
      stroke: '#04110b',
      strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0);

    card.add([cardBg, title, amountText, hint]);
    overlay.add([backdrop, card]);

    const sparkles = [];
    for (let i = 0; i < 14; i += 1) {
      const particle = this.add.circle(width / 2, height / 2 + 4, Phaser.Math.Between(2, 4), 0xf7d67a, 1)
        .setScrollFactor(0)
        .setDepth(261);
      sparkles.push(particle);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(56, 170);
      this.tweens.add({
        targets: particle,
        x: width / 2 + Math.cos(angle) * distance,
        y: height / 2 + Math.sin(angle) * distance,
        alpha: 0,
        duration: Phaser.Math.Between(520, 880),
        ease: 'Cubic.Out',
        onComplete: () => particle.destroy()
      });
    }

    this.tweens.add({
      targets: card,
      scale: 1,
      alpha: 1,
      duration: 220,
      ease: 'Back.Out'
    });

    this.rewardClaimFx = overlay;
    this.rewardClaimFxTimer = this.time.delayedCall(1400, () => {
      this.tweens.add({
        targets: [card, backdrop],
        alpha: 0,
        duration: 220,
        ease: 'Sine.In',
        onComplete: () => {
          sparkles.forEach((node) => node.destroy());
          this.dismissRewardClaimCelebration();
        }
      });
    });
  },

  getQuestProgressForEncounter(encounter) {
    const npcProgress = this.getEncounterProgress(encounter?.npc) || {};
    const monsterProgress = this.getEncounterMonsterState(encounter?.monster) || {};

    // Merge monster + NPC-centric progress so quest checklist reflects real state.
    return {
      npcInteracted: Boolean(npcProgress.npcInteracted || monsterProgress.npcInteracted),
      monsterDefeated: Boolean(npcProgress.monsterDefeated || monsterProgress.monsterDefeated),
      rewardClaimed: Boolean(npcProgress.rewardClaimed || monsterProgress.rewardClaimed),
      lossStreak: Number.isFinite(monsterProgress.lossStreak)
        ? monsterProgress.lossStreak
        : (Number.isFinite(npcProgress.lossStreak) ? npcProgress.lossStreak : 0)
    };
  },

  processQueuedMonsterSpawns() {
    if (!this.areAllNpcsCompleted()) return;
    if (!this.pendingMonsterUnlockNpcKeys.length) return;

    const keys = [...this.pendingMonsterUnlockNpcKeys];
    this.pendingMonsterUnlockNpcKeys = [];
    keys.forEach((npcKey, index) => {
      const npc = this.npcMonsterMap.get(npcKey)?.npc;
      if (!npc) return;
      this.time.delayedCall(450 * (index + 1), () => this.revealMonsterForNpc(npc, { animate: true }));
    });
  },

  revealMonsterForNpc(npc, opts = {}) {
    if (!this.areAllNpcsCompleted()) return;
    const { animate = true, silent = false } = opts;
    const npcKey = this.getNpcKey(npc);
    if (this.revealedMonsterNpcKeys.has(npcKey)) return;

    const sprite = this.monsterSpriteByNpcKey.get(npcKey);
    if (!sprite) return;

    this.revealedMonsterNpcKeys.add(npcKey);
    const label = sprite.getData('nameText');
    sprite.setVisible(true);
    sprite.setActive(true);
    if (sprite.body) sprite.body.enable = true;
    if (label) label.setVisible(true);

    if (animate) {
      const finalScale = sprite.scale;
      sprite.setScale(finalScale * 0.35);
      sprite.setAlpha(0);
      this.tweens.add({
        targets: sprite,
        alpha: 1,
        scale: finalScale,
        duration: 900,
        ease: 'Back.Out'
      });
      if (label) {
        label.setAlpha(0);
        this.tweens.add({
          targets: label,
          alpha: 1,
          duration: 700,
          ease: 'Sine.Out'
        });
      }
    }

    if (!silent) {
      const monsterName = sprite.getData('monster')?.name || 'Monster';
      this.interactPrompt.setText(`${monsterName} has appeared!`);
      this.interactPromptBg?.setVisible(true);
      this.interactPrompt.setVisible(true);
      this.time.delayedCall(1300, () => {
        if (!this.closestNpcSprite && !this.closestMonsterSprite) {
          this.interactPromptBg?.setVisible(false);
          this.interactPrompt.setVisible(false);
        }
      });
    }

    this.updateMonsterVisualState(sprite);
    this.updateMissionPanel();
    this.updateQuestPanel();
  },

  updateMissionPanel() {
    if (!this.missionText) return;

    const interactedCount = this.npcs.filter((npc) => this.getProgressState(npc) !== 'new').length;
    const completeCount = this.npcs.filter((npc) => this.getProgressState(npc) === 'completed').length;
    const spawnedCount = this.revealedMonsterNpcKeys.size;
    const totalPairs = this.npcMonsterMap.size;
    const summary = `NPCs talked: ${interactedCount}/${this.npcs.length}  |  Lessons done: ${completeCount}/${this.npcs.length}  |  Monsters spawned: ${spawnedCount}/${totalPairs}`;
    if (summary === this.lastMissionSnapshot && this.missionText.text === summary) return;

    this.lastMissionSnapshot = summary;
    this.missionText.setText(summary);
    this.layoutMissionPanel?.();
  },

  getOrderedEncounters() {
    return Array.from(this.npcMonsterMap.entries())
      .map(([npcKey, mapping], index) => ({
        npcKey,
        ...mapping,
        encounterOrder: mapping?.pair?.encounterOrder ?? index
      }))
      .sort((a, b) => a.encounterOrder - b.encounterOrder);
  },

  getActiveQuest() {
    const ordered = this.getOrderedEncounters();
    if (!ordered.length) return null;

    for (let index = 0; index < ordered.length; index += 1) {
      const encounter = ordered[index];
      const progress = this.getQuestProgressForEncounter(encounter);
      if (!progress.rewardClaimed) {
        return {
          ...encounter,
          progress,
          index,
          total: ordered.length
        };
      }
    }
    return null;
  },

  getRetryAssistSummary(lossStreak) {
    const streak = Math.max(0, Number(lossStreak || 0));
    const questionReduction = Math.min(3, streak);
    if (questionReduction <= 0) return null;
    const hpPercent = questionReduction === 1 ? 85 : questionReduction === 2 ? 72 : 60;
    return `Retry assist: -${questionReduction} qns, monster starts ${hpPercent}% HP`;
  },

  updateQuestPanel() {
    if (!this.questTitleText || !this.questStepsText || !this.claimRewardButton) return;

    const ordered = this.getOrderedEncounters();
    if (!ordered.length) {
      this.questTitleText.setText('Quest Chain');
      this.questStepsText.setText('No encounter quests on this map.');
      this.claimRewardButton.setEnabled(false);
      return;
    }

    const claimedCount = ordered.filter((encounter) => this.getQuestProgressForEncounter(encounter).rewardClaimed).length;
    const activeQuest = this.getActiveQuest();
    if (!activeQuest) {
      this.questTitleText.setText('Quest Chain Complete');
      this.questStepsText.setText(`All quests cleared.\nRewards claimed: ${claimedCount}/${ordered.length}`);
      this.claimRewardButton.setEnabled(false);
      return;
    }

    const progress = activeQuest.progress || {
      npcInteracted: false,
      monsterDefeated: false,
      rewardClaimed: false,
      lossStreak: 0
    };
    const npcName = activeQuest.npc?.name || activeQuest.pair?.npcName || 'NPC';
    const monsterName = activeQuest.monster?.name || activeQuest.pair?.monsterName || 'Monster';
    const requiredPct = activeQuest.pair?.bossEncounter ? 100 : 90;
    const marker = (done) => (done ? '[x]' : '[ ]');

    const lines = [
      `${marker(Boolean(progress.npcInteracted))} Talk to ${npcName}`,
      `${marker(Boolean(progress.monsterDefeated))} Defeat ${monsterName} (${requiredPct}% quiz)`,
      `${marker(Boolean(progress.rewardClaimed))} Claim reward`,
      `Chain progress: ${claimedCount}/${ordered.length} claimed`
    ];

    const retryInfo = !progress.monsterDefeated ? this.getRetryAssistSummary(progress.lossStreak) : null;
    if (retryInfo) lines.push(retryInfo);
    const assistCharges = this.mapConfig?.playerState?.assistCharges || 0;
    if (assistCharges > 0) lines.push(`Oracle assist ready: ${assistCharges}`);
    const luckyCharmPct = Math.max(0, Number(gameState.getActiveEffects().nextRewardGoldBonusPct || 0));
    if (luckyCharmPct > 0) lines.push(`Lucky charm ready: +${luckyCharmPct}% next reward gold`);

    this.questTitleText.setText(
      `Quest ${activeQuest.index + 1}/${activeQuest.total}${activeQuest.pair?.bossEncounter ? ' [BOSS]' : ''}`
    );
    this.questStepsText.setText(lines.join('\n'));
    this.claimRewardButton.setEnabled(Boolean(progress.monsterDefeated) && !Boolean(progress.rewardClaimed));
    this.checkForMapCompletion();
  },

  async claimActiveQuestReward() {
    const activeQuest = this.getActiveQuest();
    if (!activeQuest) {
      this.showMapToast('No active quest reward to claim.');
      return;
    }

    const mapId = this.getCurrentMapId();
    const monsterId = activeQuest?.pair?.monsterId || this.getMonsterId(activeQuest?.monster);
    if (!mapId || !monsterId) {
      this.showMapToast('Reward claim unavailable: missing map or monster ID.');
      return;
    }

    this.claimRewardButton?.setEnabled(false);
    this.resetMapCursor();

    try {
      const result = await apiService.claimEncounterReward(mapId, monsterId);
      // Keep local UI/state responsive even though claim response does not include
      // the full encounter progress payload.
      const npcId = this.getNpcId(activeQuest?.npc);
      if (npcId) {
        this.applyEncounterProgress({
          npcId,
          monsterId,
          npcInteracted: true,
          monsterDefeated: true,
          rewardClaimed: Boolean(result?.rewardClaimed)
        });
      }

      const monsterRows = Array.isArray(this.encounterState?.monsters) ? this.encounterState.monsters : [];
      const targetIndex = monsterRows.findIndex((row) => String(row?.monsterId || '') === String(monsterId));
      if (targetIndex >= 0) {
        monsterRows[targetIndex] = {
          ...monsterRows[targetIndex],
          monsterDefeated: true,
          rewardClaimed: Boolean(result?.rewardClaimed)
        };
      }

      const learner = gameState.getLearner();
      if (learner && Number.isFinite(result?.learnerTotalXp) && Number.isFinite(result?.learnerLevel)) {
        gameState.setLearner({
          ...learner,
          total_xp: result.learnerTotalXp,
          level: result.learnerLevel,
          ...(Number.isFinite(result?.learnerGold) ? { gold: result.learnerGold } : {})
        });
      }

      this.updateAllNpcVisualStates();
      this.updateMonsterVisualStates();
      this.updateMissionPanel();
      this.updateQuestPanel();
      this.refreshMapSignalPanel();
      const xp = Number(result?.xpAwarded || 0);
      const gold = Number(result?.goldAwarded || 0);
      let luckyCharmBonusGold = 0;
      const luckyCharmPct = Math.max(0, Number(gameState.getActiveEffects().nextRewardGoldBonusPct || 0));

      if (Boolean(result?.rewardClaimed) && gold > 0 && luckyCharmPct > 0) {
        luckyCharmBonusGold = Math.max(1, Math.floor((gold * luckyCharmPct) / 100));
        gameState.consumeActiveEffect('nextRewardGoldBonusPct');
        try {
          const bonusLearner = await apiService.awardMyXp(0, luckyCharmBonusGold);
          if (bonusLearner) {
            gameState.setLearner(bonusLearner);
          } else {
            const learner = gameState.getLearner();
            if (learner) {
              gameState.setLearner({
                ...learner,
                gold: Number(learner.gold || 0) + luckyCharmBonusGold
              });
            }
          }
        } catch (bonusError) {
          console.warn('Failed to persist Lucky Charm gold bonus:', bonusError);
          const learner = gameState.getLearner();
          if (learner) {
            gameState.setLearner({
              ...learner,
              gold: Number(learner.gold || 0) + luckyCharmBonusGold
            });
          }
        }
      }

      const totalGold = gold + luckyCharmBonusGold;
      dailyQuestService.recordEvent('reward_claimed');
      if (result?.rewardClaimed) {
        this.showRewardClaimCelebration({ xp, gold: totalGold });
      }
      this.showMapToast(
        xp > 0 || totalGold > 0
          ? `Reward claimed: +${xp} XP, +${totalGold} Gold${luckyCharmBonusGold > 0 ? ` (Lucky Charm +${luckyCharmBonusGold})` : ''}`
          : 'Reward already claimed'
      );

      // Pull authoritative server state after optimistic update.
      await this.refreshEncounterState?.();
      this.updateAllNpcVisualStates();
      this.updateMonsterVisualStates();
      this.updateMissionPanel();
      this.updateQuestPanel();
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Reward claim failed';
      this.showMapToast(message);
    } finally {
      this.claimRewardButton?.setEnabled(Boolean(this.getActiveQuest()?.progress?.monsterDefeated));
      this.resetMapCursor();
    }
  },

  isQuestChainComplete() {
    const ordered = this.getOrderedEncounters();
    return Boolean(ordered.length) && ordered.every((entry) => this.getQuestProgressForEncounter(entry).rewardClaimed);
  }
};
