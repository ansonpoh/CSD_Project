import { createUiButton } from './shared.js';

function getXpThresholdForLevel(level) {
  const safeLevel = Math.max(1, Number(level) || 1);
  return 100 * (safeLevel - 1) * (safeLevel - 1);
}

function getXpProgress(totalXp, level) {
  const safeXp = Math.max(0, Number(totalXp) || 0);
  const safeLevel = Math.max(1, Number(level) || 1);
  const levelStartXp = getXpThresholdForLevel(safeLevel);
  const nextLevelXp = getXpThresholdForLevel(safeLevel + 1);
  const levelSpan = Math.max(1, nextLevelXp - levelStartXp);
  const currentLevelXp = Math.max(0, safeXp - levelStartXp);
  const clampedLevelXp = Math.min(levelSpan, currentLevelXp);

  return {
    levelSpan,
    currentLevelXp: clampedLevelXp,
    progressRatio: clampedLevelXp / levelSpan
  };
}

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

  scene.xpText = scene.add.text(width / 2, 22, '', {
    fontSize: '13px',
    color: '#f4c048',
    fontStyle: 'bold',
    stroke: '#060d1e',
    strokeThickness: 4
  }).setOrigin(0.5, 0.5);

  const xpBarWidth = 220;
  const xpBarHeight = 6;
  const xpBarX = (width / 2) - (xpBarWidth / 2);
  const xpBarY = 42;

  scene.add.graphics()
    .fillStyle(0x030811, 0.95)
    .fillRoundedRect(xpBarX, xpBarY - (xpBarHeight / 2), xpBarWidth, xpBarHeight, 3)
    .lineStyle(1, 0x6d4e08, 0.9)
    .strokeRoundedRect(xpBarX - 1, xpBarY - (xpBarHeight / 2) - 1, xpBarWidth + 2, xpBarHeight + 2, 4);

  scene.xpBarFill = scene.add.graphics();
  scene.updateXpHud = (currentLearner) => {
    const xpProgress = getXpProgress(currentLearner.total_xp, currentLearner.level);
    const fillWidth = Math.floor(xpBarWidth * xpProgress.progressRatio);

    scene.xpText.setText(`XP ${xpProgress.currentLevelXp}/${xpProgress.levelSpan}`);
    scene.xpBarFill.clear();
    if (fillWidth > 0) {
      scene.xpBarFill
        .fillStyle(0xf4c048, 1)
        .fillRoundedRect(
          xpBarX,
          xpBarY - (xpBarHeight / 2),
          fillWidth,
          xpBarHeight,
          Math.min(3, fillWidth / 2)
        );
    }
  };
  scene.updateXpHud(learner);

  const textStyle = {
    fontSize: '13px',
    fontStyle: 'bold',
    color: '#f0ecff',
    stroke: '#060814',
    strokeThickness: 4
  };

  const topBtnY = 29;
  const topBtnGapDefault = 10;
  const topBtnGapTight = 6;
  const topBtnGapMin = 2;
  const labelPadding = 26;

  const measureLabelWidth = (label) => {
    const probe = scene.add.text(0, 0, label, {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#f0ecff',
      stroke: '#060814',
      strokeThickness: 4,
      ...textStyle
    }).setVisible(false);
    const measuredWidth = probe.width;
    probe.destroy();
    return measuredWidth;
  };

  const topButtons = [
    {
      label: 'Leaderboard',
      minWidth: 112,
      fillNormal: 0x1a2a52,
      fillHover: 0x2a4278,
      onPress: () => scene.showLeaderboard()
    },
    {
      label: 'Profile',
      minWidth: 92,
      fillNormal: 0x17324f,
      fillHover: 0x24507b,
      onPress: () => scene.showUserProfile()
    },
    {
      label: 'Achievements',
      minWidth: 132,
      fillNormal: 0x243615,
      fillHover: 0x335223,
      onPress: () => scene.showAchievements()
    },
    {
      label: 'Friends',
      minWidth: 96,
      fillNormal: 0x1f2f17,
      fillHover: 0x2f4923,
      onPress: () => scene.showFriends()
    }
  ].map((button) => ({
    ...button,
    width: Math.max(button.minWidth, Math.ceil(measureLabelWidth(button.label) + labelPadding))
  }));

  const trailingButtons = [
    {
      label: 'Logout',
      minWidth: 60,
      fillNormal: 0x3a0e0e,
      fillHover: 0x601818,
      onPress: () => scene.handleLogout()
    },
    {
      label: 'INV',
      minWidth: 56,
      fillNormal: 0x1e1040,
      fillHover: 0x2d1860,
      onPress: () => scene.showInventory()
    }
  ].map((button) => ({
    ...button,
    width: Math.max(button.minWidth, Math.ceil(measureLabelWidth(button.label) + labelPadding))
  }));

  let rightEdge = width - 16;
  trailingButtons.forEach((button) => {
    const buttonCenterX = rightEdge - (button.width / 2);
    createUiButton(scene, {
      x: buttonCenterX,
      y: topBtnY,
      width: button.width,
      height: 30,
      label: button.label,
      fillNormal: button.fillNormal,
      fillHover: button.fillHover,
      borderNormal: 0xc8870a,
      borderHover: 0xf0c050,
      pressFill: 0x08031a,
      pressBorder: 0x604008,
      lineWidth: 1,
      textStyle,
      onPress: button.onPress
    });
    rightEdge -= button.width + topBtnGapDefault;
  });

  const usernameRight = scene.usernameText.getBounds().right;
  const xpBounds = scene.xpText.getBounds();
  const xpSidePadding = 20;
  const xpSafeLeftEdge = Math.min(
    xpBounds.left - xpSidePadding,
    xpBarX - xpSidePadding
  );
  const topButtonsLeftEdge = usernameRight + 24;
  const topButtonsRightEdge = Math.min(rightEdge - 8, xpSafeLeftEdge);
  const topButtonsAvailableWidth = Math.max(0, topButtonsRightEdge - topButtonsLeftEdge);
  const topButtonsWidthSum = topButtons.reduce((total, button) => total + button.width, 0);
  const topButtonsIdealWidth = topButtonsWidthSum + topBtnGapDefault * (topButtons.length - 1);
  const topButtonsGap = topButtonsIdealWidth <= topButtonsAvailableWidth
    ? topBtnGapDefault
    : (
      topButtonsWidthSum + topBtnGapTight * (topButtons.length - 1) <= topButtonsAvailableWidth
        ? topBtnGapTight
        : topBtnGapMin
    );
  const topButtonsTotalWidth = topButtonsWidthSum + topButtonsGap * (topButtons.length - 1);
  const topButtonsStartX = Math.max(
    16,
    Math.min(topButtonsLeftEdge, topButtonsRightEdge - topButtonsTotalWidth)
  );

  let currentX = topButtonsStartX;
  topButtons.forEach((button) => {
    const buttonCenterX = currentX + (button.width / 2);
    createUiButton(scene, {
      x: buttonCenterX,
      y: topBtnY,
      width: button.width,
      height: 30,
      label: button.label,
      fillNormal: button.fillNormal,
      fillHover: button.fillHover,
      borderNormal: 0xc8870a,
      borderHover: 0xf0c050,
      pressFill: 0x08031a,
      pressBorder: 0x604008,
      lineWidth: 1,
      textStyle,
      onPress: button.onPress
    });
    currentX += button.width + topButtonsGap;
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

  // ── Chat icon — bottom right corner, always visible ─────────────────────
  const chatIconSize = 64;
  const height = scene.cameras.main.height;
  const chatX = width - chatIconSize / 2 - 20;
  const chatBaseY = height - chatIconSize / 2 - 20;

  let chatIcon;
  let chatIconBaseScale = 1;
  if (scene.textures.exists('ui-chat-icon')) {
    const frame = scene.textures.getFrame('ui-chat-icon');
    chatIconBaseScale = chatIconSize / Math.max(frame.realWidth, frame.realHeight, 1);
    chatIcon = scene.add.image(chatX, chatBaseY, 'ui-chat-icon')
      .setScale(chatIconBaseScale)
      .setDepth(50)
      .setAlpha(0.92);
  } else {
    const g = scene.add.graphics().setDepth(50);
    g.fillStyle(0x1a3a5c, 0.85);
    g.fillCircle(chatX, chatBaseY, chatIconSize / 2);
    g.lineStyle(2, 0x7ec8f0, 1);
    g.strokeCircle(chatX, chatBaseY, chatIconSize / 2);
    chatIcon = scene.add.text(chatX, chatBaseY, '💬', {
      fontSize: '26px'
    }).setOrigin(0.5).setDepth(51);
  }

  chatIcon.setInteractive({ useHandCursor: true });
  chatIcon.on('pointerover', () => {
    chatIcon.setAlpha(1);
    chatIcon.setScale(chatIconBaseScale * 1.12);
  });
  chatIcon.on('pointerout', () => {
    chatIcon.setAlpha(0.92);
    chatIcon.setScale(chatIconBaseScale);
  });
  chatIcon.on('pointerdown', () => scene.showChatbot?.());
}
