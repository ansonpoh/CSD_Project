import { gameState } from '../../services/gameState.js';
import { recordChallengeAttempt } from '../../services/sideChallenges.js';
import { SIDE_CHALLENGE_COLORS as C } from './constants.js';

export const sideChallengeBoardMethods = {
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
    const totalWidth = cardWidth * tokens.length + cardGap * (tokens.length - 1);
    const startX = centerX - totalWidth / 2 + cardWidth / 2;

    tokens.forEach((token, index) => {
      const x = startX + index * (cardWidth + cardGap);
      const y = startY + (index % 2) * 84;
      this.cards.push(this.createTokenCard(token, x, y, cardWidth, cardHeight));
    });
  },

  createTokenCard(token, x, y, width, height) {
    const container = this.add.container(x, y);
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
    container.setData('homeX', x);
    container.setData('homeY', y);
    container.setDepth(20);

    hit.on('pointerover', () => draw(C.cardHover, C.glow));
    hit.on('pointerout', () => draw(C.card, C.gold));

    this.input.setDraggable(hit);
    hit.on('dragstart', () => {
      container.setDepth(40);
      this.clearTokenFromSlots(token);
    });
    hit.on('drag', (_pointer, dragX, dragY) => {
      container.x = dragX;
      container.y = dragY;
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
      if (!dropped) this.returnCardHome(container);
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
    card.x = card.getData('homeX');
    card.y = card.getData('homeY');
  },

  resetCards() {
    this.slotZones.forEach((slot) => {
      slot.token = null;
    });
    this.cards.forEach((card) => this.returnCardHome(card));
    this.setStatusMessage('Challenge reset. Drag the words back into order.', C.sub);
  },

  submitChallenge() {
    const currentTokens = this.slotZones.map((slot) => slot.token);
    if (currentTokens.some((token) => !token)) {
      this.setStatusMessage('Fill every slot before submitting.', C.bad);
      return;
    }

    const won = currentTokens.every((token, index) => token === this.challenge.orderedTokens[index]);
    const result = recordChallengeAttempt(this.mapConfig, won);

    if (!won) {
      this.setStatusMessage('Not quite. Reset or drag the cards again and try another order.', C.bad);
      return;
    }

    if (gameState.getLearner() && !this.snapshot.completed) {
      gameState.updateXP(this.challenge.rewardXp);
    }

    if (!this.snapshot.completed && this.challenge.rewardAssist > 0) {
      const currentMap = gameState.getCurrentMap();
      if (currentMap) {
        gameState.setCurrentMap({
          ...currentMap,
          playerState: {
            ...(currentMap.playerState || {}),
            assistCharges: Number(currentMap.playerState?.assistCharges || 0) + this.challenge.rewardAssist
          }
        });
      }
    }

    this.snapshot = {
      ...this.snapshot,
      completed: result.completed
    };

    const message = this.snapshot.completed
      ? `Perfect. Challenge cleared${result.attempts > 1 ? ` after ${result.attempts} attempts` : ''}.`
      : 'Perfect.';

    this.setStatusMessage(message, C.good);
  }
};
