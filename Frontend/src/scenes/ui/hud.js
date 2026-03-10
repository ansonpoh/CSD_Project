import { createUiButton } from './shared.js';

export function buildHud(scene, learner) {
  const width = scene.cameras.main.width;

  const hudBackground = scene.add.graphics();
  hudBackground.fillStyle(0x0d1530, 0.97);
  hudBackground.fillRect(0, 0, width, 58);
  hudBackground.lineStyle(1, 0xc8870a, 0.55);
  hudBackground.beginPath();
  hudBackground.moveTo(0, 57);
  hudBackground.lineTo(width, 57);
  hudBackground.strokePath();

  scene.usernameText = scene.add.text(16, 10, `@ ${learner.username}`, {
    fontSize: '18px',
    color: '#e8f0ff',
    fontStyle: 'bold',
    stroke: '#060d1e',
    strokeThickness: 4
  });

  scene.usernameText.setInteractive({ useHandCursor: true });

  const tooltipText = scene.add.text(0, 0, 'User profile', {
    fontSize: '12px',
    color: '#ffffff',
    fontStyle: 'bold'
  });

  const tooltipBackground = scene.add.graphics();
  tooltipBackground.fillStyle(0x000000, 0.85);
  tooltipBackground.fillRoundedRect(-6, -4, tooltipText.width + 12, tooltipText.height + 8, 4);

  const tooltip = scene.add.container(
    scene.usernameText.x + 10,
    scene.usernameText.y + 26,
    [tooltipBackground, tooltipText]
  ).setDepth(100).setVisible(false);

  scene.usernameText.on('pointerover', () => {
    scene.usernameText.setTint(0xf4c048);
    tooltip.setVisible(true);
  });

  scene.usernameText.on('pointerout', () => {
    scene.usernameText.clearTint();
    tooltip.setVisible(false);
  });

  scene.usernameText.on('pointerdown', () => {
    tooltip.setVisible(false);
    scene.showUserProfile();
  });

  scene.levelText = scene.add.text(16, 32, `Level: ${learner.level}`, {
    fontSize: '13px',
    color: '#4ade80',
    stroke: '#060d1e',
    strokeThickness: 3
  });
  scene.lastKnownLevel = learner.level;

  scene.xpText = scene.add.text(width / 2, 29, `XP: ${learner.total_xp}`, {
    fontSize: '16px',
    color: '#f4c048',
    fontStyle: 'bold',
    stroke: '#060d1e',
    strokeThickness: 4
  }).setOrigin(0.5, 0.5);

  const textStyle = {
    fontSize: '13px',
    fontStyle: 'bold',
    color: '#f0ecff',
    stroke: '#060814',
    strokeThickness: 4
  };

  const leaderboardX = scene.usernameText.x + scene.usernameText.width + 80;

  createUiButton(scene, {
    x: leaderboardX + 56,
    y: 29,
    width: 112,
    height: 30,
    label: 'Leaderboard',
    fillNormal: 0x1a2a52,
    fillHover: 0x2a4278,
    borderNormal: 0xc8870a,
    borderHover: 0xf0c050,
    pressFill: 0x08031a,
    pressBorder: 0x604008,
    lineWidth: 1,
    textStyle,
    onPress: () => scene.showLeaderboard()
  });

  createUiButton(scene, {
    x: leaderboardX + 178,
    y: 29,
    width: 92,
    height: 30,
    label: 'Profile',
    fillNormal: 0x17324f,
    fillHover: 0x24507b,
    borderNormal: 0xc8870a,
    borderHover: 0xf0c050,
    pressFill: 0x08031a,
    pressBorder: 0x604008,
    lineWidth: 1,
    textStyle,
    onPress: () => scene.showUserProfile()
  });

  createUiButton(scene, {
    x: width - 52,
    y: 29,
    width: 56,
    height: 30,
    label: 'INV',
    fillNormal: 0x1e1040,
    fillHover: 0x2d1860,
    borderNormal: 0xc8870a,
    borderHover: 0xf0c050,
    pressFill: 0x08031a,
    pressBorder: 0x604008,
    lineWidth: 1,
    textStyle,
    onPress: () => scene.showInventory()
  });

  createUiButton(scene, {
    x: width - 122,
    y: 29,
    width: 60,
    height: 30,
    label: 'Logout',
    fillNormal: 0x3a0e0e,
    fillHover: 0x601818,
    borderNormal: 0xc8870a,
    borderHover: 0xf0c050,
    pressFill: 0x08031a,
    pressBorder: 0x604008,
    lineWidth: 1,
    textStyle,
    onPress: () => scene.handleLogout()
  });
}