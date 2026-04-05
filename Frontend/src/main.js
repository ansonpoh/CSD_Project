import Phaser from 'phaser';
import config from './config/phaser.config.js';
import './style.css';

const BASE_FONT_SCALE = 1.12;
const BASE_DOM_FONT_SCALE = 1.1;
const MIN_READABLE_GAME_SCALE = 0.9;
const MAX_FONT_SCALE = 1.65;
const FONT_SCALE_APPLIED = Symbol('fontScaleApplied');

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getViewportGameScale() {
  if (typeof window === 'undefined') return 1;

  const baseWidth = Number(config?.width) || 1920;
  const baseHeight = Number(config?.height) || 1088;
  const widthScale = window.innerWidth / baseWidth;
  const heightScale = window.innerHeight / baseHeight;
  return Math.max(0.01, Math.min(widthScale, heightScale));
}

function getAdaptiveFontScale(baseScale) {
  const viewportScale = getViewportGameScale();
  const readabilityBoost = viewportScale < MIN_READABLE_GAME_SCALE
    ? MIN_READABLE_GAME_SCALE / viewportScale
    : 1;
  return clamp(baseScale * readabilityBoost, baseScale, MAX_FONT_SCALE);
}

function scaleFontSizeValue(value) {
  const fontScale = getAdaptiveFontScale(BASE_FONT_SCALE);

  if (value === null || value === undefined || value === '') return value;

  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.round(value * fontScale));
  }

  if (typeof value === 'string') {
    const match = value.trim().match(/^(-?\d*\.?\d+)([a-z%]*)$/i);
    if (!match) return value;

    const numeric = Number.parseFloat(match[1]);
    if (!Number.isFinite(numeric)) return value;

    const unit = match[2] || 'px';
    return `${Math.max(1, Math.round(numeric * fontScale))}${unit}`;
  }

  return value;
}

function scaleTextStyle(style) {
  if (!style || typeof style !== 'object' || style[FONT_SCALE_APPLIED]) {
    return style;
  }

  const scaledStyle = { ...style };
  if ('fontSize' in scaledStyle) {
    scaledStyle.fontSize = scaleFontSizeValue(scaledStyle.fontSize);
  }
  scaledStyle[FONT_SCALE_APPLIED] = true;
  return scaledStyle;
}

function installGlobalTextScale() {
  const originalFactoryText = Phaser.GameObjects.GameObjectFactory.prototype.text;
  Phaser.GameObjects.GameObjectFactory.prototype.text = function patchedFactoryText(x, y, text, style) {
    return originalFactoryText.call(this, x, y, text, scaleTextStyle(style));
  };

  const originalCreatorText = Phaser.GameObjects.GameObjectCreator.prototype.text;
  Phaser.GameObjects.GameObjectCreator.prototype.text = function patchedCreatorText(config, addToScene) {
    if (config && typeof config === 'object' && 'style' in config) {
      return originalCreatorText.call(this, { ...config, style: scaleTextStyle(config.style) }, addToScene);
    }
    return originalCreatorText.call(this, config, addToScene);
  };

  const originalSetStyle = Phaser.GameObjects.Text.prototype.setStyle;
  Phaser.GameObjects.Text.prototype.setStyle = function patchedSetStyle(style, updateText, setDefaults) {
    return originalSetStyle.call(this, scaleTextStyle(style), updateText, setDefaults);
  };

  const originalSetFontSize = Phaser.GameObjects.Text.prototype.setFontSize;
  Phaser.GameObjects.Text.prototype.setFontSize = function patchedSetFontSize(fontSize) {
    return originalSetFontSize.call(this, scaleFontSizeValue(fontSize));
  };
}

function applyAdaptiveDomFontScale() {
  if (typeof document === 'undefined') return;
  const scale = getAdaptiveFontScale(BASE_DOM_FONT_SCALE);
  document.documentElement.style.setProperty('--font-scale', scale.toFixed(3));
}

function installDomScaleListener() {
  if (typeof window === 'undefined') return;

  let rafId = null;
  const onResize = () => {
    if (rafId !== null) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      applyAdaptiveDomFontScale();
    });
  };

  window.addEventListener('resize', onResize);
}

installGlobalTextScale();
applyAdaptiveDomFontScale();
installDomScaleListener();

// Initialize the game
new Phaser.Game(config);

// Log game info
console.log('Game initialized');
console.log('Phaser version:', Phaser.VERSION);
