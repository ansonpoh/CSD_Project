import { gameState } from '../../services/gameState.js';
import { createUiButton, stopPointerPropagation } from './shared.js';

const DEPTH = 1000;

const PALETTE = {
  bgPanel: 0x080e22,
  bgCard: 0x0d1530,
  btnSuccess: 0x0e3020,
  btnSuccessHover: 0x1a5030,
  btnDanger: 0x3a0e0e,
  btnDangerHover: 0x601818,
  borderGold: 0xc8870a,
  borderGlow: 0xf0b030,
  accentGlow: 0xffdd60
};

const TYPE_COLOR = {
  potion: 0x4193d5,
  weapon: 0xc03030,
  armor: 0x7040b0,
  accessory: 0xc8870a,
  consumable: 0x22a855
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

  const headerHeight = 52;
  const headerBackground = scene.add.graphics().setDepth(DEPTH + 2);
  headerBackground.fillStyle(0x2a0f42, 1);
  headerBackground.fillRoundedRect(panelX, panelY, panelW, headerHeight, { tl: 7, tr: 7, bl: 0, br: 0 });
  headerBackground.lineStyle(1, PALETTE.borderGold, 0.5);
  headerBackground.beginPath();
  headerBackground.moveTo(panelX, panelY + headerHeight);
  headerBackground.lineTo(panelX + panelW, panelY + headerHeight);
  headerBackground.strokePath();
  nodes.push(headerBackground);

  nodes.push(
    scene.add.text(panelX + panelW / 2, panelY + headerHeight / 2, 'INVENTORY', {
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#f4f8ff',
      stroke: '#13233d',
      strokeThickness: 7
    }).setOrigin(0.5).setDepth(DEPTH + 3)
  );

  return headerHeight;
}

function addInventoryCard(scene, item, layout, cleanup, nodes) {
  const { cardX, cardY, cardW, cardH } = layout;
  const quantity = item.quantity ?? 1;
  const typeColor = TYPE_COLOR[item.item_type] ?? 0x4a5568;

  const card = scene.add.graphics().setDepth(DEPTH + 2);
  card.fillStyle(PALETTE.bgCard, 1);
  card.fillRoundedRect(cardX, cardY, cardW, cardH, 5);
  card.lineStyle(2, typeColor, 0.55);
  card.strokeRoundedRect(cardX, cardY, cardW, cardH, 5);
  card.fillStyle(0xffffff, 0.025);
  card.fillRoundedRect(cardX + 2, cardY + 2, cardW - 4, cardH * 0.38, { tl: 4, tr: 4, bl: 0, br: 0 });
  nodes.push(card);

  const typeStrip = scene.add.graphics().setDepth(DEPTH + 3);
  typeStrip.fillStyle(typeColor, 0.7);
  typeStrip.fillRoundedRect(cardX, cardY + 4, 4, cardH - 8, 2);
  nodes.push(typeStrip);

  nodes.push(
    scene.add.text(cardX + 20, cardY + 13, item.name ?? 'Unknown Item', {
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#f0ecff',
      stroke: '#060814',
      strokeThickness: 4
    }).setDepth(DEPTH + 3)
  );

  const description = item.description
    ? (item.description.length > 60 ? `${item.description.slice(0, 59)}...` : item.description)
    : '';

  nodes.push(
    scene.add.text(cardX + 20, cardY + 42, `x${quantity}  ${description}`, {
      fontSize: '14px',
      color: '#9e88c0',
      stroke: '#060814',
      strokeThickness: 3
    }).setDepth(DEPTH + 3)
  );

  nodes.push(
    createUiButton(scene, {
      x: cardX + cardW - 50,
      y: cardY + cardH / 2,
      width: 80,
      height: 40,
      label: 'USE',
      fillNormal: PALETTE.btnSuccess,
      fillHover: PALETTE.btnSuccessHover,
      borderNormal: 0x22a855,
      borderHover: PALETTE.borderGlow,
      pressFill: 0x100520,
      pressBorder: 0x604008,
      depth: DEPTH + 4,
      onPress: async () => {
        try {
          const result = await scene.consumeInventoryItem(item);
          if (!result) {
            return;
          }

          cleanup();
          showInventory(scene);
        } catch (error) {
          console.error('Failed to use item:', error);
        }
      }
    })
  );
}

export function showInventory(scene) {
  const inventory = gameState.getInventory();
  const width = scene.cameras.main.width;
  const height = scene.cameras.main.height;
  const panelWidth = 780;
  const panelHeight = Math.min(640, 140 + Math.max(1, inventory.length) * 96);
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

  const closeButton = scene.add.sprite(panelX + panelWidth - 28, panelY + 26, 'ui-close-btn', 0)
    .setScale(1.6)
    .setDepth(DEPTH + 4)
    .setInteractive({ useHandCursor: true });
  closeButton.on('pointerover', () => closeButton.setFrame(1));
  closeButton.on('pointerout', () => closeButton.setFrame(0));
  closeButton.on('pointerdown', (pointer, localX, localY, event) => event?.stopPropagation?.());
  closeButton.on('pointerup', cleanup);
  nodes.push(closeButton);

  nodes.push(
    scene.add.text(panelX + 24, panelY + headerHeight + 14, `${inventory.length} item${inventory.length !== 1 ? 's' : ''}`, {
      fontSize: '13px',
      color: '#c0a8e0',
      stroke: '#060814',
      strokeThickness: 3
    }).setDepth(DEPTH + 3)
  );

  if (inventory.length === 0) {
    nodes.push(
      scene.add.text(panelX + panelWidth / 2, panelY + panelHeight / 2 + 10, 'Your inventory is empty', {
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#5a4a72',
        stroke: '#060814',
        strokeThickness: 4
      }).setOrigin(0.5).setDepth(DEPTH + 3)
    );
  }

  const cardWidth = panelWidth - 56;
  const cardHeight = 78;
  const cardX = panelX + 28;
  let cardY = panelY + headerHeight + 50;

  inventory.forEach((item) => {
    addInventoryCard(scene, item, { cardX, cardY, cardW: cardWidth, cardH: cardHeight }, cleanup, nodes);
    cardY += cardHeight + 12;
  });

  nodes.push(
    createUiButton(scene, {
      x: panelX + panelWidth / 2,
      y: panelY + panelHeight - 28,
      width: 120,
      height: 34,
      label: 'CLOSE',
      fillNormal: PALETTE.btnDanger,
      fillHover: PALETTE.btnDangerHover,
      borderNormal: 0x8b2020,
      borderHover: PALETTE.borderGlow,
      pressFill: 0x100520,
      pressBorder: 0x604008,
      depth: DEPTH + 4,
      onPress: cleanup
    })
  );
}