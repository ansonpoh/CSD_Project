import { orc } from './orc/Orc.js';
import { skeleton } from './skeleton/Skeleton.js';
import { eliteOrc } from './elite_orc/EliteOrc.js';
import { slime } from './slime/Slime.js';
import { werebear } from './werebear/Werebear.js';

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
  },
  eliteOrc: {
    key: eliteOrc.sheetKey,
    file: eliteOrc.file,
    frameWidth: eliteOrc.frameWidth,
    frameHeight: eliteOrc.frameHeight,
    maxCols: eliteOrc.maxCols,
    scale: eliteOrc.scale,
    anims: eliteOrc.anims,
    labelOffsetY: eliteOrc.labelOffsetY,
  },
  slime: {
    key: slime.sheetKey,
    file: slime.file,
    frameWidth: slime.frameWidth,
    frameHeight: slime.frameHeight,
    maxCols: slime.maxCols,
    scale: slime.scale,
    anims: slime.anims,
    labelOffsetY: slime.labelOffsetY,
  },
  werebear: {
    key: werebear.sheetKey,
    file: werebear.file,
    frameWidth: werebear.frameWidth,
    frameHeight: werebear.frameHeight,
    maxCols: werebear.maxCols,
    scale: werebear.scale,
    anims: werebear.anims,
    labelOffsetY: werebear.labelOffsetY,
  },
};
