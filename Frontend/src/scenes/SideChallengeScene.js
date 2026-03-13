import Phaser from 'phaser';
import { gameState } from '../services/gameState.js';
import { getChallengeSnapshot, recordChallengeAttempt } from '../services/sideChallenges.js';

const P = {
  bg: 0x07111f,
  panel: 0x0d1530,
  slot: 0x16244a,
  card: 0x233b72,
  cardHover: 0x315196,
  gold: 0xc8870a,
  glow: 0xf0b030,
  text: '#f0ecff',
  sub: '#c0a8e0',
  good: '#7df5b2',
  warn: '#ffd57a',
  bad: '#f87171'
};

export class SideChallengeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SideChallengeScene' });
    this.mapConfig = null;
    this.challenge = null;
    this.snapshot = null;
    this.slotZones = [];
    this.cards = [];
    this.statusText = null;
  }

  init(data) {
    this.mapConfig = data?.mapConfig || gameState.getCurrentMap() || null;
    this.snapshot = getChallengeSnapshot(this.mapConfig);
    this.challenge = this.snapshot.challenge;
    this.slotZones = [];
    this.cards = [];
  }

  create() {
    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, width, height, P.bg, 0.88);

    const panelW = Math.min(1120, width - 180);
    const panelH = Math.min(720, height - 140);
    const left = width / 2 - panelW / 2;
    const top = height / 2 - panelH / 2;

    const panel = this.add.graphics();
    panel.fillStyle(P.panel, 0.98);
    panel.fillRoundedRect(left, top, panelW, panelH, 10);
    panel.lineStyle(2, P.gold, 0.9);
    panel.strokeRoundedRect(left, top, panelW, panelH, 10);

    this.add.text(width / 2, top + 34, this.challenge.title, {
      fontSize: '30px',
      fontStyle: 'bold',
      color: P.text,
      stroke: '#06101a',
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(width / 2, top + 74, `${this.challenge.prompt}  Drag each word into the correct slot.`, {
      fontSize: '18px',
      color: P.sub,
      stroke: '#06101a',
      strokeThickness: 3
    }).setOrigin(0.5);

    this.add.text(width / 2, top + 108, `Reward: +${this.challenge.rewardXp} XP${this.challenge.rewardAssist ? ' and +1 Oracle assist' : ''}`, {
      fontSize: '15px',
      color: P.warn,
      stroke: '#06101a',
      strokeThickness: 3
    }).setOrigin(0.5);

    const shuffled = Phaser.Utils.Array.Shuffle([...this.challenge.orderedTokens]);
    const slotY = top + 220;
    const slotWidth = Math.min(150, Math.floor((panelW - 90) / this.challenge.orderedTokens.length));
    const slotGap = 12;
    const totalSlotsWidth = slotWidth * this.challenge.orderedTokens.length + slotGap * (this.challenge.orderedTokens.length - 1);
    const slotStartX = width / 2 - totalSlotsWidth / 2 + slotWidth / 2;

    this.input.setTopOnly(false);

    this.challenge.orderedTokens.forEach((token, index) => {
      const x = slotStartX + index * (slotWidth + slotGap);
      const zone = this.add.zone(x, slotY, slotWidth, 66).setRectangleDropZone(slotWidth, 66);
      const bg = this.add.graphics();
      bg.fillStyle(P.slot, 1);
      bg.fillRoundedRect(x - slotWidth / 2, slotY - 33, slotWidth, 66, 8);
      bg.lineStyle(2, P.gold, 0.45);
      bg.strokeRoundedRect(x - slotWidth / 2, slotY - 33, slotWidth, 66, 8);

      const label = this.add.text(x, slotY, `${index + 1}`, {
        fontSize: '18px',
        fontStyle: 'bold',
        color: P.sub
      }).setOrigin(0.5);

      this.slotZones.push({ zone, bg, label, index, token: null });
    });

    const bankY = top + 390;
    const cardGap = 18;
    const cardW = 150;
    const cardH = 58;
    const totalCardWidth = cardW * shuffled.length + cardGap * (shuffled.length - 1);
    const cardStartX = width / 2 - totalCardWidth / 2 + cardW / 2;

    shuffled.forEach((token, index) => {
      const x = cardStartX + index * (cardW + cardGap);
      const y = bankY + (index % 2) * 84;
      this.cards.push(this.createTokenCard(token, x, y, cardW, cardH));
    });

    this.statusText = this.add.text(width / 2, top + panelH - 122, this.snapshot.completed
      ? 'Already cleared. You can replay for practice, but rewards are awarded once.'
      : 'Arrange the words, then submit your answer.', {
      fontSize: '18px',
      color: this.snapshot.completed ? P.warn : P.sub,
      stroke: '#06101a',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5);

    this.makeButton(width / 2 - 170, top + panelH - 56, 150, 42, 'RESET', () => this.resetCards());
    this.makeButton(width / 2, top + panelH - 56, 170, 42, 'SUBMIT', () => this.submitChallenge());
    this.makeButton(width / 2 + 190, top + panelH - 56, 150, 42, 'BACK', () => this.closeScene());
  }

  snapCardToNearestSlot(container) {
    const snapThreshold = 120 * 120;
    let bestSlot = null;
    let bestDist = Infinity;

    this.slotZones.forEach(slot => {
      const dx = container.x - slot.zone.x;
      const dy = container.y - slot.zone.y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        bestSlot = slot;
      }
    });

    if (bestSlot && bestDist <= snapThreshold) {
      this.assignCardToSlot(container, bestSlot);
    } else {
      this.returnCardHome(container);
    }
  }

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
    draw(P.card, P.gold);

    const text = this.add.text(0, 0, token, {
      fontSize: '20px',
      fontStyle: 'bold',
      color: P.text,
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

    hit.on('pointerover', () => draw(P.cardHover, P.glow));
    hit.on('pointerout', () => draw(P.card, P.gold));

    this.input.setDraggable(hit);
    hit.on('dragstart', () => {
      container.setDepth(40);
      this.clearTokenFromSlots(token);
    });
    hit.on('drag', (_pointer, dragX, dragY) => {
      container.x = dragX;
      container.y = dragY;
    });
    hit.on('dragend', () => {
      container.setDepth(20);
      this.snapCardToNearestSlot(container);
    });

    return container;
  }

  assignCardToSlot(card, slot) {
    if (slot.token) {
      const existingCard = this.cards.find((entry) => entry.getData('token') === slot.token);
      if (existingCard) this.returnCardHome(existingCard);
    }
    slot.token = card.getData('token');
    card.x = slot.zone.x;
    card.y = slot.zone.y;
  }

  clearTokenFromSlots(token) {
    this.slotZones.forEach((slot) => {
      if (slot.token === token) slot.token = null;
    });
  }

  returnCardHome(card) {
    card.x = card.getData('homeX');
    card.y = card.getData('homeY');
  }

  resetCards() {
    this.slotZones.forEach((slot) => {
      slot.token = null;
    });
    this.cards.forEach((card) => this.returnCardHome(card));
    this.statusText.setText('Challenge reset. Drag the words back into order.');
    this.statusText.setColor(P.sub);
  }

  submitChallenge() {
    const current = this.slotZones.map((slot) => slot.token);
    if (current.some((token) => !token)) {
      this.statusText.setText('Fill every slot before submitting.');
      this.statusText.setColor(P.bad);
      return;
    }

    const won = current.every((token, index) => token === this.challenge.orderedTokens[index]);
    const result = recordChallengeAttempt(this.mapConfig, won);

    if (!won) {
      this.statusText.setText('Not quite. Reset or drag the cards again and try another order.');
      this.statusText.setColor(P.bad);
      return;
    }

    const learner = gameState.getLearner();
    if (learner && !this.snapshot.completed) {
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
    this.statusText.setText(
      this.snapshot.completed
        ? `Perfect. Challenge cleared${result.attempts > 1 ? ` after ${result.attempts} attempts` : ''}.`
        : 'Perfect.'
    );
    this.statusText.setColor(P.good);
  }

  makeButton(x, y, width, height, label, onClick) {
    const bg = this.add.graphics();
    const draw = (fill, border) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);
      bg.lineStyle(2, border, 1);
      bg.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 8);
    };
    draw(0x20123a, P.gold);

    this.add.text(x, y, label, {
      fontSize: '18px',
      fontStyle: 'bold',
      color: P.text,
      stroke: '#06101a',
      strokeThickness: 4
    }).setOrigin(0.5);

    const hit = this.add.rectangle(x, y, width, height, 0, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => draw(0x2d1b55, P.glow));
    hit.on('pointerout', () => draw(0x20123a, P.gold));
    hit.on('pointerdown', () => draw(0x130b24, 0x604008));
    hit.on('pointerup', () => {
      draw(0x2d1b55, P.glow);
      onClick();
    });
  }

  closeScene() {
    this.scene.stop();
    this.scene.resume('GameMapScene');
  }
}
