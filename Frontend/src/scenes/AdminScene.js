import Phaser from 'phaser';
import { supabase } from '../config/supabaseClient.js';
import { gameState } from '../services/gameState.js';

export class AdminScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AdminScene' });
  }

  create() {
    const width  = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a0d2a);

    // Title
    this.add.text(width / 2, 80, 'Administrator Dashboard', {
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#c87fff',
    }).setOrigin(0.5);

    const admin = gameState.getAdministrator();
    if (admin) {
      this.add.text(width / 2, 150, `Welcome, ${admin.username ?? admin.email}`, {
        fontSize: '22px',
        color: '#c0c8e0',
      }).setOrigin(0.5);
    }

    // Placeholder content area
    this.add.rectangle(width / 2, height / 2, width - 100, height - 260, 0x1a1030, 0.7)
      .setStrokeStyle(1, 0xc87fff, 0.4);

    this.add.text(width / 2, height / 2, 'Admin tools coming soon.', {
      fontSize: '24px',
      color: '#6a5090',
    }).setOrigin(0.5);

    // Logout button
    this.createLogoutButton(width, height);
  }

  createLogoutButton(width, height) {
    const btn = this.add.text(width / 2, height - 50, '[ Log Out ]', {
      fontSize: '18px',
      color: '#c87fff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover',  () => btn.setColor('#ffffff'));
    btn.on('pointerout',   () => btn.setColor('#c87fff'));
    btn.on('pointerdown',  () => this.handleLogout());
  }

  async handleLogout() {
    await supabase.auth.signOut();
    gameState.clearState();
    this.scene.start('LoginScene');
  }
}
