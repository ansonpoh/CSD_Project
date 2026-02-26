import Phaser from 'phaser';
import { supabase } from '../config/supabaseClient.js';
import { gameState } from '../services/gameState.js';

export class ContributorScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ContributorScene' });
    this.ui = null;
  }

  create() {
    const width  = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0d1b2a);

    // Title
    this.add.text(width / 2, 80, 'Contributor Dashboard', {
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#4a90e2',
    }).setOrigin(0.5);

    const contributor = gameState.getContributor();
    if (contributor) {
      this.add.text(width / 2, 150, `Welcome, ${contributor.username ?? contributor.email}`, {
        fontSize: '22px',
        color: '#c0c8e0',
      }).setOrigin(0.5);
    }

    // Placeholder content area
    this.add.rectangle(width / 2, height / 2, width - 100, height - 260, 0x152030, 0.7)
      .setStrokeStyle(1, 0x4a90e2, 0.4);

    this.add.text(width / 2, height / 2, 'Contributor tools coming soon.', {
      fontSize: '24px',
      color: '#5a7090',
    }).setOrigin(0.5);

    // Logout button
    this.createLogoutButton(width, height);
  }

  createLogoutButton(width, height) {
    const btn = this.add.text(width / 2, height - 50, '[ Log Out ]', {
      fontSize: '18px',
      color: '#9fc7ff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover',  () => btn.setColor('#ffffff'));
    btn.on('pointerout',   () => btn.setColor('#9fc7ff'));
    btn.on('pointerdown',  () => this.handleLogout());
  }

  async handleLogout() {
    await supabase.auth.signOut();
    gameState.clearState();
    this.scene.start('LoginScene');
  }
}
