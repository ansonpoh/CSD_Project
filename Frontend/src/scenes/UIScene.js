import Phaser from 'phaser';
import { gameState } from '../services/gameState.js';
import { apiService } from '../services/api.js';
import { supabase } from '../config/supabaseClient.js';
import { soldier } from '../characters/soldier/Soldier.js';

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
    if (!this.textures.exists('ui-panel-a')) {
      this.load.spritesheet('ui-panel-a', 'assets/ui_set/20250420manaSoul9SlicesA-Sheet.png', {
        frameWidth: 32,
        frameHeight: 32
      });
    }

    if (!this.textures.exists('ui-header-a')) {
      this.load.spritesheet('ui-header-a', 'assets/ui_set/20250420manaSoulHeaderA-Sheet.png', {
        frameWidth: 32,
        frameHeight: 32
      });
    }

    if (!this.textures.exists('ui-close-btn')) {
      this.load.spritesheet('ui-close-btn', 'assets/ui_set/20250425closeButton-Sheet.png', {
        frameWidth: 32,
        frameHeight: 32
      });
    }

    if (!this.textures.exists('ui-portrait-frame')) {
      this.load.image('ui-portrait-frame', 'assets/ui_set/20250425portraitFrame-Sheet.png');
    }

  }

  create() {
    const width = this.cameras.main.width;

    //  HUD bar background
    // Solid dark bar with a thin gold bottom border
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

    //  Username + level (left side)
    this.usernameText = this.add.text(16, 10, `@ ${learner.username}`, {
      fontSize:        '18px',
      color:           '#e8f0ff',
      fontStyle:       'bold',
      stroke:          '#060d1e',
      strokeThickness: 4
    });

    this.levelText = this.add.text(16, 32, `Level: ${learner.level}`, {
      fontSize:        '13px',
      color:           '#4ade80',
      stroke:          '#060d1e',
      strokeThickness: 3
    });
    this.lastKnownLevel = learner.level;

    //  XP (right of centre)
    this.xpText = this.add.text(width / 2, 29, `XP: ${learner.total_xp}`, {
      fontSize:        '16px',
      color:           '#f4c048',
      fontStyle:       'bold',
      stroke:          '#060d1e',
      strokeThickness: 4
    }).setOrigin(0.5, 0.5);

    //  Helper: build a small Graphics HUD button 
    //   Returns { container } — text label floats inside.
    const makeHudBtn = (cx, cy, btnW, btnH, label, colorNormal, colorHover, onPress) => {
      const container = this.add.container(cx - btnW / 2, cy - btnH / 2);
      const bg = this.add.graphics();

      const draw = (fill, border) => {
        bg.clear();
        bg.fillStyle(fill, 1);
        bg.fillRoundedRect(0, 0, btnW, btnH, 4);
        bg.lineStyle(1, border, 0.85);
        bg.strokeRoundedRect(0, 0, btnW, btnH, 4);
        // inner highlight
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

    //  Leaderboard button
    const lbX = this.usernameText.x + this.usernameText.width + 80;
    makeHudBtn(lbX + 56, 29, 112, 30, 'Leaderboard', 0x1a2a52, 0x2a4278, () => this.showLeaderboard());

    //  INV button
    makeHudBtn(width - 52, 29, 56, 30, 'INV', 0x1e1040, 0x2d1860, () => this.showInventory());

    //  Logout button 
    makeHudBtn(width - 122, 29, 60, 30, 'Logout', 0x3a0e0e, 0x601818, () => this.handleLogout());

    //  State subscription
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
      
      // Show level up animation if needed
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

    // Level up notification
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

    // Fade out animation
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

    // Particle effect
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
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Create inventory overlay
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0);
    overlay.setInteractive();
    overlay.setDepth(1000);

    // Inventory panel
    const panel = this.add.rectangle(width / 2, height / 2, 600, 500, 0x16213e, 1);
    panel.setStrokeStyle(3, 0x4a90e2);
    panel.setDepth(1001);

    // Title
    const title = this.add.text(width / 2, height / 2 - 220, 'INVENTORY', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    title.setDepth(1002);

    // Display items
    const itemTexts = [];
    const useButtons = [];
    const useTexts = [];

    const cleanupInventoryUI = () => {
      overlay.destroy();
      panel.destroy();
      title.destroy();
      closeBtn.destroy();
      closeBtnText.destroy();
      itemTexts.forEach(t => t.destroy());
      useButtons.forEach(b => b.destroy());
      useTexts.forEach(t => t.destroy());
    };

    if (inventory.length === 0) {
      const emptyText = this.add.text(width / 2, height / 2, 'Your inventory is empty', {
        fontSize: '20px',
        color: '#aaaaaa'
      }).setOrigin(0.5);
      emptyText.setDepth(1002);
      itemTexts.push(emptyText);
    } else {
      inventory.forEach((item, index) => {
        const y = height / 2 - 150 + (index * 60);
        const qty = item.quantity ?? 1;
        
        const itemText = this.add.text(width / 2 - 250, y, `${item.name} x${qty} - ${item.description}`, {
          fontSize: '18px',
          color: '#ffffff'
        });
        itemText.setDepth(1002);
        itemTexts.push(itemText);

        const useBtn = this.add.rectangle(width / 2 + 220, y + 10, 70, 30, 0x22c55e)
        .setInteractive({ useHandCursor: true })
        .setDepth(1002);
        useButtons.push(useBtn);

        const useText = this.add.text(width / 2 + 220, y + 10, 'USE', {
          fontSize: '14px',
          color: '#ffffff',
          fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(1003);
        useTexts.push(useText);

        useBtn.on('pointerdown', async () => {
          try {
            const itemId = item.itemId || item.item_id;
            if (!itemId) return;

            const updatedInventory = await apiService.removeInventoryItem(itemId, 1);
            gameState.setInventory(updatedInventory);

            cleanupInventoryUI();
            this.showInventory(); // reopen refreshed list
          } catch (e) {
            console.error('Failed to use item:', e);
          }
        });
      });
    }

    // Close button
    const closeBtn = this.add.rectangle(width / 2, height / 2 + 200, 120, 40, 0x666666);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.setDepth(1002);

    const closeBtnText = this.add.text(width / 2, height / 2 + 200, 'CLOSE', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    closeBtnText.setDepth(1003);

    closeBtn.on('pointerdown', () => {
      cleanupInventoryUI();
    });
  }

  async showLeaderboard() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.75)
      .setOrigin(0)
      .setInteractive()
      .setDepth(1100);

    const panel = this.add.rectangle(width / 2, height / 2, 620, 520, 0x0f172a, 1)
      .setStrokeStyle(3, 0x3b82f6)
      .setDepth(1101);

    const title = this.add.text(width / 2, height / 2 - 220, 'LEADERBOARD', {
      fontSize: '30px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1102);

    const loading = this.add.text(width / 2, height / 2 - 170, 'Loading...', {
      fontSize: '18px',
      color: '#cbd5e1'
    }).setOrigin(0.5).setDepth(1102);

    const nodes = [overlay, panel, title, loading];
    const cleanup = () => nodes.forEach(n => n?.destroy());

    const closeBtn = this.add.rectangle(width / 2, height / 2 + 220, 120, 40, 0x475569)
      .setInteractive({ useHandCursor: true })
      .setDepth(1102);

    const closeText = this.add.text(width / 2, height / 2 + 220, 'CLOSE', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1103);

    nodes.push(closeBtn, closeText);
    closeBtn.on('pointerdown', cleanup);

    try {
      const [rows, me] = await Promise.all([
        apiService.getLeaderboard(20),
        apiService.getMyLeaderboardRank()
      ]);

      loading.destroy();

      const header = this.add.text(width / 2, height / 2 - 180, '#   USERNAME                  XP', {
        fontSize: '16px',
        color: '#93c5fd',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(1102);
      nodes.push(header);

      let y = height / 2 - 145;
      rows.forEach((entry) => {
        const isMe = me?.learnerId === entry.learnerId;
        const color = isMe ? '#fde68a' : '#e2e8f0';
        const text = `#${entry.rank.toString().padEnd(3)} ${entry.username.padEnd(22)} ${entry.totalXp}`;
        const rowText = this.add.text(width / 2, y, text, {
          fontSize: '15px',
          color
        }).setOrigin(0.5).setDepth(1102);
        nodes.push(rowText);
        y += 26;
      });

      const myRankText = this.add.text(
        width / 2,
        height / 2 + 175,
        `Your Rank: #${me.rank} (${me.totalXp} XP)`,
        {
          fontSize: '18px',
          color: '#facc15',
          fontStyle: 'bold'
        }
      ).setOrigin(0.5).setDepth(1102);
      nodes.push(myRankText);

    } catch (err) {
      loading.setText('Failed to load leaderboard');
      console.error('Leaderboard load failed:', err);
    }
  }

  showUserProfile() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const learner = gameState.getLearner();
    if (!learner) return;

    const overlay = this.add.rectangle(0, 0, width, height, 0x060a14, 0.86)
      .setOrigin(0)
      .setDepth(1200)
      .setInteractive();
    const nodes = [overlay];
    const depth = 1201;
    const tileSize = 56;
    const cols = 12;
    const rows = 8;
    const panelLeft = Math.floor(width / 2 - (cols * tileSize) / 2);
    const panelTop = Math.floor(height / 2 - (rows * tileSize) / 2);
    const panelWidth = cols * tileSize;

    this.buildProfilePanel(panelLeft, panelTop, cols, rows, tileSize, depth, nodes);

    const headerY = panelTop + 42;
    const title = this.add.text(width / 2, headerY, 'PLAYER PROFILE', {
      fontSize: '34px',
      color: '#f8fbff',
      fontStyle: 'bold',
      stroke: '#13233d',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(depth + 3);
    nodes.push(title);

    const closeBtn = this.add.sprite(panelLeft + panelWidth - 40, panelTop + 36, 'ui-close-btn', 0)
      .setScale(1.8)
      .setDepth(depth + 4)
      .setInteractive({ useHandCursor: true });
    nodes.push(closeBtn);

    closeBtn.on('pointerover', () => closeBtn.setFrame(1));
    closeBtn.on('pointerout', () => closeBtn.setFrame(0));

    this.ensureProfileIdleAnimation();

    const portraitFrame = this.add.image(width / 2, height / 2 + 16, 'ui-portrait-frame')
      .setScale(4.2)
      .setDepth(depth + 2);
    nodes.push(portraitFrame);

    const character = this.add.sprite(width / 2, height / 2 + 26, soldier.sheetKey, 0)
      .setScale(2.85)
      .setDepth(depth + 3);
    character.play('idle');
    nodes.push(character);

    const glow = this.add.circle(width / 2, height / 2 + 96, 58, 0x6cc0ff, 0.24)
      .setDepth(depth + 1);
    nodes.push(glow);

    const leftStats = this.getPrimaryLeftStats(learner);
    const rightStats = this.getPrimaryRightStats(learner);
    const extras = this.getExtraProfileStats(learner);

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

    let extraY = panelTop + rows * tileSize - 124;
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

    this.tweens.add({
      targets: character,
      y: character.y - 6,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const footer = this.add.text(width / 2, panelTop + rows * tileSize - 24, 'Tap outside or X to close', {
      fontSize: '14px',
      color: '#9ec6ea'
    }).setOrigin(0.5).setDepth(depth + 3);
    nodes.push(footer);

    const cleanup = () => nodes.forEach((node) => node?.destroy());
    closeBtn.on('pointerdown', cleanup);
    overlay.on('pointerdown', cleanup);
  }

  buildProfilePanel(left, top, cols, rows, tileSize, depth, nodes) {
    const cornerFrames = {
      tl: 0,
      tr: 2,
      bl: 6,
      br: 8
    };

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

  getPrimaryLeftStats(learner) {
    return [
      ['Username', learner.username ?? 'Unknown'],
      ['Full Name', learner.full_name ?? learner.fullName ?? 'Unknown'],
      ['Email', learner.email ?? 'Unknown'],
      ['User ID', learner.learnerId ?? learner.id ?? 'N/A']
    ];
  }

  getPrimaryRightStats(learner) {
    const joined = learner.created_at || learner.createdAt || learner.joined_at || learner.joinedAt;
    return [
      ['Level', String(learner.level ?? 1)],
      ['Total XP', String(learner.total_xp ?? learner.totalXp ?? 0)],
      ['Status', learner.is_active === false ? 'Inactive' : 'Active'],
      ['Joined', joined ? this.formatJoinDate(joined) : 'Unknown']
    ];
  }

  getExtraProfileStats(learner) {
    const tracked = new Set([
      'username', 'full_name', 'fullName', 'email', 'level', 'total_xp', 'totalXp',
      'learnerId', 'id', 'is_active', 'created_at', 'createdAt', 'joined_at', 'joinedAt'
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