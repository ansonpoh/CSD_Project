import Phaser from 'phaser';
import { supabase } from '../config/supabaseClient.js';
import { apiService } from '../services/api.js';
import { gameState } from '../services/gameState.js';

export class AdminScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AdminScene' });
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

    const panelW = 940;
    const panelH = 500;
    const panelX = width / 2 - panelW / 2;
    const panelY = height / 2 - panelH / 2 + 40;

    const panel = this.add.graphics();
    panel.fillStyle(0x2a1713, 0.96);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
    panel.lineStyle(2, 0xc8870a, 0.9);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);

    const cardW = 270;
    const cardH = 150;
    const gap = 26;
    const startX = width / 2 - ((cardW * 3 + gap * 2) / 2) + cardW / 2;
    const y = panelY + 146;

    this.createActionCard(startX, y, cardW, cardH, 'Review Queue', 'Fetch pending moderation queue', async () => {
      const rows = await apiService.getContentQueue();
      this.showToast(`Loaded ${rows?.length ?? 0} queued item(s).`);
    });

    this.createActionCard(startX + cardW + gap, y, cardW, cardH, 'Contributors', 'View contributor accounts', async () => {
      const rows = await apiService.getAllContributors();
      this.showToast(`Loaded ${rows?.length ?? 0} contributor(s).`);
    });

    this.createActionCard(startX + (cardW + gap) * 2, y, cardW, cardH, 'Administrators', 'View administrator accounts', async () => {
      const rows = await apiService.getAllAdministrators();
      this.showToast(`Loaded ${rows?.length ?? 0} admin(s).`);
    });

    this.createButton(width / 2 - 90, panelY + panelH - 66, 180, 42, 'Logout', async () => {
      await supabase.auth.signOut();
      gameState.clearState();
      this.scene.start('LoginScene');
    }, 0x4a1111, 0x7a1b1b);
  }

  createActionCard(x, y, w, h, title, subtitle, onClick) {
    const c = this.add.container(x - w / 2, y - h / 2);
    const bg = this.add.graphics();

    const draw = (fill, border) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(0, 0, w, h, 6);
      bg.lineStyle(2, border, 1);
      bg.strokeRoundedRect(0, 0, w, h, 6);
      bg.fillStyle(0xffffff, 0.05);
      bg.fillRoundedRect(2, 2, w - 4, h * 0.45, { tl: 4, tr: 4, bl: 0, br: 0 });
    };

    draw(0x4a2218, 0xd49a83);
    c.add(bg);
    c.add(this.add.text(w / 2, 42, title, {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#fff0e8',
      stroke: '#240d09',
      strokeThickness: 4
    }).setOrigin(0.5));
    c.add(this.add.text(w / 2, 92, subtitle, {
      fontSize: '14px',
      color: '#f3c7b3',
      align: 'center',
      wordWrap: { width: w - 24 }
    }).setOrigin(0.5));

    const hit = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    c.add(hit);
    hit.on('pointerover', () => draw(0x643125, 0xf0bea8));
    hit.on('pointerout', () => draw(0x4a2218, 0xd49a83));
    hit.on('pointerdown', () => draw(0x32140f, 0xbd7e61));
    hit.on('pointerup', async () => {
      draw(0x643125, 0xf0bea8);
      try {
        await onClick();
      } catch (e) {
        this.showToast(e?.message || 'Action failed');
      }
    });
  }

  createButton(x, y, w, h, label, onClick, normal, hover) {
    const c = this.add.container(x, y);
    const bg = this.add.graphics();

    const draw = (fill, border) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(0, 0, w, h, 5);
      bg.lineStyle(2, border, 1);
      bg.strokeRoundedRect(0, 0, w, h, 5);
    };

    draw(normal, 0xc8870a);
    c.add(bg);
    c.add(this.add.text(w / 2, h / 2, label, {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#fff3ed',
      stroke: '#210e0a',
      strokeThickness: 4
    }).setOrigin(0.5));

    const hit = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    c.add(hit);
    hit.on('pointerover', () => draw(hover, 0xf0b030));
    hit.on('pointerout', () => draw(normal, 0xc8870a));
    hit.on('pointerdown', () => draw(0x160707, 0x6e2b2b));
    hit.on('pointerup', onClick);
  }

  showToast(message) {
    const text = this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 40, message, {
      fontSize: '14px',
      color: '#fff3ed',
      backgroundColor: '#3b1e17',
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
