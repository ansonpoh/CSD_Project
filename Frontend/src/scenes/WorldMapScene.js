import Phaser from 'phaser';
import { gameState } from '../services/gameState.js';

export class WorldMapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldMapScene' });
    this.maps = [];
  }

  async create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Title
    this.add.text(width / 2, 50, 'SELECT YOUR ADVENTURE', {
      fontSize: '36px',
      color: '#4a90e2',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // DEVELOPMENT MODE - Use mock maps instead of API
    this.maps = this.getMockMaps();
    this.displayMaps();

    // ORIGINAL CODE - Uncomment when backend is ready:
    /*
    // Load maps from backend
    try {
      this.maps = await apiService.getAllMaps();
      this.displayMaps();
    } catch (error) {
      console.error('Failed to load maps:', error);
      this.add.text(width / 2, height / 2, 'Failed to load maps. Creating demo map...', {
        fontSize: '20px',
        color: '#ff6b6b'
      }).setOrigin(0.5);
      
      // Create a demo map if none exist
      await this.createDemoMap();
    }
    */
  }

  getMockMaps() {
    // Mock map data for development
    return [
      {
        id: 1,
        name: 'Forest Clearing',
        description: 'A peaceful forest filled with mysteries',
        mapKey: 'map1', 
        tilesets: [ 
          { name: 'stone_tiles_v2.1',            imageKey: 'stone_tiles_v2.1' },
          { name: 'tiles-all-32x32',             imageKey: 'tiles-all-32x32' },
          { name: 'assets_spritesheet_v2.1_free',imageKey: 'assets_spritesheet_v2.1_free' },
          { name: 'terrain_tiles_v2.1',          imageKey: 'terrain_tiles_v2.1' },
          { name: 'assets-all',                  imageKey: 'assets-all' },
        ]
      },
      {
        id: 2,
        name: 'Dark Cave',
        description: 'A dangerous cave system with hidden treasures',
        mapKey: 'map2',
        tilesets: [
          { name: 'tiles-all-32x32',             imageKey: 'tiles-all-32x32' },
          { name: 'assets_spritesheet_v2.1_free',imageKey: 'assets_spritesheet_v2.1_free' },
          { name: 'assets-all',                  imageKey: 'assets-all' },
          { name: 'bridges',                     imageKey: 'bridges' },
        ]
      },
      {
        id: 3,
        name: 'Mountain Peak',
        description: 'The highest mountain in the realm',
        mapKey: 'map3',
        tilesets: [
          { name: 'water_and_island_tiles_v2.1', imageKey: 'water_and_island_tiles_v2.1' },
          { name: 'terrain_tiles_v2.1',          imageKey: 'terrain_tiles_v2.1' },
          { name: 'assets_spritesheet_v2.1_free',imageKey: 'assets_spritesheet_v2.1_free' },
          { name: 'fence_tiles',                 imageKey: 'fence_tiles' },
        ]
      }
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
      this.maps = [createdMap];
      this.displayMaps();
    } catch (error) {
      console.error('Failed to create demo map:', error);
    }
  }

  displayMaps() {
    const width = this.cameras.main.width;
    const startY = 150;
    const spacing = 120;

    if (this.maps.length === 0) {
      this.add.text(width / 2, 300, 'No maps available', {
        fontSize: '24px',
        color: '#999'
      }).setOrigin(0.5);
      return;
    }

    this.maps.forEach((map, index) => {
      const y = startY + (index * spacing);
      
      // Map container
      const container = this.add.container(width / 2, y);
      
      // Background
      const bg = this.add.rectangle(0, 0, 600, 100, 0x16213e, 0.9);
      bg.setStrokeStyle(2, 0x4a90e2);
      
      // Map name
      const nameText = this.add.text(-280, -20, map.name, {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold'
      });
      
      // Map description
      const descText = this.add.text(-280, 10, map.description, {
        fontSize: '16px',
        color: '#aaaaaa'
      });
      
      // Enter button
      const button = this.add.rectangle(220, 0, 120, 50, 0x4a90e2, 1);
      button.setStrokeStyle(2, 0x6ab0f2);
      button.setInteractive({ useHandCursor: true });
      
      const buttonText = this.add.text(220, 0, 'ENTER', {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      // Hover effects
      button.on('pointerover', () => {
        button.setFillStyle(0x6ab0f2);
      });
      
      button.on('pointerout', () => {
        button.setFillStyle(0x4a90e2);
      });
      
      button.on('pointerdown', () => {
        this.enterMap(map);
      });
      
      container.add([bg, nameText, descText, button, buttonText]);
    });
  }

  enterMap(map) {
    gameState.setCurrentMap(map);
    this.scene.start('GameMapScene', {mapConfig: map});
  }
}