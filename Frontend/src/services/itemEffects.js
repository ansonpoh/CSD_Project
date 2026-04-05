export function resolveItemEffect(item) {
  const name = String(item?.name || '').toLowerCase();
  const description = String(item?.description || '').toLowerCase();
  const itemType = String(item?.item_type || '').toLowerCase();
  const blob = `${name} ${description}`;
  const isPotion = blob.includes('potion') || blob.includes('elixir');
  const isHealthPotion = blob.includes('health') || blob.includes('heal') || blob.includes('healing');
  const isManaPotion = blob.includes('mana');
  const isLuckyCharm = blob.includes('lucky charm') || (blob.includes('lucky') && blob.includes('charm'));
  const isQuizHintItem =
    itemType === 'quiz_hint' ||
    blob.includes('quiz hint') ||
    blob.includes('hint token') ||
    (blob.includes('hint') && blob.includes('quiz'));

  // Only health/healing potions should grant quiz hearts.
  if (isPotion && isHealthPotion) {
    return {
      usable: true,
      quizHeartBonus: 1,
      message: 'Potion used: +1 heart for quizzes until that extra heart is lost.'
    };
  }

  // Mana potions are deprecated.
  if (isPotion && isManaPotion) {
    return {
      usable: false,
      message: 'Mana Potion has been retired.'
    };
  }

  if (isLuckyCharm) {
    return {
      usable: true,
      nextRewardGoldBonusPct: 25,
      message: 'Lucky Charm activated: next quest reward gives +25% bonus gold.'
    };
  }

  if (blob.includes('heart') || blob.includes('lifeline') || blob.includes('revive')) {
    return {
      usable: false,
      message: 'Heart items are consumed automatically when you miss an answer in combat.'
    };
  }

  if (isQuizHintItem) {
    return {
      usable: false,
      combatOnly: true,
      quizHintItem: true,
      message: 'Hint items can only be used during quiz combat via the Use Hint button.'
    };
  }

  if (blob.includes('oracle') || blob.includes('scroll')) {
    return {
      usable: true,
      assistCharges: 1,
      message: 'Oracle assist stored for your next map encounter.'
    };
  }

  if (blob.includes('insight tome') || (blob.includes('insight') && blob.includes('tome'))) {
    const xpGain = 50;
    return {
      usable: true,
      xpGain,
      message: `Insight Tome used: +${xpGain} XP.`
    };
  }

  return {
    usable: true,
    xpGain: 25,
    message: 'Knowledge item used: +25 XP.'
  };
}
