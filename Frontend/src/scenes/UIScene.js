import Phaser from 'phaser';
import { gameState } from '../services/gameState.js';
import { apiService } from '../services/api.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
    this.levelText = null;
    this.xpText = null;
    this.usernameText = null;
  }

  create() {
    const width = this.cameras.main.width;

    // Create HUD background
    const hudBg = this.add.rectangle(0, 0, width, 60, 0x16213e, 0.9).setOrigin(0);

    // DEVELOPMENT MODE - Use mock learner data
    let learner = gameState.getLearner();
    
    if (!learner) {
      // Create mock learner if none exists
      learner = {
        username: 'Player',
        level: 1,
        total_xp: 0
      };
      gameState.setLearner(learner);
    }
    
    // Username
    this.usernameText = this.add.text(20, 15, `👤 ${learner.username}`, {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    });

    // Level
    this.levelText = this.add.text(20, 35, `Level: ${learner.level}`, {
      fontSize: '16px',
      color: '#4ade80'
    });

    // XP
    this.xpText = this.add.text(width - 200, 25, `XP: ${learner.total_xp}`, {
      fontSize: '18px',
      color: '#f59e0b'
    }).setOrigin(1, 0.5);

    // Subscribe to state changes
    gameState.subscribe(() => {
      this.updateUI();
    });

    // Inventory indicator
    const inventoryBtn = this.add.rectangle(width - 60, 30, 80, 40, 0x8b5cf6)
      .setInteractive({ useHandCursor: true });
    
    this.add.text(width - 60, 30, '🎒', {
      fontSize: '24px'
    }).setOrigin(0.5);

    inventoryBtn.on('pointerdown', () => {
      this.showInventory();
    });
  }

  updateUI() {
    const learner = gameState.getLearner();
    
    if (learner) {
      this.levelText.setText(`Level: ${learner.level}`);
      this.xpText.setText(`XP: ${learner.total_xp}`);
      
      // Show level up animation if needed
      const lastLevel = this.levelText.getData('lastLevel') || 1;
      if (learner.level > lastLevel) {
        this.showLevelUp(learner.level);
      }
      
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
}