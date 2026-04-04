import { apiService } from '../../services/api.js';
import { createUiButton, stopPointerPropagation } from './shared.js';

const DEPTH = 1100;

const PALETTE = {
  bgPanel: 0x080e22,
  bgCard: 0x0d1530,
  bgCardMe: 0x1a1040,
  btnNormal: 0x2a0f42,
  btnDanger: 0x3a0e0e,
  btnDangerHover: 0x601818,
  borderGold: 0xc8870a,
  borderGlow: 0xf0b030,
  borderMe: 0xf4c048,
  accentGlow: 0xffdd60
};

const STATE_THEME = {
  loading: { text: 'LOADING', color: '#9eb7d7' },
  empty: { text: 'EMPTY', color: '#cbb899' },
  success: { text: 'SUCCESS', color: '#8fd45e' },
  error: { text: 'ERROR', color: '#ff9f9f' }
};

function drawPanel(scene, panelX, panelY, panelW, panelH, nodes) {
  const panelBackground = scene.add.graphics().setDepth(DEPTH + 1);
  panelBackground.fillStyle(PALETTE.bgPanel, 0.98);
  panelBackground.fillRoundedRect(panelX, panelY, panelW, panelH, 7);
  panelBackground.lineStyle(2, PALETTE.borderGold, 0.9);
  panelBackground.strokeRoundedRect(panelX, panelY, panelW, panelH, 7);
  panelBackground.lineStyle(1, PALETTE.accentGlow, 0.3);
  panelBackground.beginPath();
  panelBackground.moveTo(panelX + 18, panelY + 2);
  panelBackground.lineTo(panelX + panelW - 18, panelY + 2);
  panelBackground.strokePath();
  nodes.push(panelBackground);

  const headerHeight = 58;
  const headerBackground = scene.add.graphics().setDepth(DEPTH + 2);
  headerBackground.fillStyle(PALETTE.btnNormal, 1);
  headerBackground.fillRoundedRect(panelX, panelY, panelW, headerHeight, { tl: 7, tr: 7, bl: 0, br: 0 });
  headerBackground.lineStyle(1, PALETTE.borderGold, 0.5);
  headerBackground.beginPath();
  headerBackground.moveTo(panelX, panelY + headerHeight);
  headerBackground.lineTo(panelX + panelW, panelY + headerHeight);
  headerBackground.strokePath();
  nodes.push(headerBackground);

  nodes.push(
    scene.add.text(panelX + panelW / 2, panelY + headerHeight / 2, 'LEADERBOARD', {
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#f4f8ff',
      stroke: '#13233d',
      strokeThickness: 7
    }).setOrigin(0.5).setDepth(DEPTH + 3)
  );

  return headerHeight;
}

function addLeaderboardRow(scene, entry, myRankInfo, rowY, panelX, panelW, columns, nodes) {
  const isCurrentUser = myRankInfo?.learnerId === entry.learnerId;
  const fillColor = isCurrentUser ? PALETTE.bgCardMe : PALETTE.bgCard;
  const borderColor = isCurrentUser ? PALETTE.borderMe : PALETTE.borderGold;
  const borderAlpha = isCurrentUser ? 0.9 : 0.55;

  const rowBackground = scene.add.graphics().setDepth(DEPTH + 2);
  rowBackground.fillStyle(fillColor, 1);
  rowBackground.fillRoundedRect(panelX + 16, rowY, panelW - 32, 30, 4);
  rowBackground.lineStyle(1, borderColor, borderAlpha);
  rowBackground.strokeRoundedRect(panelX + 16, rowY, panelW - 32, 30, 4);

  if (isCurrentUser) {
    rowBackground.fillStyle(PALETTE.borderMe, 1);
    rowBackground.fillRoundedRect(panelX + 16, rowY + 4, 4, 22, 2);
  }

  nodes.push(rowBackground);

  const textY = rowY + 15;
  const color = isCurrentUser ? '#f4c048' : '#f0ecff';
  const textStyle = {
    color,
    stroke: '#060814',
    strokeThickness: 3
  };

  nodes.push(
    scene.add.text(columns.rank, textY, `#${entry.rank}`, {
      fontSize: '14px',
      fontStyle: isCurrentUser ? 'bold' : 'normal',
      ...textStyle
    }).setOrigin(0, 0.5).setDepth(DEPTH + 3)
  );

  const username = (entry.username ?? '').length > 20
    ? `${entry.username.slice(0, 19)}...`
    : (entry.username ?? '-');

  nodes.push(
    scene.add.text(columns.username, textY, username, {
      fontSize: '15px',
      fontStyle: isCurrentUser ? 'bold' : 'normal',
      ...textStyle
    }).setOrigin(0, 0.5).setDepth(DEPTH + 3)
  );

  nodes.push(
    scene.add.text(columns.xp, textY, `${entry.totalXp} XP`, {
      fontSize: '14px',
      fontStyle: isCurrentUser ? 'bold' : 'normal',
      ...textStyle
    }).setOrigin(1, 0.5).setDepth(DEPTH + 3)
  );
}

export async function showLeaderboard(scene) {
  const width = scene.cameras.main.width;
  const height = scene.cameras.main.height;
  const panelWidth = 680;
  const panelHeight = 580;
  const panelX = width / 2 - panelWidth / 2;
  const panelY = height / 2 - panelHeight / 2;

  const nodes = [];
  const cleanup = () => nodes.forEach((node) => node?.destroy());

  const overlay = stopPointerPropagation(
    scene.add.rectangle(0, 0, width, height, 0x000000, 0.78)
      .setOrigin(0)
      .setInteractive()
      .setDepth(DEPTH)
  );
  nodes.push(overlay);

  const headerHeight = drawPanel(scene, panelX, panelY, panelWidth, panelHeight, nodes);

  const closeButton = scene.add.sprite(panelX + panelWidth - 30, panelY + 29, 'ui-close-btn', 0)
    .setScale(1.6)
    .setDepth(DEPTH + 4)
    .setInteractive({ useHandCursor: true });
  closeButton.on('pointerover', () => closeButton.setFrame(1));
  closeButton.on('pointerout', () => closeButton.setFrame(0));
  closeButton.on('pointerdown', (pointer, localX, localY, event) => event?.stopPropagation?.());
  closeButton.on('pointerup', cleanup);
  nodes.push(closeButton);

  const columnsY = panelY + headerHeight + 16;
  const columns = {
    rank: panelX + 32,
    username: panelX + 90,
    xp: panelX + panelWidth - 36
  };

  ['RANK', 'USERNAME', 'XP'].forEach((label, index) => {
    const x = [columns.rank, columns.username, columns.xp][index];
    const originX = index === 2 ? 1 : 0;
    nodes.push(
      scene.add.text(x, columnsY, label, {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#c0a8e0',
        stroke: '#060814',
        strokeThickness: 3,
        letterSpacing: 2
      }).setOrigin(originX, 0).setDepth(DEPTH + 3)
    );
  });

  const divider = scene.add.graphics().setDepth(DEPTH + 2);
  divider.lineStyle(1, PALETTE.borderGold, 0.3);
  divider.beginPath();
  divider.moveTo(panelX + 20, columnsY + 20);
  divider.lineTo(panelX + panelWidth - 20, columnsY + 20);
  divider.strokePath();
  nodes.push(divider);

  const stateBadge = scene.add.text(panelX + panelWidth - 24, columnsY - 6, '', {
    fontSize: '11px',
    fontStyle: 'bold',
    color: '#9eb7d7',
    stroke: '#060814',
    strokeThickness: 3
  }).setOrigin(1, 0).setDepth(DEPTH + 3);
  nodes.push(stateBadge);

  const stateMessage = scene.add.text(panelX + 24, columnsY + 26, '', {
    fontSize: '13px',
    color: '#9eb7d7',
    stroke: '#060814',
    strokeThickness: 3
  }).setDepth(DEPTH + 3);
  nodes.push(stateMessage);

  const setState = (status, message) => {
    const theme = STATE_THEME[status] || STATE_THEME.loading;
    stateBadge.setText(theme.text);
    stateBadge.setColor(theme.color);
    stateMessage.setText(message || '');
    stateMessage.setColor(theme.color);
  };

  const loadingText = scene.add.text(panelX + panelWidth / 2, panelY + panelHeight / 2, 'Loading leaderboard...', {
    fontSize: '18px',
    fontStyle: 'bold',
    color: '#5a4a72',
    stroke: '#060814',
    strokeThickness: 3
  }).setOrigin(0.5).setDepth(DEPTH + 3);
  nodes.push(loadingText);
  setState('loading', 'Fetching top rankings...');

  const footerY = panelY + panelHeight - 52;
  const footer = scene.add.graphics().setDepth(DEPTH + 2);
  footer.fillStyle(0x100820, 1);
  footer.fillRoundedRect(panelX, footerY, panelWidth, 52, { tl: 0, tr: 0, bl: 7, br: 7 });
  footer.lineStyle(1, PALETTE.borderGold, 0.35);
  footer.beginPath();
  footer.moveTo(panelX, footerY);
  footer.lineTo(panelX + panelWidth, footerY);
  footer.strokePath();
  nodes.push(footer);

  const myRankText = scene.add.text(panelX + 24, footerY + 26, '- your rank -', {
    fontSize: '15px',
    color: '#5a4a72',
    stroke: '#060814',
    strokeThickness: 3
  }).setOrigin(0, 0.5).setDepth(DEPTH + 3);
  nodes.push(myRankText);

  try {
    const [rows, myRankInfo] = await Promise.all([
      apiService.getLeaderboard(20),
      apiService.getMyLeaderboardRank()
    ]);

    loadingText.destroy();

    const rowHeight = 34;
    const rowsAreaHeight = panelHeight - headerHeight - 40 - 52;
    const normalizedRows = Array.isArray(rows) ? rows : [];
    const visibleRows = normalizedRows.slice(0, Math.floor(rowsAreaHeight / rowHeight));

    let rowY = panelY + headerHeight + 38;
    visibleRows.forEach((entry) => {
      addLeaderboardRow(scene, entry, myRankInfo, rowY, panelX, panelWidth, columns, nodes);
      rowY += rowHeight;
    });

    if (!visibleRows.length) {
      setState('empty', 'No leaderboard entries yet. Be the first to earn XP.');
      myRankText.setText('Your Rank: Unranked');
      myRankText.setColor('#cbb899');
    } else {
      setState('success', `Showing top ${visibleRows.length} adventurers.`);
      myRankText.setText(`Your Rank: #${myRankInfo?.rank ?? '?'}   |   ${myRankInfo?.totalXp ?? 0} XP`);
      myRankText.setColor('#f4c048');
    }
  } catch (error) {
    loadingText.setText('Failed to load leaderboard');
    loadingText.setColor('#ff9f9f');
    setState('error', 'Unable to fetch leaderboard right now.');
    myRankText.setText('Your Rank: unavailable');
    myRankText.setColor('#ff9f9f');
    console.error('Leaderboard load failed:', error);
  }

  nodes.push(
    createUiButton(scene, {
      x: panelX + panelWidth - 72,
      y: footerY + 26,
      width: 120,
      height: 34,
      label: 'CLOSE',
      fillNormal: PALETTE.btnDanger,
      fillHover: PALETTE.btnDangerHover,
      borderNormal: 0x8b2020,
      borderHover: PALETTE.borderGlow,
      depth: DEPTH + 4,
      onPress: cleanup
    })
  );
}
