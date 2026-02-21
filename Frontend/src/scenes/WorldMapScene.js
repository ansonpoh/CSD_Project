import Phaser from 'phaser';
import { gameState } from '../services/gameState.js';
import { apiService } from '../services/api.js';

export class WorldMapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldMapScene' });
    this.maps = [];
  }

  getMockMaps() {
    return [
      { id: 1, name: 'Forest Clearing', description: 'A peaceful forest', asset: 'forest_tileset', world: null },
      { id: 2, name: 'Dark Cave', description: 'A dangerous cave system', asset: 'cave_tileset', world: null },
      { id: 3, name: 'Mountain Peak', description: 'The highest mountain', asset: 'mountain_tileset', world: null }
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
    } catch (error) {
      console.error('Failed to create demo map:', error);
      this.maps = this.getMockMaps(); // Fallback if creation fails
    }
  }

  enterMap(map) {
    gameState.setCurrentMap(map);
    this.scene.start('GameMapScene');
  }

  async create() {
    const { width, height } = this.cameras.main;
    const learner = gameState.getLearner() || { username: 'PixelWarrior', level: 10, total_xp: 1500 };

    // --- COLOR PALETTE ---
    const bgColor = 0x1f3454;
    const darkCardColor = 0x12233f;
    const lightCardColor = 0x829db1;
    const borderColor = 0x0f172a;
    const textColor = '#ffffff';

    this.cameras.main.setBackgroundColor(bgColor);

    // --- FETCH MAPS FROM BACKEND ---
    try {
      this.maps = await apiService.getAllMaps();
      if (!this.maps || this.maps.length === 0) {
        console.log('No maps found, creating demo map...');
        await this.createDemoMap();
      }
    } catch (error) {
      console.error('Failed to load maps:', error);
      this.maps = this.getMockMaps(); // Fallback to mock maps if backend is down
    }

    // --- GRID LAYOUT SEGMENTS ---
    const cardWidth = 520;
    const leftX = width / 2 - 540;
    const rightX = width / 2 + 20;
    const topY = 120;

    const createPixelCard = (x, y, w, h, title, bgHex) => {
      const card = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, w, h, bgHex).setOrigin(0);
      bg.setStrokeStyle(6, borderColor);
      card.add(bg);

      if (title) {
        const titleText = this.add.text(20, 15, title, { fontSize: '24px', fontFamily: '"Courier New", Courier, monospace', color: textColor, fontStyle: 'bold' });
        titleText.setShadow(2, 2, '#000000', 0, false, true);
        card.add(titleText);
      }
      return card;
    };

    // 1. Welcome Card
    const welcomeCard = createPixelCard(leftX, topY, cardWidth, 240, "", lightCardColor);
    const bubbleBg = this.add.rectangle(20, 20, 320, 200, 0xf8fafc).setOrigin(0).setStrokeStyle(4, borderColor);
    const welcomeMsg = this.add.text(40, 40, `Welcome back,\n${learner.username}!`, { fontSize: '28px', fontFamily: '"Courier New", Courier, monospace', color: '#0f172a', fontStyle: 'bold' });
    const lvlDisplay = this.add.text(40, 130, `Current Level: ${learner.level}`, { fontSize: '20px', fontFamily: '"Courier New", Courier, monospace', color: '#0f172a', fontStyle: 'bold' });
    const pbTrack = this.add.rectangle(40, 170, 280, 24, 0x1e293b).setOrigin(0).setStrokeStyle(2, 0x64748b);
    const pbFill = this.add.rectangle(44, 174, 100, 16, 0x4a90e2).setOrigin(0);
    const giantAvatar = this.add.image(430, 120, 'player').setScale(5);
    welcomeCard.add([bubbleBg, welcomeMsg, lvlDisplay, pbTrack, pbFill, giantAvatar]);

    // 2. Map View
    const mapCard = createPixelCard(rightX, topY, cardWidth, 240, "Map View", lightCardColor);
    const mountain1 = this.add.triangle(40, 90, 0, 150, 120, 0, 240, 150, 0x475569).setOrigin(0);
    const mountain2 = this.add.triangle(180, 50, 0, 190, 140, 0, 280, 190, 0x334155).setOrigin(0);
    const mountain3 = this.add.triangle(320, 110, 0, 130, 80, 0, 160, 130, 0x475569).setOrigin(0);
    const ground = this.add.rectangle(0, 220, cardWidth, 20, 0x22c55e).setOrigin(0);
    mapCard.add([mountain1, mountain3, mountain2, ground]);

    // 3. Recommendations
    const recCard = createPixelCard(leftX, topY + 270, cardWidth, 360, "Recommendations", darkCardColor);
    const recs = ["1. Pixel Art Basics", "2. Retro Game Design", "3. 8-bit Music Creation"];
    recs.forEach((text, i) => {
      const recItem = this.add.text(30, 70 + (i * 50), text, { fontSize: '22px', fontFamily: '"Courier New", Courier, monospace', color: textColor, fontStyle: 'bold' });
      recItem.setShadow(2, 2, '#000000', 0, false, true);
      recCard.add(recItem);
    });

    // 4. Quick Actions (Using Fetched Maps)
    const actionCard = createPixelCard(rightX, topY + 270, cardWidth, 130, "Quick Actions", darkCardColor);
    
    // Grab up to 3 maps from the API to display as buttons
    const actionMaps = this.maps.slice(0, 3);
    
    // Default short labels in case map names are too long, or fallback to the first word of the map name
    const getShortLabel = (name, index) => {
      const defaults = ["Forest", "Cave", "Mountain"];
      if (name) return name.split(' ')[0]; // Takes the first word of the fetched map name
      return defaults[index];
    };

    actionMaps.forEach((map, i) => {
      const btnBg = this.add.rectangle(20 + (i * 165), 65, 145, 40, 0x475e7a).setOrigin(0).setStrokeStyle(3, borderColor);
      btnBg.setInteractive({ useHandCursor: true });
      
      const btnText = this.add.text(92 + (i * 165), 85, getShortLabel(map.name, i), {
        fontSize: '16px',
        fontFamily: '"Courier New", Courier, monospace',
        color: textColor,
        fontStyle: 'bold'
      }).setOrigin(0.5);

      btnBg.on('pointerover', () => btnBg.setFillStyle(0x64748b));
      btnBg.on('pointerout', () => btnBg.setFillStyle(0x475e7a));
      
      btnBg.on('pointerdown', () => {
        this.enterMap(map);
      });
      
      actionCard.add([btnBg, btnText]);
    });

    // If there are less than 3 maps, fill the remaining spots with disabled placeholder buttons
    for (let i = actionMaps.length; i < 3; i++) {
      const btnBg = this.add.rectangle(20 + (i * 165), 65, 145, 40, 0x1e293b).setOrigin(0).setStrokeStyle(3, borderColor);
      const btnText = this.add.text(92 + (i * 165), 85, "Locked", {
        fontSize: '16px',
        fontFamily: '"Courier New", Courier, monospace',
        color: '#64748b',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      actionCard.add([btnBg, btnText]);
    }

    // 5. Weekly Leaderboard
    const leaderCard = createPixelCard(rightX, topY + 430, cardWidth, 200, "Weekly Leaderboard", darkCardColor);
    const topPlayers = [
      { r: 1, n: "PixelKing", xp: 2000 },
      { r: 2, n: "RetroQueen", xp: 1800 },
      { r: 3, n: "BitMaster", xp: 1600 }
    ];
    topPlayers.forEach((p, i) => {
      const yPos = 70 + (i * 35);
      const rText = this.add.text(30, yPos, `Rank ${p.r}`, { fontSize: '20px', fontFamily: '"Courier New", Courier, monospace', color: textColor });
      const nText = this.add.text(160, yPos, p.n, { fontSize: '20px', fontFamily: '"Courier New", Courier, monospace', color: textColor });
      const xText = this.add.text(cardWidth - 140, yPos, `(${p.xp} XP)`, { fontSize: '20px', fontFamily: '"Courier New", Courier, monospace', color: textColor });
      
      [rText, nText, xText].forEach(t => t.setShadow(2, 2, '#000000', 0, false, true));
      if (i < topPlayers.length - 1) leaderCard.add(this.add.line(0, 0, 30, yPos + 28, cardWidth - 30, yPos + 28, 0x334155).setOrigin(0));
      leaderCard.add([rText, nText, xText]);
    });
  }
}