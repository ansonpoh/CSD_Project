export const TYPOGRAPHY = {
  fontStacks: {
    ui: '"Trebuchet MS", "Verdana", "Segoe UI", "Tahoma", sans-serif',
    display: '"Trebuchet MS", "Verdana", "Segoe UI", "Tahoma", sans-serif',
    mono: '"Courier New", "Courier", monospace'
  },
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  }
};

const BASE = {
  bgDeep: 0x090f24,
  bgPanel: 0x0d1530,
  btnNormal: 0x2a0f42,
  btnHover: 0x3d1860,
  btnPress: 0x100520,
  borderGold: 0xc8870a,
  borderGlow: 0xf0b030,
  borderDim: 0x604008,
  textMain: '#f0ecff',
  textSub: '#c0a8e0',
  textGold: '#f4c048',
  textGreen: '#4ade80',
  textRed: '#f87171',
  textDim: '#5a4a72',
  textDesc: '#9e88c0',
  btnDanger: 0x3a0e0e,
  btnDangerHover: 0x601818
};

export const SCENE_PALETTES = {
  shop: {
    ...BASE,
    bgCard: 0x080e22,
    btnSuccess: 0x0e3020,
    btnSuccessHover: 0x1a5030
  },
  worldMap: {
    ...BASE,
    btnDisabled: 0x130b20,
    accentGlow: 0xffdd60,
    textDesc: '#c8b8df',
    textSub: '#d9ccee',
    textDisabled: '#9b8ab8',
    xpFill: 0x4193d5,
    xpTrack: 0x0e0820,
    xpBorder: 0xc8870a,
    good: '#7df5b2',
    warn: '#ffd57a',
    gold: '#ffe2a8'
  },
  combat: {
    ...BASE,
    btnDangerHov: BASE.btnDangerHover,
    btnBlue: 0x1a2a52,
    btnBlueHov: 0x2a4278,
    borderRed: 0x8b2020,
    borderBlue: 0x2a5090,
    hpGreen: 0x22a855,
    hpRed: 0xc03030,
    hpTrack: 0x0a1020
  }
};
