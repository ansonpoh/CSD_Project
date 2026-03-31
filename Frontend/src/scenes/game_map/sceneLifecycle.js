import Phaser from 'phaser';
import { gameState } from '../../services/gameState.js';
import { SoldierController } from '../../characters/soldier/SoldierController.js';
import { apiService } from '../../services/api.js';
import { HUD } from './constants.js';

const PLAYER_TOP_BOUNDARY_Y = 90;

function showMapLoadingOverlay(scene) {
  const width = scene.cameras.main.width;
  const height = scene.cameras.main.height;
  const overlay = scene.add.container(0, 0).setScrollFactor(0).setDepth(5000);

  const backdrop = scene.add.rectangle(width / 2, height / 2, width, height, 0x050814, 0.96).setScrollFactor(0);
  const title = scene.add.text(width / 2, height / 2 - 22, 'Loading Map', {
    fontSize: '38px',
    fontFamily: 'Trebuchet MS, Verdana, sans-serif',
    fontStyle: 'bold',
    color: '#f4f6ff',
    stroke: '#0a1025',
    strokeThickness: 5
  }).setOrigin(0.5).setScrollFactor(0);
  const status = scene.add.text(width / 2, height / 2 + 26, 'Preparing world...', {
    fontSize: '20px',
    fontFamily: 'Trebuchet MS, Verdana, sans-serif',
    color: '#c8d0ff',
    stroke: '#0a1025',
    strokeThickness: 4
  }).setOrigin(0.5).setScrollFactor(0);

  overlay.add([backdrop, title, status]);
  scene.mapLoadingOverlay = { overlay, status };
}

function setMapLoadingStatus(scene, message) {
  if (!scene.mapLoadingOverlay?.status) return;
  scene.mapLoadingOverlay.status.setText(message);
}

function hideMapLoadingOverlay(scene) {
  if (!scene.mapLoadingOverlay) return;
  scene.mapLoadingOverlay.overlay?.destroy(true);
  scene.mapLoadingOverlay = null;
}

export async function createGameMapScene() {
  const loadToken = Symbol('game-map-load');
  this.activeLoadToken = loadToken;
  const isStaleLoad = () => this.activeLoadToken !== loadToken;

  this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    if (this.activeLoadToken === loadToken) {
      this.activeLoadToken = null;
    }
    this.events.off('resume', this.handleSceneResume, this);
    this.playerCtrl?.destroy?.();
    this.playerCtrl = null;
    this.destroyEventPanel();
    hideMapLoadingOverlay(this);
  });

  const width = this.cameras.main.width;
  const height = this.cameras.main.height;
  const isContributorMap = Boolean(
    this.editorMapData
    || this.mapConfig?.isEditorMap
    || String(this.mapConfig?.asset || '').startsWith('editor-draft:')
  );
  showMapLoadingOverlay(this);
  await new Promise((resolve) => this.time.delayedCall(0, resolve));

  try {
    if (!this.editorMapData) {
      setMapLoadingStatus(this, 'Preparing map layout...');
      await this.tryLoadEditorMapData();
      if (isStaleLoad()) return;
    }

    this.createTilemap();
    if (isStaleLoad()) return;

    this.playerCtrl = new SoldierController(this, width, height);
    if (this.collisionLayers?.length) {
      this.collisionLayers.forEach((layer) => {
        this.physics.add.collider(this.playerCtrl.sprite, layer);
      });
    }
    if (this.collisionBodies?.length) {
      this.collisionBodies.forEach((body) => {
        this.physics.add.collider(this.playerCtrl.sprite, body);
      });
    }

    if (isContributorMap) {
      this.cameras.main.stopFollow();
      this.cameras.main.setScroll(0, 0);
      this.cameras.main.setBounds(0, 0, width, height);
      this.physics.world.setBounds(0, PLAYER_TOP_BOUNDARY_Y, width, Math.max(1, height - PLAYER_TOP_BOUNDARY_Y));
    } else {
      this.cameras.main.startFollow(this.playerCtrl.sprite);
      if (this.map) {
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.physics.world.setBounds(
          0,
          PLAYER_TOP_BOUNDARY_Y,
          this.map.widthInPixels,
          Math.max(1, this.map.heightInPixels - PLAYER_TOP_BOUNDARY_Y)
        );
      }
    }
    this.playerCtrl?.sprite?.setCollideWorldBounds(true);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.createUI();

    try {
      setMapLoadingStatus(this, 'Syncing NPC encounters...');
      const currentMap = gameState.getCurrentMap();
      const mapId = currentMap?.mapId || currentMap?.id;
      if (mapId) {
        const [monsters, npcs, encounterState] = await Promise.all([
          apiService.getMonstersByMap(mapId),
          apiService.getNPCsByMap(mapId),
          apiService.getEncounterState(mapId).catch(() => null)
        ]);
        if (isStaleLoad()) return;

        this.monsters = monsters || [];
        this.npcs = npcs || [];
        this.encounterState = encounterState;
        this.hydrateEncounterProgress();
      } else {
        this.monsters = [];
        this.npcs = [];
        this.encounterState = null;
      }

      setMapLoadingStatus(this, 'Spawning NPCs and monsters...');
      this.createMonsterAnimations();
      this.createNPCAnimations();
      this.createNpcMonsterMapping();
      this.createNPCs();
      this.createMonsters();
      this.mapStartedCompleted = this.isQuestChainComplete();
      this.updateAllNpcVisualStates();
      this.updateMonsterVisualStates();
      this.updateMissionPanel();
      this.updateQuestPanel();
    } catch (error) {
      if (isStaleLoad()) return;

      console.error('Failed to load monsters for map:', error);
      this.monsters = [];
      this.npcs = this.npcs || [];
      this.encounterState = null;
      this.encounterProgressByNpcKey.clear();
      this.createNpcMonsterMapping();
      this.mapStartedCompleted = this.isQuestChainComplete();
      this.updateAllNpcVisualStates();
      this.updateMissionPanel();
      this.updateQuestPanel();
    }

    if (isStaleLoad()) return;

    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.interactPromptBg = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height - 40,
      760,
      44,
      0x08122e,
      0.95
    ).setStrokeStyle(2, HUD.border, 0.85).setScrollFactor(0).setDepth(100).setVisible(false);
    this.interactPrompt = this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 40, '', {
      fontSize: '18px',
      fontFamily: 'Trebuchet MS, Verdana, sans-serif',
      fontStyle: 'bold',
      color: HUD.textMain,
      stroke: '#060814',
      strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101).setVisible(false);

    this.events.on('resume', this.handleSceneResume, this);
  } finally {
    hideMapLoadingOverlay(this);
  }
}

export function updateGameMapScene() {
  this.playerCtrl?.update?.();
  this.updateNpcInteraction();

  this.npcSprites.forEach((sprite) => {
    const nameText = sprite.getData('nameText');
    if (nameText) {
      const offsetY = sprite.getData('labelOffsetY') || -30;
      this.placeNameLabel(sprite, nameText, offsetY);
    }
    const statusBadge = sprite.getData('statusBadge');
    if (statusBadge) this.placeStatusBadge(sprite, statusBadge);
  });

  this.monsterSprites.forEach((sprite) => {
    const nameText = sprite.getData('nameText');
    if (nameText) {
      const offsetY = sprite.getData('labelOffsetY') || -30;
      this.placeNameLabel(sprite, nameText, offsetY);
    }
  });
}
