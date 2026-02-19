import Phaser from 'phaser';
import { gameState } from '../services/gameState.js';
import { SoldierController } from '../characters/soldier/SoldierController.js';
export class GameMapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameMapScene' });
    this.player = null;
    this.cursors = null;
    this.npcs = [];
    this.monsters = [];
    this.npcSprites = [];
    this.monsterSprites = [];
  }

  async create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Create simple background
    this.add.rectangle(0, 0, width, height, 0x2d5016).setOrigin(0);
    
    // Add grid pattern for visual interest
    this.createGrid();

    // Create player
    this.playerCtrl = new SoldierController(this, width, height);
    // this.createPlayer();
    // this.attackKeys = this.input.keyboard.addKeys({
    //   atk1: Phaser.Input.Keyboard.KeyCodes.Z,
    //   atk2: Phaser.Input.Keyboard.KeyCodes.X,
    //   atk3: Phaser.Input.Keyboard.KeyCodes.C,
    // });
    // this.isAttacking = false;

    // DEVELOPMENT MODE - Use mock data instead of API
    this.npcs = this.getMockNPCs();
    this.monsters = this.getMockMonsters();
    this.createNPCs();
    this.createMonsters();

    // ORIGINAL CODE - Uncomment when backend is ready:
    /*
    // Load NPCs and Monsters
    await this.loadEntities();
    */

    // Setup camera
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(0, 0, width, height);

    // Setup controls
    this.cursors = this.input.keyboard.createCursorKeys();

    // Add UI buttons
    this.createUI();
  }

  getMockNPCs() {
    return [
      {
        id: 1,
        name: 'Elder Wizard',
        npc_type: 'quest_giver',
        description: 'A wise old wizard with many secrets',
        is_active: true
      },
      {
        id: 2,
        name: 'Village Merchant',
        npc_type: 'vendor',
        description: 'A friendly merchant selling wares',
        is_active: true
      },
      {
        id: 3,
        name: 'Guard Captain',
        npc_type: 'guard',
        description: 'A stern captain of the guard',
        is_active: true
      }
    ];
  }

  getMockMonsters() {
    return [
      {
        id: 1,
        name: 'Forest Goblin',
        monster_type: 'enemy',
        description: 'A mischievous goblin',
        hp: 50,
        attack: 10,
        defense: 5,
        is_active: true
      },
      {
        id: 2,
        name: 'Wild Wolf',
        monster_type: 'beast',
        description: 'A fierce wild wolf',
        hp: 40,
        attack: 15,
        defense: 3,
        is_active: true
      },
      {
        id: 3,
        name: 'Skeleton Warrior',
        monster_type: 'undead',
        description: 'An animated skeleton',
        hp: 60,
        attack: 12,
        defense: 8,
        is_active: true
      }
    ];
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
    // Create NPC sprites at random positions
    this.npcs.slice(0, 3).forEach((npc, index) => {
      const x = 200 + (index * 250);
      const y = 200 + (Math.random() * 200);
      
      // Create NPC sprite (green circle)
      const graphics = this.add.graphics();
      graphics.fillStyle(0x4ade80, 1);
      graphics.fillCircle(0, 0, 18);
      graphics.generateTexture('npc_' + index, 36, 36);
      graphics.destroy();
      
      const npcSprite = this.physics.add.sprite(x, y, 'npc_' + index);
      npcSprite.setData('npc', npc);
      npcSprite.setInteractive();
      npcSprite.setDepth(5);
      
      // Add name label
      const nameText = this.add.text(x, y - 30, npc.name, {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 5, y: 2 }
      }).setOrigin(0.5);
      npcSprite.setData('nameText', nameText);
      
      npcSprite.on('pointerdown', () => {
        this.interactWithNPC(npc);
      });
      
      this.npcSprites.push(npcSprite);
    });
  }

  createMonsters() {
    // Create monster sprites at random positions
    this.monsters.slice(0, 3).forEach((monster, index) => {
      const x = 300 + (index * 200);
      const y = 400 + (Math.random() * 150);
      
      // Create monster sprite (red circle)
      const graphics = this.add.graphics();
      graphics.fillStyle(0xef4444, 1);
      graphics.fillCircle(0, 0, 18);
      graphics.generateTexture('monster_' + index, 36, 36);
      graphics.destroy();
      
      const monsterSprite = this.physics.add.sprite(x, y, 'monster_' + index);
      monsterSprite.setData('monster', monster);
      monsterSprite.setInteractive();
      monsterSprite.setDepth(5);
      
      // Add name label
      const nameText = this.add.text(x, y - 30, monster.name, {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 5, y: 2 }
      }).setOrigin(0.5);
      monsterSprite.setData('nameText', nameText);
      
      monsterSprite.on('pointerdown', () => {
        this.encounterMonster(monster);
      });
      
      this.monsterSprites.push(monsterSprite);
    });
  }

  createUI() {
    const width = this.cameras.main.width;
    
    // Shop button
    const shopBtn = this.add.rectangle(width - 100, 30, 100, 40, 0x4a90e2)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    
    this.add.text(width - 100, 30, 'SHOP', {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0);
    
    shopBtn.on('pointerdown', () => {
      this.scene.launch('ShopScene');
      this.scene.pause();
    });

    // Back button
    const backBtn = this.add.rectangle(60, 30, 100, 40, 0x666666)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    
    this.add.text(60, 30, 'BACK', {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0);
    
    backBtn.on('pointerdown', () => {
      this.scene.start('WorldMapScene');
    });
  }

  interactWithNPC(npc) {
    console.log('Talking to NPC:', npc.name);
    this.scene.launch('DialogueScene', { npc });
    this.scene.pause();
  }

  encounterMonster(monster) {
    console.log('Encountering monster:', monster.name);
    this.scene.start('CombatScene', { monster });
  }

  update() {
    this.playerCtrl.update();
    // if (!this.player || !this.cursors) return;
    // if (Phaser.Input.Keyboard.JustDown(this.attackKeys.atk1)) this.attack('attack_1');
    // if (Phaser.Input.Keyboard.JustDown(this.attackKeys.atk2)) this.attack('attack_2');
    // if (Phaser.Input.Keyboard.JustDown(this.attackKeys.atk3)) this.attack('attack_3');
    // if (this.isAttacking) return;

    // const speed = 200;
    // let vx = 0;
    // let vy = 0;
    // this.player.setVelocity(0);

    // if (this.cursors.left.isDown) {
    //   vx -= speed
    //   this.player.setFlipX(true);
    // } else if (this.cursors.right.isDown) {
    //   vx = speed;
    //   this.player.setFlipX(false);
    // }
    // if (this.cursors.up.isDown) {
    //   vy -= speed;
    // } else if (this.cursors.down.isDown) {
    //   vy = speed;
    // }

    // this.player.setVelocity(vx, vy);
    // const isMoving = vx !== 0 || vy !== 0;
    // const nextAnim = isMoving ? 'move' : 'idle';

    // // Prevents restarting of animation at every frame.
    // if(this.player.anims.currentAnim?.key !== nextAnim) {
    //   this.player.play(nextAnim, true);
    // }

    // Update NPC name positions
    this.npcSprites.forEach(sprite => {
      const nameText = sprite.getData('nameText');
      if (nameText) {
        nameText.setPosition(sprite.x, sprite.y - 30);
      }
    });

    // Update Monster name positions
    this.monsterSprites.forEach(sprite => {
      const nameText = sprite.getData('nameText');
      if (nameText) {
        nameText.setPosition(sprite.x, sprite.y - 30);
      }
    });
  }

}