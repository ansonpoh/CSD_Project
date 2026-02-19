import { samurai } from "./samurai/Samurai";

export const NPCRegistry = {
    samurai: {
        key: samurai.sheetKey,
        file: samurai.file,
        frameWidth: samurai.frameWidth,
        frameHeight: samurai.frameHeight,
        maxCols: samurai.maxCols,
        scale: samurai.scale,
        anims: samurai.anims
    }
}