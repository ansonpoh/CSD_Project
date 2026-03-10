import Phaser from 'phaser';
import { supabase } from '../../config/supabaseClient.js';
import { gameState } from '../../services/gameState.js';
import { createAdminLayout } from './AdminLayout.js';
import { createActionCard, createButton } from './adminUi.js';
import { destroyAdminModals } from './adminModalState.js';
import { openContributorAccountsModal } from './workflows/contributorAccountsModal.js';
import { openTelemetryModal } from './workflows/telemetryModal.js';
import { openReviewQueueModal } from './workflows/reviewQueueModal.js';
import { openFlagQueueModal } from './workflows/flagQueueModal.js';

export class AdminScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AdminScene' });
    this.reviewQueueModal = null;
    this.contributorAccountsModal = null;
    this.telemetryModal = null;
    this.flagQueueModal = null;
  }

  create() {
    const layout = createAdminLayout(this);

    createActionCard(this, {
      ...layout.cards.reviewQueue,
      title: 'Review Queue',
      subtitle: 'Fetch pending moderation queue',
      onClick: () => openReviewQueueModal(this)
    });

    createActionCard(this, {
      ...layout.cards.flaggedContent,
      title: 'Flagged Content',
      subtitle: 'Review learner reports',
      onClick: () => openFlagQueueModal(this)
    });

    createActionCard(this, {
      ...layout.cards.contributors,
      title: 'Contributors',
      subtitle: 'View contributor accounts',
      onClick: () => openContributorAccountsModal(this)
    });

    createActionCard(this, {
      ...layout.cards.telemetry,
      title: 'Telemetry',
      subtitle: 'Encounter funnel dashboard',
      onClick: () => openTelemetryModal(this)
    });

    createButton(this, {
      ...layout.logoutButton,
      label: 'Logout',
      normal: 0x4a1111,
      hover: 0x7a1b1b,
      onClick: async () => {
        destroyAdminModals(this);
        await supabase.auth.signOut();
        gameState.clearState();
        this.scene.start('LoginScene');
      }
    });

    this.events.once('shutdown', () => {
      destroyAdminModals(this);
    });
    this.events.once('destroy', () => {
      destroyAdminModals(this);
    });
  }
}
