import { orc } from './orc/Orc.js';
import { skeleton } from './skeleton/Skeleton.js';

export const monsterRegistry = {
  orc: {
    key: orc.sheetKey,
    file: orc.file,
    frameWidth: orc.frameWidth,
    frameHeight: orc.frameHeight,
    maxCols: orc.maxCols,
    scale: orc.scale,
    anims: orc.anims,
    labelOffsetY: orc.labelOffsetY,
  },
  skeleton: {
    key: skeleton.sheetKey,
    file: skeleton.file,
    frameWidth: skeleton.frameWidth,
    frameHeight: skeleton.frameHeight,
    maxCols: skeleton.maxCols,
    scale: skeleton.scale,
    anims: skeleton.anims,
    labelOffsetY: skeleton.labelOffsetY,
  }
};
