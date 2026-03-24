export function ensureProfileIdleAnimation(scene, soldier) {
  if (scene.anims.exists('idle')) {
    return;
  }

  const idle = soldier.anims.idle;
  const frames = Array.from({ length: idle.count }, (_, index) => idle.row * soldier.maxCols + index);

  scene.anims.create({
    key: 'idle',
    frames: scene.anims.generateFrameNumbers(soldier.sheetKey, { frames }),
    frameRate: idle.frameRate,
    repeat: idle.repeat
  });
}

export function buildProfilePanel(scene, config, nodes) {
  const { left, top, cols, rows, tileSize, depth } = config;
  const cornerFrames = { tl: 0, tr: 2, bl: 6, br: 8 };

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const isTop = row === 0;
      const isBottom = row === rows - 1;
      const isLeft = col === 0;
      const isRight = col === cols - 1;
      let frame = 4;

      if (isTop && isLeft) frame = cornerFrames.tl;
      else if (isTop && isRight) frame = cornerFrames.tr;
      else if (isBottom && isLeft) frame = cornerFrames.bl;
      else if (isBottom && isRight) frame = cornerFrames.br;
      else if (isTop) frame = 1;
      else if (isBottom) frame = 7;
      else if (isLeft) frame = 3;
      else if (isRight) frame = 5;

      const tile = scene.add.sprite(
        left + col * tileSize + tileSize / 2,
        top + row * tileSize + tileSize / 2,
        'ui-panel-a',
        frame
      ).setScale(tileSize / 32).setDepth(depth);
      nodes.push(tile);
    }
  }

  for (let col = 1; col < cols - 1; col += 1) {
    const x = left + col * tileSize + tileSize / 2;
    nodes.push(
      scene.add.sprite(x, top + tileSize / 2, 'ui-header-a', 1)
        .setScale(tileSize / 32)
        .setDepth(depth + 1)
    );
  }

  nodes.push(
    scene.add.sprite(left + tileSize / 2, top + tileSize / 2, 'ui-header-a', 0)
      .setScale(tileSize / 32)
      .setDepth(depth + 1),
    scene.add.sprite(left + (cols - 0.5) * tileSize, top + tileSize / 2, 'ui-header-a', 2)
      .setScale(tileSize / 32)
      .setDepth(depth + 1)
  );
}

export function getPrimaryLeftStats(learner, roleInfo, profile) {
  const roleString = (typeof roleInfo === 'object' && roleInfo !== null)
    ? (roleInfo.role || roleInfo.roleName || 'User')
    : (roleInfo || 'User');

  return [
    ['Full Name', learner.full_name ?? learner.fullName ?? 'Unknown'],
    ['Style', profile.label],
    ['Email', learner.email ?? 'Unknown'],
    ['Role', roleString]
  ];
}

export function getPrimaryRightStats(learner) {
  const joined = learner.created_at || learner.createdAt || learner.joined_at || learner.joinedAt;
  return [
    ['Level', String(learner.level ?? 1)],
    ['XP Points', String(learner.total_xp ?? learner.totalXp ?? 0)],
    ['Created', joined ? formatJoinDate(joined) : 'Unknown']
  ];
}

export function getExtraProfileStats(learner) {
  const trackedFields = new Set([
    'username', 'full_name', 'fullName', 'email', 'level', 'total_xp', 'totalXp',
    'learnerId', 'id', 'is_active', 'created_at', 'createdAt', 'joined_at', 'joinedAt',
    'supabase_user_id', 'supabaseUserId', 'updated_at', 'updatedAt'
  ]);

  return Object.entries(learner)
    .filter(([key, value]) => !trackedFields.has(key) && ['string', 'number', 'boolean'].includes(typeof value))
    .slice(0, 2)
    .map(([key, value]) => [toTitleCase(key), String(value)]);
}

export function truncateProfileValue(value, maxLength = 34) {
  const text = String(value ?? 'Unknown');
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

export function formatJoinDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function toTitleCase(text) {
  return text
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}