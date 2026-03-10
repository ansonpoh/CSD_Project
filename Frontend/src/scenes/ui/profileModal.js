import { apiService } from '../../services/api.js';
import { gameState } from '../../services/gameState.js';
import { soldier } from '../../characters/soldier/Soldier.js';
import { applyPlayerProfileToSprite, getDefaultPlayerProfile } from '../../services/playerProfile.js';
import {
  buildProfilePanel,
  ensureProfileIdleAnimation,
  getExtraProfileStats,
  getPrimaryLeftStats,
  getPrimaryRightStats,
  truncateProfileValue
} from './profileHelpers.js';
import { createUiButton, stopPointerPropagation } from './shared.js';

export async function showUserProfile(scene) {
  const width = scene.cameras.main.width;
  const height = scene.cameras.main.height;
  const depth = 1201;
  const tileSize = 56;
  const cols = 12;
  const rows = 9;
  const panelLeft = Math.floor(width / 2 - (cols * tileSize) / 2);
  const panelTop = Math.floor(height / 2 - (rows * tileSize) / 2);
  const panelWidth = cols * tileSize;

  const overlay = stopPointerPropagation(
    scene.add.rectangle(0, 0, width, height, 0x060a14, 0.86)
      .setOrigin(0)
      .setDepth(1200)
      .setInteractive()
  );

  const nodes = [overlay];

  buildProfilePanel(scene, {
    left: panelLeft,
    top: panelTop,
    cols,
    rows,
    tileSize,
    depth
  }, nodes);

  nodes.push(
    scene.add.text(width / 2, panelTop + 32, 'PLAYER PROFILE', {
      fontSize: '34px',
      color: '#f8fbff',
      fontStyle: 'bold',
      stroke: '#13233d',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(depth + 3)
  );

  const cleanup = (pointer, localX, localY, event) => {
    event?.stopPropagation?.();
    nodes.forEach((node) => node?.destroy());
    scene.profileTween?.stop();
    scene.profileTween = null;
  };

  const closeButton = scene.add.sprite(panelLeft + panelWidth - 40, panelTop + 32, 'ui-close-btn', 0)
    .setScale(1.8)
    .setDepth(depth + 4)
    .setInteractive({ useHandCursor: true });
  closeButton.on('pointerover', () => closeButton.setFrame(1));
  closeButton.on('pointerout', () => closeButton.setFrame(0));
  closeButton.on('pointerdown', (pointer, localX, localY, event) => event?.stopPropagation?.());
  closeButton.on('pointerup', cleanup);
  nodes.push(closeButton);

  const loadingText = scene.add.text(width / 2, height / 2, 'Loading Profile...', {
    fontSize: '20px',
    color: '#c4def8',
    stroke: '#060814',
    strokeThickness: 3
  }).setOrigin(0.5).setDepth(depth + 3);
  nodes.push(loadingText);

  try {
    const [learnerData, roleData] = await Promise.all([
      apiService.getCurrentLearner(),
      apiService.getMyRole()
    ]);

    loadingText.destroy();
    ensureProfileIdleAnimation(scene, soldier);

    const playerProfile = gameState.getPlayerProfile() || getDefaultPlayerProfile();

    nodes.push(
      scene.add.image(width / 2, height / 2 + 16, 'ui-portrait-frame')
        .setScale(4.2)
        .setDepth(depth + 2)
    );

    const character = scene.add.sprite(width / 2, height / 2 + 26, soldier.sheetKey, 0)
      .setScale(2.85)
      .setDepth(depth + 3);
    character.play('idle');
    applyPlayerProfileToSprite(character, playerProfile);
    nodes.push(character);

    nodes.push(
      scene.add.circle(width / 2, height / 2 + 96, 58, 0x6cc0ff, 0.24)
        .setDepth(depth + 1)
    );

    renderProfileColumns(scene, {
      learnerData,
      roleData,
      playerProfile,
      nodes,
      width,
      panelLeft,
      panelTop,
      panelWidth,
      rows,
      tileSize,
      depth
    });

    scene.profileTween = scene.tweens.add({
      targets: character,
      y: character.y - 6,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    nodes.push(
      createUiButton(scene, {
        x: width / 2,
        y: panelTop + rows * tileSize - 70,
        width: 140,
        height: 36,
        label: 'LOGOUT',
        fillNormal: 0x3a0e0e,
        fillHover: 0x601818,
        borderNormal: 0x8b2020,
        borderHover: 0xf0b030,
        depth: depth + 4,
        onPress: () => {
          cleanup();
          scene.handleLogout();
        }
      })
    );

    nodes.push(
      scene.add.text(width / 2, panelTop + rows * tileSize - 28, 'Tap X to close', {
        fontSize: '13px',
        color: '#7a96b4'
      }).setOrigin(0.5).setDepth(depth + 3)
    );
  } catch (error) {
    console.error('Error fetching profile:', error);
    loadingText.setText('Failed to load profile data.\nPlease ensure you are logged in.');
    loadingText.setColor('#ff6b6b');
  }
}

function renderProfileColumns(scene, config) {
  const {
    learnerData,
    roleData,
    playerProfile,
    nodes,
    width,
    panelLeft,
    panelTop,
    panelWidth,
    rows,
    tileSize,
    depth
  } = config;

  const leftStats = getPrimaryLeftStats(learnerData, roleData || gameState.getRole() || 'User', playerProfile);
  const rightStats = getPrimaryRightStats(learnerData);
  const extras = getExtraProfileStats(learnerData);

  const drawRows = (startX, startY, rowsToDraw, align = 'left') => {
    let y = startY;
    rowsToDraw.forEach(([label, value]) => {
      const labelText = scene.add.text(startX, y, `${label}:`, {
        fontSize: '17px',
        color: '#a5c8ea',
        fontStyle: 'bold'
      }).setDepth(depth + 3);

      const valueText = scene.add.text(startX, y + 19, truncateProfileValue(value, 34), {
        fontSize: '18px',
        color: '#f1f7ff',
        fontStyle: 'bold'
      }).setDepth(depth + 3);

      if (align === 'right') {
        labelText.setOrigin(1, 0);
        valueText.setOrigin(1, 0);
      }

      nodes.push(labelText, valueText);
      y += 58;
    });
  };

  drawRows(panelLeft + 36, panelTop + 102, leftStats);
  drawRows(panelLeft + panelWidth - 36, panelTop + 102, rightStats, 'right');

  let extraY = panelTop + rows * tileSize - 150;
  extras.slice(0, 2).forEach(([label, value]) => {
    nodes.push(
      scene.add.text(width / 2, extraY, `${label}: ${truncateProfileValue(value, 52)}`, {
        fontSize: '15px',
        color: '#c4def8'
      }).setOrigin(0.5).setDepth(depth + 3)
    );
    extraY += 24;
  });
}