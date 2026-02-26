import Phaser from 'phaser';
import { supabase } from "../config/supabaseClient";
import { soldier } from '../characters/soldier/Soldier';
import { monsterRegistry } from '../characters/monsters/MonsterRegistry';
import { NPCRegistry } from '../characters/npcs/NPCRegistry';
import { apiService } from '../services/api';
import { gameState } from '../services/gameState';

const P = {
  bgDeep:     0x090f24,
  borderGold: 0xc8870a,
  borderGlow: 0xf0b030,
  accentBlue: 0x4193d5,
  textMain:   '#f0ecff',
  textSub:    '#c0a8e0',
  textGold:   '#f4c048',
};

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    const width  = this.cameras.main.width;
    const height = this.cameras.main.height;

    // ── Background ──────────────────────────────────────────────────────────
    this.add.rectangle(width / 2, height / 2, width, height, P.bgDeep);

    // Subtle ambient circles
    this.add.circle(width * 0.2,  height * 0.2,  220, 0x1a3266, 0.12);
    this.add.circle(width * 0.82, height * 0.75, 280, 0x2a1060, 0.10);

    // Stars
    for (let i = 0; i < 60; i++) {
      this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(1, 2),
        0xcfe4ff,
        Phaser.Math.FloatBetween(0.2, 0.7)
      );
    }

    // ── Title ───────────────────────────────────────────────────────────────
    this.add.text(width / 2, height / 2 - 120, 'LOADING', {
      fontSize:        '28px',
      fontStyle:       'bold',
      color:           P.textGold,
      stroke:          '#06101a',
      strokeThickness: 6,
      letterSpacing:   8
    }).setOrigin(0.5);

    // ── Progress track ──────────────────────────────────────────────────────
    const barW = 360;
    const barH = 18;
    const barX = width / 2 - barW / 2;
    const barY = height / 2 - 30;

    // Track
    const track = this.add.graphics();
    track.fillStyle(0x0e0820, 1);
    track.fillRoundedRect(barX, barY, barW, barH, 4);
    track.lineStyle(2, P.borderGold, 0.8);
    track.strokeRoundedRect(barX, barY, barW, barH, 4);

    // Fill (updated on progress)
    const fill = this.add.graphics();

    // Percent label
    const percentText = this.add.text(width / 2, barY + barH + 14, '0%', {
      fontSize:        '14px',
      color:           P.textSub,
      stroke:          '#06101a',
      strokeThickness: 3
    }).setOrigin(0.5);

    // ── Progress callbacks ──────────────────────────────────────────────────
    this.load.on('progress', (value) => {
      percentText.setText(`${Math.floor(value * 100)}%`);
      fill.clear();
      fill.fillStyle(P.accentBlue, 1);
      fill.fillRoundedRect(barX + 2, barY + 2, Math.max(0, (barW - 4) * value), barH - 4, 3);
      // inner shine
      fill.fillStyle(0xffffff, 0.18);
      fill.fillRoundedRect(barX + 2, barY + 2, Math.max(0, (barW - 4) * value), Math.floor((barH - 4) * 0.45), { tl: 3, tr: 3, bl: 0, br: 0 });
    });

    this.load.on('complete', () => {
      fill.destroy();
      track.destroy();
      percentText.destroy();
    });

    // ── Asset loads (unchanged) ─────────────────────────────────────────────
    this.load.image('logo', 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="%234a90e2"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="48">GAME</text></svg>');

    this.load.spritesheet(soldier.sheetKey, soldier.file, {
      frameWidth: soldier.frameWidth,
      frameHeight: soldier.frameHeight
    });

    Object.values(monsterRegistry).forEach((m) => {
      this.load.spritesheet(m.key, m.file, {
        frameWidth: m.frameWidth,
        frameHeight: m.frameHeight
      });
    });

    Object.values(NPCRegistry).forEach((npc) => {
      this.load.spritesheet(npc.key, npc.file, {
        frameWidth: npc.frameWidth,
        frameHeight: npc.frameHeight
      });
    });

    this.load.tilemapTiledJSON('map1', 'assets/forest.tiled-project.json');
    this.load.tilemapTiledJSON('map2', 'assets/cave.tiled-project.json');
    this.load.tilemapTiledJSON('map3', 'assets/mountain.tiled-project.json');
    this.load.tilemapTiledJSON('map4', 'assets/test.tiled-project.json');

    this.load.image('stone_tiles_v2.1',           'assets/basic_tileset_and_assets_standard/stone_tiles_v2.1.png');
    this.load.image('tiles-all-32x32',            'assets/basic caves and dungeons 32x32 standard - v1.0/tiles/tiles-all-32x32.png');
    this.load.image('assets_spritesheet_v2.1_free','assets/basic_tileset_and_assets_standard/assets_spritesheet_v2.1_free.png');
    this.load.image('terrain_tiles_v2.1',          'assets/basic_tileset_and_assets_standard/terrain_tiles_v2.1.png');
    this.load.image('assets-all',                  'assets/basic caves and dungeons 32x32 standard - v1.0/assets/assets-all.png');
    this.load.image('bridges',                     'assets/basic caves and dungeons 32x32 standard - v1.0/assets/bridges.png');
    this.load.image('water_and_island_tiles_v2.1', 'assets/basic_tileset_and_assets_standard/water_and_island_tiles_v2.1.png');
    this.load.image('fence_tiles',                 'assets/basic_tileset_and_assets_standard/fence_tiles.png');
    
    this.load.image('1_Terrains_and_Fences_32x32', 'assets/map4/1_Terrains_and_Fences_32x32.png');
    this.load.image('7_Villas_32x32', 'assets/map4/7_Villas_32x32.png');
    this.load.image('17_Garden_32x32', 'assets/map4/17_Garden_32x32.png');

    this.load.video('test_video', 'assets/videos/test_video.mp4', 'loadeddata', false, true);
  }

  // ── Tilemap sanity (unchanged) ────────────────────────────────────────────
  sanitizeTilemapCache() {
    ['map1', 'map2', 'map3'].forEach((key) => {
      const data = this.cache.tilemap.get(key)?.data;
      if (!data?.tilesets) return;
      const th = data.tileheight || 32, tw = data.tilewidth || 32;
      data.tilesets.forEach((set) => {
        const m = set.margin ?? 0, s = set.spacing ?? 0;
        if (!m && !s) return;
        const tc = set.tilecount, cols = set.columns ?? Math.ceil(Math.sqrt(tc)), rows = Math.ceil((tc || 0) / cols);
        if (!tc) return;
        set.imagewidth  = Math.ceil(cols * ((set.tilewidth  ?? tw) + s) + m * 2 - s);
        set.imageheight = Math.ceil(rows * ((set.tileheight ?? th) + s) + m * 2 - s);
      });
      const maxBySet = data.tilesets.map((set) => {
        const m = set.margin ?? 0, s = set.spacing ?? 0;
        const rc = Math.floor((set.imageheight - m * 2 + s) / (th + s));
        const cc = Math.floor((set.imagewidth  - m * 2 + s) / (tw + s));
        return { firstgid: set.firstgid, maxGid: set.firstgid + Math.max(0, rc * cc) - 1 };
      });
      const visit = (layer) => {
        if (layer.type === 'tilelayer' && Array.isArray(layer.data))
          for (let i = 0; i < layer.data.length; i++) {
            const gid = layer.data[i];
            if (gid <= 0) continue;
            const raw = gid & 0x1fffffff;
            const t = maxBySet.filter((x) => x.firstgid <= raw).sort((a, b) => b.firstgid - a.firstgid)[0];
            if (t && raw > t.maxGid) layer.data[i] = (gid & 0xe0000000) | t.maxGid;
          }
        (layer.layers || []).forEach(visit);
      };
      (data.layers || []).forEach(visit);
    });
  }

  async create() {
    this.sanitizeTilemapCache();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        gameState.clearState();
        this.scene.start('LoginScene');
        return;
      }

      const roleInfo = await apiService.getMyRole();
      const role = roleInfo?.role;

      if (role === 'learner') {
        const learner = await apiService.getCurrentLearner();
        gameState.setLearner(learner);
        const inventory = await apiService.getMyInventory().catch(() => []);
        gameState.setInventory(inventory || []);
        this.scene.start('WorldMapScene');
        this.scene.launch('UIScene');
        return;
      }

      if (role === 'contributor') {
        this.scene.start('ContributorScene');
        return;
      }

      if (role === 'admin') {
        this.scene.start('AdminScene');
        return;
      }
      
    } catch (error) {
      console.error('Boot auth check failed:', error);
      gameState.clearState();
      this.scene.start('LoginScene');
    }
  }
}