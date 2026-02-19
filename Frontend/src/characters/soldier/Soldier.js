export const soldier = {
  id: 'soldier',
  sheetKey: 'soldier',
  file: 'https://tdhhdbipbnlfdjlbxege.supabase.co/storage/v1/object/public/game-assets/soldier.png',
  frameWidth: 100,
  frameHeight: 100,
  maxCols: 9,
  scale: 3,

  anims: {
    idle: { row: 0, count: 6, frameRate: 4,  repeat: -1 },
    move: { row: 1, count: 8, frameRate: 12, repeat: -1 },
    attack_1: { row: 2, count: 6, frameRate: 10, repeat: 0 },
    attack_2: { row: 3, count: 6, frameRate: 10, repeat: 0 },
    attack_3: { row: 4, count: 9, frameRate: 12, repeat: 0 },
    hurt: { row: 5, count: 4, frameRate: 8, repeat: 0 },
    dead: { row: 6, count: 4, frameRate: 8, repeat: 0 },
  }
};
