import Phaser from 'phaser';
import { supabase } from "../config/supabaseClient";
import { soldier } from '../characters/soldier/Soldier';
import { monsterRegistry } from '../characters/monsters/MonsterRegistry';
import { NPCRegistry } from '../characters/npcs/NPCRegistry';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
    
    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontSize: '20px',
      color: '#ffffff'
    });
    loadingText.setOrigin(0.5, 0.5);
    
    const percentText = this.add.text(width / 2, height / 2, '0%', {
      fontSize: '18px',
      color: '#ffffff'
    });
    percentText.setOrigin(0.5, 0.5);
    
    this.load.on('progress', (value) => {
      percentText.setText(Math.floor(value * 100) + '%');
      progressBar.clear();
      progressBar.fillStyle(0x4a90e2, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });
    
    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });
    
    // Load placeholder assets
    this.load.image('logo', 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="%234a90e2"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="48">GAME</text></svg>');

    // Spritesheet soldier_idle 
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

    //Load tilemap :D
    this.load.tilemapTiledJSON('map1', 'assets/forest.tiled-project.json');
    this.load.tilemapTiledJSON('map2', 'assets/cave.tiled-project.json');
    this.load.tilemapTiledJSON('map3', 'assets/mountain.tiled-project.json');

    //Load tilesets
    this.load.image('stone_tiles_v2.1', 'assets/basic_tileset_and_assets_standard/stone_tiles_v2.1.png');
    this.load.image('tiles-all-32x32', 'assets/basic caves and dungeons 32x32 standard - v1.0/tiles/tiles-all-32x32.png');
    this.load.image('assets_spritesheet_v2.1_free', 'assets/basic_tileset_and_assets_standard/assets_spritesheet_v2.1_free.png');
    this.load.image('terrain_tiles_v2.1', 'assets/basic_tileset_and_assets_standard/terrain_tiles_v2.1.png');
    this.load.image('assets-all', 'assets/basic caves and dungeons 32x32 standard - v1.0/assets/assets-all.png');
    this.load.image('bridges', 'assets/basic caves and dungeons 32x32 standard - v1.0/assets/bridges.png');
    this.load.image('water_and_island_tiles_v2.1', 'assets/basic_tileset_and_assets_standard/water_and_island_tiles_v2.1.png');
    this.load.image('fence_tiles', 'assets/basic_tileset_and_assets_standard/fence_tiles.png');

    //Load video
    this.load.video('test_video', 'assets/videos/test_video.mp4', 'loadeddata', false, true);

  }

  //Patch tilesets (margin/spacing) so Phaser's tile count matches Tiled; clamp out-of-range GIDs.
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
        set.imagewidth = Math.ceil(cols * ((set.tilewidth ?? tw) + s) + m * 2 - s);
        set.imageheight = Math.ceil(rows * ((set.tileheight ?? th) + s) + m * 2 - s);
      });
      const maxBySet = data.tilesets.map((set) => {
        const m = set.margin ?? 0, s = set.spacing ?? 0;
        const rc = Math.floor((set.imageheight - m * 2 + s) / (th + s));
        const cc = Math.floor((set.imagewidth - m * 2 + s) / (tw + s));
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

  create() {
    this.sanitizeTilemapCache();

    // DEVELOPMENT MODE - Skip login and go directly to WorldMapScene
    this.scene.start('WorldMapScene');
    this.scene.launch('UIScene');
    
    // ORIGINAL CODE - Uncomment this when you want to re-enable login:
    
    // Check if user is logged in
    // const savedState = localStorage.getItem('gameState');
    
    // if (savedState) {
    //   const state = JSON.parse(savedState);
    //   if (state.learner) {
    //     // User is logged in, go to world map
    //     this.scene.start('WorldMapScene');
    //     this.scene.launch('UIScene');
    //     return;
    //   }
    // }
    
    // // No saved state, go to login
    // this.scene.start('LoginScene');
    
  }
}