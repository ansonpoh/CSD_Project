import Phaser from 'phaser';
import { gameState } from '../services/gameState.js';
import { apiService } from '../services/api.js';
import { supabase } from '../config/supabaseClient.js';
import { soldier } from '../characters/soldier/Soldier.js';
import { applyPlayerProfileToSprite, getDefaultPlayerProfile } from '../services/playerProfile.js';
import { resolveItemEffect } from '../services/itemEffects.js';
import { loadSharedUiAssets } from '../services/uiAssets.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
    this.levelText = null;
    this.xpText = null;
    this.usernameText = null;
    this.leaderboardBtn = null;
    this.leaderboardBtnText = null;
    this.logoutBtn = null;
    this.logoutBtnText = null;
    this.lastKnownLevel = null;
  }

  preload() {
    loadSharedUiAssets(this, {
      includeClose: true,
      includePortrait: true
    });
  }

  create() {
    const width = this.cameras.main.width;

    // ── HUD bar background ──────────────────────────────────────────────────
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x0d1530, 0.97);
    hudBg.fillRect(0, 0, width, 58);
    hudBg.lineStyle(1, 0xc8870a, 0.55);
    hudBg.beginPath();
    hudBg.moveTo(0, 57);
    hudBg.lineTo(width, 57);
    hudBg.strokePath();

    const learner = gameState.getLearner();
    if (!learner) {
      this.scene.stop('WorldMapScene');
      this.scene.start('LoginScene');
      return;
    }

    // ── Username + level (left side) ────────────────────────────────────────
    this.usernameText = this.add.text(16, 10, `@ ${learner.username}`, {
      fontSize:        '18px',
      color:           '#e8f0ff',
      fontStyle:       'bold',
      stroke:          '#060d1e',
      strokeThickness: 4
    });

    // Make username clickable and add hover tooltip
    this.usernameText.setInteractive({ useHandCursor: true });
    
    const tooltipText = this.add.text(0, 0, 'User profile', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    
    const tooltipBg = this.add.graphics();
    tooltipBg.fillStyle(0x000000, 0.85);
    tooltipBg.fillRoundedRect(-6, -4, tooltipText.width + 12, tooltipText.height + 8, 4);
    
    const tooltipCont = this.add.container(
      this.usernameText.x + 10, 
      this.usernameText.y + 26, 
      [tooltipBg, tooltipText]
    ).setDepth(100).setVisible(false);

    this.usernameText.on('pointerover', () => {
      this.usernameText.setTint(0xf4c048);
      tooltipCont.setVisible(true);
    });
    
    this.usernameText.on('pointerout', () => {
      this.usernameText.clearTint();
      tooltipCont.setVisible(false);
    });

    this.usernameText.on('pointerdown', () => {
      tooltipCont.setVisible(false);
      this.showUserProfile();
    });

    this.levelText = this.add.text(16, 32, `Level: ${learner.level}`, {
      fontSize:        '13px',
      color:           '#4ade80',
      stroke:          '#060d1e',
      strokeThickness: 3
    });
    this.lastKnownLevel = learner.level;

    // ── XP (right of centre) ────────────────────────────────────────────────
    this.xpText = this.add.text(width / 2, 29, `XP: ${learner.total_xp}`, {
      fontSize:        '16px',
      color:           '#f4c048',
      fontStyle:       'bold',
      stroke:          '#060d1e',
      strokeThickness: 4
    }).setOrigin(0.5, 0.5);

    // ── Helper: build a small Graphics HUD button ───────────────────────────
    const makeHudBtn = (cx, cy, btnW, btnH, label, colorNormal, colorHover, onPress) => {
      const container = this.add.container(cx - btnW / 2, cy - btnH / 2);
      const bg = this.add.graphics();

      const draw = (fill, border) => {
        bg.clear();
        bg.fillStyle(fill, 1);
        bg.fillRoundedRect(0, 0, btnW, btnH, 4);
        bg.lineStyle(1, border, 0.85);
        bg.strokeRoundedRect(0, 0, btnW, btnH, 4);
        bg.fillStyle(0xffffff, 0.07);
        bg.fillRoundedRect(1, 1, btnW - 2, btnH * 0.45, { tl: 3, tr: 3, bl: 0, br: 0 });
      };

      draw(colorNormal, 0xc8870a);
      container.add(bg);

      container.add(
        this.add.text(btnW / 2, btnH / 2, label, {
          fontSize:        '13px',
          fontStyle:       'bold',
          color:           '#f0ecff',
          stroke:          '#060814',
          strokeThickness: 4
        }).setOrigin(0.5, 0.5)
      );

      const hit = this.add.rectangle(btnW / 2, btnH / 2, btnW, btnH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      container.add(hit);

      hit.on('pointerover',  () => draw(colorHover,  0xf0c050));
      hit.on('pointerout',   () => draw(colorNormal, 0xc8870a));
      hit.on('pointerdown',  () => draw(0x08031a,    0x604008));
      hit.on('pointerup',    () => { draw(colorHover, 0xf0c050); onPress(); });

      return container;
    };

    // ── Leaderboard button ──────────────────────────────────────────────────
    const lbX = this.usernameText.x + this.usernameText.width + 80;
    makeHudBtn(lbX + 56, 29, 112, 30, 'Leaderboard', 0x1a2a52, 0x2a4278, () => this.showLeaderboard());
    makeHudBtn(lbX + 178, 29, 92, 30, 'Profile', 0x17324f, 0x24507b, () => this.showUserProfile());

    // ── INV button ──────────────────────────────────────────────────────────
    makeHudBtn(width - 52, 29, 56, 30, 'INV', 0x1e1040, 0x2d1860, () => this.showInventory());

    // ── Logout button ───────────────────────────────────────────────────────
    makeHudBtn(width - 122, 29, 60, 30, 'Logout', 0x3a0e0e, 0x601818, () => this.handleLogout());

    // ── State subscription ──────────────────────────────────────────────────
    gameState.subscribe(() => { this.updateUI(); });
  }

  async handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Supabase sign out failed:', err);
    } finally {
      gameState.clearState();

      const activeScenes = this.scene.manager.getScenes(true);
      activeScenes.forEach((activeScene) => {
        const key = activeScene.scene.key;
        if (key !== 'UIScene' && key !== 'LoginScene') {
          this.scene.stop(key);
        }
      });

      this.scene.start('LoginScene');
    }
  }

  updateUI() {
    const learner = gameState.getLearner();
    
    if (learner) {
      this.levelText.setText(`Level: ${learner.level}`);
      this.xpText.setText(`XP: ${learner.total_xp}`);
      
      if (this.lastKnownLevel !== null && learner.level > this.lastKnownLevel) {
        this.showLevelUp(learner.level);
      }

      this.lastKnownLevel = learner.level;
      this.levelText.setData('lastLevel', learner.level);
    }
  }

  showLevelUp(newLevel) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const levelUpText = this.add.text(
      width / 2,
      height / 2,
      `LEVEL UP!\nLevel ${newLevel}`,
      {
        fontSize: '48px',
        color: '#4ade80',
        fontStyle: 'bold',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 4
      }
    ).setOrigin(0.5);

    this.tweens.add({
      targets: levelUpText,
      alpha: 0,
      scale: 1.5,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        levelUpText.destroy();
      }
    });

    const particles = this.add.particles(width / 2, height / 2, 'player', {
      speed: { min: 100, max: 200 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 1000,
      quantity: 50,
      blendMode: 'ADD'
    });

    this.time.delayedCall(1000, () => {
      particles.destroy();
    });
  }

  showInventory() {
    const inventory = gameState.getInventory();
    const width  = this.cameras.main.width;
    const height = this.cameras.main.height;
    const D      = 1000; 

    const P = {
      bgDeep:        0x090f24,
      bgPanel:       0x080e22,
      bgCard:        0x0d1530,
      btnNormal:     0x2a0f42,
      btnHover:      0x3d1860,
      btnPress:      0x100520,
      btnSuccess:    0x0e3020,
      btnSuccessHov: 0x1a5030,
      btnDanger:     0x3a0e0e,
      btnDangerHov:  0x601818,
      borderGold:    0xc8870a,
      borderGlow:    0xf0b030,
      borderDim:     0x604008,
      accentGlow:    0xffdd60,
    };

    const TYPE_COLOR = {
      potion:     0x4193d5,
      weapon:     0xc03030,
      armor:      0x7040b0,
      accessory:  0xc8870a,
      consumable: 0x22a855,
    };

    const panelW  = 780;
    const panelH  = Math.min(640, 140 + Math.max(1, inventory.length) * 96);
    const panelX  = width  / 2 - panelW / 2;
    const panelY  = height / 2 - panelH / 2;

    const nodes = [];
    const cleanup = () => nodes.forEach((n) => n?.destroy());

    const mkBtn = (cx, cy, w, h, label, fillN, fillH, border, onClick) => {
      const c  = this.add.container(cx - w / 2, cy - h / 2).setDepth(D + 4);
      const bg = this.add.graphics();

      const draw = (fill, brd) => {
        bg.clear();
        bg.fillStyle(fill, 1);
        bg.fillRoundedRect(0, 0, w, h, 4);
        bg.lineStyle(2, brd, 1);
        bg.strokeRoundedRect(0, 0, w, h, 4);
        bg.fillStyle(0xffffff, 0.06);
        bg.fillRoundedRect(2, 2, w - 4, h * 0.42, { tl: 3, tr: 3, bl: 0, br: 0 });
      };

      draw(fillN, border);
      c.add(bg);
      c.add(this.add.text(w / 2, h / 2, label, {
        fontSize: '14px', fontStyle: 'bold',
        color: '#f0ecff', stroke: '#060814', strokeThickness: 4
      }).setOrigin(0.5));

      const hit = this.add.rectangle(w / 2, h / 2, w, h, 0, 0)
        .setInteractive({ useHandCursor: true });
      c.add(hit);
      hit.on('pointerover',  () => draw(fillH,       P.borderGlow));
      hit.on('pointerout',   () => draw(fillN,       border));
      hit.on('pointerdown',  (p, x, y, e) => { e.stopPropagation(); draw(P.btnPress,  P.borderDim); });
      hit.on('pointerup',    () => { draw(fillH, P.borderGlow); onClick(); });

      nodes.push(c);
      return c;
    };

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.78)
      .setOrigin(0).setInteractive().setDepth(D);
    
    // Stop overlay clicks from hitting the map
    overlay.on('pointerdown', (p, x, y, e) => e.stopPropagation());
    overlay.on('pointerup', (p, x, y, e) => e.stopPropagation());
    nodes.push(overlay);

    const panelBg = this.add.graphics().setDepth(D + 1);
    panelBg.fillStyle(P.bgPanel, 0.98);
    panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 7);
    panelBg.lineStyle(2, P.borderGold, 0.9);
    panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 7);
    panelBg.lineStyle(1, P.accentGlow, 0.3);
    panelBg.beginPath();
    panelBg.moveTo(panelX + 18, panelY + 2);
    panelBg.lineTo(panelX + panelW - 18, panelY + 2);
    panelBg.strokePath();
    nodes.push(panelBg);

    const headerH  = 52;
    const headerBg = this.add.graphics().setDepth(D + 2);
    headerBg.fillStyle(P.btnNormal, 1);
    headerBg.fillRoundedRect(panelX, panelY, panelW, headerH, { tl: 7, tr: 7, bl: 0, br: 0 });
    headerBg.lineStyle(1, P.borderGold, 0.5);
    headerBg.beginPath();
    headerBg.moveTo(panelX, panelY + headerH);
    headerBg.lineTo(panelX + panelW, panelY + headerH);
    headerBg.strokePath();
    nodes.push(headerBg);

    nodes.push(
      this.add.text(panelX + panelW / 2, panelY + headerH / 2, 'INVENTORY', {
        fontSize: '26px', fontStyle: 'bold',
        color: '#f4f8ff', stroke: '#13233d', strokeThickness: 7
      }).setOrigin(0.5).setDepth(D + 3)
    );

    const closeX = this.add.sprite(panelX + panelW - 28, panelY + 26, 'ui-close-btn', 0)
      .setScale(1.6).setDepth(D + 4).setInteractive({ useHandCursor: true });
    closeX.on('pointerover',  () => closeX.setFrame(1));
    closeX.on('pointerout',   () => closeX.setFrame(0));
    // Fixed: Close on pointerup to prevent map clicks
    closeX.on('pointerdown',  (p, x, y, e) => e.stopPropagation());
    closeX.on('pointerup',    cleanup);
    nodes.push(closeX);

    nodes.push(
      this.add.text(panelX + 24, panelY + headerH + 14, `${inventory.length} item${inventory.length !== 1 ? 's' : ''}`, {
        fontSize: '13px', color: '#c0a8e0', stroke: '#060814', strokeThickness: 3
      }).setDepth(D + 3)
    );

    if (inventory.length === 0) {
      nodes.push(
        this.add.text(panelX + panelW / 2, panelY + panelH / 2 + 10, 'Your inventory is empty', {
          fontSize: '20px', fontStyle: 'bold',
          color: '#5a4a72', stroke: '#060814', strokeThickness: 4
        }).setOrigin(0.5).setDepth(D + 3)
      );
    }

    const cardW  = panelW - 56;
    const cardH  = 78;
    const cardX  = panelX + 28;
    let   cardY  = panelY + headerH + 50;

    inventory.forEach((item) => {
      const qty       = item.quantity ?? 1;
      const typeColor = TYPE_COLOR[item.item_type] ?? 0x4a5568;

      const card = this.add.graphics().setDepth(D + 2);
      card.fillStyle(P.bgCard, 1);
      card.fillRoundedRect(cardX, cardY, cardW, cardH, 5);
      card.lineStyle(2, typeColor, 0.55);
      card.strokeRoundedRect(cardX, cardY, cardW, cardH, 5);
      card.fillStyle(0xffffff, 0.025);
      card.fillRoundedRect(cardX + 2, cardY + 2, cardW - 4, cardH * 0.38, { tl: 4, tr: 4, bl: 0, br: 0 });
      nodes.push(card);

      const strip = this.add.graphics().setDepth(D + 3);
      strip.fillStyle(typeColor, 0.7);
      strip.fillRoundedRect(cardX, cardY + 4, 4, cardH - 8, 2);
      nodes.push(strip);

      nodes.push(
        this.add.text(cardX + 20, cardY + 13, item.name ?? 'Unknown Item', {
          fontSize: '18px', fontStyle: 'bold',
          color: '#f0ecff', stroke: '#060814', strokeThickness: 4
        }).setDepth(D + 3)
      );

      const desc = item.description
        ? (item.description.length > 60 ? item.description.slice(0, 59) + '…' : item.description)
        : '';
      nodes.push(
        this.add.text(cardX + 20, cardY + 42, `x${qty}  ${desc}`, {
          fontSize: '14px', color: '#9e88c0', stroke: '#060814', strokeThickness: 3
        }).setDepth(D + 3)
      );

      mkBtn(
        cardX + cardW - 50, cardY + cardH / 2,
        80, 40,
        'USE',
        P.btnSuccess, P.btnSuccessHov, 0x22a855,
        async () => {
          try {
            const result = await this.consumeInventoryItem(item);
            if (!result) return;
            cleanup();
            this.showInventory();
          } catch (e) {
            console.error('Failed to use item:', e);
          }
        }
      );

      cardY += cardH + 12;
    });

    mkBtn(
      panelX + panelW / 2, panelY + panelH - 28,
      120, 34,
      'CLOSE',
      P.btnDanger, P.btnDangerHov, 0x8b2020,
      cleanup
    );
  }

  async showLeaderboard() {
    const width  = this.cameras.main.width;
    const height = this.cameras.main.height;
    const D      = 1100;

    const P = {
      bgPanel:    0x080e22,
      bgCard:     0x0d1530,
      bgCardMe:   0x1a1040,
      btnNormal:  0x2a0f42,
      btnHover:   0x3d1860,
      btnPress:   0x100520,
      btnDanger:  0x3a0e0e,
      btnDangHov: 0x601818,
      borderGold: 0xc8870a,
      borderGlow: 0xf0b030,
      borderDim:  0x604008,
      borderMe:   0xf4c048,
      accentGlow: 0xffdd60,
    };

    const panelW = 680;
    const panelH = 580;
    const panelX = width  / 2 - panelW / 2;
    const panelY = height / 2 - panelH / 2;

    const nodes   = [];
    const cleanup = () => nodes.forEach((n) => n?.destroy());

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.78)
      .setOrigin(0).setInteractive().setDepth(D);
    
    // Stop overlay clicks from hitting the map
    overlay.on('pointerdown', (p, x, y, e) => e.stopPropagation());
    overlay.on('pointerup', (p, x, y, e) => e.stopPropagation());
    nodes.push(overlay);

    const panelBg = this.add.graphics().setDepth(D + 1);
    panelBg.fillStyle(P.bgPanel, 0.98);
    panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 7);
    panelBg.lineStyle(2, P.borderGold, 0.9);
    panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 7);
    panelBg.lineStyle(1, P.accentGlow, 0.3);
    panelBg.beginPath();
    panelBg.moveTo(panelX + 18, panelY + 2);
    panelBg.lineTo(panelX + panelW - 18, panelY + 2);
    panelBg.strokePath();
    nodes.push(panelBg);

    const headerH  = 58;
    const headerBg = this.add.graphics().setDepth(D + 2);
    headerBg.fillStyle(P.btnNormal, 1);
    headerBg.fillRoundedRect(panelX, panelY, panelW, headerH, { tl: 7, tr: 7, bl: 0, br: 0 });
    headerBg.lineStyle(1, P.borderGold, 0.5);
    headerBg.beginPath();
    headerBg.moveTo(panelX, panelY + headerH);
    headerBg.lineTo(panelX + panelW, panelY + headerH);
    headerBg.strokePath();
    nodes.push(headerBg);

    nodes.push(
      this.add.text(panelX + panelW / 2, panelY + headerH / 2, '✦  LEADERBOARD  ✦', {
        fontSize: '26px', fontStyle: 'bold',
        color: '#f4f8ff', stroke: '#13233d', strokeThickness: 7
      }).setOrigin(0.5).setDepth(D + 3)
    );

    const closeX = this.add.sprite(panelX + panelW - 30, panelY + 29, 'ui-close-btn', 0)
      .setScale(1.6).setDepth(D + 4).setInteractive({ useHandCursor: true });
    closeX.on('pointerover',  () => closeX.setFrame(1));
    closeX.on('pointerout',   () => closeX.setFrame(0));
    // Fixed: Close on pointerup to prevent map clicks
    closeX.on('pointerdown',  (p, x, y, e) => e.stopPropagation());
    closeX.on('pointerup',    cleanup);
    nodes.push(closeX);

    const colY = panelY + headerH + 16;
    const col = {
      rank:     panelX + 32,
      username: panelX + 90,
      xp:       panelX + panelW - 36,
    };

    ['RANK', 'USERNAME', 'XP'].forEach((label, i) => {
      const x = [col.rank, col.username, col.xp][i];
      const origin = i === 2 ? 1 : 0;
      nodes.push(
        this.add.text(x, colY, label, {
          fontSize: '12px', fontStyle: 'bold',
          color: '#c0a8e0', stroke: '#060814', strokeThickness: 3,
          letterSpacing: 2
        }).setOrigin(origin, 0).setDepth(D + 3)
      );
    });

    const divider = this.add.graphics().setDepth(D + 2);
    divider.lineStyle(1, P.borderGold, 0.3);
    divider.beginPath();
    divider.moveTo(panelX + 20, colY + 20);
    divider.lineTo(panelX + panelW - 20, colY + 20);
    divider.strokePath();
    nodes.push(divider);

    const loading = this.add.text(panelX + panelW / 2, panelY + panelH / 2, 'Loading...', {
      fontSize: '18px', fontStyle: 'bold',
      color: '#5a4a72', stroke: '#060814', strokeThickness: 3
    }).setOrigin(0.5).setDepth(D + 3);
    nodes.push(loading);

    const footerY  = panelY + panelH - 52;
    const footerBg = this.add.graphics().setDepth(D + 2);
    footerBg.fillStyle(0x100820, 1);
    footerBg.fillRoundedRect(panelX, footerY, panelW, 52, { tl: 0, tr: 0, bl: 7, br: 7 });
    footerBg.lineStyle(1, P.borderGold, 0.35);
    footerBg.beginPath();
    footerBg.moveTo(panelX, footerY);
    footerBg.lineTo(panelX + panelW, footerY);
    footerBg.strokePath();
    nodes.push(footerBg);

    const myRankText = this.add.text(panelX + 24, footerY + 26, '— your rank —', {
      fontSize: '15px', color: '#5a4a72', stroke: '#060814', strokeThickness: 3
    }).setOrigin(0, 0.5).setDepth(D + 3);
    nodes.push(myRankText);

    const mkBtn = (cx, cy, w, h, label, fillN, fillH, border, onClick) => {
      const c  = this.add.container(cx - w / 2, cy - h / 2).setDepth(D + 4);
      const bg = this.add.graphics();
      const draw = (fill, brd) => {
        bg.clear();
        bg.fillStyle(fill, 1);
        bg.fillRoundedRect(0, 0, w, h, 4);
        bg.lineStyle(2, brd, 1);
        bg.strokeRoundedRect(0, 0, w, h, 4);
        bg.fillStyle(0xffffff, 0.06);
        bg.fillRoundedRect(2, 2, w - 4, h * 0.42, { tl: 3, tr: 3, bl: 0, br: 0 });
      };
      draw(fillN, border);
      c.add(bg);
      c.add(this.add.text(w / 2, h / 2, label, {
        fontSize: '14px', fontStyle: 'bold',
        color: '#f0ecff', stroke: '#060814', strokeThickness: 4
      }).setOrigin(0.5));
      const hit = this.add.rectangle(w / 2, h / 2, w, h, 0, 0).setInteractive({ useHandCursor: true });
      c.add(hit);
      hit.on('pointerover',  () => draw(fillH,       P.borderGlow));
      hit.on('pointerout',   () => draw(fillN,       border));
      hit.on('pointerdown',  (p, x, y, e) => { e.stopPropagation(); draw(P.btnPress,  P.borderDim); });
      hit.on('pointerup',    () => { draw(fillH, P.borderGlow); onClick(); });
      nodes.push(c);
    };

    try {
      const [rows, me] = await Promise.all([
        apiService.getLeaderboard(20),
        apiService.getMyLeaderboardRank()
      ]);

      loading.destroy();

      const rowH      = 34;
      const rowsAreaH = panelH - headerH - 40 - 52;
      const maxRows   = Math.floor(rowsAreaH / rowH);
      const visRows   = rows.slice(0, maxRows);

      let rowY = panelY + headerH + 38;

      visRows.forEach((entry) => {
        const isMe     = me?.learnerId === entry.learnerId;
        const cardFill = isMe ? P.bgCardMe : P.bgCard;
        const border   = isMe ? P.borderMe : P.borderGold;
        const opacity  = isMe ? 0.9 : 0.55;

        const rowBg = this.add.graphics().setDepth(D + 2);
        rowBg.fillStyle(cardFill, 1);
        rowBg.fillRoundedRect(panelX + 16, rowY, panelW - 32, rowH - 4, 4);
        rowBg.lineStyle(1, border, opacity);
        rowBg.strokeRoundedRect(panelX + 16, rowY, panelW - 32, rowH - 4, 4);
        if (isMe) {
          rowBg.fillStyle(P.borderMe, 1);
          rowBg.fillRoundedRect(panelX + 16, rowY + 4, 4, rowH - 12, 2);
        }
        nodes.push(rowBg);

        const textY  = rowY + (rowH - 4) / 2;
        const color  = isMe ? '#f4c048' : '#f0ecff';
        const stroke = '#060814';
        const thick  = 3;

        nodes.push(
          this.add.text(col.rank, textY, `#${entry.rank}`, {
            fontSize: '14px', fontStyle: isMe ? 'bold' : 'normal',
            color, stroke, strokeThickness: thick
          }).setOrigin(0, 0.5).setDepth(D + 3)
        );

        const uname = (entry.username ?? '').length > 20
          ? entry.username.slice(0, 19) + '…'
          : (entry.username ?? '—');
        nodes.push(
          this.add.text(col.username, textY, uname, {
            fontSize: '15px', fontStyle: isMe ? 'bold' : 'normal',
            color, stroke, strokeThickness: thick
          }).setOrigin(0, 0.5).setDepth(D + 3)
        );

        nodes.push(
          this.add.text(col.xp, textY, `${entry.totalXp} XP`, {
            fontSize: '14px', fontStyle: isMe ? 'bold' : 'normal',
            color, stroke, strokeThickness: thick
          }).setOrigin(1, 0.5).setDepth(D + 3)
        );

        rowY += rowH;
      });

      myRankText.setText(`Your Rank:  #${me?.rank ?? '?'}   ·   ${me?.totalXp ?? 0} XP`);
      myRankText.setColor('#f4c048');
      myRankText.setOrigin(0, 0.5);

    } catch (err) {
      loading.setText('Failed to load leaderboard');
      console.error('Leaderboard load failed:', err);
    }

    mkBtn(
      panelX + panelW - 72, footerY + 26,
      120, 34,
      'CLOSE',
      P.btnDanger, P.btnDangHov, 0x8b2020,
      cleanup
    );
  }

  async showUserProfile() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const overlay = this.add.rectangle(0, 0, width, height, 0x060a14, 0.86)
      .setOrigin(0)
      .setDepth(1200)
      .setInteractive();
    
    // Stop overlay clicks from hitting the map
    overlay.on('pointerdown', (p, x, y, e) => e.stopPropagation());
    overlay.on('pointerup', (p, x, y, e) => e.stopPropagation());
    
    const nodes = [overlay];
    const depth = 1201;
    const tileSize = 56;
    const cols = 12;
    const rows = 9; 
    const panelLeft = Math.floor(width / 2 - (cols * tileSize) / 2);
    const panelTop = Math.floor(height / 2 - (rows * tileSize) / 2);
    const panelWidth = cols * tileSize;

    this.buildProfilePanel(panelLeft, panelTop, cols, rows, tileSize, depth, nodes);

    const headerY = panelTop + 32;
    const title = this.add.text(width / 2, headerY, 'PLAYER PROFILE', {
      fontSize: '34px',
      color: '#f8fbff',
      fontStyle: 'bold',
      stroke: '#13233d',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(depth + 3);
    nodes.push(title);

    const cleanup = (pointer, localX, localY, event) => {
      if (event && event.stopPropagation) event.stopPropagation();
      nodes.forEach((node) => node?.destroy());
      if (this.profileTween) this.profileTween.stop();
    };

    const closeBtn = this.add.sprite(panelLeft + panelWidth - 40, panelTop + 32, 'ui-close-btn', 0)
      .setScale(1.8)
      .setDepth(depth + 4)
      .setInteractive({ useHandCursor: true });
    nodes.push(closeBtn);

    closeBtn.on('pointerover', () => closeBtn.setFrame(1));
    closeBtn.on('pointerout', () => closeBtn.setFrame(0));
    
    // Fixed: Close on pointerup to prevent map clicks
    closeBtn.on('pointerdown', (p, x, y, e) => e.stopPropagation());
    closeBtn.on('pointerup', cleanup);

    const loadingText = this.add.text(width / 2, height / 2, 'Loading Profile...', {
      fontSize: '20px', color: '#c4def8', stroke: '#060814', strokeThickness: 3
    }).setOrigin(0.5).setDepth(depth + 3);
    nodes.push(loadingText);

    try {
      const [learnerData, roleData] = await Promise.all([
        apiService.getCurrentLearner(),
        apiService.getMyRole()
      ]);

      loadingText.destroy();

      this.ensureProfileIdleAnimation();

      const portraitFrame = this.add.image(width / 2, height / 2 + 16, 'ui-portrait-frame')
        .setScale(4.2)
        .setDepth(depth + 2);
      nodes.push(portraitFrame);

      const character = this.add.sprite(width / 2, height / 2 + 26, soldier.sheetKey, 0)
        .setScale(2.85)
        .setDepth(depth + 3);
      character.play('idle');
      applyPlayerProfileToSprite(character, gameState.getPlayerProfile() || getDefaultPlayerProfile());
      nodes.push(character);

      const glow = this.add.circle(width / 2, height / 2 + 96, 58, 0x6cc0ff, 0.24)
        .setDepth(depth + 1);
      nodes.push(glow);

      const leftStats = this.getPrimaryLeftStats(learnerData, roleData);
      const rightStats = this.getPrimaryRightStats(learnerData);
      const extras = this.getExtraProfileStats(learnerData);

      const renderStatRows = (startX, startY, rowsToDraw, align = 'left') => {
        let y = startY;
        rowsToDraw.forEach(([label, value]) => {
          const labelText = this.add.text(startX, y, `${label}:`, {
            fontSize: '17px',
            color: '#a5c8ea',
            fontStyle: 'bold'
          }).setDepth(depth + 3);
          nodes.push(labelText);

          const valueText = this.add.text(startX, y + 19, this.truncateProfileValue(value, 34), {
            fontSize: '18px',
            color: '#f1f7ff',
            fontStyle: 'bold'
          }).setDepth(depth + 3);

          if (align === 'right') {
            labelText.setOrigin(1, 0);
            valueText.setOrigin(1, 0);
          }
          nodes.push(valueText);
          y += 58;
        });
      };

      renderStatRows(panelLeft + 36, panelTop + 102, leftStats);
      renderStatRows(panelLeft + panelWidth - 36, panelTop + 102, rightStats, 'right');

      let extraY = panelTop + rows * tileSize - 150;
      extras.slice(0, 2).forEach(([label, value]) => {
        const extraLine = this.add.text(
          width / 2,
          extraY,
          `${label}: ${this.truncateProfileValue(value, 52)}`,
          {
            fontSize: '15px',
            color: '#c4def8'
          }
        ).setOrigin(0.5).setDepth(depth + 3);
        nodes.push(extraLine);
        extraY += 24;
      });

      this.profileTween = this.tweens.add({
        targets: character,
        y: character.y - 6,
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      const mkBtn = (cx, cy, w, h, label, fillN, fillH, border, onClick) => {
        const c  = this.add.container(cx - w / 2, cy - h / 2).setDepth(depth + 4);
        const bg = this.add.graphics();
        const draw = (fill, brd) => {
          bg.clear();
          bg.fillStyle(fill, 1);
          bg.fillRoundedRect(0, 0, w, h, 4);
          bg.lineStyle(2, brd, 1);
          bg.strokeRoundedRect(0, 0, w, h, 4);
          bg.fillStyle(0xffffff, 0.06);
          bg.fillRoundedRect(2, 2, w - 4, h * 0.42, { tl: 3, tr: 3, bl: 0, br: 0 });
        };
        draw(fillN, border);
        c.add(bg);
        c.add(this.add.text(w / 2, h / 2, label, {
          fontSize: '14px', fontStyle: 'bold',
          color: '#f0ecff', stroke: '#060814', strokeThickness: 4
        }).setOrigin(0.5));
        const hit = this.add.rectangle(w / 2, h / 2, w, h, 0, 0).setInteractive({ useHandCursor: true });
        c.add(hit);
        hit.on('pointerover',  () => draw(fillH,       0xf0b030));
        hit.on('pointerout',   () => draw(fillN,       border));
        hit.on('pointerdown',  (p, x, y, e) => { e.stopPropagation(); draw(0x100520, 0x604008); });
        hit.on('pointerup',    () => { draw(fillH, 0xf0b030); onClick(); });
        nodes.push(c);
      };

      mkBtn(
        width / 2, panelTop + rows * tileSize - 70, 
        140, 36,
        'LOGOUT',
        0x3a0e0e, 0x601818, 0x8b2020,
        () => { 
          cleanup(); 
          this.handleLogout(); 
        }
      );

      const footer = this.add.text(width / 2, panelTop + rows * tileSize - 28, 'Tap X to close', {
        fontSize: '13px',
        color: '#7a96b4'
      }).setOrigin(0.5).setDepth(depth + 3);
      nodes.push(footer);

    } catch (error) {
      console.error('Error fetching profile:', error);
      loadingText.setText('Failed to load profile data.\nPlease ensure you are logged in.');
      loadingText.setColor('#ff6b6b');
    }
  }

  buildProfilePanel(left, top, cols, rows, tileSize, depth, nodes) {
    const cornerFrames = { tl: 0, tr: 2, bl: 6, br: 8 };

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const isTop = row === 0;
        const isBottom = row === rows - 1;
        const isLeft = col === 0;
        const isRight = col === cols - 1;
        let frame = 4;

        if (isTop && isLeft) frame = cornerFrames.tl;
        else if (isTop && isRight) frame = cornerFrames.tr;
        else if (isBottom && isLeft) frame = cornerFrames.bl;
        else if (isBottom && isRight) frame = cornerFrames.br;
        else if (isTop) frame = 1;
        else if (isBottom) frame = 7;
        else if (isLeft) frame = 3;
        else if (isRight) frame = 5;

        const tile = this.add.sprite(
          left + col * tileSize + tileSize / 2,
          top + row * tileSize + tileSize / 2,
          'ui-panel-a',
          frame
        ).setScale(tileSize / 32).setDepth(depth);
        nodes.push(tile);
      }
    }

    for (let col = 1; col < cols - 1; col += 1) {
      const x = left + col * tileSize + tileSize / 2;
      const topHeader = this.add.sprite(x, top + tileSize / 2, 'ui-header-a', 1)
        .setScale(tileSize / 32)
        .setDepth(depth + 1);
      nodes.push(topHeader);
    }

    const headerLeft = this.add.sprite(left + tileSize / 2, top + tileSize / 2, 'ui-header-a', 0)
      .setScale(tileSize / 32)
      .setDepth(depth + 1);
    const headerRight = this.add.sprite(left + (cols - 0.5) * tileSize, top + tileSize / 2, 'ui-header-a', 2)
      .setScale(tileSize / 32)
      .setDepth(depth + 1);
    nodes.push(headerLeft, headerRight);
  }

  async consumeInventoryItem(item) {
    const itemId = item?.itemId || item?.item_id;
    if (!itemId) return false;

    const effect = this.resolveItemEffect(item);
    if (!effect.usable) {
      this.showQuickToast(effect.message || 'This item activates automatically during encounters.');
      return false;
    }

    const updated = await apiService.removeInventoryItem(itemId, 1);
    gameState.setInventory(updated);

    if (effect.xpGain > 0) {
      gameState.updateXP(effect.xpGain);
    }

    if (effect.nextCombatHpBonus > 0) {
      const current = gameState.getActiveEffects();
      const existing = Number(current.nextCombatHpBonus || 0);
      gameState.setActiveEffects({
        ...current,
        nextCombatHpBonus: existing + effect.nextCombatHpBonus
      });
    }

    if (effect.assistCharges > 0) {
      const currentMap = gameState.getCurrentMap();
      if (currentMap) {
        const playerState = {
          ...(currentMap.playerState || {}),
          assistCharges: Math.max(0, Number(currentMap.playerState?.assistCharges || 0) + effect.assistCharges)
        };
        gameState.setCurrentMap({
          ...currentMap,
          playerState
        });
      }
    }

    this.showQuickToast(effect.message);
    return true;
  }

  resolveItemEffect(item) {
    return resolveItemEffect(item);
  }

  showQuickToast(message) {
    const toast = this.add.text(this.cameras.main.width / 2, 84, message, {
      fontSize: '14px',
      color: '#fff3ed',
      backgroundColor: '#2b1835',
      padding: { x: 12, y: 8 }
    }).setOrigin(0.5).setDepth(1400);

    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: toast.y - 10,
      duration: 1600,
      onComplete: () => toast.destroy()
    });
  }

  ensureProfileIdleAnimation() {
    if (this.anims.exists('idle')) return;

    const idle = soldier.anims.idle;
    const frames = Array.from({ length: idle.count }, (_, i) => idle.row * soldier.maxCols + i);
    this.anims.create({
      key: 'idle',
      frames: this.anims.generateFrameNumbers(soldier.sheetKey, { frames }),
      frameRate: idle.frameRate,
      repeat: idle.repeat
    });
  }

  getPrimaryLeftStats(learner, roleInfo) {
    const roleString = (typeof roleInfo === 'object' && roleInfo !== null) 
      ? (roleInfo.role || roleInfo.roleName || 'User') 
      : (roleInfo || gameState.getRole() || 'User');
    const profile = gameState.getPlayerProfile() || getDefaultPlayerProfile();
    return [
      ['Full Name', learner.full_name ?? learner.fullName ?? 'Unknown'],
      ['Style', profile.label],
      ['Email', learner.email ?? 'Unknown'],
      ['Role', roleString]
    ];
  }

  getPrimaryRightStats(learner) {
    const joined = learner.created_at || learner.createdAt || learner.joined_at || learner.joinedAt;
    return [
      ['Level', String(learner.level ?? 1)],
      ['XP Points', String(learner.total_xp ?? learner.totalXp ?? 0)],
      ['Created', joined ? this.formatJoinDate(joined) : 'Unknown']
    ];
  }

  getExtraProfileStats(learner) {
    const tracked = new Set([
      'username', 'full_name', 'fullName', 'email', 'level', 'total_xp', 'totalXp',
      'learnerId', 'id', 'is_active', 'created_at', 'createdAt', 'joined_at', 'joinedAt',
      'supabase_user_id', 'supabaseUserId', 'updated_at', 'updatedAt' 
    ]);

    return Object.entries(learner)
      .filter(([key, value]) => !tracked.has(key) && ['string', 'number', 'boolean'].includes(typeof value))
      .slice(0, 2)
      .map(([key, value]) => [this.toTitleCase(key), String(value)]);
  }

  truncateProfileValue(value, maxLen = 34) {
    const text = String(value ?? 'Unknown');
    return text.length > maxLen ? `${text.slice(0, maxLen - 1)}...` : text;
  }

  formatJoinDate(value) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  toTitleCase(text) {
    return text
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
  }
}
