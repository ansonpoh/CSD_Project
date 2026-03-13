import Phaser from 'phaser';
import { apiService } from '../../services/api.js';
import { gameState } from '../../services/gameState.js';
import { loadSharedUiAssets } from '../../services/uiAssets.js';
import { worldMapBackdropMethods } from './backdrop.js';
import { worldMapCommunityPanelMethods } from './communityPanel.js';
import { worldMapIntelPanelMethods } from './intelPanel.js';
import { worldMapMapPanelMethods } from './mapPanel.js';
import { worldMapPanelFactoryMethods } from './panelFactory.js';
import { worldMapProfilePanelMethods } from './profilePanel.js';
import { worldMapUtilityMethods } from './utils.js';

export class WorldMapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldMapScene' });
    this.rawMaps = [];
    this.catalog = [];
    this.selectedMapId = null;
    this.selectedMap = null;
    this.uiTileSize = 56;
    this.cloudSet = 1;
    this.cloudLayerCount = 4;
    this.panels = {};
  }

  init(data) {
    this.selectedMapId = data?.selectedMapId || this.selectedMapId || null;
  }

  preload() {
    loadSharedUiAssets(this, { includeArrow: true });

    const { cloudSet, cloudLayerCount } = this.getCloudConfigForCurrentTime();
    this.cloudSet = cloudSet;
    this.cloudLayerCount = cloudLayerCount;

    for (let i = 1; i <= this.cloudLayerCount; i += 1) {
      this.load.image(`home-cloud-${i}`, `assets/Clouds/Clouds%20${this.cloudSet}/${i}.png`);
    }
  }

  async create() {
    const { width, height } = this.cameras.main;
    const learner = gameState.getLearner();

    if (!learner) {
      this.scene.stop('UIScene');
      this.scene.start('LoginScene');
      return;
    }

    this.input.keyboard.on('keydown-B', () => {
      this.scene.start('ScenarioQuizScene');
    });

    this.cameras.main.setBackgroundColor(0x090f24);
    this.drawBackdrop(width, height);
    this.createHomeCloudBackdrop(width, height);

    try {
      this.rawMaps = await apiService.getAllMaps();
      if (!this.rawMaps?.length) await this.createDemoMap();
    } catch (error) {
      console.error('Failed to load maps:', error);
      this.rawMaps = this.getMockMaps();
    }

    this.refreshCatalog();
    this.layoutPanels(width, height);
    this.renderPanels(learner);
  }

  layoutPanels(width, height) {
    const panelGapX = Math.max(18, Math.floor(width * 0.016));
    const panelGapY = Math.max(18, Math.floor(height * 0.018));
    const leftCols = 10;
    const rightCols = 13;
    const topRows = 8;
    const bottomRows = 6;
    const sidePadding = 40;
    const availableWidth = width - sidePadding * 2 - panelGapX;
    this.uiTileSize = Phaser.Math.Clamp(Math.floor(availableWidth / (leftCols + rightCols)), 44, 64);

    const tile = this.uiTileSize;
    const totalWidth = (leftCols + rightCols) * tile + panelGapX;
    const leftX = Math.floor((width - totalWidth) / 2);
    const topY = 86;
    const rightX = leftX + leftCols * tile + panelGapX;
    const bottomY = topY + topRows * tile + panelGapY;

    this.panels.profile = this.createWindowPanel(leftX, topY, leftCols, topRows, 'ADVENTURER');
    this.panels.gates = this.createWindowPanel(rightX, topY, rightCols, topRows, 'DISCOVERY GATES');
    this.panels.intel = this.createWindowPanel(leftX, bottomY, leftCols, bottomRows, 'MAP INTEL');
    this.panels.community = this.createWindowPanel(rightX, bottomY, rightCols, bottomRows, 'COMMUNITY SIGNALS');
  }

  renderPanels(learner) {
    this.populateProfilePanel(this.panels.profile, learner);
    this.populateMapPanel(this.panels.gates);
    this.populateIntelPanel(this.panels.intel, learner);
    this.populateCommunityPanel(this.panels.community, learner);
  }
}

Object.assign(
  WorldMapScene.prototype,
  worldMapBackdropMethods,
  worldMapPanelFactoryMethods,
  worldMapProfilePanelMethods,
  worldMapMapPanelMethods,
  worldMapIntelPanelMethods,
  worldMapCommunityPanelMethods,
  worldMapUtilityMethods
);
