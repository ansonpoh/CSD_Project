import Phaser from 'phaser';
import { SIDE_CHALLENGE_COLORS as C } from './constants.js';

export function createSideChallengeScene() {
  const { width, height } = this.cameras.main;
  const panelWidth = Math.min(1120, width - 180);
  const panelHeight = Math.min(720, height - 140);
  const panelLeft = width / 2 - panelWidth / 2;
  const panelTop = height / 2 - panelHeight / 2;
  const shuffledTokens = Phaser.Utils.Array.Shuffle([...this.challenge.orderedTokens]);

  this.add.rectangle(width / 2, height / 2, width, height, C.bg, 0.88);
  this.drawPanelFrame(panelLeft, panelTop, panelWidth, panelHeight);
  this.renderChallengeHeader(width / 2, panelTop);

  this.input.setTopOnly(false);
  this.createSlotRow(width / 2, panelTop + 220, panelWidth);
  this.createTokenBank(width / 2, panelTop + 390, shuffledTokens);
  this.createStatusText(width / 2, panelTop + panelHeight - 122);
  this.createFooterActions(width / 2, panelTop + panelHeight - 56);
}
