export const wizard = {
  id: 'wizard',
  sheetKey: 'wizard',
  file: 'https://tdhhdbipbnlfdjlbxege.supabase.co/storage/v1/object/public/game-assets/wizard.png',
  frameWidth: 100,
  frameHeight: 100,
  maxCols: 15,
  scale: 3,
  labelOffsetY: 105,
  portraitOffsetY: -10,
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
    idle: { row: 0, count: 6, frameRate: 4, repeat: -1 },
    move: { row: 1, count: 8, frameRate: 12, repeat: -1 },
    attack_1: { row: 2, count: 15, frameRate: 12, repeat: 0 },
    attack_1_noanim: { row: 3, count: 6, frameRate: 12, repeat: 0 },
    attack_1_anim: {row: 4, count: 10, frameRate: 12, repeat: 0},
    attack_2: { row: 5, count: 12, frameRate: 12, repeat: 0 },
    attack_2_noanim: { row: 6, count: 6, frameRate: 12, repeat: 0 },
    attack_2_anim: {row: 7, count: 7, frameRate: 12, repeat: 0},
    hurt: { row: 8, count: 4, frameRate: 8, repeat: 0 },
    dead: { row: 9, count: 4, frameRate: 8, repeat: 0 }
  }
};