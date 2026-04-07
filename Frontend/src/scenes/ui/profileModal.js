import { apiService } from '../../services/api.js';
import { gameState } from '../../services/gameState.js';
import { soldier } from '../../characters/soldier/Soldier.js';
import { applyPlayerProfileToSprite, getDefaultPlayerProfile } from '../../services/playerProfile.js';
import { showAnalyticsModal } from './analyticsModal.js';
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
    const learnerId = learnerData?.id || learnerData?.learnerId || 'me';
    const analyticsData = await apiService.getLearnerAnalytics(learnerId).catch(() => null);

    loadingText.destroy();
    ensureProfileIdleAnimation(scene, soldier);

    const playerProfile = gameState.getPlayerProfile() || getDefaultPlayerProfile();

    nodes.push(
      scene.add.image(width / 2, height / 2 + 16, 'ui-portrait-frame')
        .setScale(4.1, 4.75)
        .setDepth(depth + 2)
    );

    const character = scene.add.sprite(width / 2, height / 2 + 26, soldier.sheetKey, 0)
      .setScale(2.85)
      .setDepth(depth + 3);
    character.play('idle');
    applyPlayerProfileToSprite(character, playerProfile);
    nodes.push(character);

    const auraRadius = Math.max(40, Math.round(character.displayWidth * 0.32));
    const aura = scene.add.circle(
      character.x,
      character.y,
      auraRadius,
      0x6cc0ff,
      0.24
    ).setDepth(depth + 1);
    nodes.push(aura);

    renderProfileColumns(scene, {
      learnerData,
      analyticsData,
      roleData,
      playerProfile,
      nodes,
      panelLeft,
      panelTop,
      panelWidth,
      rows,
      tileSize,
      depth
    });

    scene.profileTween = scene.tweens.add({
      targets: [character, aura],
      y: '-=6',
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // --- NEW: VIEW ANALYTICS BUTTON ---
    nodes.push(
      createUiButton(scene, {
        x: width / 2,
        y: panelTop + rows * tileSize - 72,
        width: 158,
        height: 26,
        label: 'VIEW ANALYTICS',
        fillNormal: 0x0f3460, // Deep Blue
        fillHover: 0x1a5294,  // Bright Blue
        borderNormal: 0x1f477a,
        borderHover: 0x3a7bd5,
        depth: depth + 4,
        onPress: () => {
          // Open the HTML DOM overlay over the Phaser canvas
          // Default to 'me' if learner ID cannot be extracted directly
          const currentId = learnerData?.id || learnerData?.learnerId || 'me';
          showAnalyticsModal(currentId);
        }
      })
    );
    // ----------------------------------

    // Existing: LOGOUT BUTTON
    nodes.push(
      createUiButton(scene, {
        x: width / 2,
        y: panelTop + rows * tileSize - 40,
        width: 118,
        height: 26,
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
  } catch (error) {
    console.error('Error fetching profile:', error);
    loadingText.setText('Failed to load profile data.\nPlease ensure you are logged in.');
    loadingText.setColor('#ff6b6b');
  }
}

function renderProfileColumns(scene, config) {
  const {
    learnerData,
    analyticsData,
    roleData,
    playerProfile,
    nodes,
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
  const analyticsStats = buildAnalyticsProfileStats(analyticsData);

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
  drawRows(panelLeft + panelWidth - 36, panelTop + 102, rightStats.concat(analyticsStats), 'right');

  const bottomY = panelTop + rows * tileSize - 110;
  extras.slice(0, 2).forEach(([label, value], index) => {
    const x = index === 0 ? panelLeft + 36 : panelLeft + panelWidth - 36;
    const alignRight = index === 1;
    nodes.push(
      scene.add.text(x, bottomY, `${label}: ${truncateProfileValue(value, 22)}`, {
        fontSize: '15px',
        color: '#c4def8'
      }).setOrigin(alignRight ? 1 : 0, 0).setDepth(depth + 3)
    );
  });
}

function buildAnalyticsProfileStats(analyticsData) {
  if (!analyticsData) {
    return [['Analytics', 'Unavailable']];
  }
  const exp7d = Math.max(0, Number(analyticsData.expGainedLast7Days || 0));
  const streak = Math.max(0, Number(analyticsData.currentStreak || 0));
  const quizRate = Number(analyticsData.averageQuizScore || 0);
  const safeQuizRate = Number.isFinite(quizRate) ? `${quizRate.toFixed(1)}%` : '0%';

  return [
    ['7d XP', String(exp7d)],
    ['Streak', `${streak}d`],
    ['Avg Quiz', safeQuizRate]
  ];
}
