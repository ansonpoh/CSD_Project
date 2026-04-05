const DEFAULT_PRESET_ID = 'azure-knight';

export const PLAYER_PRESETS = [
  {
    id: 'azure-knight',
    label: 'Azure Knight',
    tint: 0x7ec8ff,
    accent: '#7ec8ff',
    summary: 'Balanced explorer with a cool blue glow.'
  },
  {
    id: 'ember-guard',
    label: 'Ember Guard',
    tint: 0xffb26b,
    accent: '#ffb26b',
    summary: 'Warm orange palette for a bold frontline look.'
  },
  {
    id: 'verdant-scout',
    label: 'Verdant Scout',
    tint: 0x89f0a8,
    accent: '#89f0a8',
    summary: 'Leafy green tones for calm, steady progress.'
  },
  {
    id: 'violet-scholar',
    label: 'Violet Scholar',
    tint: 0xd0a2ff,
    accent: '#d0a2ff',
    summary: 'Arcane purple finish for quiz-heavy runs.'
  }
];

export function getDefaultPlayerProfile() {
  return buildPlayerProfile({ presetId: DEFAULT_PRESET_ID });
}

export function buildPlayerProfile(profile = {}) {
  const preset = getPresetById(profile?.presetId || DEFAULT_PRESET_ID);
  return {
    presetId: preset.id,
    label: preset.label,
    tint: preset.tint,
    accent: preset.accent,
    summary: preset.summary
  };
}

export function getPresetById(presetId) {
  return PLAYER_PRESETS.find((preset) => preset.id === presetId) || PLAYER_PRESETS[0];
}

export function applyPlayerProfileToSprite(sprite, profile) {
  if (!sprite) return;
  sprite.clearTint();
}
