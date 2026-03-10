import Phaser from 'phaser';
import { supabase } from '../../config/supabaseClient.js';
import { gameState } from '../../services/gameState.js';
import { openMyContentWorkflow, destroyContentListModal } from './contentWorkflow.js';
import { renderContributorPortal } from './portal.js';
import { openSubmitWorkflow, destroySubmitForm } from './submitWorkflow.js';

export class ContributorScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ContributorScene' });
    this.submitForm = null;
    this.submitMessageEl = null;
    this.submitButtonEl = null;
    this.cancelButtonEl = null;
    this.contentListModal = null;
    this.narrationsContainer = null;
    this.aiGenerateBtn = null;
    this.addLineBtn = null;
  }

  create() {
    renderContributorPortal(this, {
      openMyContent: () => openMyContentWorkflow(this),
      openSubmit: () => openSubmitWorkflow(this),
      openMapEditor: () => this.startMapEditor(),
      logout: () => this.logout()
    });

    this.events.once('shutdown', () => this.cleanupDomOverlays());
    this.events.once('destroy', () => this.cleanupDomOverlays());
  }

  cleanupDomOverlays() {
    destroySubmitForm(this);
    destroyContentListModal(this);
  }

  startMapEditor() {
    this.cleanupDomOverlays();
    this.scene.start('MapEditorScene');
  }

  async logout() {
    this.cleanupDomOverlays();
    await supabase.auth.signOut();
    gameState.clearState();
    this.scene.start('LoginScene');
  }

  showToast(message) {
    const text = this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 40, message, {
      fontSize: '14px',
      color: '#f1f6ff',
      backgroundColor: '#122647',
      padding: { x: 12, y: 8 }
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 10,
      duration: 1400,
      onComplete: () => text.destroy()
    });
  }
}
