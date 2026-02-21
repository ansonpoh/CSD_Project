import { samurai } from "./samurai/Samurai";
import { knight } from "./knight/Knight";
import { priest } from "./priest/Priest";
import { wizard } from "./wizard/Wizard";
import { lancer } from "./lancer/Lancer";

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
    },
    priest: {
        key: priest.sheetKey,
        file: priest.file,
        frameWidth: priest.frameWidth,
        frameHeight: priest.frameHeight,
        maxCols: priest.maxCols,
        scale: priest.scale,
        anims: priest.anims,
        labelOffsetY: priest.labelOffsetY,
        portraitOffsetY: priest.portraitOffsetY
    },
    wizard: {
        key: wizard.sheetKey,
        file: wizard.file,
        frameWidth: wizard.frameWidth,
        frameHeight: wizard.frameHeight,
        maxCols: wizard.maxCols,
        scale: wizard.scale,
        anims: wizard.anims,
        labelOffsetY: wizard.labelOffsetY,
        portraitOffsetY: wizard.portraitOffsetY
    },
    lancer: {
        key: lancer.sheetKey,
        file: lancer.file,
        frameWidth: lancer.frameWidth,
        frameHeight: lancer.frameHeight,
        maxCols: lancer.maxCols,
        scale: lancer.scale,
        anims: lancer.anims,
        labelOffsetY: lancer.labelOffsetY,
        portraitOffsetY: lancer.portraitOffsetY
    },
}