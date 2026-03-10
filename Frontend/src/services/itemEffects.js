export function resolveItemEffect(item) {
  const name = String(item?.name || '').toLowerCase();
  const description = String(item?.description || '').toLowerCase();
  const blob = `${name} ${description}`;

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

  if (blob.includes('potion') || blob.includes('elixir') || blob.includes('heal')) {
    return {
      usable: true,
      nextCombatHpBonus: 20,
      message: 'Potion used: next combat starts with +20 HP.'
    };
  }

  return {
    usable: true,
    xpGain: 25,
    message: 'Knowledge item used: +25 XP.'
  };
}
