import Phaser from 'phaser';
import { gameState } from '../../services/gameState.js';
import { SoldierController } from '../../characters/soldier/SoldierController.js';
import { apiService } from '../../services/api.js';
import { HUD } from './constants.js';

export async function createGameMapScene() {
  const width = this.cameras.main.width;
  const height = this.cameras.main.height;

  if (!this.editorMapData) {
    await this.tryLoadEditorMapData();
  }

  this.createTilemap();

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

  this.cameras.main.startFollow(this.playerCtrl.sprite);
  if (this.map) {
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
  }
  this.playerCtrl?.sprite?.setCollideWorldBounds(true);

  this.cursors = this.input.keyboard.createCursorKeys();
  this.createUI();

  try {
    const currentMap = gameState.getCurrentMap();
    const mapId = currentMap?.mapId || currentMap?.id;
    if (mapId) {
      const [monsters, npcs, encounterState] = await Promise.all([
        apiService.getMonstersByMap(mapId),
        apiService.getNPCsByMap(mapId),
        apiService.getEncounterState(mapId).catch(() => null)
      ]);
      this.monsters = monsters || [];
      this.npcs = npcs || [];
      this.encounterState = encounterState;
      this.hydrateEncounterProgress();
    } else {
      this.monsters = [];
      this.npcs = [];
      this.encounterState = null;
    }

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
  this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    this.events.off('resume', this.handleSceneResume, this);
    this.destroyEventPanel();
  });
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
    if (statusBadge) statusBadge.setPosition(sprite.x, sprite.y - 58);
  });

  this.monsterSprites.forEach((sprite) => {
    const nameText = sprite.getData('nameText');
    if (nameText) {
      const offsetY = sprite.getData('labelOffsetY') || -30;
      this.placeNameLabel(sprite, nameText, offsetY);
    }
  });
}
