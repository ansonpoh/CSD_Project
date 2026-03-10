import Phaser from 'phaser';
import { gameState } from '../services/gameState.js';
import { SoldierController } from '../characters/soldier/SoldierController.js';
import { apiService } from "../services/api.js";
import { monsterRegistry } from '../characters/monsters/MonsterRegistry.js';
import { NPCRegistry } from '../characters/npcs/NPCRegistry.js';
import { mapDiscoveryService } from '../services/mapDiscovery.js';
import { dailyQuestService } from '../services/dailyQuests.js';
import { getChallengeSnapshot } from '../services/sideChallenges.js';

const HUD = {
  panelBg: 0x0d1530,
  cardBg: 0x101b3f,
  btnPurple: 0x2a0f42,
  btnPurpleHover: 0x3d1860,
  btnBlue: 0x1f3e76,
  btnBlueHover: 0x2d5b9e,
  border: 0xc8870a,
  borderGlow: 0xf0b030,
  textMain: '#f0ecff',
  textSub: '#c0a8e0',
  textGood: '#7df5b2',
  textWarn: '#ffd57a',
  textGold: '#ffe2a8'
};

export class GameMapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameMapScene' });
    this.player = null;
    this.cursors = null;
    this.npcs = [];
    this.monsters = [];
    this.npcSprites = [];
    this.monsterSprites = [];
    this.interactKey = null;
    this.interactPrompt = null;
    this.interactPromptBg = null;
    this.closestNpcSprite = null;
    this.npcInteractDistance = 120;
    this.map = null;
    this.collisionBodies = [];
    this.npcMonsterMap = new Map();
    this.monsterSpriteByNpcKey = new Map();
    this.revealedMonsterNpcKeys = new Set();
    this.pendingMonsterUnlockNpcKeys = [];
    this.encounterProgressByNpcKey = new Map();
    this.encounterState = null;
    this.missionText = null;
    this.lastMissionSnapshot = '';
    this.questTitleText = null;
    this.questStepsText = null;
    this.claimRewardButton = null;
    this.mapBannerText = null;
    this.mapSignalText = null;
    this.mapEventButton = null;
    this.sideChallengeButton = null;
    this.eventOverlay = null;
    this.eventPanel = null;
    this.mapCompletionRecorded = false;
    this.mapStartedCompleted = false;
  }
  
  // mapConfig is passed in from WorldMapScene via scene.start()
  init(data) {
    this.mapConfig = data?.mapConfig || { mapKey: 'map1' };
    this.editorMapData = this.mapConfig?.editorMapData || null;
    this.npcs = [];
    this.monsters = [];
    this.npcSprites = [];
    this.monsterSprites = [];
    this.collisionBodies = [];
    this.npcMonsterMap = new Map();
    this.monsterSpriteByNpcKey = new Map();
    this.revealedMonsterNpcKeys = new Set();
    this.pendingMonsterUnlockNpcKeys = [];
    this.encounterProgressByNpcKey = new Map();
    this.encounterState = null;
    this.lastMissionSnapshot = '';
    this.closestNpcSprite = null;
    this.questTitleText = null;
    this.questStepsText = null;
    this.claimRewardButton = null;
    this.mapBannerText = null;
    this.mapSignalText = null;
    this.mapEventButton = null;
    this.sideChallengeButton = null;
    this.eventOverlay = null;
    this.eventPanel = null;
    this.mapCompletionRecorded = false;
    this.mapStartedCompleted = false;

    if (!this.mapConfig.mapKey && !this.mapConfig.isEditorMap && !this.editorMapData) {
      const raw = String(this.mapConfig.asset || this.mapConfig.name || '').toLowerCase();
      if (raw.includes('forest')) this.mapConfig.mapKey = 'map1';
      else if (raw.includes('cave')) this.mapConfig.mapKey = 'map2';
      else if (raw.includes('mountain')) this.mapConfig.mapKey = 'map3';
      else this.mapConfig.mapKey = 'map1';
    }

    const learner = gameState.getLearner();
    this.mapConfig = mapDiscoveryService.buildCatalog([this.mapConfig], learner)[0] || this.mapConfig;
  }

  async create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // // Create simple background
    // this.add.rectangle(0, 0, width, height, 0x2d5016).setOrigin(0);
    
    // // Add grid pattern for visual interest
    // this.createGrid();

    if (!this.editorMapData) {
      await this.tryLoadEditorMapData();
    }

    // Build the tilemap
    this.createTilemap();

    // Create player
    this.playerCtrl = new SoldierController(this, width, height);
    if (this.collisionLayers?.length) {
      this.collisionLayers.forEach((layer) => {
        this.physics.add.collider(this.playerCtrl.sprite, layer);
      });
    }
    if (this.collisionBodies?.length) {
      this.collisionBodies.forEach((body) => {
        this.physics.add.collider(this.playerCtrl.sprite, body);
      });
    }
    // this.createPlayer();

    // ORIGINAL CODE - Uncomment when backend is ready:
    /*
    // Load NPCs and Monsters
    await this.loadEntities();
    */

    // Setup camera
    this.cameras.main.startFollow(this.playerCtrl.sprite);
    // this.cameras.main.setBounds(0, 0, width, height);
    if (this.map) {
      this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
      this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    }
    this.playerCtrl?.sprite?.setCollideWorldBounds(true);
    
    // Setup controls
    this.cursors = this.input.keyboard.createCursorKeys();

    // Add UI buttons
    this.createUI();
    try {
      const currentMap = gameState.getCurrentMap();
      const mapId = currentMap?.mapId || currentMap?.id;
      if (mapId) {
        const [monsters, npcs, encounterState] = await Promise.all([
          apiService.getMonstersByMap(mapId),
          apiService.getNPCsByMap(mapId),
          apiService.getEncounterState(mapId).catch(() => null)
        ]);
        this.monsters = monsters || [];
        this.npcs = npcs || [];
        this.encounterState = encounterState;
        this.hydrateEncounterProgress();
      } else {
        this.monsters = [];
        this.npcs = [];
        this.encounterState = null;
      } 

      this.createMonsterAnimations();
      this.createNPCAnimations();
      this.createNpcMonsterMapping();
      this.createNPCs();
      this.createMonsters();
      this.mapStartedCompleted = this.isQuestChainComplete();
      this.updateAllNpcVisualStates();
      this.updateMonsterVisualStates();
      this.updateMissionPanel();
      this.updateQuestPanel();

    } catch (e) {
      console.error('Failed to load monsters for map:', e);
      this.monsters = [];
      this.npcs = this.npcs || [];
      this.encounterState = null;
      this.encounterProgressByNpcKey.clear();
      this.createNpcMonsterMapping();
      this.mapStartedCompleted = this.isQuestChainComplete();
      this.updateAllNpcVisualStates();
      this.updateMissionPanel();
      this.updateQuestPanel();
    }

    // Interactions
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.interactPromptBg = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height - 40,
      760,
      44,
      0x08122e,
      0.95
    ).setStrokeStyle(2, HUD.border, 0.85).setScrollFactor(0).setDepth(100).setVisible(false);
    this.interactPrompt = this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 40, '', {
      fontSize: '18px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      fontStyle: 'bold',
      color: HUD.textMain,
      stroke: '#060814',
      strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101).setVisible(false);

    this.events.on('resume', this.handleSceneResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off('resume', this.handleSceneResume, this);
      this.destroyEventPanel();
    });
  }

  createGrid() {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x3d6b1f, 0.3);
    
    for (let x = 0; x < this.cameras.main.width; x += 64) {
      graphics.lineBetween(x, 0, x, this.cameras.main.height);
    }
    
    for (let y = 0; y < this.cameras.main.height; y += 64) {
      graphics.lineBetween(0, y, this.cameras.main.width, y);
    }
  }

  createTilemap() {
    if (this.editorMapData) {
      this.createEditorTilemap();
      return;
    }

    const mapKey = this.mapConfig?.mapKey;
    if (!mapKey) {
      console.error('Missing mapKey in mapConfig:', this.mapConfig);
      this.createFallbackArena();
      return;
    }

    try {
      this.map = this.make.tilemap({ key: mapKey });
    } catch (e) {
      console.error('Failed to load tilemap:', mapKey, e);
      this.createFallbackArena();
      return;
    }
    if (!this.map?.tilesets?.length) {
      this.createFallbackArena();
      return;
    }
    const jsonSets = this.cache.tilemap.get(mapKey)?.data?.tilesets || [];
    const tilesets = [];
    for (const ts of this.map.tilesets) {
      const added = this.map.addTilesetImage(ts.name, ts.name);
      if (added) {
        const j = jsonSets.find((t) => t.name === ts.name);
        if (j && (j.margin || j.spacing)) this.fixTilesetTexCoords(added, j);
        tilesets.push(added);
      }
    }
    this.collisionLayers = [];
    this.collisionBodies = [];
    this.map.layers.forEach((ld) => {
      const layer = this.map.createLayer(ld.name, tilesets, 0, 0);
      if (!layer) return;
      const shouldCollideByName = /collision|collide|wall|blocked|barrier/i.test(String(ld.name || ''));
      layer.setCollisionByProperty({ collides: true });
      if (shouldCollideByName) {
        layer.setCollisionByExclusion([-1]);
      }
      if (shouldCollideByName || layer.layer.properties?.some?.((prop) => prop.name === 'collides' && prop.value === true)) {
        this.collisionLayers.push(layer);
      }
    });
  }

  createFallbackArena() {
    const arenaWidth = 2200;
    const arenaHeight = 1400;
    this.map = {
      widthInPixels: arenaWidth,
      heightInPixels: arenaHeight
    };
    this.collisionLayers = [];
    this.collisionBodies = [];

    this.add.rectangle(arenaWidth / 2, arenaHeight / 2, arenaWidth, arenaHeight, 0x213a24).setDepth(-20);

    const wallDefs = [
      { x: arenaWidth / 2, y: 20, w: arenaWidth, h: 40 },
      { x: arenaWidth / 2, y: arenaHeight - 20, w: arenaWidth, h: 40 },
      { x: 20, y: arenaHeight / 2, w: 40, h: arenaHeight },
      { x: arenaWidth - 20, y: arenaHeight / 2, w: 40, h: arenaHeight },
      { x: arenaWidth / 2, y: arenaHeight / 2, w: 180, h: 220 },
      { x: arenaWidth / 2 + 380, y: arenaHeight / 2 - 180, w: 160, h: 160 }
    ];

    wallDefs.forEach((wall) => {
      const rect = this.add.rectangle(wall.x, wall.y, wall.w, wall.h, 0x314d38, 1).setDepth(-10);
      this.physics.add.existing(rect, true);
      this.collisionBodies.push(rect);
    });
  }

  async tryLoadEditorMapData() {
    const isEditorMap = this.mapConfig?.isEditorMap || String(this.mapConfig?.asset || '').startsWith('editor-draft:');
    const mapId = this.mapConfig?.mapId || this.mapConfig?.id;
    if (!isEditorMap || !mapId) return;

    try {
      const payload = await apiService.getEditorMapData(mapId);
      if (payload?.layers) {
        this.editorMapData = payload;
      }
    } catch (e) {
      console.error('Failed to load editor map payload:', e);
    }
  }

  createEditorTilemap() {
    const payload = this.editorMapData || {};
    const tileSize = Number(payload.tileSize || 32);
    const width = Number(payload.width || 60);
    const height = Number(payload.height || 34);
    const tilesetKey = payload.tilesetKey || 'terrain_tiles_v2.1';

    this.map = this.make.tilemap({
      tileWidth: tileSize,
      tileHeight: tileSize,
      width,
      height
    });

    const tileset = this.map.addTilesetImage(tilesetKey, tilesetKey, tileSize, tileSize, 0, 0);
    this.collisionLayers = [];

    const layerDefs = [
      ['ground', payload.layers?.ground, 1],
      ['decor', payload.layers?.decor, 2],
      ['collision', payload.layers?.collision, 3]
    ];

    layerDefs.forEach(([name, data, depth]) => {
      const layer = this.map.createBlankLayer(name, tileset, 0, 0);
      if (!layer || !Array.isArray(data)) return;
      layer.setDepth(depth);
      if (name === 'collision') layer.setAlpha(0.6);

      for (let y = 0; y < data.length; y += 1) {
        const row = data[y];
        if (!Array.isArray(row)) continue;
        for (let x = 0; x < row.length; x += 1) {
          layer.putTileAt(Number.isInteger(row[x]) ? row[x] : -1, x, y);
        }
      }

      if (name === 'collision') {
        layer.setCollisionByExclusion([-1], true);
        this.collisionLayers.push(layer);
      }
    });
  }

  // Tiled formula for tex coords (uses texture size; Phaser uses different margin formula).
  fixTilesetTexCoords(tileset, j) {
    const tw = j.tilewidth ?? 32, th = j.tileheight ?? 32, m = j.margin ?? 0, s = j.spacing ?? 0;
    const src = tileset.image?.source?.[0];
    const w = src?.width ?? j.imagewidth ?? 0, h = src?.height ?? j.imageheight ?? 0;
    if (!w || !h) return;
    const cols = Math.floor((w - m + s) / (tw + s)), rows = Math.floor((h - m + s) / (th + s));
    tileset.rows = rows;
    tileset.columns = cols;
    tileset.total = cols * rows;
    tileset.texCoordinates.length = 0;
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++)
        tileset.texCoordinates.push({ x: m + col * (tw + s), y: m + row * (th + s) });
  }

  createPlayer() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const hasTexture = this.textures.exists('soldier');
    // Create player sprite (simple circle for now)
    this.player = this.physics.add.sprite(width / 2, height / 2, hasTexture ? 'soldier' : '', 0);
    
    // Draw player as a circle
    if(hasTexture) {
      this.player.setScale(4);
    } else {
      const graphics = this.add.graphics();
      graphics.fillStyle(0x4a90e2, 1);
      graphics.fillCircle(0, 0, 20);
      graphics.generateTexture('player', 40, 40);
      graphics.destroy();
      this.player.setTexture('player');
    }

    Object.entries(soldier.anims).forEach(([name, cfg]) => {
      const key = name;
      if (this.anims.exists(key)) return;

      const frames = Array.from({ length: cfg.count }, (_, i) => cfg.row * soldier.maxCols + i);
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(soldier.sheetKey, { frames }),
        frameRate: cfg.frameRate,
        repeat: cfg.repeat
      });
    });

    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.play('idle');
  }

  async loadEntities() {
    try {
      // Load NPCs
      this.npcs = await apiService.getAllNPCs();
      this.createNPCs();

      // Load Monsters
      this.monsters = await apiService.getAllMonsters();
      this.createMonsters();
    } catch (error) {
      console.error('Failed to load entities:', error);
    }
  }

  createNPCs() {
    const columns = 4;
    const spacingX = 170;
    const spacingY = 120;
    const startX = 220;
    const startY = 440;
    this.npcs.forEach((npc, index) => {
      if(!npc || !npc.name) return;
      const col = index % columns;
      const row = Math.floor(index / columns);
      const jitterX = Phaser.Math.Between(-20, 20);
      const jitterY = Phaser.Math.Between(-12, 12);
      const x = startX + col * spacingX + jitterX;
      const y = startY + row * spacingY + jitterY;

      const npcName = npc.name
      const cfg = NPCRegistry[npcName] || NPCRegistry.orc;
      if (!this.textures.exists(npcName)) {
        console.warn(`Missing texture for ${npc.asset}`);
      }

      const npc_sprite = this.physics.add.sprite(x, y, npcName, 0);
      npc_sprite.setScale(cfg.scale);
      npc_sprite.setDepth(5);
      npc_sprite.setData('npc', npc);
      npc_sprite.setData('labelOffsetY', cfg.labelOffsetY);
      npc_sprite.setData('npcKey', this.getNpcKey(npc));

      const nameText = this.add.text(x, y, npcName, {
        fontSize: '14px',
        fontFamily: 'Trebuchet MS, Verdana, sans-serif',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 6, y: 3 }
      }).setOrigin(0.5,1);
      this.placeNameLabel(npc_sprite, nameText, cfg.labelOffsetY);
      npc_sprite.setData('nameText', nameText);

      const statusBadge = this.add.text(x, y - 56, '', {
        fontSize: '12px',
        fontFamily: 'Trebuchet MS, Verdana, sans-serif',
        fontStyle: 'bold',
        color: HUD.textSub,
        backgroundColor: '#0a1128',
        padding: { x: 6, y: 2 }
      }).setOrigin(0.5, 1).setDepth(6);
      npc_sprite.setData('statusBadge', statusBadge);

      npc_sprite.play(`${npcName}_idle`, true)
      this.npcSprites.push(npc_sprite);
    });
  }

  createMonsters() {
    const mappings = Array.from(this.npcMonsterMap.entries());
    const totalMonsters = mappings.length;
    mappings.forEach(([npcKey, mapping], index) => {
      const monster = mapping.monster;
      const npcSprite = this.npcSprites.find((sprite) => sprite.getData('npcKey') === npcKey);
      if (!monster || !npcSprite) return;

      const encounterMonster = {
        ...monster,
        npcId: this.getNpcId(mapping.npc),
        encounterIndex: index,
        totalMonsters,
        isBossEncounter: Boolean(mapping?.pair?.bossEncounter) || (totalMonsters > 0 && index === totalMonsters - 1)
      };
      const x = npcSprite.x + 90;
      const y = npcSprite.y - 20;

      const monsterName = encounterMonster.name
      const cfg = monsterRegistry[monsterName] || monsterRegistry.orc;
      if (!this.textures.exists(monsterName)) {
        console.warn(`Missing texture for ${encounterMonster.asset}, fallback to orc`);
      }

      const m_sprite = this.physics.add.sprite(x, y, monsterName, 0);
      m_sprite.setScale(cfg.scale);
      m_sprite.setDepth(4);
      m_sprite.setInteractive();
      m_sprite.setData('monster', encounterMonster);
      m_sprite.setData('npcKey', npcKey);
      m_sprite.setVisible(false);
      m_sprite.setActive(false);
      m_sprite.body.enable = false;
      m_sprite.disableInteractive();

      const labelName = encounterMonster.isBossEncounter ? `${monsterName} [BOSS]` : monsterName;
      const nameText = this.add.text(x, y, labelName, {
        fontSize: '14px',
        fontFamily: 'Trebuchet MS, Verdana, sans-serif',
        fontStyle: 'bold',
        color: '#ffe8cc',
        backgroundColor: '#2a1010',
        padding: { x: 6, y: 3 }
      }).setOrigin(0.5,1);
      this.placeNameLabel(m_sprite, nameText, cfg.labelOffsetY);
      nameText.setVisible(false);
      m_sprite.setData('nameText', nameText);
      m_sprite.setData('labelOffsetY', cfg.labelOffsetY);
      m_sprite.setData('baseLabel', labelName);

      m_sprite.play(`${monsterName}_idle`, true);
      m_sprite.on('pointerdown', () => this.encounterMonster(encounterMonster));
      this.monsterSprites.push(m_sprite);
      this.monsterSpriteByNpcKey.set(npcKey, m_sprite);

      if (this.shouldMonsterBeUnlockedForNpc(mapping.npc)) {
        this.revealMonsterForNpc(mapping.npc, { animate: false, silent: true });
      }
      this.updateMonsterVisualState(m_sprite);
    });
  }

  createMonsterAnimations() {
    Object.entries(monsterRegistry).forEach(([monsterType, def]) => {
      Object.entries(def.anims || {}).forEach(([animName, a]) => {
        const key = `${monsterType}_${animName}`; // e.g. orc_idle
        if (this.anims.exists(key)) return;

        const frames = Array.from(
          { length: a.count },
          (_, i) => a.row * def.maxCols + i
        );

        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(def.key, { frames }),
          frameRate: a.frameRate,
          repeat: a.repeat
        });
      });
    });
  }

  createNPCAnimations() {
    Object.entries(NPCRegistry).forEach(([npcType, def]) => {
      Object.entries(def.anims || {}).forEach(([animName, a]) => {
        const key = `${npcType}_${animName}`; 
        if (this.anims.exists(key)) return;

        const frames = Array.from(
          { length: a.count },
          (_, i) => a.row * def.maxCols + i
        );

        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(def.key, { frames }),
          frameRate: a.frameRate,
          repeat: a.repeat
        });
      });
    });
  }

  createUI() {
    const width = this.cameras.main.width;
    const makeHudBtn = (cx, cy, label, fillNormal, fillHover, onClick) => {
      const w = 120;
      const h = 40;
      const c = this.add.container(cx - w / 2, cy - h / 2).setScrollFactor(0).setDepth(120);
      const bg = this.add.graphics();
      const draw = (fill, border) => {
        bg.clear();
        bg.fillStyle(fill, 1);
        bg.fillRoundedRect(0, 0, w, h, 6);
        bg.lineStyle(2, border, 0.95);
        bg.strokeRoundedRect(0, 0, w, h, 6);
        bg.fillStyle(0xffffff, 0.08);
        bg.fillRoundedRect(2, 2, w - 4, h * 0.45, { tl: 4, tr: 4, bl: 0, br: 0 });
      };
      draw(fillNormal, HUD.border);
      const txt = this.add.text(w / 2, h / 2, label, {
        fontSize: '18px',
        fontFamily: 'Trebuchet MS, Verdana, sans-serif',
        fontStyle: 'bold',
        color: HUD.textMain,
        stroke: '#060814',
        strokeThickness: 4
      }).setOrigin(0.5);
      const hit = this.add.rectangle(w / 2, h / 2, w, h, 0, 0).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => draw(fillHover, HUD.borderGlow));
      hit.on('pointerout', () => draw(fillNormal, HUD.border));
      hit.on('pointerdown', () => draw(0x120722, 0x604008));
      hit.on('pointerup', () => { draw(fillHover, HUD.borderGlow); onClick(); });
      c.add([bg, txt, hit]);
      return {
        container: c,
        text: txt,
        hit,
        setEnabled: (enabled) => {
          if (enabled) {
            hit.setInteractive({ useHandCursor: true });
            c.setAlpha(1);
            draw(fillNormal, HUD.border);
          } else {
            hit.disableInteractive();
            c.setAlpha(0.45);
            draw(fillNormal, 0x3c3552);
          }
        }
      };
    };

    makeHudBtn(width - 80, 90, 'SHOP', HUD.btnBlue, HUD.btnBlueHover, () => {
      this.scene.launch('ShopScene');
      this.scene.pause();
    });
    makeHudBtn(80, 90, 'BACK', HUD.btnPurple, HUD.btnPurpleHover, () => {
      this.scene.start('WorldMapScene', { selectedMapId: this.mapConfig?.mapId || this.mapConfig?.id });
    });

    const missionCard = this.add.graphics().setScrollFactor(0).setDepth(119);
    missionCard.fillStyle(HUD.cardBg, 0.92);
    missionCard.fillRoundedRect(width / 2 - 250, 70, 500, 54, 8);
    missionCard.lineStyle(2, HUD.border, 0.8);
    missionCard.strokeRoundedRect(width / 2 - 250, 70, 500, 54, 8);
    this.missionText = this.add.text(width / 2, 97, 'Syncing objectives...', {
      fontSize: '17px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      fontStyle: 'bold',
      color: HUD.textMain,
      stroke: '#060814',
      strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(120);

    const bannerCard = this.add.graphics().setScrollFactor(0).setDepth(119);
    bannerCard.fillStyle(HUD.cardBg, 0.92);
    bannerCard.fillRoundedRect(32, 150, 280, 124, 8);
    bannerCard.lineStyle(2, HUD.border, 0.82);
    bannerCard.strokeRoundedRect(32, 150, 280, 124, 8);
    this.mapBannerText = this.add.text(46, 164, '', {
      fontSize: '18px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      fontStyle: 'bold',
      color: HUD.textMain,
      stroke: '#060814',
      strokeThickness: 3,
      wordWrap: { width: 252 }
    }).setScrollFactor(0).setDepth(120);
    this.mapSignalText = this.add.text(46, 198, '', {
      fontSize: '13px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      color: HUD.textSub,
      lineSpacing: 5,
      wordWrap: { width: 252 }
    }).setScrollFactor(0).setDepth(120);

    this.mapEventButton = makeHudBtn(
      172,
      292,
      'EVENT',
      0x714915,
      0x93621d,
      () => this.openMapEventPanel()
    );

    this.sideChallengeButton = makeHudBtn(
      172,
      340,
      'DUEL',
      0x28491f,
      0x3c6d2c,
      () => this.openSideChallenge()
    );

    const questX = width - 290;
    const questY = 160;
    const questW = 250;
    const questH = 230;
    const questCard = this.add.graphics().setScrollFactor(0).setDepth(119);
    questCard.fillStyle(HUD.cardBg, 0.95);
    questCard.fillRoundedRect(questX, questY, questW, questH, 8);
    questCard.lineStyle(2, HUD.border, 0.82);
    questCard.strokeRoundedRect(questX, questY, questW, questH, 8);

    this.questTitleText = this.add.text(questX + 14, questY + 12, 'Quest Chain', {
      fontSize: '18px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      fontStyle: 'bold',
      color: '#ffeac8',
      stroke: '#060814',
      strokeThickness: 3
    }).setScrollFactor(0).setDepth(120);

    this.questStepsText = this.add.text(questX + 14, questY + 42, 'Loading...', {
      fontSize: '14px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      color: HUD.textMain,
      lineSpacing: 6,
      wordWrap: { width: questW - 28 }
    }).setScrollFactor(0).setDepth(120);

    this.claimRewardButton = makeHudBtn(
      questX + questW / 2,
      questY + questH - 30,
      'CLAIM',
      0x1f6d34,
      0x2d9150,
      () => this.claimActiveQuestReward()
    );
    this.claimRewardButton.setEnabled(false);
    this.refreshMapSignalPanel();
  }

  interactWithNPC(npc) {
    const mapping = this.npcMonsterMap.get(this.getNpcKey(npc));
    if (mapping) {
      this.queueMonsterUnlockForNpc(npc);
      void this.syncNpcInteraction(npc);
    }
    const contentId = npc?.contentId || npc?.content_id;
    const payload = {
      contentId,
      topicId: npc?.topicId || npc?.topic_id || null,
      npcId: npc?.npcId || npc?.npc_id || null
    };

    if (contentId) {
      gameState.enrollLesson(contentId, payload);
      void apiService.enrollLessonProgress(payload)
        .then((saved) => gameState.upsertLessonProgress(saved))
        .catch((e) => console.warn('Enroll sync failed:', e));
    }

    const lessonPages = this.buildLessonPages(npc);
    this.scene.launch('DialogueScene', { npc, lessonPages });
    this.scene.pause();
  }

  buildLessonPages(npc) {
    const title = npc.contentTitle || 'Lesson';
    const topic = npc.topicName || 'Topic';
    // const body = (npc.contentBody || '').trim();
    const rawBody = (npc.contentBody || '').trim();
    const videoUrl = npc.videoUrl || null;

    const pages = [];

    // Try JSON array first (AI-generated), then fall back to \n split (manual)
    let lines = [];
    if (rawBody) {
      try {
        const parsed = JSON.parse(rawBody);
        if (Array.isArray(parsed)) {
          lines = parsed.map(l => String(l).trim()).filter(Boolean);
        }
      } catch {
        lines = rawBody
          .replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n')
          .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
          .split(/\n+/).map(s => s.trim()).filter(Boolean);
      }
    }

    if (lines.length === 0) {
      pages.push({
        lessonTitle: title,
        lessonBody: 'No lesson content yet.',
        narration: `Today we learn: ${topic}`,
        mediaType: 'text'
      });
    } else {
      lines.forEach((line, i) => {
        pages.push({
          lessonTitle: `${title} (${i + 1}/${lines.length})`,
          lessonBody: line,
          narration: `Today we learn: ${topic}`,
          mediaType: 'text'
        });
      });
    }

    // Inject video page for this NPC if configured
    if (videoUrl ) {
      const clampedIndex = Math.max(0, pages.length);
      pages.splice(clampedIndex, 0, {
        lessonTitle: `${title} (Video)`,
        lessonBody: '',
        narration: 'Watch this short lesson clip.',
        mediaType: 'video',
        videoUrl 
      });
    }

    return pages;

  }

  getLessonKey(npc) {
    return String(
      npc?.contentId ||
      npc?.content_id ||
      npc?.npcId ||
      npc?.npc_id ||
      `${npc?.name || 'npc'}:${npc?.topicName || 'topic'}`
    );
  }

  encounterMonster(monster) {
    const npcId = monster?.npcId || null;
    const npcKey = npcId ? String(npcId) : null;
    if (npcKey && !this.isMonsterInteractableForNpcKey(npcKey)) {
      this.showMapToast('Clear the current quest step before facing this monster.');
      return;
    }
    if (npcId) {
      const progress = this.encounterProgressByNpcKey.get(String(npcId));
      if (progress?.monsterDefeated) {
        this.showMapToast('Monster already defeated. Claim your reward from the quest panel.');
        return;
      }
    }

    console.log('Encountering monster:', monster.name);
    const currentMap = gameState.getCurrentMap();
    const mapId = currentMap?.mapId || currentMap?.id || this.mapConfig?.mapId || null;
    let eventAssist = null;
    if ((this.mapConfig?.playerState?.assistCharges || 0) > 0) {
      mapDiscoveryService.consumeAssist(this.mapConfig);
      this.mapConfig = mapDiscoveryService.buildCatalog([this.mapConfig], gameState.getLearner())[0] || this.mapConfig;
      gameState.setCurrentMap(this.mapConfig);
      this.refreshMapSignalPanel();
      eventAssist = {
        label: 'Oracle support',
        questionReduction: 2,
        startingMonsterHpPercent: 82
      };
    }
    this.scene.start('CombatScene', { monster, mapId, npcId, eventAssist });
  }

  update() {
    this.playerCtrl?.update?.();
    this.updateNpcInteraction();

    // Update NPC name positions
    this.npcSprites.forEach(sprite => {
      const nameText = sprite.getData('nameText');
      if (nameText) {
        const offsetY = sprite.getData('labelOffsetY') || -30;
        this.placeNameLabel(sprite, nameText, offsetY);
      }
      const statusBadge = sprite.getData('statusBadge');
      if (statusBadge) statusBadge.setPosition(sprite.x, sprite.y - 58);
    });

    // Update Monster name positions
    this.monsterSprites.forEach(sprite => {
      const nameText = sprite.getData('nameText');
      if (nameText) {
        const offsetY = sprite.getData('labelOffsetY') || -30;
        this.placeNameLabel(sprite, nameText, offsetY);
      }
    });
  }

  placeNameLabel(sprite, nameText, offsetY) {
    const topY = sprite.y - (sprite.displayHeight * sprite.originY);
    nameText.setPosition(sprite.x, topY + offsetY);
  }

  updateNpcInteraction() {
    const player = this.playerCtrl?.sprite;
    if (!player || !this.interactPrompt) return;

    this.npcSprites = this.npcSprites.filter((sprite) => {
      return sprite && sprite.active && sprite.body && sprite.getData('npc');
    });

    let closest = null;
    let closestDist = Number.POSITIVE_INFINITY;

    for (const npcSprite of this.npcSprites) {
      const dist = Phaser.Math.Distance.Between(player.x, player.y, npcSprite.x, npcSprite.y);
      if (dist < closestDist) {
        closestDist = dist;
        closest = npcSprite;
      }
    }

    const inRange = closest && closestDist <= this.npcInteractDistance;

    if (inRange) {
      const npc = closest.getData('npc');
      if (!npc || !npc.name) {
        this.closestNpcSprite = null;
        this.interactPrompt.setVisible(false);
        return;
      }
      
      this.closestNpcSprite = closest;
      const progressState = this.getProgressState(npc);
      const mapping = this.npcMonsterMap.get(this.getNpcKey(npc));
      const monsterName = mapping?.monster?.name || 'monster';
      const spawned = this.revealedMonsterNpcKeys.has(this.getNpcKey(npc));
      this.interactPrompt.setText(
        `Press E to talk to ${npc.name}  |  ${progressState.toUpperCase()}  |  ${monsterName}: ${spawned ? 'spawned' : 'locked'}`
      );
      this.interactPromptBg?.setVisible(true);
      this.interactPrompt.setVisible(true);

      if (Phaser.Input.Keyboard.JustDown(this.interactKey) && !this.scene.isActive('DialogueScene') && !this.isDomInputFocused()) {
        this.interactWithNPC(npc);
        this.interactPromptBg?.setVisible(false);
        this.interactPrompt.setVisible(false);
      }
    } else {
      this.closestNpcSprite = null;
      this.interactPromptBg?.setVisible(false);
      this.interactPrompt.setVisible(false);
    }
  }

  createNpcMonsterMapping() {
    this.npcMonsterMap.clear();
    const pairRows = Array.isArray(this.encounterState?.pairs) ? [...this.encounterState.pairs] : [];

    if (pairRows.length) {
      const npcById = new Map(this.npcs.map((npc) => [String(this.getNpcId(npc) || ''), npc]));
      const monsterById = new Map(this.monsters.map((monster) => [String(this.getMonsterId(monster) || ''), monster]));
      let resolvedPairs = 0;

      pairRows
        .sort((a, b) => (a?.encounterOrder ?? 0) - (b?.encounterOrder ?? 0))
        .forEach((pair) => {
          const npc = npcById.get(String(pair?.npcId || ''));
          const monster = monsterById.get(String(pair?.monsterId || ''));
          if (!npc || !monster) return;
          resolvedPairs += 1;
          this.npcMonsterMap.set(this.getNpcKey(npc), {
            npc,
            monster: {
              ...monster,
              name: pair?.monsterName || monster?.name
            },
            pair
          });
        });
      if (resolvedPairs > 0) return;
    }

    const maxPairs = Math.min(this.npcs.length, this.monsters.length);
    for (let i = 0; i < maxPairs; i += 1) {
      const npc = this.npcs[i];
      const monster = this.monsters[i];
      if (!npc || !monster) continue;
      this.npcMonsterMap.set(this.getNpcKey(npc), { npc, monster, pair: null });
    }
  }

  getNpcKey(npc) {
    return String(this.getNpcId(npc) || npc?.name || 'npc-unknown');
  }

  getCurrentMapId() {
    const currentMap = gameState.getCurrentMap();
    return currentMap?.mapId || currentMap?.id || this.mapConfig?.mapId || null;
  }

  getNpcId(npc) {
    return npc?.npcId || npc?.npc_id || null;
  }

  getMonsterId(monster) {
    return monster?.monster_id || monster?.monsterId || null;
  }

  applyEncounterProgress(progress) {
    if (!progress?.npcId) return;
    const npcKey = String(progress.npcId);
    const existing = this.encounterProgressByNpcKey.get(npcKey) || {};
    this.encounterProgressByNpcKey.set(npcKey, { ...existing, ...progress });
  }

  hydrateEncounterProgress() {
    this.encounterProgressByNpcKey.clear();
    const rows = Array.isArray(this.encounterState?.progress) ? this.encounterState.progress : [];
    rows.forEach((progress) => this.applyEncounterProgress(progress));
  }

  getEncounterProgress(npc) {
    return this.encounterProgressByNpcKey.get(this.getNpcKey(npc)) || null;
  }

  getProgressState(npc) {
    const encounter = this.getEncounterProgress(npc);
    const lessonKey = this.getLessonKey(npc);
    const progress = gameState.lessonProgress?.[lessonKey];
    if (encounter?.rewardClaimed || encounter?.monsterDefeated) return 'completed';
    if (gameState.isLessonComplete(lessonKey)) return 'completed';
    if (encounter?.npcInteracted || encounter?.monsterUnlocked) return 'interacted';
    if (progress) return 'interacted';
    return 'new';
  }

  updateAllNpcVisualStates() {
    this.npcSprites.forEach((sprite) => this.updateNpcVisualState(sprite));
  }

  updateNpcVisualState(npcSprite) {
    const npc = npcSprite?.getData('npc');
    const badge = npcSprite?.getData('statusBadge');
    const nameText = npcSprite?.getData('nameText');
    if (!npc || !badge || !nameText) return;

    const state = this.getProgressState(npc);
    const encounter = this.getEncounterProgress(npc);
    if (encounter?.rewardClaimed) {
      badge.setText('CLAIMED');
      badge.setColor(HUD.textGood);
      npcSprite.setTint(0xb8ffd8);
      nameText.setColor('#d9ffe8');
    } else if (state === 'completed') {
      badge.setText('DONE');
      badge.setColor(HUD.textGood);
      npcSprite.setTint(0xb8ffd8);
      nameText.setColor('#d9ffe8');
    } else if (state === 'interacted') {
      badge.setText('TALKED');
      badge.setColor(HUD.textWarn);
      npcSprite.clearTint();
      nameText.setColor('#ffe6ad');
    } else {
      badge.setText('NEW');
      badge.setColor(HUD.textSub);
      npcSprite.clearTint();
      nameText.setColor('#ffffff');
    }
  }

  updateMonsterVisualStates() {
    this.monsterSprites.forEach((sprite) => this.updateMonsterVisualState(sprite));
  }

  updateMonsterVisualState(monsterSprite) {
    const npcKey = monsterSprite?.getData('npcKey');
    if (!npcKey) return;
    const progress = this.encounterProgressByNpcKey.get(npcKey);
    const nameText = monsterSprite.getData('nameText');
    const baseLabel = monsterSprite.getData('baseLabel') || monsterSprite.getData('monster')?.name || 'Monster';
    const interactable = this.isMonsterInteractableForNpcKey(npcKey);

    if (progress?.monsterDefeated) {
      monsterSprite.setTint(0x97b59d);
      monsterSprite.disableInteractive();
      if (monsterSprite.body) monsterSprite.body.enable = false;
      if (nameText) {
        nameText.setText(`${baseLabel} [DEFEATED]`);
        nameText.setColor('#b8ffd8');
      }
      return;
    }

    monsterSprite.clearTint();
    if (nameText) {
      nameText.setText(interactable ? baseLabel : `${baseLabel} [LOCKED]`);
      nameText.setColor(interactable ? '#ffe8cc' : '#c0a8e0');
    }
    if (monsterSprite.visible && interactable) {
      monsterSprite.setInteractive({ useHandCursor: true });
      if (monsterSprite.body) monsterSprite.body.enable = true;
    } else {
      monsterSprite.disableInteractive();
      if (monsterSprite.body) monsterSprite.body.enable = false;
      monsterSprite.setTint(0x6f7392);
    }
  }

  isMonsterInteractableForNpcKey(npcKey) {
    const activeQuest = this.getActiveQuest();
    if (!activeQuest) return true;
    const progress = this.encounterProgressByNpcKey.get(npcKey);
    if (progress?.monsterDefeated || progress?.rewardClaimed) return true;
    return activeQuest.npcKey === npcKey;
  }

  shouldMonsterBeUnlockedForNpc(npc) {
    const key = this.getNpcKey(npc);
    if (this.revealedMonsterNpcKeys.has(key)) return true;
    const progress = this.getEncounterProgress(npc);
    if (progress?.monsterUnlocked || progress?.monsterDefeated || progress?.rewardClaimed) return true;
    const lessonState = this.getProgressState(npc);
    return lessonState === 'interacted' || lessonState === 'completed';
  }

  queueMonsterUnlockForNpc(npc) {
    const key = this.getNpcKey(npc);
    if (this.revealedMonsterNpcKeys.has(key)) return;
    if (this.pendingMonsterUnlockNpcKeys.includes(key)) return;
    this.pendingMonsterUnlockNpcKeys.push(key);
    this.updateNpcVisualState(this.npcSprites.find((sprite) => sprite.getData('npcKey') === key));
    this.updateQuestPanel();
  }

  async syncNpcInteraction(npc) {
    const mapId = this.getCurrentMapId();
    const npcId = this.getNpcId(npc);
    if (!mapId || !npcId) return;

    const npcKey = this.getNpcKey(npc);
    const existing = this.encounterProgressByNpcKey.get(npcKey) || {};
    this.encounterProgressByNpcKey.set(npcKey, {
      ...existing,
      npcId,
      monsterId: existing.monsterId || this.getMonsterId(this.npcMonsterMap.get(npcKey)?.monster),
      npcInteracted: true,
      monsterUnlocked: true
    });
    this.updateAllNpcVisualStates();
    this.updateMissionPanel();
    this.updateQuestPanel();

    try {
      const saved = await apiService.markEncounterNpcInteracted(mapId, npcId);
      this.applyEncounterProgress(saved);
      this.updateAllNpcVisualStates();
      this.updateMissionPanel();
      this.updateQuestPanel();
    } catch (error) {
      console.warn('Failed to sync NPC interaction:', error);
    }
  }

  async refreshEncounterState() {
    const mapId = this.getCurrentMapId();
    if (!mapId) return;

    try {
      const state = await apiService.getEncounterState(mapId);
      this.encounterState = state;
      this.hydrateEncounterProgress();
      this.revealedMonsterNpcKeys.clear();
      this.npcMonsterMap.forEach((mapping) => {
        if (this.shouldMonsterBeUnlockedForNpc(mapping?.npc)) {
          this.revealMonsterForNpc(mapping.npc, { animate: false, silent: true });
        }
      });
    } catch (error) {
      console.warn('Encounter state refresh failed:', error);
    }
  }

  async handleSceneResume() {
    const hasQueuedSpawns = this.pendingMonsterUnlockNpcKeys.length > 0;
    if (!hasQueuedSpawns) {
      await this.refreshEncounterState();
    }
    this.processQueuedMonsterSpawns();
    this.updateAllNpcVisualStates();
    this.updateMonsterVisualStates();
    this.updateMissionPanel();
    this.updateQuestPanel();
    this.refreshMapSignalPanel();
  }

  openSideChallenge() {
    const snapshot = getChallengeSnapshot(this.mapConfig);
    const suffix = snapshot.completed ? ' Practice mode only.' : '';
    this.showMapToast(`${snapshot.challenge.title} ready.${suffix}`, 1200);
    this.scene.launch('SideChallengeScene', { mapConfig: this.mapConfig });
    this.scene.pause();
  }

  processQueuedMonsterSpawns() {
    if (!this.pendingMonsterUnlockNpcKeys.length) return;
    const keys = [...this.pendingMonsterUnlockNpcKeys];
    this.pendingMonsterUnlockNpcKeys = [];
    keys.forEach((npcKey, idx) => {
      const npc = this.npcMonsterMap.get(npcKey)?.npc;
      if (!npc) return;
      this.time.delayedCall(450 * (idx + 1), () => this.revealMonsterForNpc(npc, { animate: true }));
    });
  }

  revealMonsterForNpc(npc, opts = {}) {
    const { animate = true, silent = false } = opts;
    const npcKey = this.getNpcKey(npc);
    if (this.revealedMonsterNpcKeys.has(npcKey)) return;
    const sprite = this.monsterSpriteByNpcKey.get(npcKey);
    if (!sprite) return;

    this.revealedMonsterNpcKeys.add(npcKey);
    const label = sprite.getData('nameText');
    sprite.setVisible(true);
    sprite.setActive(true);
    if (sprite.body) sprite.body.enable = true;
    sprite.setInteractive({ useHandCursor: true });
    if (label) label.setVisible(true);

    if (animate) {
      const finalScale = sprite.scale;
      sprite.setScale(finalScale * 0.35);
      sprite.setAlpha(0);
      this.tweens.add({
        targets: sprite,
        alpha: 1,
        scale: finalScale,
        duration: 900,
        ease: 'Back.Out'
      });
      if (label) {
        label.setAlpha(0);
        this.tweens.add({ targets: label, alpha: 1, duration: 700, ease: 'Sine.Out' });
      }
    }

    if (!silent) {
      const monsterName = sprite.getData('monster')?.name || 'Monster';
      this.interactPrompt.setText(`${monsterName} has appeared!`);
      this.interactPromptBg?.setVisible(true);
      this.interactPrompt.setVisible(true);
      this.time.delayedCall(1300, () => {
        if (!this.closestNpcSprite) {
          this.interactPromptBg?.setVisible(false);
          this.interactPrompt.setVisible(false);
        }
      });
    }
    this.updateMonsterVisualState(sprite);
    this.updateMissionPanel();
    this.updateQuestPanel();
  }

  updateMissionPanel() {
    if (!this.missionText) return;
    const interactedCount = this.npcs.filter((npc) => this.getProgressState(npc) !== 'new').length;
    const completeCount = this.npcs.filter((npc) => this.getProgressState(npc) === 'completed').length;
    const spawnedCount = this.revealedMonsterNpcKeys.size;
    const totalPairs = this.npcMonsterMap.size;
    const summary = `NPCs talked: ${interactedCount}/${this.npcs.length}  |  Lessons done: ${completeCount}/${this.npcs.length}  |  Monsters spawned: ${spawnedCount}/${totalPairs}`;
    if (summary === this.lastMissionSnapshot && this.missionText.text === summary) return;
    this.lastMissionSnapshot = summary;
    this.missionText.setText(summary);
  }

  getOrderedEncounters() {
    return Array.from(this.npcMonsterMap.entries())
      .map(([npcKey, mapping], index) => ({
        npcKey,
        ...mapping,
        encounterOrder: mapping?.pair?.encounterOrder ?? index
      }))
      .sort((a, b) => a.encounterOrder - b.encounterOrder);
  }

  getActiveQuest() {
    const ordered = this.getOrderedEncounters();
    if (!ordered.length) return null;

    for (let i = 0; i < ordered.length; i += 1) {
      const encounter = ordered[i];
      const progress = this.encounterProgressByNpcKey.get(encounter.npcKey);
      if (!progress?.rewardClaimed) {
        return {
          ...encounter,
          progress: progress || null,
          index: i,
          total: ordered.length
        };
      }
    }
    return null;
  }

  getRetryAssistSummary(lossStreak) {
    const streak = Math.max(0, Number(lossStreak || 0));
    const questionReduction = Math.min(3, streak);
    if (questionReduction <= 0) return null;
    const hpPercent = questionReduction === 1 ? 85 : questionReduction === 2 ? 72 : 60;
    return `Retry assist: -${questionReduction} qns, monster starts ${hpPercent}% HP`;
  }

  updateQuestPanel() {
    if (!this.questTitleText || !this.questStepsText || !this.claimRewardButton) return;

    const ordered = this.getOrderedEncounters();
    if (!ordered.length) {
      this.questTitleText.setText('Quest Chain');
      this.questStepsText.setText('No encounter quests on this map.');
      this.claimRewardButton.setEnabled(false);
      return;
    }

    const claimedCount = ordered.filter((encounter) => this.encounterProgressByNpcKey.get(encounter.npcKey)?.rewardClaimed).length;
    const activeQuest = this.getActiveQuest();
    if (!activeQuest) {
      this.questTitleText.setText('Quest Chain Complete');
      this.questStepsText.setText(`All quests cleared.\nRewards claimed: ${claimedCount}/${ordered.length}`);
      this.claimRewardButton.setEnabled(false);
      return;
    }

    const progress = activeQuest.progress || {
      npcInteracted: false,
      monsterDefeated: false,
      rewardClaimed: false,
      lossStreak: 0
    };
    const npcName = activeQuest.npc?.name || activeQuest.pair?.npcName || 'NPC';
    const monsterName = activeQuest.monster?.name || activeQuest.pair?.monsterName || 'Monster';
    const requiredPct = activeQuest.pair?.bossEncounter ? 100 : 90;

    const marker = (done) => (done ? '[x]' : '[ ]');
    const lines = [
      `${marker(Boolean(progress.npcInteracted))} Talk to ${npcName}`,
      `${marker(Boolean(progress.monsterDefeated))} Defeat ${monsterName} (${requiredPct}% quiz)`,
      `${marker(Boolean(progress.rewardClaimed))} Claim reward`,
      `Chain progress: ${claimedCount}/${ordered.length} claimed`
    ];
    const retryInfo = !progress.monsterDefeated ? this.getRetryAssistSummary(progress.lossStreak) : null;
    if (retryInfo) lines.push(retryInfo);
    const assistCharges = this.mapConfig?.playerState?.assistCharges || 0;
    if (assistCharges > 0) lines.push(`Oracle assist ready: ${assistCharges}`);

    this.questTitleText.setText(
      `Quest ${activeQuest.index + 1}/${activeQuest.total}${activeQuest.pair?.bossEncounter ? ' [BOSS]' : ''}`
    );
    this.questStepsText.setText(lines.join('\n'));
    this.claimRewardButton.setEnabled(Boolean(progress.monsterDefeated) && !Boolean(progress.rewardClaimed));
    this.checkForMapCompletion();
  }

  async claimActiveQuestReward() {
    const activeQuest = this.getActiveQuest();
    if (!activeQuest) return;

    const mapId = this.getCurrentMapId();
    const monsterId = activeQuest?.pair?.monsterId || this.getMonsterId(activeQuest?.monster);
    if (!mapId || !monsterId) return;

    try {
      const result = await apiService.claimEncounterReward(mapId, monsterId);
      if (result?.progress) this.applyEncounterProgress(result.progress);

      const learner = gameState.getLearner();
      if (learner && Number.isFinite(result?.learnerTotalXp) && Number.isFinite(result?.learnerLevel)) {
        gameState.setLearner({
          ...learner,
          total_xp: result.learnerTotalXp,
          level: result.learnerLevel
        });
      }

      this.updateAllNpcVisualStates();
      this.updateMonsterVisualStates();
      this.updateMissionPanel();
      this.updateQuestPanel();
      this.refreshMapSignalPanel();
      const xp = Number(result?.xpAwarded || 0);
      dailyQuestService.recordEvent('reward_claimed');
      this.showMapToast(xp > 0 ? `Reward claimed: +${xp} XP` : 'Reward already claimed');
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Reward claim failed';
      this.showMapToast(message);
    }
  }

  showMapToast(message, duration = 1800) {
    if (!this.interactPrompt || !this.interactPromptBg) return;
    this.interactPrompt.setText(String(message));
    this.interactPromptBg.setVisible(true);
    this.interactPrompt.setVisible(true);
    this.time.delayedCall(duration, () => {
      if (!this.closestNpcSprite) {
        this.interactPromptBg?.setVisible(false);
        this.interactPrompt?.setVisible(false);
      }
    });
  }

  isDomInputFocused() {
    const active = document.activeElement;
    if (!active) return false;

    const tag = active.tagName;
    return (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      active.isContentEditable
    );
  }

  refreshMapSignalPanel() {
    if (!this.mapBannerText || !this.mapSignalText) return;
    const event = this.mapConfig?.event;
    const lastChoice = this.mapConfig?.playerState?.lastChoice;
    const challenge = getChallengeSnapshot(this.mapConfig);
    const lines = [
      `${this.mapConfig?.theme || this.mapConfig?.name || 'Map'}  |  ${this.mapConfig?.difficulty || 'Adaptive'}`,
      `${this.mapConfig?.creatorName || 'Unknown creator'} [${this.mapConfig?.creatorBadge || 'Builder'}]`,
      `Likes ${this.mapConfig?.socialProof?.likes || 0}  |  Clears ${this.mapConfig?.socialProof?.completions || 0}`
    ];

    if (lastChoice?.label) {
      lines.push(`Decision locked in: ${lastChoice.label}`);
    } else if (event?.title) {
      lines.push(`Map event ready: ${event.title}`);
    } else {
      lines.push('No special event on this route.');
    }

    lines.push(`Side challenge: ${challenge.challenge.title}${challenge.completed ? ' [CLEARED]' : ' [READY]'}`);

    this.mapBannerText.setText(this.mapConfig?.name || 'Current Gate');
    this.mapSignalText.setText(lines.join('\n'));
    this.mapEventButton?.setEnabled(Boolean(event) && !Boolean(lastChoice?.optionId));
    this.sideChallengeButton?.setEnabled(true);
  }

  openMapEventPanel() {
    const event = this.mapConfig?.event;
    if (!event) {
      this.showMapToast('This map has no authored event.');
      return;
    }
    if (this.mapConfig?.playerState?.lastChoice?.optionId) {
      this.showMapToast('This map decision has already been made.');
      return;
    }
    if (this.eventOverlay) return;

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(180);
    const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x040814, 0.72)
      .setInteractive();
    backdrop.on('pointerup', () => this.destroyEventPanel());
    overlay.add(backdrop);

    const panel = this.add.container(width / 2 - 250, height / 2 - 160);
    const bg = this.add.graphics();
    bg.fillStyle(0x0d1530, 0.98);
    bg.fillRoundedRect(0, 0, 500, 320, 10);
    bg.lineStyle(2, HUD.border, 0.9);
    bg.strokeRoundedRect(0, 0, 500, 320, 10);
    panel.add(bg);

    panel.add(this.add.text(250, 22, event.title, {
      fontSize: '24px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      fontStyle: 'bold',
      color: HUD.textGold,
      stroke: '#060814',
      strokeThickness: 4
    }).setOrigin(0.5, 0));

    panel.add(this.add.text(28, 68, event.intro, {
      fontSize: '15px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      color: HUD.textMain,
      lineSpacing: 6,
      wordWrap: { width: 444 }
    }));

    event.options.forEach((option, index) => {
      const y = 126 + index * 62;
      const btn = this.createEventOptionButton(24, y, 452, 50, option, () => this.applyMapEventChoice(option));
      panel.add(btn);
    });

    panel.add(this.add.text(250, 292, 'Choose once. The world map will remember it.', {
      fontSize: '12px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      color: HUD.textSub
    }).setOrigin(0.5, 0.5));
    panel.add(this.add.text(470, 18, 'X', {
      fontSize: '18px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      fontStyle: 'bold',
      color: HUD.textWarn,
      stroke: '#060814',
      strokeThickness: 3
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.destroyEventPanel()));

    overlay.add(panel);
    this.eventOverlay = overlay;
    this.eventPanel = panel;
  }

  createEventOptionButton(x, y, width, height, option, onClick) {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    const draw = (fill, border) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(0, 0, width, height, 6);
      bg.lineStyle(2, border, 1);
      bg.strokeRoundedRect(0, 0, width, height, 6);
    };

    draw(0x1c274f, HUD.border);
    container.add(bg);
    container.add(this.add.text(14, 9, option.label, {
      fontSize: '15px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      fontStyle: 'bold',
      color: HUD.textMain,
      stroke: '#060814',
      strokeThickness: 3
    }));
    container.add(this.add.text(14, 28, option.summary, {
      fontSize: '12px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      color: HUD.textSub
    }));

    const hit = this.add.rectangle(width / 2, height / 2, width, height, 0, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => draw(0x26376c, HUD.borderGlow));
    hit.on('pointerout', () => draw(0x1c274f, HUD.border));
    hit.on('pointerdown', () => draw(0x131b36, 0x6c4f0e));
    hit.on('pointerup', () => {
      draw(0x26376c, HUD.borderGlow);
      onClick();
    });
    container.add(hit);
    return container;
  }

  applyMapEventChoice(option) {
    const rewards = mapDiscoveryService.recordChoice(this.mapConfig, this.mapConfig.event.id, option);
    const learner = gameState.getLearner();
    if (learner && rewards?.bonusXp) {
      gameState.setLearner({
        ...learner,
        total_xp: Number(learner.total_xp || learner.totalXp || 0) + Number(rewards.bonusXp || 0)
      });
    }

    if (rewards?.revealNextMonster) {
      const nextLocked = this.getOrderedEncounters().find((entry) => !this.revealedMonsterNpcKeys.has(entry.npcKey));
      if (nextLocked?.npc) this.revealMonsterForNpc(nextLocked.npc, { animate: true, silent: true });
    }

    this.mapConfig = mapDiscoveryService.buildCatalog([this.mapConfig], gameState.getLearner())[0] || this.mapConfig;
    gameState.setCurrentMap(this.mapConfig);
    this.refreshMapSignalPanel();
    this.updateQuestPanel();
    this.destroyEventPanel();
    this.showMapToast(option.outcome, 2600);
  }

  destroyEventPanel() {
    if (this.eventOverlay) {
      this.eventOverlay.destroy(true);
    }
    this.eventOverlay = null;
    this.eventPanel = null;
  }

  checkForMapCompletion() {
    if (this.mapCompletionRecorded || this.mapStartedCompleted) return;
    if (!this.isQuestChainComplete()) return;

    const choiceRewards = this.mapConfig?.event?.options?.find(
      (option) => option.id === this.mapConfig?.playerState?.lastChoice?.optionId
    )?.rewards || {};
    mapDiscoveryService.recordCompletion(this.mapConfig, {
      bonusStars: choiceRewards.bonusStars || 0,
      featuredCompletion: Boolean(choiceRewards.featuredCompletion),
      autoLike: false
    });
    this.mapConfig = mapDiscoveryService.buildCatalog([this.mapConfig], gameState.getLearner())[0] || this.mapConfig;
    gameState.setCurrentMap(this.mapConfig);
    this.mapCompletionRecorded = true;
    this.mapStartedCompleted = true;
    this.refreshMapSignalPanel();
    this.showMapToast(`${this.mapConfig.name} logged as a completed run.`, 2400);
  }

  isQuestChainComplete() {
    const ordered = this.getOrderedEncounters();
    return Boolean(ordered.length) && ordered.every((entry) => this.encounterProgressByNpcKey.get(entry.npcKey)?.rewardClaimed);
  }

}
