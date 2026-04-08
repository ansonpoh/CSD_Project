import { apiService } from '../../services/api.js';
import { gameState } from '../../services/gameState.js';
import { createModalDismissHandlers, createUiButton, stopPointerPropagation } from './shared.js';
import { UI_TOKENS } from './uiTokens.js';

const DEPTH = 1100;

const PALETTE = {
  bgPanel: 0x071022,
  bgCard: 0x11213f,
  bgUnlocked: 0x253410,
  bgTab: 0x172949,
  bgTabActive: 0x2d4f1e,
  borderGold: 0xc8870a,
  borderGlow: 0xf0b030,
  borderUnlocked: 0x8fd45e
};

function clampNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function drawProgressBar(scene, x, y, width, progressRatio, unlocked, nodes) {
  const barBg = scene.add.graphics().setDepth(DEPTH + 3);
  barBg.fillStyle(0x091429, 1);
  barBg.fillRoundedRect(x, y, width, 8, 3);
  barBg.lineStyle(1, unlocked ? PALETTE.borderUnlocked : PALETTE.borderGold, 0.55);
  barBg.strokeRoundedRect(x, y, width, 8, 3);
  nodes.push(barBg);

  if (progressRatio <= 0) {
    return;
  }

  const filled = Math.max(1, Math.floor(width * Math.min(1, progressRatio)));
  const barFill = scene.add.graphics().setDepth(DEPTH + 4);
  barFill.fillStyle(unlocked ? 0x8fd45e : 0x4aa7ff, 0.9);
  barFill.fillRoundedRect(x + 1, y + 1, Math.max(1, filled - 2), 6, 2);
  nodes.push(barFill);
}

function drawAchievementRow(scene, item, rowX, rowY, rowW, nodes) {
  const unlocked = Boolean(item?.isUnlocked);
  const progressValue = Math.max(0, clampNumber(item?.progressValue, 0));
  const targetValue = Math.max(1, clampNumber(item?.targetValue, 1));
  const ratio = Math.min(1, progressValue / targetValue);

  const card = scene.add.graphics().setDepth(DEPTH + 2);
  card.fillStyle(unlocked ? PALETTE.bgUnlocked : PALETTE.bgCard, 0.96);
  card.fillRoundedRect(rowX, rowY, rowW, 52, 5);
  card.lineStyle(1, unlocked ? PALETTE.borderUnlocked : PALETTE.borderGold, unlocked ? 0.9 : 0.5);
  card.strokeRoundedRect(rowX, rowY, rowW, 52, 5);
  nodes.push(card);

  const name = String(item?.name || 'Achievement');
  const displayName = name.length > 34 ? `${name.slice(0, 33)}...` : name;
  const progressText = unlocked ? 'Unlocked' : `${progressValue}/${targetValue}`;
  const rewardXp = Math.max(0, clampNumber(item?.rewardXp, 0));
  const rewardGold = Math.max(0, clampNumber(item?.rewardGold, 0));
  const rewardText = `+${rewardXp} XP | +${rewardGold} Gold`;

  nodes.push(
    scene.add.text(rowX + 12, rowY + 8, displayName, {
      fontSize: '15px',
      color: unlocked ? '#eaffdd' : '#e8f1ff',
      fontStyle: 'bold',
      stroke: '#071022',
      strokeThickness: 3
    }).setDepth(DEPTH + 5)
  );

  nodes.push(
    scene.add.text(rowX + rowW - 12, rowY + 9, progressText, {
      fontSize: '13px',
      color: unlocked ? '#8fd45e' : '#d3dcf0',
      fontStyle: 'bold',
      stroke: '#071022',
      strokeThickness: 3
    }).setOrigin(1, 0).setDepth(DEPTH + 5)
  );

  nodes.push(
    scene.add.text(rowX + 12, rowY + 30, rewardText, {
      fontSize: '12px',
      color: '#b9c9e6',
      stroke: '#071022',
      strokeThickness: 2
    }).setDepth(DEPTH + 5)
  );

  drawProgressBar(scene, rowX + 170, rowY + 34, rowW - 300, ratio, unlocked, nodes);
}

export async function showAchievements(scene) {
  const width = scene.cameras.main.width;
  const height = scene.cameras.main.height;
  const panelWidth = 760;
  const panelHeight = 560;
  const panelX = width / 2 - panelWidth / 2;
  const panelY = height / 2 - panelHeight / 2;

  const nodes = [];
  const tabNodes = [];
  const contentNodes = [];
  let wheelHandler = null;
  let teardownDismiss = () => {};
  const cleanup = () => {
    teardownDismiss();
    if (wheelHandler) {
      scene.input.off('wheel', wheelHandler);
      wheelHandler = null;
    }
    [...new Set([...nodes, ...tabNodes, ...contentNodes])].forEach((node) => node?.destroy());
  };
  let isClaiming = false;
  let activeTab = 'unlocked';
  let allAchievements = [];
  const tabScrollIndex = {
    unlocked: 0,
    locked: 0
  };

  const clearTabNodes = () => {
    tabNodes.forEach((node) => node?.destroy());
    tabNodes.length = 0;
  };

  const clearContentNodes = () => {
    contentNodes.forEach((node) => node?.destroy());
    contentNodes.length = 0;
  };

  const overlay = stopPointerPropagation(
    scene.add.rectangle(0, 0, width, height, UI_TOKENS.colors.overlay, 0.8)
      .setOrigin(0)
      .setInteractive()
      .setDepth(DEPTH)
  );
  nodes.push(overlay);
  teardownDismiss = createModalDismissHandlers(scene, {
    overlay,
    cleanup,
    shouldCloseOnBackdropPointerUp: (pointer) => {
      const px = Number(pointer?.x);
      const py = Number(pointer?.y);
      if (!Number.isFinite(px) || !Number.isFinite(py)) return true;
      const insidePanel = px >= panelX && px <= (panelX + panelWidth) && py >= panelY && py <= (panelY + panelHeight);
      return !insidePanel;
    }
  });

  const panel = scene.add.graphics().setDepth(DEPTH + 1);
  panel.fillStyle(PALETTE.bgPanel, 0.98);
  panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 7);
  panel.lineStyle(2, PALETTE.borderGold, 0.9);
  panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 7);
  nodes.push(panel);

  nodes.push(
    scene.add.text(panelX + panelWidth / 2, panelY + 32, 'ACHIEVEMENTS', {
      fontSize: '30px',
      color: '#f4f8ff',
      fontStyle: 'bold',
      stroke: '#13233d',
      strokeThickness: 7
    }).setOrigin(0.5).setDepth(DEPTH + 3)
  );

  const closeButton = scene.add.sprite(panelX + panelWidth - 30, panelY + 30, 'ui-close-btn', 0)
    .setScale(1.6)
    .setDepth(DEPTH + 4)
    .setInteractive({ useHandCursor: true });
  closeButton.on('pointerover', () => closeButton.setFrame(1));
  closeButton.on('pointerout', () => closeButton.setFrame(0));
  closeButton.on('pointerdown', (pointer, localX, localY, event) => event?.stopPropagation?.());
  closeButton.on('pointerup', cleanup);
  nodes.push(closeButton);

  const loadingText = scene.add.text(panelX + panelWidth / 2, panelY + panelHeight / 2, 'Loading achievements...', {
    fontSize: '18px',
    color: '#c4def8',
    stroke: '#060814',
    strokeThickness: 3
  }).setOrigin(0.5).setDepth(DEPTH + 3);
  nodes.push(loadingText);

  const statusText = scene.add.text(panelX + 24, panelY + panelHeight - 28, '', {
    fontSize: '12px',
    color: '#9eb7d7',
    stroke: '#060814',
    strokeThickness: 3
  }).setDepth(DEPTH + 4);
  nodes.push(statusText);

  const drawTabs = (totalUnlocked, totalLocked, renderContent) => {
    clearTabNodes();
    const tabY = panelY + 102;
    const tabWidth = 140;
    const tabHeight = 30;
    const tabGap = 12;
    const startX = panelX + panelWidth / 2 - tabWidth - (tabGap / 2);

    const addTab = (label, value, key, x) => {
      const isActive = activeTab === key;
      const tab = createUiButton(scene, {
        x,
        y: tabY,
        width: tabWidth,
        height: tabHeight,
        label: `${label} (${value})`,
        fillNormal: isActive ? PALETTE.bgTabActive : PALETTE.bgTab,
        fillHover: isActive ? 0x3f6e2b : 0x223a66,
        borderNormal: isActive ? PALETTE.borderUnlocked : 0x6c8fc9,
        borderHover: isActive ? 0xbff59a : PALETTE.borderGlow,
        pressFill: isActive ? 0x29481c : 0x162949,
        pressBorder: isActive ? PALETTE.borderUnlocked : PALETTE.borderGold,
        lineWidth: 1,
        depth: DEPTH + 5,
        textStyle: {
          fontSize: '12px',
          color: isActive ? '#ebffdf' : '#d4e2fa',
          stroke: '#071022',
          strokeThickness: 3
        },
        onPress: () => {
          if (activeTab === key) return;
          activeTab = key;
          renderContent();
        }
      });
      tabNodes.push(tab);
    };

    addTab('Unlocked', totalUnlocked, 'unlocked', startX);
    addTab('Locked', totalLocked, 'locked', startX + tabWidth + tabGap);
  };

  const renderAchievementRows = () => {
    clearContentNodes();

    const selected = allAchievements.filter((row) => {
      if (activeTab === 'unlocked') return Boolean(row?.isUnlocked);
      return !row?.isUnlocked;
    });

    if (selected.length === 0) {
      contentNodes.push(
        scene.add.text(panelX + panelWidth / 2, panelY + panelHeight / 2 + 18, `No ${activeTab} achievements.`, {
          fontSize: '18px',
          color: '#9eb7d7',
          stroke: '#060814',
          strokeThickness: 3
        }).setOrigin(0.5).setDepth(DEPTH + 3)
      );
      return;
    }

    const rowStartY = panelY + 126;
    const rowGap = 58;
    const maxRows = 6;
    const maxStartIndex = Math.max(0, selected.length - maxRows);
    const startIndex = Math.min(tabScrollIndex[activeTab] || 0, maxStartIndex);
    tabScrollIndex[activeTab] = startIndex;
    const visible = selected.slice(startIndex, startIndex + maxRows);

    visible.forEach((item, index) => {
      const rowX = panelX + 20;
      const rowY = rowStartY + (index * rowGap);
      const rowW = panelWidth - 40;
      drawAchievementRow(scene, item, rowX, rowY, rowW, contentNodes);

      if (item?.isUnlocked && !item?.isRewardClaimed) {
        const claimButton = createUiButton(scene, {
          x: rowX + rowW - 56,
          y: rowY + 26,
          width: 92,
          height: 24,
          label: 'CLAIM',
          fillNormal: 0x2b4b1e,
          fillHover: 0x3b6b2b,
          borderNormal: 0x8fd45e,
          borderHover: 0xbff59a,
          pressFill: 0x1a2d11,
          pressBorder: 0x8fd45e,
          lineWidth: 1,
          depth: DEPTH + 6,
          textStyle: {
            fontSize: '12px',
            color: '#ecffe2',
            stroke: '#071022',
            strokeThickness: 3
          },
          onPress: async () => {
            if (isClaiming) return;
            isClaiming = true;
            statusText.setColor('#9eb7d7');
            statusText.setText('Claiming reward...');
            try {
              await apiService.claimMyAchievement(item.achievementId);
              const learner = await apiService.getCurrentLearner().catch(() => null);
              if (learner) {
                gameState.setLearner(learner);
              }

              item.isRewardClaimed = true;
              statusText.setColor('#8fd45e');
              statusText.setText('Reward claimed.');
              renderAchievementRows();
            } catch (error) {
              console.error('Failed to claim achievement reward:', error);
              const message = error?.response?.data?.message || 'Failed to claim reward.';
              statusText.setColor('#ff7e7e');
              statusText.setText(message);
            } finally {
              isClaiming = false;
            }
          }
        });
        contentNodes.push(claimButton);
      } else if (item?.isRewardClaimed) {
        contentNodes.push(
          scene.add.text(rowX + rowW - 12, rowY + 29, 'CLAIMED', {
            fontSize: '12px',
            color: '#8fd45e',
            fontStyle: 'bold',
            stroke: '#071022',
            strokeThickness: 3
          }).setOrigin(1, 0.5).setDepth(DEPTH + 6)
        );
      } else {
        contentNodes.push(
          scene.add.text(rowX + rowW - 12, rowY + 29, 'LOCKED', {
            fontSize: '12px',
            color: '#8393ad',
            fontStyle: 'bold',
            stroke: '#071022',
            strokeThickness: 3
          }).setOrigin(1, 0.5).setDepth(DEPTH + 6)
        );
      }
    });

    if (selected.length > maxRows) {
      contentNodes.push(
        scene.add.text(panelX + panelWidth / 2, panelY + panelHeight - 74, `Scroll to view more (${startIndex + 1}-${startIndex + visible.length} of ${selected.length})`, {
          fontSize: '13px',
          color: '#90a3bf',
          stroke: '#060814',
          strokeThickness: 3
        }).setOrigin(0.5).setDepth(DEPTH + 3)
      );
    }
  };

  try {
    const achievements = await apiService.getMyAchievements();
    loadingText.destroy();

    const sorted = Array.isArray(achievements) ? [...achievements] : [];
    sorted.sort((a, b) => Number(Boolean(b?.isUnlocked)) - Number(Boolean(a?.isUnlocked)));
    allAchievements = sorted;

    const unlockedCount = sorted.filter((row) => row?.isUnlocked).length;
    const lockedCount = sorted.length - unlockedCount;
    nodes.push(
      scene.add.text(panelX + 22, panelY + 68, `Unlocked ${unlockedCount}/${sorted.length}`, {
        fontSize: '14px',
        color: '#f4c048',
        fontStyle: 'bold',
        stroke: '#060814',
        strokeThickness: 3
      }).setDepth(DEPTH + 3)
    );

    if (sorted.length === 0) {
      nodes.push(
        scene.add.text(panelX + panelWidth / 2, panelY + panelHeight / 2, 'No achievements configured yet.', {
          fontSize: '18px',
          color: '#9eb7d7',
          stroke: '#060814',
          strokeThickness: 3
        }).setOrigin(0.5).setDepth(DEPTH + 3)
      );
    } else {
      const renderContent = () => {
        drawTabs(unlockedCount, lockedCount, renderContent);
        renderAchievementRows();
      };
      renderContent();

      wheelHandler = (pointer, gameObjects, deltaX, deltaY, deltaZ, event) => {
        const px = pointer?.x ?? 0;
        const py = pointer?.y ?? 0;
        const insidePanel = px >= panelX && px <= (panelX + panelWidth) && py >= panelY && py <= (panelY + panelHeight);
        if (!insidePanel) return;

        const selected = allAchievements.filter((row) => (activeTab === 'unlocked' ? Boolean(row?.isUnlocked) : !row?.isUnlocked));
        const maxRows = 6;
        const maxStartIndex = Math.max(0, selected.length - maxRows);
        if (maxStartIndex <= 0) return;

        const direction = deltaY > 0 ? 1 : -1;
        const current = tabScrollIndex[activeTab] || 0;
        const next = Math.max(0, Math.min(maxStartIndex, current + direction));
        if (next === current) return;

        tabScrollIndex[activeTab] = next;
        renderAchievementRows();
        event?.preventDefault?.();
      };
      scene.input.on('wheel', wheelHandler);
    }
  } catch (error) {
    loadingText.setText('Failed to load achievements.');
    loadingText.setColor('#ff7e7e');
    statusText.setText('');
    console.error('Failed to load achievements:', error);
  }

  nodes.push(
    createUiButton(scene, {
      x: panelX + panelWidth - 74,
      y: panelY + panelHeight - 28,
      width: 122,
      height: 34,
      label: 'CLOSE',
      fillNormal: UI_TOKENS.colors.danger,
      fillHover: UI_TOKENS.colors.dangerHover,
      borderNormal: UI_TOKENS.colors.dangerBorder,
      borderHover: UI_TOKENS.colors.borderGlow,
      depth: DEPTH + 4,
      onPress: cleanup
    })
  );
}
