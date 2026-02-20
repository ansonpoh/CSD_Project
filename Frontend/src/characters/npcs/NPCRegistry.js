import { samurai } from "./samurai/Samurai";
import { knight } from "./knight/Knight";

export const NPCRegistry = {
    samurai: {
        key: samurai.sheetKey,
        file: samurai.file,
        frameWidth: samurai.frameWidth,
        frameHeight: samurai.frameHeight,
        maxCols: samurai.maxCols,
        scale: samurai.scale,
        anims: samurai.anims,
        labelOffsetY: samurai.labelOffsetY,
        portraitOffsetY: samurai.portraitOffsetY
    },
    knight: {
        key: knight.sheetKey,
        file: knight.file,
        frameWidth: knight.frameWidth,
        frameHeight: knight.frameHeight,
        maxCols: knight.maxCols,
        scale: knight.scale,
        anims: knight.anims,
        labelOffsetY: knight.labelOffsetY,
        portraitOffsetY: knight.portraitOffsetY
    }
}