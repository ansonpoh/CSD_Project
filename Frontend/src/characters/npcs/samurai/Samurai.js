export const samurai = {
    id: 'samurai',
    sheetKey: 'samurai',
    file: 'https://tdhhdbipbnlfdjlbxege.supabase.co/storage/v1/object/public/game-assets/samurai.png',
    frameWidth: 96,
    frameHeight: 96,
    maxCols: 1,
    scale: 2,
    labelOffsetY: 90,
    portraitOffsetY: 30,
    lessonPages: [
        {
            narrationLines: "I sense discipline in your stance.",
            lessonTitle: "Input validation",
            lessonBody:"Always validate user input on the server side.",
        },
        {
            narrationLines: "Stinky",
            lessonTitle: "Client vs Server",
            lessonBody:"Client checks are for UX only.",
        }
    ],

    anims: {
        idle: { row: 0, count: 10, frameRate: 5, repeat: -1 }
    }
}