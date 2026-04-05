import { gameState } from '../../services/gameState.js';
import { mapDiscoveryService } from '../../services/mapDiscovery.js';
import { getChallengeSnapshot } from '../../services/sideChallenges.js';
import { HUD } from './constants.js';

export const mapEventMethods = {
  showMapToast(message, duration = 1800) {
    if (!this.interactPrompt || !this.interactPromptBg) return;

    this.interactPrompt.setText(String(message));
    this.interactPromptBg.setVisible(true);
    this.interactPrompt.setVisible(true);
    this.time.delayedCall(duration, () => {
      if (!this.closestNpcSprite && !this.closestMonsterSprite) {
        this.interactPromptBg?.setVisible(false);
        this.interactPrompt?.setVisible(false);
      }
    });
  },

  isDomInputFocused() {
    const active = document.activeElement;
    if (!active) return false;

    const tag = active.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active.isContentEditable;
  },

  layoutMapSignalPanel() {
    if (!this.mapBannerCard || !this.mapBannerCardBounds || !this.mapSignalText) return;

    const { x, y, width, minHeight } = this.mapBannerCardBounds;
    const cardBottomPadding = 14;
    const signalBottom = this.mapSignalText.y + this.mapSignalText.height;
    const computedHeight = Math.max(minHeight, Math.ceil(signalBottom - y + cardBottomPadding));

    this.mapBannerCard.clear();
    this.mapBannerCard.fillStyle(HUD.cardBg, 0.92);
    this.mapBannerCard.fillRoundedRect(x, y, width, computedHeight, 8);
    this.mapBannerCard.lineStyle(2, HUD.border, 0.82);
    this.mapBannerCard.strokeRoundedRect(x, y, width, computedHeight, 8);

    const buttonHeight = 40;
    const buttonGap = 8;
    const buttonMargin = 14;
    const firstButtonCenterY = y + computedHeight + buttonMargin + (buttonHeight / 2);
    this.mapEventButton?.container?.setY(firstButtonCenterY - buttonHeight / 2);
    this.sideChallengeButton?.container?.setY(firstButtonCenterY + buttonGap + buttonHeight / 2);
  },

  refreshMapSignalPanel() {
    if (!this.mapBannerText || !this.mapSignalText) return;

    const event = this.mapConfig?.event;
    const lastChoice = this.mapConfig?.playerState?.lastChoice;
    const challenge = getChallengeSnapshot(this.mapConfig);
    const mapDescription = String(this.mapConfig?.description || 'No map description available.');
    const compactDescription = mapDescription.length > 92 ? `${mapDescription.slice(0, 89)}...` : mapDescription;
    const lines = [
      `${this.mapConfig?.theme || this.mapConfig?.name || 'Map'}  |  ${this.mapConfig?.difficulty || 'Adaptive'}`,
      `${this.mapConfig?.creatorName || 'Unknown creator'} [${this.mapConfig?.creatorBadge || 'Builder'}]`,
      compactDescription
    ];

    if (lastChoice?.label) {
      lines.push(`Decision locked in: ${lastChoice.label}`);
    } else if (event?.title) {
      lines.push(`Map event ready: ${event.title}`);
    } else {
      lines.push('No special event on this route.');
    }

    lines.push(`Side challenge: ${challenge.challenge.title}${challenge.completed ? ' [CLEARED]' : ' [READY]'}`);

    this.mapBannerText.setText(this.mapConfig?.name || 'Current Gate');
    this.mapSignalText.setText(lines.join('\n'));
    this.layoutMapSignalPanel();
    this.mapEventButton?.setEnabled(Boolean(event) && !Boolean(lastChoice?.optionId));
    this.sideChallengeButton?.setEnabled(true);
  },

  openMapEventPanel() {
    const event = this.mapConfig?.event;
    if (!event) {
      this.showMapToast('This map has no authored event.');
      return;
    }
    if (this.mapConfig?.playerState?.lastChoice?.optionId) {
      this.showMapToast('This map decision has already been made.');
      return;
    }
    if (this.eventOverlay) return;

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(180);
    const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x040814, 0.72).setInteractive();
    backdrop.on('pointerup', () => this.destroyEventPanel());
    overlay.add(backdrop);

    const panel = this.add.container(width / 2 - 250, height / 2 - 160);
    const bg = this.add.graphics();
    bg.fillStyle(0x0d1530, 0.98);
    bg.fillRoundedRect(0, 0, 500, 320, 10);
    bg.lineStyle(2, HUD.border, 0.9);
    bg.strokeRoundedRect(0, 0, 500, 320, 10);
    panel.add(bg);

    panel.add(this.add.text(250, 22, event.title, {
      fontSize: '24px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      fontStyle: 'bold',
      color: HUD.textGold,
      stroke: '#060814',
      strokeThickness: 4
    }).setOrigin(0.5, 0));

    panel.add(this.add.text(28, 68, event.intro, {
      fontSize: '15px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      color: HUD.textMain,
      lineSpacing: 6,
      wordWrap: { width: 444 }
    }));

    event.options.forEach((option, index) => {
      const y = 126 + index * 62;
      panel.add(this.createEventOptionButton(24, y, 452, 50, option, () => this.applyMapEventChoice(option)));
    });

    panel.add(this.add.text(250, 292, 'Choose once. The world map will remember it.', {
      fontSize: '12px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      color: HUD.textSub
    }).setOrigin(0.5, 0.5));
    panel.add(this.add.text(470, 18, 'X', {
      fontSize: '18px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      fontStyle: 'bold',
      color: HUD.textWarn,
      stroke: '#060814',
      strokeThickness: 3
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.destroyEventPanel()));

    overlay.add(panel);
    this.eventOverlay = overlay;
    this.eventPanel = panel;
  },

  createEventOptionButton(x, y, width, height, option, onClick) {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    const draw = (fill, border) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(0, 0, width, height, 6);
      bg.lineStyle(2, border, 1);
      bg.strokeRoundedRect(0, 0, width, height, 6);
    };

    draw(0x1c274f, HUD.border);
    container.add(bg);
    container.add(this.add.text(14, 9, option.label, {
      fontSize: '15px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      fontStyle: 'bold',
      color: HUD.textMain,
      stroke: '#060814',
      strokeThickness: 3
    }));
    container.add(this.add.text(14, 28, option.summary, {
      fontSize: '12px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      color: HUD.textSub
    }));

    const hit = this.add.rectangle(width / 2, height / 2, width, height, 0, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => draw(0x26376c, HUD.borderGlow));
    hit.on('pointerout', () => draw(0x1c274f, HUD.border));
    hit.on('pointerdown', () => draw(0x131b36, 0x6c4f0e));
    hit.on('pointerup', () => {
      draw(0x26376c, HUD.borderGlow);
      onClick();
    });
    container.add(hit);
    return container;
  },

  applyMapEventChoice(option) {
    const rewards = mapDiscoveryService.recordChoice(this.mapConfig, this.mapConfig.event.id, option);
    const learner = gameState.getLearner();
    if (learner && rewards?.bonusXp) {
      gameState.setLearner({
        ...learner,
        total_xp: Number(learner.total_xp || learner.totalXp || 0) + Number(rewards.bonusXp || 0)
      });
    }

    if (rewards?.revealNextMonster) {
      if (!this.areAllNpcsCompleted()) {
        this.showMapToast('Monsters unlock only after all NPC lessons are completed.');
      } else {
        const nextLocked = this.getOrderedEncounters().find((entry) => !this.revealedMonsterNpcKeys.has(entry.npcKey));
        if (nextLocked?.npc) this.revealMonsterForNpc(nextLocked.npc, { animate: true, silent: true });
      }
    }

    this.mapConfig = mapDiscoveryService.buildCatalog([this.mapConfig], gameState.getLearner())[0] || this.mapConfig;
    gameState.setCurrentMap(this.mapConfig);
    this.refreshMapSignalPanel();
    this.updateQuestPanel();
    this.destroyEventPanel();
    this.showMapToast(option.outcome, 2600);
  },

  destroyEventPanel() {
    if (this.eventOverlay) {
      this.eventOverlay.destroy(true);
    }
    this.eventOverlay = null;
    this.eventPanel = null;
  },

  checkForMapCompletion() {
    if (this.mapCompletionRecorded || this.mapStartedCompleted) return;
    if (!this.isQuestChainComplete()) return;

    const choiceRewards = this.mapConfig?.event?.options?.find(
      (option) => option.id === this.mapConfig?.playerState?.lastChoice?.optionId
    )?.rewards || {};
    mapDiscoveryService.recordCompletion(this.mapConfig, {
      bonusStars: choiceRewards.bonusStars || 0,
      featuredCompletion: Boolean(choiceRewards.featuredCompletion),
      autoLike: false
    });
    this.mapConfig = mapDiscoveryService.buildCatalog([this.mapConfig], gameState.getLearner())[0] || this.mapConfig;
    gameState.setCurrentMap(this.mapConfig);
    this.mapCompletionRecorded = true;
    this.mapStartedCompleted = true;
    this.refreshMapSignalPanel();
    this.showMapToast(`${this.mapConfig.name} logged as a completed run.`, 2400);
  }
};
