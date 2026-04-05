import Phaser from 'phaser';
import { gameState } from '../../services/gameState.js';
import { apiService } from '../../services/api.js';
import { supabase } from '../../config/supabaseClient.js';
import { resolveItemEffect } from '../../services/itemEffects.js';
import { loadSharedUiAssets } from '../../services/uiAssets.js';
import { routeToLogin } from '../shared/authRouting.js';
import { buildHud } from './hud.js';
import { showInventory } from './inventoryModal.js';
import { showLeaderboard } from './leaderboardModal.js';
import { showUserProfile } from './profileModal.js';
import { showAchievements } from './achievementsModal.js';
import { showFriends } from './friendsModal.js';
import { showQuests } from './questModal.js';
import { showChatbot } from './chatModal.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
    this.levelText = null;
    this.xpText = null;
    this.usernameText = null;
    this.lastKnownLevel = null;
    this.profileTween = null;
  }

  preload() {
    loadSharedUiAssets(this, {
      includeClose: true,
      includePortrait: true,
      includeScrollIcon: true,
      includeChatIcon: true
    });
  }

  create() {
    const learner = gameState.getLearner();
    if (!learner) {
      routeToLogin(this);
      return;
    }

    buildHud(this, learner);
    gameState.subscribe(() => this.updateUI());
  }

  async handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Supabase sign out failed:', error);
    } finally {
      gameState.clearState();
      routeToLogin(this, { hardReload: true });
    }
  }

  updateUI() {
    const learner = gameState.getLearner();
    if (!learner || !this.levelText || !this.xpText) {
      return;
    }

    this.levelText.setText(`Level: ${learner.level}`);
    this.xpText.setText(`XP: ${learner.total_xp}`);

    if (this.lastKnownLevel !== null && learner.level > this.lastKnownLevel) {
      this.showLevelUp(learner.level);
    }

    this.lastKnownLevel = learner.level;
    this.levelText.setData('lastLevel', learner.level);
  }

  showLevelUp(newLevel) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const levelUpText = this.add.text(width / 2, height / 2, `LEVEL UP!\nLevel ${newLevel}`, {
      fontSize: '48px',
      color: '#4ade80',
      fontStyle: 'bold',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    this.tweens.add({
      targets: levelUpText,
      alpha: 0,
      scale: 1.5,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => levelUpText.destroy()
    });

    const particles = this.add.particles(width / 2, height / 2, 'player', {
      speed: { min: 100, max: 200 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 1000,
      quantity: 50,
      blendMode: 'ADD'
    });

    this.time.delayedCall(1000, () => particles.destroy());
  }

  showInventory() {
    showInventory(this);
  }

  showLeaderboard() {
    return showLeaderboard(this);
  }

  showUserProfile() {
    return showUserProfile(this);
  }

  showAchievements() {
    return showAchievements(this);
  }

  showFriends() {
    return showFriends(this);
  }

  showQuests() {
    return showQuests(this);
  }

  showChatbot() {
    return showChatbot(this);
  }

  async consumeInventoryItem(item) {
    const itemId = item?.itemId || item?.item_id;
    if (!itemId) {
      return false;
    }

    const effect = this.resolveItemEffect(item);
    if (effect.combatOnly) {
      this.showQuickToast(effect.message || 'This item can only be used during quiz combat.');
      return false;
    }

    if (!effect.usable) {
      this.showQuickToast(effect.message || 'This item activates automatically during encounters.');
      return false;
    }

    const updatedInventory = await apiService.removeInventoryItem(itemId, 1);
    gameState.setInventory(updatedInventory);

    if (effect.xpGain > 0) {
      try {
        const updatedLearner = await apiService.awardMyXp(Number(effect.xpGain || 0), 0);
        if (updatedLearner) {
          gameState.setLearner(updatedLearner);
        } else {
          gameState.updateXP(effect.xpGain);
        }
      } catch (error) {
        console.warn('Failed to persist XP award, applying local fallback:', error);
        gameState.updateXP(effect.xpGain);
      }
    }

    if (effect.nextCombatHpBonus > 0) {
      const currentEffects = gameState.getActiveEffects();
      const existingBonus = Number(currentEffects.nextCombatHpBonus || 0);
      gameState.setActiveEffects({
        ...currentEffects,
        nextCombatHpBonus: existingBonus + effect.nextCombatHpBonus
      });
    }

    if (effect.quizHeartBonus > 0) {
      const currentEffects = gameState.getActiveEffects();
      const existingBonus = Number(currentEffects.quizHeartBonus || 0);
      gameState.setActiveEffects({
        ...currentEffects,
        quizHeartBonus: existingBonus + effect.quizHeartBonus
      });

      const combatScene = this.scene.manager?.getScene?.('CombatScene');
      if (combatScene && combatScene.scene?.isActive()) {
        const bonus = Math.max(0, Number(effect.quizHeartBonus || 0));
        combatScene.maxLifelines = Math.max(1, Number(combatScene.maxLifelines || 0) + bonus);
        combatScene.remainingLifelines = Math.max(0, Number(combatScene.remainingLifelines || 0) + bonus);
        combatScene.syncPlayerHealthToHearts?.();
        combatScene.refreshQuizMeta?.();
        combatScene.addLog?.(`Potion effect: +${bonus} heart${bonus === 1 ? '' : 's'}.`);
      }
    }

    if (effect.assistCharges > 0) {
      const currentMap = gameState.getCurrentMap();
      if (currentMap) {
        const playerState = {
          ...(currentMap.playerState || {}),
          assistCharges: Math.max(0, Number(currentMap.playerState?.assistCharges || 0) + effect.assistCharges)
        };

        gameState.setCurrentMap({
          ...currentMap,
          playerState
        });
      }
    }

    this.showQuickToast(effect.message);
    return true;
  }

  resolveItemEffect(item) {
    return resolveItemEffect(item);
  }

  showQuickToast(message) {
    const toast = this.add.text(this.cameras.main.width / 2, 84, message, {
      fontSize: '14px',
      color: '#fff3ed',
      backgroundColor: '#2b1835',
      padding: { x: 12, y: 8 }
    }).setOrigin(0.5).setDepth(1400);

    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: toast.y - 10,
      duration: 1600,
      onComplete: () => toast.destroy()
    });
  }
}
