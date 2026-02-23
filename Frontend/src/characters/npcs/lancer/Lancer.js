export const lancer = {
  id: 'lancer',
  sheetKey: 'lancer',
  file: 'https://tdhhdbipbnlfdjlbxege.supabase.co/storage/v1/object/public/game-assets/lancer.png',
  frameWidth: 100,
  frameHeight: 100,
  maxCols: 9,
  scale: 3,
  labelOffsetY: 80,
  portraitOffsetY: -20,
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
    run: { row: 2, count: 8, frameRate: 12, repeat: -1 },
    attack_1: { row: 3, count: 6, frameRate: 12, repeat: 0 },
    attack_2: { row: 4, count: 9, frameRate: 12, repeat: 0 },
    attack_3: { row: 5, count: 8, frameRate: 12, repeat: 0 },
    hurt: { row: 6, count: 4, frameRate: 8, repeat: 0 },
    dead: { row: 7, count: 4, frameRate: 8, repeat: 0 }
  }
};