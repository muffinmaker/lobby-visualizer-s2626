const STORAGE_KEY = 'lobby-visualizer-saved-presets';

export function loadSavedPresets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeSavedPresets(presets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function toStoredPreset(preset) {
  return {
    id: preset.id,
    name: preset.name,
    shader: preset.shader,
    values: { ...preset.values },
    savedAt: preset.savedAt ?? Date.now(),
  };
}
