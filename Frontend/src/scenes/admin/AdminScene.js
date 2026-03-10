import Phaser from 'phaser';
import { supabase } from '../../config/supabaseClient.js';
import { gameState } from '../../services/gameState.js';
import { contributorAdminMethods } from './contributors.js';
import { flagQueueAdminMethods } from './flagQueue.js';
import { reviewQueueAdminMethods } from './reviewQueue.js';
import { sharedAdminMethods } from './shared.js';
import { telemetryAdminMethods } from './telemetry.js';

export class AdminScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AdminScene' });
    this.reviewQueueModal = null;
    this.contributorAccountsModal = null;
    this.contributorDetailsModal = null;
    this.telemetryModal = null;
    this.flagQueueModal = null;
  }

  create() {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor(0x1a1110);

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1110);
    this.add.circle(width * 0.24, height * 0.24, 220, 0x6b1f1a, 0.14);
    this.add.circle(width * 0.78, height * 0.74, 280, 0x442018, 0.16);

    this.add.text(width / 2, 88, 'ADMIN PORTAL', {
      fontSize: '42px',
      color: '#ffe8dc',
      fontStyle: 'bold',
      stroke: '#240d09',
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(width / 2, 140, 'Moderate and manage platform content', {
      fontSize: '18px',
      color: '#efb9a2',
      stroke: '#240d09',
      strokeThickness: 3
    }).setOrigin(0.5);

    const panelWidth = 980;
    const panelHeight = 500;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2 + 40;

    const panel = this.add.graphics();
    panel.fillStyle(0x2a1713, 0.96);
    panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);
    panel.lineStyle(2, 0xc8870a, 0.9);
    panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);

    const cardWidth = 220;
    const cardHeight = 150;
    const gap = 20;
    const totalCards = 4;
    const startX = width / 2 - ((cardWidth * totalCards + gap * (totalCards - 1)) / 2) + cardWidth / 2;
    const cardY = panelY + 146;

    this.createActionCard(startX, cardY, cardWidth, cardHeight, 'Review Queue', 'Fetch pending moderation queue', async () => {
      await this.openReviewQueueWorkflow();
    });

    this.createActionCard(startX + (cardWidth + gap), cardY, cardWidth, cardHeight, 'Flagged Content', 'Review learner reports', async () => {
      await this.openFlagQueueWorkflow();
    });

    this.createActionCard(startX + (cardWidth + gap) * 2, cardY, cardWidth, cardHeight, 'Contributors', 'View contributor accounts', async () => {
      await this.openContributorsWorkflow();
    });

    this.createActionCard(startX + (cardWidth + gap) * 3, cardY, cardWidth, cardHeight, 'Telemetry', 'Encounter funnel dashboard', async () => {
      await this.openTelemetryWorkflow();
    });

    this.createButton(width / 2 - 90, panelY + panelHeight - 66, 180, 42, 'Logout', async () => {
      this.destroyAllModals();
      await supabase.auth.signOut();
      gameState.clearState();
      this.scene.start('LoginScene');
    }, 0x4a1111, 0x7a1b1b);

    this.events.once('shutdown', () => {
      this.destroyAllModals();
    });
    this.events.once('destroy', () => {
      this.destroyAllModals();
    });
  }
}

Object.assign(
  AdminScene.prototype,
  sharedAdminMethods,
  contributorAdminMethods,
  telemetryAdminMethods,
  reviewQueueAdminMethods,
  flagQueueAdminMethods
);
