import Phaser from 'phaser';
import config from './config/phaser.config.js';
import './style.css';

// Initialize the game
const game = new Phaser.Game(config);

// Log game info
console.log('Game initialized');
console.log('Phaser version:', Phaser.VERSION);
