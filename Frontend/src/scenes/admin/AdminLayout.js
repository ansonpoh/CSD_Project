export function createAdminLayout(scene) {
  const { width, height } = scene.cameras.main;
  scene.cameras.main.setBackgroundColor(0x1a1110);

  scene.add.rectangle(width / 2, height / 2, width, height, 0x1a1110);
  scene.add.circle(width * 0.24, height * 0.24, 220, 0x6b1f1a, 0.14);
  scene.add.circle(width * 0.78, height * 0.74, 280, 0x442018, 0.16);

  scene.add.text(width / 2, 88, 'ADMIN PORTAL', {
    fontSize: '42px',
    color: '#ffe8dc',
    fontStyle: 'bold',
    stroke: '#240d09',
    strokeThickness: 6
  }).setOrigin(0.5);

  scene.add.text(width / 2, 140, 'Moderate and manage platform content', {
    fontSize: '18px',
    color: '#efb9a2',
    stroke: '#240d09',
    strokeThickness: 3
  }).setOrigin(0.5);

  const panelW = 980;
  const panelH = 500;
  const panelX = width / 2 - panelW / 2;
  const panelY = height / 2 - panelH / 2 + 40;

  const panel = scene.add.graphics();
  panel.fillStyle(0x2a1713, 0.96);
  panel.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
  panel.lineStyle(2, 0xc8870a, 0.9);
  panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);

  const cardW = 220;
  const cardH = 150;
  const gap = 20;
  const totalCards = 4;
  const startX = width / 2 - ((cardW * totalCards + gap * (totalCards - 1)) / 2) + cardW / 2;
  const cardsY = panelY + 146;

  return {
    cards: {
      reviewQueue: { x: startX, y: cardsY, w: cardW, h: cardH },
      flaggedContent: { x: startX + (cardW + gap), y: cardsY, w: cardW, h: cardH },
      contributors: { x: startX + (cardW + gap) * 2, y: cardsY, w: cardW, h: cardH },
      telemetry: { x: startX + (cardW + gap) * 3, y: cardsY, w: cardW, h: cardH }
    },
    logoutButton: {
      x: width / 2 - 90,
      y: panelY + panelH - 66,
      w: 180,
      h: 42
    }
  };
}
