import Phaser from 'phaser';
import { supabase } from "../config/supabaseClient";
import { soldier } from '../characters/soldier/Soldiertmp';

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
  }

  create() {
    // DEVELOPMENT MODE - Skip login and go directly to WorldMapScene
    // this.scene.start('WorldMapScene');
    // this.scene.launch('UIScene');
    
    // ORIGINAL CODE - Uncomment this when you want to re-enable login:
    
    // Check if user is logged in
    const savedState = localStorage.getItem('gameState');
    
    if (savedState) {
      const state = JSON.parse(savedState);
      if (state.learner) {
        // User is logged in, go to world map
        this.scene.start('WorldMapScene');
        this.scene.launch('UIScene');
        return;
      }
    }
    
    // No saved state, go to login
    this.scene.start('LoginScene');
    
  }
}