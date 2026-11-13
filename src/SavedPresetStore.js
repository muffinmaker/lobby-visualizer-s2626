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

export function presetsFromImport(data) {
  const list = Array.isArray(data) ? data : Array.isArray(data?.presets) ? data.presets : [data];
  return list
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      name: typeof entry.name === 'string' ? entry.name.trim() : '',
      shader: typeof entry.shader === 'string' ? entry.shader : '',
      values: entry.values && typeof entry.values === 'object' ? { ...entry.values } : null,
    }))
    .filter((entry) => entry.name && entry.shader && entry.values);
}

export function downloadPresetFile(preset) {
  const stored = toStoredPreset(preset);
  const blob = new Blob([JSON.stringify(stored, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  const safe = String(stored.name || 'preset').replace(/[^\w.-]+/g, '-');
  link.href = URL.createObjectURL(blob);
  link.download = `${safe}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}
