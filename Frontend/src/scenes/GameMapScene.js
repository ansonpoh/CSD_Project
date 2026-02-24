import Phaser from 'phaser';
import { gameState } from '../services/gameState.js';
import { SoldierController } from '../characters/soldier/SoldierController.js';
import { apiService } from "../services/api.js";
import { monsterRegistry } from '../characters/monsters/MonsterRegistry.js';
import { NPCRegistry } from '../characters/npcs/NPCRegistry.js';

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
    this.closestNpcSprite = null;
    this.npcInteractDistance = 120;
    this.map = null;
  }
  
  // mapConfig is passed in from WorldMapScene via scene.start()
  init(data) {
    this.mapConfig = data.mapConfig;
  }

  async create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // // Create simple background
    // this.add.rectangle(0, 0, width, height, 0x2d5016).setOrigin(0);
    
    // // Add grid pattern for visual interest
    // this.createGrid();

    // Build the tilemap
    this.createTilemap();

    // Create player
    this.playerCtrl = new SoldierController(this, width, height);
    // this.createPlayer();
    // this.attackKeys = this.input.keyboard.addKeys({
    //   atk1: Phaser.Input.Keyboard.KeyCodes.Z,
    //   atk2: Phaser.Input.Keyboard.KeyCodes.X,
    //   atk3: Phaser.Input.Keyboard.KeyCodes.C,
    // });
    // this.isAttacking = false;

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
    
    // Setup controls
    this.cursors = this.input.keyboard.createCursorKeys();

    // Add UI buttons
    this.createUI();
    try {
      const currentMap = gameState.getCurrentMap();
      const mapId = currentMap?.mapId || currentMap?.id;
      if (mapId) {
        this.monsters = await apiService.getMonstersByMap(mapId);
        this.npcs = await apiService.getNPCsByMap(mapId);
      } else {
        this.monsters = [];
        this.npcs = [];
      } 

      this.createMonsterAnimations();
      this.createNPCAnimations();

      this.createMonsters();
      this.createNPCs();

    } catch (e) {
      console.error('Failed to load monsters for map:', e);
      this.monsters = [];
    }

    // Interactions
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.interactPrompt = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height - 40,
      '',
      {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: {x:10, y:6},
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(100).setVisible(false);
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
    try {
      this.map = this.make.tilemap({ key: this.mapConfig.mapKey });
    } catch (e) {
      console.error('Failed to load tilemap:', this.mapConfig.mapKey, e);
      return;
    }
    if (!this.map?.tilesets?.length) return;
    const jsonSets = this.cache.tilemap.get(this.mapConfig.mapKey)?.data?.tilesets || [];
    const tilesets = [];
    for (const ts of this.map.tilesets) {
      const added = this.map.addTilesetImage(ts.name, ts.name);
      if (added) {
        const j = jsonSets.find((t) => t.name === ts.name);
        if (j && (j.margin || j.spacing)) this.fixTilesetTexCoords(added, j);
        tilesets.push(added);
      }
    }
    this.map.layers.forEach((ld) => this.map.createLayer(ld.name, tilesets, 0, 0));
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
    // Create NPC sprites at random positions

    this.npcs.forEach((npc, index) => {
      if(!npc || !npc.name) return;
      const x = 200 + index * 180;
      const y = 480 + Math.random() * 150;

      const npcName = npc.name
      const cfg = NPCRegistry[npcName] || NPCRegistry.orc;
      if (!this.textures.exists(npcName)) {
        console.warn(`Missing texture for ${npc.asset}`);
      }

      const npc_sprite = this.physics.add.sprite(x, y, npcName, 0);
      npc_sprite.setScale(cfg.scale);
      npc_sprite.setDepth(5);
      npc_sprite.setData('npc', npc);

      const nameText = this.add.text(x, y, npcName, {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 5, y: 2 }
      }).setOrigin(0.5,1);
      this.placeNameLabel(npc_sprite, nameText, cfg.labelOffsetY);
      // npc_sprite.setData('nameText', nameText);

      npc_sprite.play(`${npcName}_idle`, true)
      this.npcSprites.push(npc_sprite);
    });
  }

  createMonsters() {
    // Create monster sprites at random positions

    this.monsters.forEach((monster, index) => {
      const x = 300 + index * 180;
      const y = 380 + Math.random() * 150;

      const monsterName = monster.name
      const cfg = monsterRegistry[monsterName] || monsterRegistry.orc;
      if (!this.textures.exists(monsterName)) {
        console.warn(`Missing texture for ${monster.asset}, fallback to orc`);
      }

      const m_sprite = this.physics.add.sprite(x, y, monsterName, 0);
      m_sprite.setScale(cfg.scale);
      m_sprite.setDepth(5);
      m_sprite.setInteractive();
      m_sprite.setData('monster', monster);

      const nameText = this.add.text(x, y, monsterName, {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 5, y: 2 }
      }).setOrigin(0.5,1);
      this.placeNameLabel(m_sprite, nameText, cfg.labelOffsetY);
      // m_sprite.setData('nameText', nameText);

      m_sprite.play(`${monsterName}_idle`, true)
      m_sprite.on('pointerdown', () => this.encounterMonster(monster));
      this.monsterSprites.push(m_sprite);
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
    
    // Shop button
    const shopBtn = this.add.rectangle(width - 60, 90, 100, 40, 0x4a90e2)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    
    this.add.text(width - 60, 90, 'SHOP', {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0);
    
    shopBtn.on('pointerdown', () => {
      this.scene.launch('ShopScene');
      this.scene.pause();
    });

    // Back button
    const backBtn = this.add.rectangle(60, 90, 100, 40, 0x666666)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    
    this.add.text(60, 90, 'BACK', {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0);
    
    backBtn.on('pointerdown', () => {
      this.scene.start('WorldMapScene');
    });
  }

  interactWithNPC(npc) {

    const npcDef = NPCRegistry[npc.name] || {};

    const narrationLines = npcDef.narrationLines || [
      `Hello, traveler! I am ${npc.name}.`
    ];

    this.scene.launch('DialogueScene', { npc, lines: narrationLines, lessonPages: npcDef.lessonPages});
    this.scene.pause();
  }

  encounterMonster(monster) {
    console.log('Encountering monster:', monster.name);
    this.scene.start('CombatScene', { monster });
  }

  update() {
    this.playerCtrl.update();
    this.updateNpcInteraction();
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
      this.interactPrompt.setText(`Press E to talk to ${npc.name}`);
      this.interactPrompt.setVisible(true);

      if (Phaser.Input.Keyboard.JustDown(this.interactKey) && !this.scene.isActive('DialogueScene')) {
        this.interactWithNPC(npc);
        this.interactPrompt.setVisible(false);
      }
    } else {
      this.closestNpcSprite = null;
      this.interactPrompt.setVisible(false);
    }
  }

}