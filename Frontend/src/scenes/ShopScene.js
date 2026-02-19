import Phaser from 'phaser';
import { gameState } from '../services/gameState.js';
import { apiService } from '../services/api.js';

export class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ShopScene' });
    this.items = [];
    this.gold = 1000;
    this.iconGraphics = {};
  }

  async create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Semi-transparent background
    this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0);

    // Title
    this.add.text(width / 2, 100, 'ITEM SHOP', {
      fontSize: '36px',
      color: '#f59e0b',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Gold display
    this.add.text(width / 2, 150, `Gold: ${this.gold}`, {
      fontSize: '24px',
      color: '#f59e0b'
    }).setOrigin(0.5);

    // DEVELOPMENT MODE - Use mock items instead of API
    // this.items = this.getMockItems();
    // this.displayItems();

    // ORIGINAL CODE - Uncomment when backend is ready:
    
    // Load items
    await this.loadItems();

    // Close button
    const closeBtn = this.add.rectangle(width - 60, 90, 100, 40, 0x666666)
      .setInteractive({ useHandCursor: true });
    
    this.add.text(width - 60, 90, 'CLOSE', {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    closeBtn.on('pointerdown', () => {
      this.scene.stop();
      this.scene.resume('GameMapScene');
    });
  }

  getMockItems() {
    return [
      {
        id: 1,
        item_type: 'potion',
        name: 'Health Potion',
        description: 'Restores 50 HP',
        price: 50,
        is_active: true
      },
      {
        id: 2,
        item_type: 'potion',
        name: 'Mana Potion',
        description: 'Restores 30 MP',
        price: 40,
        is_active: true
      },
      {
        id: 3,
        item_type: 'weapon',
        name: 'Iron Sword',
        description: 'A basic sword (+10 ATK)',
        price: 200,
        is_active: true
      },
      {
        id: 4,
        item_type: 'armor',
        name: 'Leather Armor',
        description: 'Basic protection (+5 DEF)',
        price: 150,
        is_active: true
      },
      {
        id: 5,
        item_type: 'weapon',
        name: 'Steel Axe',
        description: 'Heavy weapon (+15 ATK)',
        price: 300,
        is_active: true
      },
      {
        id: 6,
        item_type: 'accessory',
        name: 'Lucky Charm',
        description: 'Increases luck (+5 LCK)',
        price: 100,
        is_active: true
      }
    ];
  }

  async loadItems() {
    try {
      let items = await apiService.getAllItems();
      this.items = items.filter(item => item.is_active);
      this.displayItems()
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  }

  async createDemoItems() {
    const demoItems = [
      {
        item_type: 'potion',
        name: 'Health Potion',
        description: 'Restores 50 HP',
        price: 50,
        is_active: true
      },
      {
        item_type: 'potion',
        name: 'Mana Potion',
        description: 'Restores 30 MP',
        price: 40,
        is_active: true
      },
      {
        item_type: 'weapon',
        name: 'Iron Sword',
        description: 'A basic sword (+10 ATK)',
        price: 200,
        is_active: true
      },
      {
        item_type: 'armor',
        name: 'Leather Armor',
        description: 'Basic protection (+5 DEF)',
        price: 150,
        is_active: true
      }
    ];

    try {
      for (const item of demoItems) {
        const created = await apiService.addItem(item);
        this.items.push(created);
      }
      this.displayItems();
    } catch (error) {
      console.error('Failed to create demo items:', error);
    }
  }

  displayItems() {
    const width = this.cameras.main.width;
    const startY = 250;
    const spacing = 100;
    const itemsPerRow = 2;

    this.items.forEach((item, index) => {
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;
      
      const x = (width / 3) + (col * 350);
      const y = startY + (row * spacing);

      // Item container
      const container = this.add.container(x, y);
      
      // Background
      const bg = this.add.rectangle(0, 0, 320, 80, 0x16213e, 0.9);
      bg.setStrokeStyle(2, this.getTypeColor(item.item_type));
      
      // Icon - using graphics instead of emoji
      this.createItemIcon(container, -140, 0, item.item_type);
      
      // Item info
      const nameText = this.add.text(-80, -15, item.name, {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold'
      });
      
      const descText = this.add.text(-80, 5, item.description, {
        fontSize: '14px',
        color: '#aaaaaa'
      });
      
      const priceText = this.add.text(-80, 25, `${item.price} gold`, {
        fontSize: '16px',
        color: '#f59e0b'
      });
      
      // Buy button
      const canAfford = this.gold >= item.price;
      const button = this.add.rectangle(100, 0, 80, 40, canAfford ? 0x22c55e : 0x666666, 1);
      button.setStrokeStyle(2, canAfford ? 0x4ade80 : 0x888888);
      
      if (canAfford) {
        button.setInteractive({ useHandCursor: true });
        
        button.on('pointerover', () => {
          button.setFillStyle(0x4ade80);
        });
        
        button.on('pointerout', () => {
          button.setFillStyle(0x22c55e);
        });
        
        button.on('pointerdown', () => {
          this.purchaseItem(item);
        });
      }
      
      const buttonText = this.add.text(100, 0, 'BUY', {
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      container.add([bg, nameText, descText, priceText, button, buttonText]);
    });
  }

  createItemIcon(container, x, y, type) {
    const graphics = this.add.graphics();
    
    switch(type) {
      case 'potion':
        // Potion bottle
        graphics.fillStyle(0x3b82f6, 1);
        graphics.fillRoundedRect(x - 10, y - 10, 20, 25, 3);
        graphics.fillStyle(0x60a5fa, 1);
        graphics.fillRect(x - 8, y - 5, 16, 15);
        graphics.fillStyle(0x1e40af, 1);
        graphics.fillRect(x - 6, y - 12, 12, 3);
        break;
        
      case 'weapon':
        // Sword
        graphics.fillStyle(0xef4444, 1);
        graphics.fillRect(x - 3, y - 15, 6, 20);
        graphics.fillTriangle(x - 5, y - 15, x + 5, y - 15, x, y - 20);
        graphics.fillStyle(0x991b1b, 1);
        graphics.fillRect(x - 6, y + 5, 12, 6);
        graphics.fillCircle(x, y + 8, 4);
        break;
        
      case 'armor':
        // Shield
        graphics.fillStyle(0x8b5cf6, 1);
        graphics.fillRoundedRect(x - 12, y - 15, 24, 30, 5);
        graphics.lineStyle(2, 0xffffff);
        graphics.strokeRoundedRect(x - 10, y - 13, 20, 26, 4);
        graphics.lineStyle(3, 0xa78bfa);
        graphics.lineBetween(x, y - 10, x, y + 10);
        graphics.lineBetween(x - 8, y, x + 8, y);
        break;
        
      case 'accessory':
        // Ring/Gem
        graphics.lineStyle(3, 0xf59e0b);
        graphics.strokeCircle(x, y, 12);
        graphics.fillStyle(0xfbbf24, 1);
        graphics.fillCircle(x, y - 3, 6);
        graphics.fillStyle(0xfde047, 1);
        graphics.fillCircle(x - 2, y - 4, 3);
        break;
        
      case 'consumable':
        // Apple/food
        graphics.fillStyle(0x22c55e, 1);
        graphics.fillCircle(x, y, 12);
        graphics.fillStyle(0x15803d, 1);
        graphics.fillRect(x - 2, y - 15, 4, 8);
        graphics.fillStyle(0x16a34a, 1);
        graphics.fillCircle(x + 8, y - 8, 5);
        break;
        
      default:
        // Default box
        graphics.fillStyle(0x6b7280, 1);
        graphics.fillRoundedRect(x - 12, y - 12, 24, 24, 3);
        graphics.lineStyle(2, 0x9ca3af);
        graphics.strokeRoundedRect(x - 12, y - 12, 24, 24, 3);
        break;
    }
    
    container.add(graphics);
  }

  getTypeColor(type) {
    const colors = {
      'potion': 0x3b82f6,
      'weapon': 0xef4444,
      'armor': 0x8b5cf6,
      'accessory': 0xf59e0b,
      'consumable': 0x22c55e
    };
    return colors[type] || 0x6b7280;
  }

  async purchaseItem(item) {
    if (this.gold < item.price) return;

    const learner = gameState.getLearner();
    const itemId = item.itemId;

    this.gold -= item.price;

    try {
      if (learner?.learnerId && itemId) {
        const updatedInventory = await apiService.addInventoryItem(itemId, 1, false);
        apiService.createPurchase([{ itemId: item.itemId, quantity: 1 }])
        gameState.setInventory(updatedInventory);
      } else {
        // fallback for dev/mock mode
        gameState.addItem(item, 1);
      }

      const width = this.cameras.main.width;
      const confirmText = this.add.text(width / 2, 100, `Purchased ${item.name}!`, {
        fontSize: '20px',
        color: '#22c55e',
        backgroundColor: '#000000',
        padding: { x: 10, y: 5 }
      }).setOrigin(0.5);

      this.time.delayedCall(1500, () => confirmText.destroy());
      this.scene.restart();
    } catch (error) {
      this.gold += item.price; // rollback local gold on failure
      console.error('Purchase failed:', error);
    }
  }


}