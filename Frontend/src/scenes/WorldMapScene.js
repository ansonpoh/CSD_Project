import Phaser from 'phaser';
import { gameState } from '../services/gameState.js';
import { apiService } from '../services/api.js';
import { soldier } from '../characters/soldier/Soldier.js';
import { mapDiscoveryService } from '../services/mapDiscovery.js';
import { applyPlayerProfileToSprite, getDefaultPlayerProfile } from '../services/playerProfile.js';
import { dailyQuestService } from '../services/dailyQuests.js';
import { loadSharedUiAssets } from '../services/uiAssets.js';

const P = {
  btnNormal: 0x2a0f42,
  btnHover: 0x3d1860,
  btnPress: 0x100520,
  btnDisabled: 0x130b20,
  borderGold: 0xc8870a,
  borderGlow: 0xf0b030,
  borderDim: 0x604008,
  accentGlow: 0xffdd60,
  textMain: '#f0ecff',
  textSub: '#c0a8e0',
  textDisabled: '#5a4a72',
  textDesc: '#9e88c0',
  xpFill: 0x4193d5,
  xpTrack: 0x0e0820,
  xpBorder: 0xc8870a,
  good: '#7df5b2',
  warn: '#ffd57a',
  gold: '#ffe2a8'
};

export class WorldMapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldMapScene' });
    this.rawMaps = [];
    this.catalog = [];
    this.selectedMapId = null;
    this.selectedMap = null;
    this.uiTileSize = 56;
    this.cloudSet = 1;
    this.cloudLayerCount = 4;
    this.panels = {};
  }

  init(data) {
    this.selectedMapId = data?.selectedMapId || this.selectedMapId || null;
  }

  preload() {
    loadSharedUiAssets(this, { includeArrow: true });

    const { cloudSet, cloudLayerCount } = this.getCloudConfigForCurrentTime();
    this.cloudSet = cloudSet;
    this.cloudLayerCount = cloudLayerCount;

    for (let i = 1; i <= this.cloudLayerCount; i += 1) {
      this.load.image(`home-cloud-${i}`, `assets/Clouds/Clouds%20${this.cloudSet}/${i}.png`);
    }
  }

  getMockMaps() {
    return [
      { id: 1, name: 'Forest Clearing', description: 'A peaceful forest filled with mysteries', mapKey: 'map1' },
      { id: 2, name: 'Dark Cave', description: 'A dangerous cave system with hidden treasures', mapKey: 'map2' },
      { id: 3, name: 'Mountain Peak', description: 'The highest mountain in the realm', mapKey: 'map3' },
      { id: 4, name: 'Makers Garden', description: 'A prototype space for bold remix ideas', mapKey: 'map4' }
    ];
  }

  async createDemoMap() {
    try {
      const demoMap = {
        name: 'Forest Clearing',
        description: 'A peaceful forest clearing',
        asset: 'forest_tileset',
        world: null
      };
      const createdMap = await apiService.addMap(demoMap);
      this.rawMaps = [createdMap];
    } catch (error) {
      console.error('Failed to create demo map:', error);
      this.rawMaps = this.getMockMaps();
    }
  }

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
      this.rawMaps = await apiService.getAllMaps();
      if (!this.rawMaps?.length) await this.createDemoMap();
    } catch (error) {
      console.error('Failed to load maps:', error);
      this.rawMaps = this.getMockMaps();
    }

    this.refreshCatalog();

    const panelGapX = Math.max(18, Math.floor(width * 0.016));
    const panelGapY = Math.max(18, Math.floor(height * 0.018));
    const leftCols = 10;
    const rightCols = 13;
    const topRows = 8;
    const botRows = 6;
    const sidePadding = 40;
    const availableWidth = width - sidePadding * 2 - panelGapX;
    this.uiTileSize = Phaser.Math.Clamp(Math.floor(availableWidth / (leftCols + rightCols)), 44, 64);
    const tile = this.uiTileSize;

    const totalWidth = (leftCols + rightCols) * tile + panelGapX;
    const leftX = Math.floor((width - totalWidth) / 2);
    const topY = 86;
    const rightX = leftX + leftCols * tile + panelGapX;
    const botY = topY + topRows * tile + panelGapY;

    this.panels.profile = this.createWindowPanel(leftX, topY, leftCols, topRows, 'ADVENTURER');
    this.panels.gates = this.createWindowPanel(rightX, topY, rightCols, topRows, 'DISCOVERY GATES');
    this.panels.intel = this.createWindowPanel(leftX, botY, leftCols, botRows, 'MAP INTEL');
    this.panels.community = this.createWindowPanel(rightX, botY, rightCols, botRows, 'COMMUNITY SIGNALS');

    this.populateProfilePanel(this.panels.profile, learner);
    this.populateMapPanel(this.panels.gates);
    this.populateIntelPanel(this.panels.intel, learner);
    this.populateCommunityPanel(this.panels.community, learner);
  }

  refreshCatalog() {
    const learner = gameState.getLearner();
    this.catalog = mapDiscoveryService.buildCatalog(this.rawMaps, learner);
    this.selectedMap = this.catalog.find((map) => String(map.mapId) === String(this.selectedMapId)) || this.catalog[0] || null;
    this.selectedMapId = this.selectedMap?.mapId || null;
  }

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
    const layerCountsBySet = { 1: 4, 2: 4, 3: 4, 4: 4, 5: 5, 6: 6, 7: 4, 8: 6 };
    return { cloudSet, cloudLayerCount: layerCountsBySet[cloudSet] || 4 };
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

  createWindowPanel(x, y, cols, rows, title) {
    const tile = this.uiTileSize;
    const width = cols * tile;
    const height = rows * tile;
    const container = this.add.container(x, y).setDepth(50);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const top = row === 0;
        const bottom = row === rows - 1;
        const left = col === 0;
        const right = col === cols - 1;
        let frame = 4;
        if (top && left) frame = 0;
        else if (top && right) frame = 2;
        else if (bottom && left) frame = 6;
        else if (bottom && right) frame = 8;
        else if (top) frame = 1;
        else if (bottom) frame = 7;
        else if (left) frame = 3;
        else if (right) frame = 5;

        container.add(
          this.add.sprite(col * tile + tile / 2, row * tile + tile / 2, 'ui-panel-a', frame).setScale(tile / 32)
        );
      }
    }

    for (let col = 0; col < cols; col += 1) {
      const headerFrame = col === 0 ? 0 : col === cols - 1 ? 2 : 1;
      container.add(
        this.add.sprite(col * tile + tile / 2, tile / 2, 'ui-header-a', headerFrame).setScale(tile / 32)
      );
    }

    container.add(
      this.add.text(width / 2, 28, title, {
        fontSize: '28px',
        color: '#f4f8ff',
        fontStyle: 'bold',
        stroke: '#13233d',
        strokeThickness: 7
      }).setOrigin(0.5)
    );

    const body = this.add.container(0, 58);
    container.add(body);

    return { container, body, x, y, width, height, pad: 22 };
  }

  clearPanelBody(panel) {
    panel.body.removeAll(true);
  }

  populateProfilePanel(panel, learner) {
    this.clearPanelBody(panel);
    this.ensureWorldIdleAnimation();
    const c = panel.body;
    const pad = panel.pad;

    const joinedRaw = learner.created_at || learner.createdAt || learner.joined_at || learner.joinedAt;
    const joined = joinedRaw ? new Date(joinedRaw).toLocaleDateString() : 'Unknown';
    const totalCompletions = this.catalog.reduce((sum, map) => sum + (map.playerState?.completions || 0), 0);
    const likedCount = this.catalog.filter((map) => map.playerState?.liked).length;
    const profile = gameState.getPlayerProfile() || getDefaultPlayerProfile();
    const dailySnapshot = dailyQuestService.getSnapshot();
    const stats = [
      { label: 'Name', value: learner.username ?? 'Unknown' },
      { label: 'Style', value: profile.label },
      { label: 'Level', value: learner.level ?? 1 },
      { label: 'Total XP', value: learner.total_xp ?? learner.totalXp ?? 0 },
      { label: 'Runs Cleared', value: totalCompletions },
      { label: 'Daily Streak', value: `${dailySnapshot.streak || 0} day(s)` },
      { label: 'Liked Maps', value: likedCount },
      { label: 'Joined', value: joined }
    ];

    let y = 18;
    stats.forEach(({ label, value }) => {
      c.add(this.add.text(pad, y, `${label}:`, {
        fontSize: '14px',
        color: P.textSub,
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 4
      }));
      c.add(this.add.text(panel.width - pad, y, String(value), {
        fontSize: '14px',
        color: P.textMain,
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 4
      }).setOrigin(1, 0));
      y += 28;
    });

    const recommendations = mapDiscoveryService.getRecommendations(this.catalog, learner).slice(0, 2);
    y += 4;
    c.add(this.add.text(pad, y, 'Explorer Feed', {
      fontSize: '15px',
      color: P.gold,
      fontStyle: 'bold',
      stroke: '#060814',
      strokeThickness: 4
    }));
    y += 26;

    recommendations.forEach((line, index) => {
      c.add(this.add.text(pad, y, `${index + 1}. ${this.truncate(line, 44)}`, {
        fontSize: '13px',
        color: P.textMain,
        stroke: '#060814',
        strokeThickness: 3,
        wordWrap: { width: panel.width - pad * 2 }
      }));
      y += 38;
    });

    const xp = Number(learner.total_xp ?? learner.totalXp ?? 0);
    const lvl = Number(learner.level ?? 1);
    const thresh = Math.max(100, Math.floor(lvl * 140));
    const pct = Phaser.Math.Clamp((xp % thresh) / thresh, 0, 1);
    const barW = panel.width - pad * 2;
    const barH = 14;

    const track = this.add.graphics();
    track.fillStyle(P.xpTrack, 1);
    track.fillRoundedRect(pad, y, barW, barH, 3);
    track.lineStyle(1, P.xpBorder, 0.7);
    track.strokeRoundedRect(pad, y, barW, barH, 3);
    c.add(track);

    if (pct > 0) {
      const fillW = Math.max(6, Math.floor((barW - 4) * pct));
      const fill = this.add.graphics();
      fill.fillStyle(P.xpFill, 1);
      fill.fillRoundedRect(pad + 2, y + 2, fillW, barH - 4, 2);
      fill.fillStyle(0xffffff, 0.25);
      fill.fillRoundedRect(pad + 2, y + 2, fillW, Math.floor((barH - 4) * 0.5), { tl: 2, tr: 2, bl: 0, br: 0 });
      c.add(fill);
    }

    c.add(this.add.text(pad + barW / 2, y + barH / 2, `${xp % thresh} / ${thresh} XP`, {
      fontSize: '11px',
      color: '#ffffff',
      stroke: '#06101a',
      strokeThickness: 4
    }).setOrigin(0.5, 0.5));

    const avatarY = panel.height - 110;
    const avatar = this.add.sprite(panel.width / 2, avatarY, soldier.sheetKey, 0).setScale(3.2);
    avatar.play('wm_soldier_idle');
    applyPlayerProfileToSprite(avatar, profile);
    c.add(avatar);

    this.tweens.add({
      targets: avatar,
      y: avatar.y - 6,
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const glow = this.add.graphics();
    glow.fillStyle(profile.tint, 0.18);
    glow.fillEllipse(panel.width / 2, avatarY + 28, 80, 20);
    c.add(glow);
  }

  populateMapPanel(panel) {
    this.clearPanelBody(panel);
    const c = panel.body;
    const maps = this.catalog.slice(0, 4);
    const cardW = panel.width - panel.pad * 2;
    const cardH = 88;
    let y = 14;

    maps.forEach((map, index) => {
      const isSelected = String(map.mapId) === String(this.selectedMapId);
      const isLocked = !map.unlocked;
      const card = this.createMapCard(panel.pad, y, cardW, cardH, map, isSelected, () => {
        this.scene.restart({ selectedMapId: map.mapId });
      });
      c.add(card);

      const actionLabel = isLocked ? map.unlockText : `Open ${map.name}`;
      const action = this.createButton(panel.pad + cardW - 184, y + cardH + 6, 184, 38, actionLabel, () => {
        if (map.unlocked) this.enterMap(map);
      }, isLocked);
      c.add(action);

      y += cardH + 52;
      if (index < maps.length - 1) {
        const divider = this.add.graphics();
        divider.lineStyle(1, P.borderGold, 0.2);
        divider.beginPath();
        divider.moveTo(panel.pad, y - 14);
        divider.lineTo(panel.width - panel.pad, y - 14);
        divider.strokePath();
        c.add(divider);
      }
    });
  }

  createMapCard(x, y, width, height, map, isSelected, onClick) {
    const card = this.add.container(x, y);
    const bg = this.add.graphics();

    const draw = (fill, border, alpha = 1) => {
      bg.clear();
      bg.fillStyle(fill, alpha);
      bg.fillRoundedRect(0, 0, width, height, 6);
      bg.lineStyle(2, border, 1);
      bg.strokeRoundedRect(0, 0, width, height, 6);
      bg.fillStyle(0xffffff, 0.05);
      bg.fillRoundedRect(2, 2, width - 4, height * 0.42, { tl: 4, tr: 4, bl: 0, br: 0 });
    };

    draw(isSelected ? 0x20386a : 0x1a1736, isSelected ? P.borderGlow : P.borderGold, map.unlocked ? 1 : 0.88);
    card.add(bg);

    const textColor = map.unlocked ? P.textMain : P.textDisabled;
    card.add(this.add.text(16, 12, map.name || 'Unnamed Map', {
      fontSize: '20px',
      fontStyle: 'bold',
      color: textColor,
      stroke: '#060814',
      strokeThickness: 5
    }));

    card.add(this.add.text(16, 40, `${map.theme}  |  ${map.difficulty}  |  ${map.estimatedMinutes} min`, {
      fontSize: '13px',
      color: map.unlocked ? P.gold : P.textDisabled,
      stroke: '#060814',
      strokeThickness: 3
    }));

    card.add(this.add.text(16, 60, this.truncate(map.learningGoal, 82), {
      fontSize: '13px',
      color: map.unlocked ? P.textDesc : P.textDisabled,
      stroke: '#060814',
      strokeThickness: 3
    }));

    const badge = this.add.text(width - 12, 12, map.featured ? 'FEATURED' : map.seasonalTag.toUpperCase(), {
      fontSize: '12px',
      fontStyle: 'bold',
      color: map.featured ? P.good : P.warn,
      stroke: '#060814',
      strokeThickness: 3
    }).setOrigin(1, 0);
    card.add(badge);

    const social = `${map.socialProof.rating.toFixed(1)}★  ${this.formatCompact(map.socialProof.likes)} likes  ${this.formatCompact(map.socialProof.completions)} clears`;
    card.add(this.add.text(width - 12, 58, social, {
      fontSize: '12px',
      color: textColor,
      stroke: '#060814',
      strokeThickness: 3
    }).setOrigin(1, 0));

    const hit = this.add.rectangle(width / 2, height / 2, width, height, 0, 0).setInteractive({ useHandCursor: true });
    card.add(hit);
    hit.on('pointerover', () => draw(isSelected ? 0x27457b : 0x211b46, isSelected ? P.borderGlow : P.borderGlow));
    hit.on('pointerout', () => draw(isSelected ? 0x20386a : 0x1a1736, isSelected ? P.borderGlow : P.borderGold, map.unlocked ? 1 : 0.88));
    hit.on('pointerdown', () => draw(0x120722, P.borderDim, map.unlocked ? 1 : 0.88));
    hit.on('pointerup', () => onClick());

    return card;
  }

  populateIntelPanel(panel, learner) {
    this.clearPanelBody(panel);
    const c = panel.body;
    const pad = panel.pad;
    const map = this.selectedMap;

    if (!map) {
      c.add(this.add.text(pad, 18, 'No map selected.', {
        fontSize: '16px',
        color: P.textMain,
        stroke: '#060814',
        strokeThickness: 4
      }));
      return;
    }

    const lines = [
      { label: 'Theme', value: map.theme },
      { label: 'Biome', value: map.biome },
      { label: 'Difficulty', value: map.difficulty },
      { label: 'Creator', value: `${map.creatorName} [${map.creatorBadge}]` },
      { label: 'Topic', value: map.recommendedTopic },
      { label: 'Unlock', value: map.unlockText }
    ];
    const dailySnapshot = dailyQuestService.getSnapshot();

    let y = 18;
    c.add(this.add.text(pad, y, map.name, {
      fontSize: '22px',
      fontStyle: 'bold',
      color: P.textMain,
      stroke: '#060814',
      strokeThickness: 5
    }));
    y += 30;

    c.add(this.add.text(pad, y, this.truncate(map.description || map.learningGoal, 110), {
      fontSize: '13px',
      color: P.textDesc,
      stroke: '#060814',
      strokeThickness: 3,
      wordWrap: { width: panel.width - pad * 2 }
    }));
    y += 50;

    lines.forEach(({ label, value }) => {
      c.add(this.add.text(pad, y, `${label}:`, {
        fontSize: '13px',
        color: P.textSub,
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 4
      }));
      c.add(this.add.text(panel.width - pad, y, String(value), {
        fontSize: '13px',
        color: P.textMain,
        stroke: '#060814',
        strokeThickness: 4
      }).setOrigin(1, 0));
      y += 26;
    });

    y += 6;
    c.add(this.add.text(pad, y, 'Map promise', {
      fontSize: '14px',
      color: P.gold,
      fontStyle: 'bold',
      stroke: '#060814',
      strokeThickness: 4
    }));
    y += 24;
    c.add(this.add.text(pad, y, this.truncate(map.learningGoal, 118), {
      fontSize: '13px',
      color: P.textMain,
      stroke: '#060814',
      strokeThickness: 3,
      wordWrap: { width: panel.width - pad * 2 }
    }));

    const recommendations = mapDiscoveryService.getRecommendations(this.catalog, learner).slice(0, 2);
    let recY = panel.height - 116;
    c.add(this.add.text(pad, recY, 'Run guidance', {
      fontSize: '14px',
      color: P.good,
      fontStyle: 'bold',
      stroke: '#060814',
      strokeThickness: 4
    }));
    recY += 22;
    recommendations.forEach((line, index) => {
      c.add(this.add.text(pad, recY, `${index + 1}. ${this.truncate(line, 48)}`, {
        fontSize: '12px',
        color: P.textMain,
        stroke: '#060814',
        strokeThickness: 3
      }));
      recY += 28;
    });

    const questLines = dailySnapshot.quests.map((quest) => {
      const marker = quest.completed ? '[x]' : '[ ]';
      return `${marker} ${quest.label} (${Math.min(quest.progress, quest.goal)}/${quest.goal})`;
    });
    c.add(this.add.text(panel.width - pad, panel.height - 112, `Daily Quests\n${questLines.join('\n')}`, {
      fontSize: '12px',
      align: 'right',
      color: P.textMain,
      stroke: '#060814',
      strokeThickness: 3
    }).setOrigin(1, 0));
  }

  populateCommunityPanel(panel) {
    this.clearPanelBody(panel);
    const c = panel.body;
    const pad = panel.pad;
    const map = this.selectedMap;

    if (!map) {
      c.add(this.add.text(pad, 18, 'No community data available.', {
        fontSize: '16px',
        color: P.textMain,
        stroke: '#060814',
        strokeThickness: 4
      }));
      return;
    }

    const spotlight = mapDiscoveryService.getCreatorSpotlight(this.catalog);
    const trendLeader = [...this.catalog].sort((a, b) => b.socialProof.trendScore - a.socialProof.trendScore)[0];

    c.add(this.add.text(pad, 18, `${map.socialProof.rating.toFixed(1)}★ average from ${this.formatCompact(map.socialProof.ratingCount)} ratings`, {
      fontSize: '16px',
      color: P.gold,
      fontStyle: 'bold',
      stroke: '#060814',
      strokeThickness: 4
    }));

    c.add(this.add.text(pad, 46, `${this.formatCompact(map.socialProof.likes)} likes  |  ${this.formatCompact(map.socialProof.completions)} completions  |  ${map.socialProof.remixCount} remixes`, {
      fontSize: '13px',
      color: P.textMain,
      stroke: '#060814',
      strokeThickness: 3
    }));

    c.add(this.add.text(pad, 72, `Creator rep ${this.formatCompact(map.socialProof.creatorRep)}  |  trend ${this.formatCompact(map.socialProof.trendScore)}  |  your clears ${map.playerState.completions}`, {
      fontSize: '13px',
      color: P.textDesc,
      stroke: '#060814',
      strokeThickness: 3
    }));

    const btnY = 108;
    c.add(this.createButton(pad, btnY, 160, 42, map.playerState.liked ? 'Unlike Map' : 'Like Map', () => {
      mapDiscoveryService.toggleLike(map);
      this.scene.restart({ selectedMapId: map.mapId });
    }));
    c.add(this.createButton(pad + 174, btnY, 160, 42, map.playerState.rating >= 5 ? 'Rated 5★' : 'Rate 5★', () => {
      mapDiscoveryService.rateMap(map, 5);
      this.scene.restart({ selectedMapId: map.mapId });
    }));
    c.add(this.createButton(pad + 348, btnY, 180, 42, map.unlocked ? 'Enter Highlighted Gate' : map.unlockText, () => {
      if (map.unlocked) this.enterMap(map);
    }, !map.unlocked));

    c.add(this.add.text(pad, 166, 'Creator spotlight', {
      fontSize: '15px',
      color: P.good,
      fontStyle: 'bold',
      stroke: '#060814',
      strokeThickness: 4
    }));

    let y = 194;
    spotlight.forEach((entry, index) => {
      c.add(this.add.text(pad, y, `${index + 1}. ${entry.creatorName}  |  ${entry.name}`, {
        fontSize: '13px',
        color: P.textMain,
        stroke: '#060814',
        strokeThickness: 3
      }));
      c.add(this.add.text(panel.width - pad, y, `${this.formatCompact(entry.socialProof.creatorRep)} rep`, {
        fontSize: '13px',
        color: P.gold,
        stroke: '#060814',
        strokeThickness: 3
      }).setOrigin(1, 0));
      y += 26;
    });

    if (trendLeader) {
      y += 8;
      c.add(this.add.text(pad, y, 'Trending now', {
        fontSize: '15px',
        color: P.warn,
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 4
      }));
      y += 24;
      c.add(this.add.text(pad, y, `${trendLeader.name} is leading discovery this week with ${trendLeader.socialProof.likes} likes and ${trendLeader.socialProof.completions} clears.`, {
        fontSize: '13px',
        color: P.textMain,
        stroke: '#060814',
        strokeThickness: 3,
        wordWrap: { width: panel.width - pad * 2 }
      }));
    }
  }

  createButton(x, y, width, height, label, onClick, disabled = false) {
    const btn = this.add.container(x, y);
    const bg = this.add.graphics();

    const draw = (fill, border, glowLine) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(0, 0, width, height, 4);
      bg.lineStyle(2, border, disabled ? 0.35 : 1);
      bg.strokeRoundedRect(0, 0, width, height, 4);

      if (!disabled) {
        bg.fillStyle(0xffffff, 0.05);
        bg.fillRoundedRect(2, 2, width - 4, height * 0.42, { tl: 3, tr: 3, bl: 0, br: 0 });
        bg.lineStyle(1, glowLine, 0.55);
        bg.beginPath();
        bg.moveTo(8, 2);
        bg.lineTo(width - 8, 2);
        bg.strokePath();
      }
    };

    draw(disabled ? P.btnDisabled : P.btnNormal, disabled ? P.borderDim : P.borderGold, P.accentGlow);
    btn.add(bg);

    btn.add(this.add.text(width / 2, height / 2, this.truncate(label, 34), {
      fontSize: '15px',
      fontStyle: 'bold',
      color: disabled ? P.textDisabled : P.textMain,
      stroke: '#060814',
      strokeThickness: 5,
      align: 'center'
    }).setOrigin(0.5));

    if (!disabled && onClick) {
      const hit = this.add.rectangle(width / 2, height / 2, width, height, 0, 0).setInteractive({ useHandCursor: true });
      btn.add(hit);
      hit.on('pointerover', () => draw(P.btnHover, P.borderGlow, P.accentGlow));
      hit.on('pointerout', () => draw(P.btnNormal, P.borderGold, P.accentGlow));
      hit.on('pointerdown', () => draw(P.btnPress, P.borderDim, P.borderGold));
      hit.on('pointerup', () => {
        draw(P.btnHover, P.borderGlow, P.accentGlow);
        onClick();
      });
    }

    return btn;
  }

  ensureWorldIdleAnimation() {
    if (this.anims.exists('wm_soldier_idle')) return;
    const idle = soldier.anims.idle;
    const frames = Array.from({ length: idle.count }, (_, i) => idle.row * soldier.maxCols + i);
    this.anims.create({
      key: 'wm_soldier_idle',
      frames: this.anims.generateFrameNumbers(soldier.sheetKey, { frames }),
      frameRate: idle.frameRate,
      repeat: idle.repeat
    });
  }

  truncate(text, maxLen) {
    const s = String(text ?? '');
    return s.length > maxLen ? `${s.slice(0, maxLen - 1)}...` : s;
  }

  formatCompact(value) {
    const num = Number(value || 0);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return String(num);
  }

  enterMap(map) {
    const normalizedMap = {
      ...map,
      mapKey: map.mapKey || this.resolveMapKey(map)
    };
    mapDiscoveryService.markMapVisited(normalizedMap);
    gameState.setCurrentMap(normalizedMap);
    this.scene.start('GameMapScene', { mapConfig: normalizedMap });
  }

  resolveMapKey(map) {
    const raw = String(map?.mapKey || map?.asset || map?.name || '').toLowerCase();
    if (raw === 'map1' || raw.includes('forest')) return 'map1';
    if (raw === 'map2' || raw.includes('cave')) return 'map2';
    if (raw === 'map3' || raw.includes('mountain')) return 'map3';
    if (raw === 'map4' || raw.includes('test') || raw.includes('terrain') || raw.includes('garden')) return 'map4';
    return 'map1';
  }
}
