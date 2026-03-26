export function resolveItemEffect(item) {
  const name = String(item?.name || '').toLowerCase();
  const description = String(item?.description || '').toLowerCase();
  const blob = `${name} ${description}`;
  const isPotion = blob.includes('potion') || blob.includes('elixir');
  const isHealthPotion = blob.includes('health') || blob.includes('heal') || blob.includes('healing');
  const isManaPotion = blob.includes('mana');

  // Only health/healing potions should grant quiz hearts.
  if (isPotion && isHealthPotion) {
    return {
      usable: true,
      quizHeartBonus: 1,
      message: 'Potion used: +1 heart for quizzes until that extra heart is lost.'
    };
  }

  // Mana potions are usable but should not affect hearts.
  if (isPotion && isManaPotion) {
    return {
      usable: true,
      nextCombatHpBonus: 20,
      message: 'Mana potion used: next combat starts with +20 HP.'
    };
  }

  if (blob.includes('heart') || blob.includes('lifeline') || blob.includes('revive')) {
    return {
      usable: false,
      message: 'Heart items are consumed automatically when you miss an answer in combat.'
    };
  }

  if (blob.includes('oracle') || blob.includes('hint') || blob.includes('scroll')) {
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
