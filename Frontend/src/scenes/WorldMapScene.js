import Phaser from 'phaser';
import { gameState } from '../services/gameState.js';
import { apiService } from '../services/api.js';
import { soldier } from '../characters/soldier/Soldier.js';

const P = {
  // button fill states
  btnNormal:    0x2a0f42,
  btnHover:     0x3d1860,
  btnPress:     0x100520,
  btnDisabled:  0x130b20,

  // border gold
  borderGold:   0xc8870a,
  borderGlow:   0xf0b030,
  borderDim:    0x604008,

  // top accent line inside button
  accentGlow:   0xffdd60,

  // text
  textMain:     '#f0ecff',
  textSub:      '#c0a8e0',
  textDisabled: '#5a4a72',
  textDesc:     '#9e88c0',

  // XP bar
  xpFill:       0x4193d5,   // sampled from ButtonA blue body
  xpTrack:      0x0e0820,
  xpBorder:     0xc8870a,
};

export class WorldMapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldMapScene' });
    this.maps = [];
    this.uiTileSize = 56;
    this.cloudSet = 1;
    this.cloudLayerCount = 4;
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

    // Right-arrow sprite - decorative indicator on travel buttons
    if (!this.textures.exists('ui-arrow-r')) {
      this.load.spritesheet('ui-arrow-r', 'assets/ui_set/20250425rightArrow-Sheet.png', {
        frameWidth: 28,
        frameHeight: 14
      });
    }

    const { cloudSet, cloudLayerCount } = this.getCloudConfigForCurrentTime();
    this.cloudSet = cloudSet;
    this.cloudLayerCount = cloudLayerCount;

    for (let i = 1; i <= this.cloudLayerCount; i += 1) {
      this.load.image(
        `home-cloud-${i}`,
        `assets/Clouds/Clouds%20${this.cloudSet}/${i}.png`
      );
    }
  }

  //  mock / api helpers

  getMockMaps() {
    return [
      { id: 1, name: 'Forest Clearing',  description: 'A peaceful forest filled with mysteries', mapKey: 'map1' },
      { id: 2, name: 'Dark Cave',        description: 'A dangerous cave system with hidden treasures', mapKey: 'map2' },
      { id: 3, name: 'Mountain Peak',    description: 'The highest mountain in the realm', mapKey: 'map3' }
    ];
  }

  async createDemoMap() {
    try {
      const demoMap = { name: 'Forest Clearing', description: 'A peaceful forest clearing', asset: 'forest_tileset', world: null };
      const createdMap = await apiService.addMap(demoMap);
      this.maps = [createdMap];
    } catch (error) {
      console.error('Failed to create demo map:', error);
      this.maps = this.getMockMaps();
    }
  }

  //  main create

  async create() {
    const { width, height } = this.cameras.main;
    const learner = gameState.getLearner();
    if (!learner) {
      this.scene.stop('UIScene');
      this.scene.start('LoginScene');
      return;
    }

    this.cameras.main.setBackgroundColor(0x090f24);
    this.drawBackdrop(width, height);
    this.createHomeCloudBackdrop(width, height);

    try {
      this.maps = await apiService.getAllMaps();
      if (!this.maps?.length) await this.createDemoMap();
    } catch (error) {
      console.error('Failed to load maps:', error);
      this.maps = this.getMockMaps();
    }

    const panelGapX = Math.max(18, Math.floor(width * 0.016));
    const panelGapY = Math.max(18, Math.floor(height * 0.018));
    const leftCols  = 10;
    const rightCols = 13;
    const topRows   = 8;
    const botRows   = 6;

    const sidePadding   = 40;
    const availableWidth = width - sidePadding * 2 - panelGapX;
    this.uiTileSize = Phaser.Math.Clamp(Math.floor(availableWidth / (leftCols + rightCols)), 44, 64);
    const tile = this.uiTileSize;

    const totalWidth = (leftCols + rightCols) * tile + panelGapX;
    const leftX  = Math.floor((width - totalWidth) / 2);
    const topY   = 86;
    const rightX = leftX + leftCols * tile + panelGapX;
    const botY   = topY + topRows * tile + panelGapY;

    const profilePanel = this.createWindowPanel(leftX,  topY,  leftCols,  topRows,  'ADVENTURER');
    const mapPanel     = this.createWindowPanel(rightX, topY,  rightCols, topRows,  'WORLD GATES');
    const recPanel     = this.createWindowPanel(leftX,  botY,  leftCols,  botRows,  'RECOMMENDED');
    const actionPanel  = this.createWindowPanel(rightX, botY,  rightCols, botRows,  'QUICK TRAVEL');

    this.populateProfilePanel(profilePanel, learner);
    this.populateMapPanel(mapPanel);
    this.populateRecommendations(recPanel, learner);
    this.populateQuickTravel(actionPanel);
  }

  //  backdrop

  drawBackdrop(width, height) {
    this.add.rectangle(width / 2, height / 2, width, height, 0x090f24);
    this.add.circle(width * 0.20, height * 0.18, 260, 0x1a3266, 0.14);
    this.add.circle(width * 0.82, height * 0.32, 300, 0x204880, 0.12);
    this.add.circle(width * 0.55, height * 0.75, 420, 0x1a2f60, 0.16);

    for (let i = 0; i < 85; i += 1) {
      const dot = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(18, Math.floor(height * 0.58)),
        Phaser.Math.Between(1, 2),
        0xcfe4ff,
        Phaser.Math.FloatBetween(0.25, 0.85)
      );
      this.tweens.add({
        targets: dot,
        alpha: Phaser.Math.FloatBetween(0.35, 1),
        duration: Phaser.Math.Between(1200, 2600),
        yoyo: true,
        repeat: -1
      });
    }
  }

  getCloudConfigForCurrentTime() {
    const hour = new Date().getHours();
    const cloudSet = Math.floor(hour / 3) + 1;
    const layerCountsBySet = {
      1: 4,
      2: 4,
      3: 4,
      4: 4,
      5: 5,
      6: 6,
      7: 4,
      8: 6
    };

    return {
      cloudSet,
      cloudLayerCount: layerCountsBySet[cloudSet] || 4
    };
  }

  createHomeCloudBackdrop(width, height) {
    for (let i = 1; i <= this.cloudLayerCount; i += 1) {
      const drift = 20 + i * 14;
      const cloud = this.add.image(width / 2, height / 2, `home-cloud-${i}`);
      const requiredWidth = width + drift * 2 + 120;
      const requiredHeight = height + 120;
      const scale = Math.max(requiredWidth / cloud.width, requiredHeight / cloud.height);

      cloud.setScale(scale);
      cloud.setAlpha(Math.min(0.06 + i * 0.035, 0.2));
      cloud.setDepth(2 + i);

      this.tweens.add({
        targets: cloud,
        x: { from: width / 2 - drift, to: width / 2 + drift },
        duration: 22000 + i * 3200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  //  panel builder 

  createWindowPanel(x, y, cols, rows, title) {
    const tile      = this.uiTileSize;
    const width     = cols * tile;
    const height    = rows * tile;
    const container = this.add.container(x, y);
    container.setDepth(50);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const top = row === 0, bottom = row === rows - 1;
        const left = col === 0, right = col === cols - 1;
        let frame = 4;
        if      (top    && left)  frame = 0;
        else if (top    && right) frame = 2;
        else if (bottom && left)  frame = 6;
        else if (bottom && right) frame = 8;
        else if (top)             frame = 1;
        else if (bottom)          frame = 7;
        else if (left)            frame = 3;
        else if (right)           frame = 5;

        container.add(
          this.add.sprite(col * tile + tile / 2, row * tile + tile / 2, 'ui-panel-a', frame)
            .setScale(tile / 32)
        );
      }
    }

    // Header bar overlay
    for (let col = 0; col < cols; col += 1) {
      const headerFrame = col === 0 ? 0 : col === cols - 1 ? 2 : 1;
      container.add(
        this.add.sprite(col * tile + tile / 2, tile / 2, 'ui-header-a', headerFrame)
          .setScale(tile / 32)
      );
    }

    // Title text - centred, bold, readable stroke
    container.add(
      this.add.text(width / 2, 28, title, {
        fontSize:        '28px',
        color:           '#f4f8ff',
        fontStyle:       'bold',
        stroke:          '#13233d',
        strokeThickness: 7
      }).setOrigin(0.5)
    );

    return { container, x, y, width, height, pad: 22 };
  }

  //  ADVENTURER panel 

  populateProfilePanel(panel, learner) {
    this.ensureWorldIdleAnimation();
    const c   = panel.container;
    const pad = panel.pad;

    // ── stats ──
    const joinedRaw = learner.created_at || learner.createdAt || learner.joined_at || learner.joinedAt;
    const joined    = joinedRaw ? new Date(joinedRaw).toLocaleDateString() : 'Unknown';
    const stats     = [
      { label: 'Name',     value: learner.username ?? 'Unknown' },
      { label: 'Level',    value: learner.level ?? 1 },
      { label: 'Total XP', value: learner.total_xp ?? learner.totalXp ?? 0 },
      { label: 'Joined',   value: joined }
    ];

    let y = 76;
    stats.forEach(({ label, value }) => {
      // label
      c.add(this.add.text(pad, y, `${label}:`, {
        fontSize: '14px',
        color: P.textSub,
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 4
      }));
      // value (right-aligned)
      c.add(this.add.text(panel.width - pad, y, String(value), {
        fontSize: '14px',
        color: P.textMain,
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 4
      }).setOrigin(1, 0));
      y += 28;
    });

    // divider
    y += 4;
    const divider = this.add.graphics();
    divider.lineStyle(1, P.borderGold, 0.35);
    divider.beginPath();
    divider.moveTo(pad, y);
    divider.lineTo(panel.width - pad, y);
    divider.strokePath();
    c.add(divider);
    y += 10;

    // XP bar
    const barW   = panel.width - pad * 2;
    const barH   = 14;
    const xp     = Number(learner.total_xp ?? learner.totalXp ?? 0);
    const lvl    = Number(learner.level ?? 1);
    const thresh = Math.max(100, Math.floor(lvl * 140));
    const pct    = Phaser.Math.Clamp((xp % thresh) / thresh, 0, 1);

    // track
    const track = this.add.graphics();
    track.fillStyle(P.xpTrack, 1);
    track.fillRoundedRect(pad, y, barW, barH, 3);
    track.lineStyle(1, P.xpBorder, 0.7);
    track.strokeRoundedRect(pad, y, barW, barH, 3);
    c.add(track);

    // fill
    if (pct > 0) {
      const fillW = Math.max(6, Math.floor((barW - 4) * pct));
      const fill  = this.add.graphics();
      fill.fillStyle(P.xpFill, 1);
      fill.fillRoundedRect(pad + 2, y + 2, fillW, barH - 4, 2);
      // inner glow stripe
      fill.fillStyle(0xffffff, 0.25);
      fill.fillRoundedRect(pad + 2, y + 2, fillW, Math.floor((barH - 4) * 0.5), { tl: 2, tr: 2, bl: 0, br: 0 });
      c.add(fill);
    }

    // XP label
    c.add(this.add.text(pad + barW / 2, y + barH / 2, `${xp % thresh} / ${thresh} XP`, {
      fontSize: '11px',
      color: '#ffffff',
      stroke: '#06101a',
      strokeThickness: 4
    }).setOrigin(0.5, 0.5));

    // character sprite
    const avatarY = Math.floor(panel.height * 0.72);
    const avatar  = this.add.sprite(panel.width / 2, avatarY, soldier.sheetKey, 0).setScale(3.2);
    avatar.play('wm_soldier_idle');
    c.add(avatar);

    this.tweens.add({
      targets:  avatar,
      y:        avatar.y - 6,
      duration: 1300,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut'
    });

    // subtle glow under avatar
    const glow = this.add.graphics();
    glow.fillStyle(0x4193d5, 0.12);
    glow.fillEllipse(panel.width / 2, avatarY + 28, 80, 20);
    c.add(glow);
  }

  //  WORLD GATES panel

  populateMapPanel(panel) {
    const c    = panel.container;
    const maps = this.maps.slice(0, 4);
    const btnW = panel.width - panel.pad * 2;
    const btnH = 44;
    let   y    = 72;

    maps.forEach((map, i) => {
      const btn = this.createButton(
        panel.pad, y, btnW, btnH,
        map.name || `Map ${i + 1}`,
        () => this.enterMap(map)
      );
      c.add(btn);

      const desc = this.add.text(panel.pad + 10, y + btnH + 7, this.truncate(map.description || 'Travel gate ready.', 60), {
        fontSize: '13px',
        color: P.textDesc,
        stroke: '#060814',
        strokeThickness: 3
      });
      c.add(desc);
      y += btnH + 32;
    });

    // Locked placeholder slots
    for (let i = maps.length; i < 4; i += 1) {
      const lockedBtn = this.createButton(
        panel.pad, y, btnW, btnH,
        `Locked Gate ${i + 1}`,
        null,
        true
      );
      c.add(lockedBtn);
      c.add(this.add.text(panel.pad + 10, y + btnH + 7, 'Discover more maps to unlock this gate.', {
        fontSize: '13px',
        color: P.textDisabled,
        stroke: '#060814',
        strokeThickness: 3
      }));
      y += btnH + 32;
    }
  }

  //  RECOMMENDED panel

  populateRecommendations(panel, learner) {
    const c   = panel.container;
    const pad = panel.pad;
    const lvl = Number(learner.level ?? 1);

    const recs = [
      lvl < 3
        ? 'Clear Forest maps for quick XP growth.'
        : 'Challenge tougher maps for faster leveling.',
      'Open your profile to monitor progression.',
      'Use inventory items before entering combat-heavy maps.'
    ];

    // Decorative side accent
    const accent = this.add.graphics();
    accent.lineStyle(2, P.borderGold, 0.4);
    accent.beginPath();
    accent.moveTo(pad, 68);
    accent.lineTo(pad, panel.height - 28);
    accent.strokePath();
    c.add(accent);

    let y = 76;
    recs.forEach((line, idx) => {
      // Number badge
      const badge = this.add.graphics();
      badge.fillStyle(P.btnNormal, 1);
      badge.lineStyle(1, P.borderGold, 0.7);
      badge.fillCircle(pad + 18, y + 12, 11);
      badge.strokeCircle(pad + 18, y + 12, 11);
      c.add(badge);

      c.add(this.add.text(pad + 18, y + 12, String(idx + 1), {
        fontSize: '13px',
        color: P.textMain,
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 4
      }).setOrigin(0.5, 0.5));

      c.add(this.add.text(pad + 36, y, this.truncate(line, 50), {
        fontSize: '15px',
        color: P.textMain,
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 4,
        wordWrap: { width: panel.width - pad - 48 }
      }));
      y += 62;
    });
  }

  //  QUICK TRAVEL panel

  populateQuickTravel(panel) {
    const c    = panel.container;
    const maps = this.maps.slice(0, 3);
    const n    = 3;
    const gap  = 12;
    const btnW = Math.floor((panel.width - panel.pad * 2 - gap * (n - 1)) / n);
    const btnH = 52;
    const y    = Math.floor(panel.height / 2) - Math.floor(btnH / 2);

    for (let i = 0; i < n; i += 1) {
      const map = maps[i];
      const x   = panel.pad + i * (btnW + gap);

      if (map) {
        const btn = this.createTravelButton(x, y, btnW, btnH, map.name || `Map ${i + 1}`, () => this.enterMap(map));
        c.add(btn);
      } else {
        const locked = this.createButton(x, y, btnW, btnH, `Locked`, null, true);
        c.add(locked);
      }
    }
  }

  //  button factories
  createButton(x, y, width, height, label, onClick, disabled = false) {
    const btn = this.add.container(x, y);
    const bg  = this.add.graphics();

    const draw = (fill, border, glowLine) => {
      bg.clear();

      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(0, 0, width, height, 4);

      bg.lineStyle(2, border, disabled ? 0.35 : 1);
      bg.strokeRoundedRect(0, 0, width, height, 4);

      if (!disabled) {
        // subtle inner top-shine
        bg.fillStyle(0xffffff, 0.05);
        bg.fillRoundedRect(2, 2, width - 4, height * 0.42, { tl: 3, tr: 3, bl: 0, br: 0 });
        // thin gold accent line at top
        bg.lineStyle(1, glowLine, 0.55);
        bg.beginPath();
        bg.moveTo(8, 2);
        bg.lineTo(width - 8, 2);
        bg.strokePath();
      }
    };

    draw(
      disabled ? P.btnDisabled : P.btnNormal,
      disabled ? P.borderDim   : P.borderGold,
      P.accentGlow
    );
    btn.add(bg);

    btn.add(
      this.add.text(16, height / 2, this.truncate(label, 36), {
        fontSize:        '17px',
        fontStyle:       'bold',
        color:           disabled ? P.textDisabled : P.textMain,
        stroke:          '#060814',
        strokeThickness: 5
      }).setOrigin(0, 0.5)
    );

    if (!disabled && onClick) {
      const hit = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      btn.add(hit);

      hit.on('pointerover',  () => draw(P.btnHover, P.borderGlow,  P.accentGlow));
      hit.on('pointerout',   () => draw(P.btnNormal, P.borderGold, P.accentGlow));
      hit.on('pointerdown',  () => draw(P.btnPress, P.borderDim,   P.borderGold));
      hit.on('pointerup',    () => { draw(P.btnHover, P.borderGlow, P.accentGlow); onClick(); });
    }

    return btn;
  }

  createTravelButton(x, y, width, height, label, onClick) {
    const btn = this.add.container(x, y);
    const bg  = this.add.graphics();

    // Declare arrow before draw() so the closure can reference it safely.
    // It gets assigned below after the Phaser object is created.
    let arrow = null;

    const draw = (fill, border, glowLine, arrowFrame) => {
      bg.clear();

      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(0, 0, width, height, 5);

      bg.lineStyle(2, border, 1);
      bg.strokeRoundedRect(0, 0, width, height, 5);

      // inner top shine
      bg.fillStyle(0xffffff, 0.06);
      bg.fillRoundedRect(2, 2, width - 4, height * 0.4, { tl: 4, tr: 4, bl: 0, br: 0 });

      // gold accent line
      bg.lineStyle(1, glowLine, 0.6);
      bg.beginPath();
      bg.moveTo(10, 2);
      bg.lineTo(width - 10, 2);
      bg.strokePath();

      if (arrow) arrow.setFrame(arrowFrame);
    };

    draw(P.btnNormal, P.borderGold, P.accentGlow, 0);
    btn.add(bg);

    // Centred map name
    btn.add(
      this.add.text(width / 2, height / 2 - 6, this.truncate(label, 16), {
        fontSize:        '16px',
        fontStyle:       'bold',
        color:           P.textMain,
        stroke:          '#060814',
        strokeThickness: 5
      }).setOrigin(0.5, 0.5)
    );

    // "Enter" sub-label
    btn.add(
      this.add.text(width / 2, height / 2 + 12, 'ENTER', {
        fontSize:        '11px',
        fontStyle:       'bold',
        color:           P.textSub,
        stroke:          '#060814',
        strokeThickness: 3,
        letterSpacing:   3
      }).setOrigin(0.5, 0.5)
    );

    // Arrow sprite — now assigned after draw() is defined, no TDZ
    arrow = this.add.sprite(width - 14, height / 2, 'ui-arrow-r', 0)
      .setScale(1.4)
      .setOrigin(0.5);
    btn.add(arrow);

    const hit = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    btn.add(hit);

    hit.on('pointerover',  () => draw(P.btnHover,  P.borderGlow, P.accentGlow, 1));
    hit.on('pointerout',   () => draw(P.btnNormal, P.borderGold, P.accentGlow, 0));
    hit.on('pointerdown',  () => draw(P.btnPress,  P.borderDim,  P.borderGold, 0));
    hit.on('pointerup',    () => { draw(P.btnHover, P.borderGlow, P.accentGlow, 1); onClick(); });

    return btn;
  }

  //  animation helpers 

  ensureWorldIdleAnimation() {
    if (this.anims.exists('wm_soldier_idle')) return;
    const idle   = soldier.anims.idle;
    const frames = Array.from({ length: idle.count }, (_, i) => idle.row * soldier.maxCols + i);
    this.anims.create({
      key:       'wm_soldier_idle',
      frames:    this.anims.generateFrameNumbers(soldier.sheetKey, { frames }),
      frameRate: idle.frameRate,
      repeat:    idle.repeat
    });
  }

  //  utility 

  truncate(text, maxLen) {
    const s = String(text ?? '');
    return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s;
  }

  enterMap(map) {
    const isEditorMap = String(map?.asset || '').startsWith('editor-draft:');
    const normalizedMap = {
      ...map,
      mapKey: isEditorMap ? null : (map.mapKey || this.resolveMapKey(map)),
      isEditorMap
    };
    gameState.setCurrentMap(normalizedMap);
    this.scene.start('GameMapScene', { mapConfig: normalizedMap });
  }

  resolveMapKey(map) {
    const raw = String(map?.mapKey || map?.asset || map?.name || '').toLowerCase();
    if (raw.startsWith('editor-draft:')) return null;
    if (raw === 'map1' || raw.includes('forest'))   return 'map1';
    if (raw === 'map2' || raw.includes('cave'))     return 'map2';
    if (raw === 'map3' || raw.includes('mountain')) return 'map3';
    if (raw === 'map4' || raw.includes('test') || raw.includes('terrain')) return 'map4';

    return 'map1';
  }
}
