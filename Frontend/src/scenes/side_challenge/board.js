import { gameState } from '../../services/gameState.js';
import { recordChallengeAttempt } from '../../services/sideChallenges.js';
import { SIDE_CHALLENGE_COLORS as C } from './constants.js';

export const sideChallengeBoardMethods = {
  clampCardPosition(x, y, width, height) {
    const camera = this.cameras.main;
    const halfWidth = Number(width) / 2;
    const halfHeight = Number(height) / 2;
    const minX = halfWidth;
    const maxX = camera.width - halfWidth;
    const minY = halfHeight;
    const maxY = camera.height - halfHeight;
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y))
    };
  },

  snapCardToNearestSlot(card) {
    const snapThreshold = 120 * 120;
    let bestSlot = null;
    let bestDistance = Infinity;

    this.slotZones.forEach((slot) => {
      const dx = card.x - slot.zone.x;
      const dy = card.y - slot.zone.y;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestSlot = slot;
      }
    });

    if (bestSlot && bestDistance <= snapThreshold) {
      this.assignCardToSlot(card, bestSlot);
      return;
    }

    this.returnCardHome(card);
  },

  createSlotRow(centerX, y, panelWidth) {
    const tokenCount = this.challenge.orderedTokens.length;
    const slotWidth = Math.min(150, Math.floor((panelWidth - 90) / tokenCount));
    const slotGap = 12;
    const totalWidth = slotWidth * tokenCount + slotGap * (tokenCount - 1);
    const startX = centerX - totalWidth / 2 + slotWidth / 2;

    this.challenge.orderedTokens.forEach((_token, index) => {
      const x = startX + index * (slotWidth + slotGap);
      const zone = this.add.zone(x, y, slotWidth, 66).setRectangleDropZone(slotWidth, 66);
      const bg = this.add.graphics();
      bg.fillStyle(C.slot, 1);
      bg.fillRoundedRect(x - slotWidth / 2, y - 33, slotWidth, 66, 8);
      bg.lineStyle(2, C.gold, 0.45);
      bg.strokeRoundedRect(x - slotWidth / 2, y - 33, slotWidth, 66, 8);

      const label = this.add.text(x, y, `${index + 1}`, {
        fontSize: '18px',
        fontStyle: 'bold',
        color: C.sub
      }).setOrigin(0.5);

      this.slotZones.push({ zone, bg, label, index, token: null });
    });
  },

  createTokenBank(centerX, startY, tokens) {
    const cardGap = 18;
    const cardWidth = 150;
    const cardHeight = 58;
    const cameraWidth = this.cameras.main.width;
    const usableWidth = Math.max(cardWidth, cameraWidth - 140);
    const maxPerRow = Math.max(1, Math.floor((usableWidth + cardGap) / (cardWidth + cardGap)));
    const rowCount = Math.ceil(tokens.length / maxPerRow);

    tokens.forEach((token, index) => {
      const rowIndex = Math.floor(index / maxPerRow);
      const indexInRow = index % maxPerRow;
      const remaining = tokens.length - rowIndex * maxPerRow;
      const cardsInThisRow = Math.min(maxPerRow, remaining);
      const rowWidth = cardsInThisRow * cardWidth + Math.max(0, cardsInThisRow - 1) * cardGap;
      const startX = centerX - rowWidth / 2 + cardWidth / 2;
      const x = startX + indexInRow * (cardWidth + cardGap);
      const centeredRowOffset = (rowIndex - (rowCount - 1) / 2) * 84;
      const y = startY + centeredRowOffset;
      this.cards.push(this.createTokenCard(token, x, y, cardWidth, cardHeight));
    });
  },

  createTokenCard(token, x, y, width, height) {
    const clampedHome = this.clampCardPosition(x, y, width, height);
    const container = this.add.container(clampedHome.x, clampedHome.y);
    const bg = this.add.graphics();
    const draw = (fill, border) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
      bg.lineStyle(2, border, 1);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
    };

    draw(C.card, C.gold);

    const text = this.add.text(0, 0, token, {
      fontSize: '20px',
      fontStyle: 'bold',
      color: C.text,
      stroke: '#06101a',
      strokeThickness: 4
    }).setOrigin(0.5);

    const hit = this.add.rectangle(0, 0, width, height, 0, 0)
      .setInteractive({ draggable: true, useHandCursor: true });

    container.add([bg, text, hit]);
    container.setData('token', token);
    container.setData('homeX', clampedHome.x);
    container.setData('homeY', clampedHome.y);
    container.setData('cardWidth', width);
    container.setData('cardHeight', height);
    container.setDepth(20);

    hit.on('pointerover', () => draw(C.cardHover, C.glow));
    hit.on('pointerout', () => draw(C.card, C.gold));

    this.input.setDraggable(hit);
    hit.on('dragstart', (pointer) => {
      container.setDepth(40);
      this.clearTokenFromSlots(token);
      hit.setData('dragOffsetX', container.x - pointer.worldX);
      hit.setData('dragOffsetY', container.y - pointer.worldY);
    });
    hit.on('drag', (pointer) => {
      const targetX = pointer.worldX + Number(hit.getData('dragOffsetX') || 0);
      const targetY = pointer.worldY + Number(hit.getData('dragOffsetY') || 0);
      const next = this.clampCardPosition(
        targetX,
        targetY,
        Number(container.getData('cardWidth') || width),
        Number(container.getData('cardHeight') || height)
      );
      container.x = next.x;
      container.y = next.y;
    });
    hit.on('drop', (_pointer, zone) => {
      const slot = this.slotZones.find((entry) => entry.zone === zone);
      if (!slot) {
        this.returnCardHome(container);
        return;
      }
      this.assignCardToSlot(container, slot);
    });
    hit.on('dragend', (_pointer, dropped) => {
      if (!dropped) this.snapCardToNearestSlot(container);
      container.setDepth(20);
    });

    return container;
  },

  assignCardToSlot(card, slot) {
    if (slot.token) {
      const existingCard = this.cards.find((entry) => entry.getData('token') === slot.token);
      if (existingCard) this.returnCardHome(existingCard);
    }

    slot.token = card.getData('token');
    card.x = slot.zone.x;
    card.y = slot.zone.y;
  },

  clearTokenFromSlots(token) {
    this.slotZones.forEach((slot) => {
      if (slot.token === token) slot.token = null;
    });
  },

  returnCardHome(card) {
    const nextHome = this.clampCardPosition(
      Number(card.getData('homeX') || 0),
      Number(card.getData('homeY') || 0),
      Number(card.getData('cardWidth') || 150),
      Number(card.getData('cardHeight') || 58)
    );
    card.setData('homeX', nextHome.x);
    card.setData('homeY', nextHome.y);
    this.tweens.killTweensOf(card);
    this.tweens.add({
      targets: card,
      x: nextHome.x,
      y: nextHome.y,
      duration: 120,
      ease: 'Quad.Out'
    });
  },

  resetCards() {
    this.slotZones.forEach((slot) => {
      slot.token = null;
    });
    this.cards.forEach((card) => this.returnCardHome(card));
    this.setStatusMessage('Challenge reset. Drag the words back into order.', C.sub);
  },

  async submitChallenge() {
    if (this.isSubmitting) return;

    const currentTokens = this.slotZones.map((slot) => slot.token);
    if (currentTokens.some((token) => !token)) {
      this.setStatusMessage('Fill every slot before submitting.', C.bad);
      return;
    }

    this.isSubmitting = true;
    if (this.submitButtonControl) this.submitButtonControl.setEnabled(false);
    this.setStatusMessage('Submitting answer...', C.sub);

    try {
      const won = currentTokens.every((token, index) => token === this.challenge.orderedTokens[index]);
      const result = await recordChallengeAttempt(this.mapConfig, won, {
        serverChallenge: this.challenge
      });

      if (!won) {
        this.setStatusMessage('Not quite. Reset or drag the cards again and try another order.', C.bad);
        return;
      }

      if (gameState.getLearner() && Number(result.xpAwarded || 0) > 0) {
        gameState.updateXP(Number(result.xpAwarded));
      }

      if (Number(result.assistAwarded || 0) > 0) {
        const currentMap = gameState.getCurrentMap();
        if (currentMap) {
          gameState.setCurrentMap({
            ...currentMap,
            playerState: {
              ...(currentMap.playerState || {}),
              assistCharges: Number(currentMap.playerState?.assistCharges || 0) + Number(result.assistAwarded)
            }
          });
        }
      }

      this.snapshot = {
        ...this.snapshot,
        completed: result.completed,
        dailyRewardClaimedToday: Boolean(result.dailyRewardClaimedToday),
        dailyCompletionsToday: Number(result.dailyCompletionsToday || 0)
      };

      const rewardMessage = Number(result.xpAwarded || 0) > 1
        ? `Reward claimed: +${Number(result.xpAwarded)} XP${Number(result.assistAwarded || 0) > 0 ? ` and +${Number(result.assistAwarded)} assist` : ''}.`
        : Number(result.xpAwarded || 0) === 1
          ? 'Daily main reward already claimed. +1 XP granted.'
          : 'No XP awarded for this attempt.';

      const message = `Perfect. ${rewardMessage}${result.attempts > 1 ? ` (${result.attempts} attempts total)` : ''}`;
      this.setStatusMessage(message, C.good);
    } catch (_e) {
      this.setStatusMessage('Unable to submit right now. Please try again.', C.bad);
    } finally {
      this.isSubmitting = false;
      if (this.submitButtonControl) this.submitButtonControl.setEnabled(true);
    }
  }
};
