export function renderContributorPortal(scene, actions) {
  const { width, height } = scene.cameras.main;
  scene.cameras.main.setBackgroundColor(0x0b1730);

  scene.add.rectangle(width / 2, height / 2, width, height, 0x0b1730);
  scene.add.circle(width * 0.2, height * 0.25, 220, 0x1c3f7a, 0.14);
  scene.add.circle(width * 0.8, height * 0.75, 260, 0x17345f, 0.16);

  scene.add.text(width / 2, 88, 'CONTRIBUTOR PORTAL', {
    fontSize: '42px',
    color: '#e6f0ff',
    fontStyle: 'bold',
    stroke: '#071224',
    strokeThickness: 6
  }).setOrigin(0.5);

  scene.add.text(width / 2, 140, 'Create and manage learning content', {
    fontSize: '18px',
    color: '#a6c3ec',
    stroke: '#071224',
    strokeThickness: 3
  }).setOrigin(0.5);

  const panelWidth = 860;
  const panelHeight = 460;
  const panelX = width / 2 - panelWidth / 2;
  const panelY = height / 2 - panelHeight / 2 + 40;

  const panel = scene.add.graphics();
  panel.fillStyle(0x101f3d, 0.96);
  panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);
  panel.lineStyle(2, 0xc8870a, 0.9);
  panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);

  const cardWidth = 230;
  const cardHeight = 150;
  const gap = 22;
  const totalCards = 3;
  const startX = width / 2 - ((cardWidth * totalCards + gap * (totalCards - 1)) / 2) + cardWidth / 2;
  const cardY = panelY + 140;

  createActionCard(scene, startX, cardY, cardWidth, cardHeight, 'My Content', 'View content you submitted', actions.openMyContent);
  createActionCard(scene, startX + cardWidth + gap, cardY, cardWidth, cardHeight, 'Submit Content', 'Open submit workflow', actions.openSubmit);
  createActionCard(scene, startX + (cardWidth + gap) * 2, cardY, cardWidth, cardHeight, 'Map Editor', 'Create and publish maps', actions.openMapEditor);

  createButton(scene, width / 2 - 90, panelY + panelHeight - 64, 180, 42, 'Logout', actions.logout, 0x4a1111, 0x7a1b1b);
}

function createActionCard(scene, x, y, width, height, title, subtitle, onClick) {
  const container = scene.add.container(x - width / 2, y - height / 2);
  const bg = scene.add.graphics();

  const draw = (fill, border) => {
    bg.clear();
    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(0, 0, width, height, 6);
    bg.lineStyle(2, border, 1);
    bg.strokeRoundedRect(0, 0, width, height, 6);
    bg.fillStyle(0xffffff, 0.05);
    bg.fillRoundedRect(2, 2, width - 4, height * 0.45, { tl: 4, tr: 4, bl: 0, br: 0 });
  };

  draw(0x1a2f58, 0x76a8e8);
  container.add(bg);
  container.add(scene.add.text(width / 2, 42, title, {
    fontSize: '20px',
    fontStyle: 'bold',
    color: '#eef5ff',
    stroke: '#071224',
    strokeThickness: 4
  }).setOrigin(0.5));
  container.add(scene.add.text(width / 2, 92, subtitle, {
    fontSize: '14px',
    color: '#bad2f2',
    align: 'center',
    wordWrap: { width: width - 24 }
  }).setOrigin(0.5));

  const hit = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0).setInteractive({ useHandCursor: true });
  container.add(hit);
  hit.on('pointerover', () => draw(0x244273, 0xaed2ff));
  hit.on('pointerout', () => draw(0x1a2f58, 0x76a8e8));
  hit.on('pointerdown', () => draw(0x132747, 0x5d8ccc));
  hit.on('pointerup', async (_pointer, _localX, _localY, event) => {
    event?.stopPropagation?.();
    draw(0x244273, 0xaed2ff);
    try {
      await onClick();
    } catch (error) {
      scene.showToast(error?.message || 'Action failed');
    }
  });
}

function createButton(scene, x, y, width, height, label, onClick, normal, hover) {
  const container = scene.add.container(x, y);
  const bg = scene.add.graphics();

  const draw = (fill, border) => {
    bg.clear();
    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(0, 0, width, height, 5);
    bg.lineStyle(2, border, 1);
    bg.strokeRoundedRect(0, 0, width, height, 5);
  };

  draw(normal, 0xc8870a);
  container.add(bg);
  container.add(scene.add.text(width / 2, height / 2, label, {
    fontSize: '16px',
    fontStyle: 'bold',
    color: '#f3f6ff',
    stroke: '#06101f',
    strokeThickness: 4
  }).setOrigin(0.5));

  const hit = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0).setInteractive({ useHandCursor: true });
  container.add(hit);
  hit.on('pointerover', () => draw(hover, 0xf0b030));
  hit.on('pointerout', () => draw(normal, 0xc8870a));
  hit.on('pointerdown', () => draw(0x160707, 0x6e2b2b));
  hit.on('pointerup', (_pointer, _localX, _localY, event) => {
    event?.stopPropagation?.();
    onClick();
  });
}
