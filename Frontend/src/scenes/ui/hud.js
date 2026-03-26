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

  const topBtnGap = 10;
  const leaderboardBtnW = 112;
  const profileBtnW = 92;
  const achievementsBtnW = 132;
  const friendsBtnW = 96;

  const leaderboardBtnX = leaderboardX + (leaderboardBtnW / 2);
  const profileBtnX = leaderboardX + leaderboardBtnW + topBtnGap + (profileBtnW / 2);
  const achievementsBtnX = profileBtnX + (profileBtnW / 2) + topBtnGap + (achievementsBtnW / 2);
  const friendsBtnX = achievementsBtnX + (achievementsBtnW / 2) + topBtnGap + (friendsBtnW / 2);

  createUiButton(scene, {
    x: leaderboardBtnX,
    y: 29,
    width: leaderboardBtnW,
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
    x: profileBtnX,
    y: 29,
    width: profileBtnW,
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
    x: achievementsBtnX,
    y: 29,
    width: achievementsBtnW,
    height: 30,
    label: 'Achievements',
    fillNormal: 0x243615,
    fillHover: 0x335223,
    borderNormal: 0xc8870a,
    borderHover: 0xf0c050,
    pressFill: 0x08031a,
    pressBorder: 0x604008,
    lineWidth: 1,
    textStyle,
    onPress: () => scene.showAchievements()
  });

  createUiButton(scene, {
    x: friendsBtnX,
    y: 29,
    width: friendsBtnW,
    height: 30,
    label: 'Friends',
    fillNormal: 0x1f2f17,
    fillHover: 0x2f4923,
    borderNormal: 0xc8870a,
    borderHover: 0xf0c050,
    pressFill: 0x08031a,
    pressBorder: 0x604008,
    lineWidth: 1,
    textStyle,
    onPress: () => scene.showFriends()
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

  // Scroll / Quest icon — right side, below HUD
  const scrollIconSize = 72;
  const scrollX = width - scrollIconSize / 2 - 12;
  const scrollY = 58 + scrollIconSize / 2 + 12;

  // ── 4-pointed star sparkles with soft glow ───────────────────────────────
  function drawStar4(g, x, y, size, alpha) {
    g.clear();
    // Layered glow — many concentric circles stepping down in alpha for a smooth falloff
    const glowLayers = 6;
    for (let l = glowLayers; l >= 1; l--) {
      const r = size * (0.5 + l * 0.45);
      const a = alpha * (0.04 * (glowLayers - l + 1));
      g.fillStyle(0xf4c048, a);
      g.fillCircle(x, y, r);
    }
    // Cross arms
    g.fillStyle(0xf4c048, alpha);
    g.fillRect(x - size * 0.15, y - size * 0.65, size * 0.3, size * 1.3);
    g.fillRect(x - size * 0.65, y - size * 0.15, size * 1.3, size * 0.3);
    // Bright white centre
    g.fillStyle(0xffffff, alpha * 0.85);
    g.fillCircle(x, y, size * 0.22);
  }

  const starDefs = [
    { ox: -42, oy: -20, phase: 0,    size: 5 },
    { ox:  44, oy: -26, phase: 1.2,  size: 4 },
    { ox:  32, oy:  36, phase: 2.4,  size: 6 },
    { ox: -30, oy:  32, phase: 3.6,  size: 4 },
    { ox:  54, oy:   6, phase: 0.7,  size: 3 },
    { ox:  -8, oy: -46, phase: 1.9,  size: 3 },
    { ox: -50, oy:  10, phase: 3.0,  size: 4 },
  ];
  const starGraphics = starDefs.map(() => scene.add.graphics().setDepth(52));

  let starT = 0;
  scene.time.addEvent({
    delay: 40,
    loop: true,
    callback: () => {
      starT += 0.04;
      starDefs.forEach((def, i) => {
        // Smooth sine wave — each star fades in/out independently
        const alpha = Math.max(0, Math.sin(starT + def.phase));
        drawStar4(starGraphics[i], scrollX + def.ox, scrollY + def.oy, def.size, alpha);
      });
    }
  });

  let scrollIcon;
  let scrollIconBaseScale = 1;
  if (scene.textures.exists('ui-scroll-icon')) {
    const frame = scene.textures.getFrame('ui-scroll-icon');
    scrollIconBaseScale = scrollIconSize / Math.max(frame.realWidth, frame.realHeight, 1);
    scrollIcon = scene.add.image(scrollX, scrollY, 'ui-scroll-icon')
      .setScale(scrollIconBaseScale)
      .setDepth(50)
      .setAlpha(0.92);
  } else {
    // Fallback: draw a parchment-coloured circle button
    const g = scene.add.graphics().setDepth(50);
    g.fillStyle(0xc8870a, 0.85);
    g.fillCircle(scrollX, scrollY, scrollIconSize / 2);
    g.lineStyle(2, 0xf4c048, 1);
    g.strokeCircle(scrollX, scrollY, scrollIconSize / 2);
    scrollIcon = scene.add.text(scrollX, scrollY, '📜', {
      fontSize: '30px'
    }).setOrigin(0.5).setDepth(51);
  }

  // Gentle float animation on the icon itself
  scene.tweens.add({
    targets: scrollIcon,
    y: scrollY - 4,
    duration: 1200,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  scrollIcon.setInteractive({ useHandCursor: true });
  scrollIcon.on('pointerover', () => {
    scrollIcon.setAlpha(1);
    scrollIcon.setScale(scrollIconBaseScale * 1.12);
  });
  scrollIcon.on('pointerout', () => {
    scrollIcon.setAlpha(0.92);
    scrollIcon.setScale(scrollIconBaseScale);
  });
  scrollIcon.on('pointerdown', () => scene.showQuests?.());

  // Collect all scroll-related display objects for show/hide
  const scrollObjects = [...starGraphics, scrollIcon];

  function setScrollVisible(visible) {
    scrollObjects.forEach((obj) => obj?.setVisible(visible));
  }

  // Only show on WorldMapScene — poll every 250ms since scene manager
  // doesn't expose reliable cross-scene lifecycle events
  scene.time.addEvent({
    delay: 250,
    loop: true,
    callback: () => setScrollVisible(scene.scene.isActive('WorldMapScene'))
  });

  // Set initial visibility immediately
  setScrollVisible(scene.scene.isActive('WorldMapScene'));
}
