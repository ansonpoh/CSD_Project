import { orc } from './orc/Orc.js';

export const monsterRegistry = {
  orc: {
    key: orc.sheetKey,
    file: orc.file,
    frameWidth: orc.frameWidth,
    frameHeight: orc.frameHeight,
    maxCols: orc.maxCols,
    scale: orc.scale,
    anims: orc.anims
  }
};
