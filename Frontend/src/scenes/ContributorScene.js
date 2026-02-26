import Phaser from 'phaser';
import { supabase } from '../config/supabaseClient.js';
import { apiService } from '../services/api.js';
import { gameState } from '../services/gameState.js';

export class ContributorScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ContributorScene' });
  }

  create() {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor(0x0b1730);

    this.add.rectangle(width / 2, height / 2, width, height, 0x0b1730);
    this.add.circle(width * 0.2, height * 0.25, 220, 0x1c3f7a, 0.14);
    this.add.circle(width * 0.8, height * 0.75, 260, 0x17345f, 0.16);

    this.add.text(width / 2, 88, 'CONTRIBUTOR PORTAL', {
      fontSize: '42px',
      color: '#e6f0ff',
      fontStyle: 'bold',
      stroke: '#071224',
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(width / 2, 140, 'Create and manage learning content', {
      fontSize: '18px',
      color: '#a6c3ec',
      stroke: '#071224',
      strokeThickness: 3
    }).setOrigin(0.5);

    const panelW = 860;
    const panelH = 460;
    const panelX = width / 2 - panelW / 2;
    const panelY = height / 2 - panelH / 2 + 40;

    const panel = this.add.graphics();
    panel.fillStyle(0x101f3d, 0.96);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
    panel.lineStyle(2, 0xc8870a, 0.9);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);

    const cardW = 250;
    const cardH = 150;
    const gap = 24;
    const startX = width / 2 - ((cardW * 3 + gap * 2) / 2) + cardW / 2;
    const y = panelY + 140;

    this.createActionCard(startX, y, cardW, cardH, 'My Content', 'View content you submitted', async () => {
      const profile = await this.requireContributorProfile();
      if (!profile) return;
      const rows = await apiService.getContentByContributor(profile.contributorId);
      this.showToast(`Loaded ${rows?.length ?? 0} content item(s).`);
    });

    this.createActionCard(startX + cardW + gap, y, cardW, cardH, 'Submit Content', 'Open submit workflow', () => {
      this.showToast('Wire this to your content submit scene/form.');
    });

    this.createActionCard(startX + (cardW + gap) * 2, y, cardW, cardH, 'Topics', 'Browse available topics', async () => {
      const topics = await apiService.getAllTopics();
      this.showToast(`Loaded ${topics?.length ?? 0} topic(s).`);
    });

    this.createButton(width / 2 - 90, panelY + panelH - 64, 180, 42, 'Logout', async () => {
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

    draw(0x1a2f58, 0x76a8e8);
    c.add(bg);
    c.add(this.add.text(w / 2, 42, title, {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#eef5ff',
      stroke: '#071224',
      strokeThickness: 4
    }).setOrigin(0.5));
    c.add(this.add.text(w / 2, 92, subtitle, {
      fontSize: '14px',
      color: '#bad2f2',
      align: 'center',
      wordWrap: { width: w - 24 }
    }).setOrigin(0.5));

    const hit = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    c.add(hit);
    hit.on('pointerover', () => draw(0x244273, 0xaed2ff));
    hit.on('pointerout', () => draw(0x1a2f58, 0x76a8e8));
    hit.on('pointerdown', () => draw(0x132747, 0x5d8ccc));
    hit.on('pointerup', async () => {
      draw(0x244273, 0xaed2ff);
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
      color: '#f3f6ff',
      stroke: '#06101f',
      strokeThickness: 4
    }).setOrigin(0.5));

    const hit = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    c.add(hit);
    hit.on('pointerover', () => draw(hover, 0xf0b030));
    hit.on('pointerout', () => draw(normal, 0xc8870a));
    hit.on('pointerdown', () => draw(0x160707, 0x6e2b2b));
    hit.on('pointerup', onClick);
  }

  async requireContributorProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) {
      this.showToast('No active session');
      return null;
    }
    return apiService.getContributorBySupabaseId(uid);
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
