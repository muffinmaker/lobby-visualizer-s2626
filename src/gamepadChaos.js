import { CHAOS_MODES } from './chaosModes.js';

export function createGamepadChaos({
  presetManager,
  settings,
  onRefreshLabels,
  onToast,
}) {
  function toast(message) {
    onToast?.(message);
  }

  function refresh() {
    onRefreshLabels?.();
  }

  function formatToast(modeId, result) {
    const mode = CHAOS_MODES[modeId];
    if (!mode || !result?.ok) return null;

    if (modeId === 'preset') {
      if (result.reRolled) return `Random preset · ${result.presetName} (re-rolled)`;
      return `Random preset · ${result.presetName}`;
    }

    return `${mode.label} · ${result.presetName}`;
  }

  function applyMode(modeId) {
    const result = presetManager.randomizeMode(modeId, {
      shader: settings?.state?.shader,
      presetName: settings?.state?.preset,
    });
    const message = formatToast(modeId, result);
    if (!message) return result;

    if (modeId === 'preset') {
      refresh();
    }
    toast(message);
    return result;
  }

  return {
    applyMode,
    /** A / Z — speed, bloom, trails (same preset). */
    motion: () => applyMode('motion'),
    /** X / C — palettes, tints, hues (same preset). */
    color: () => applyMode('color'),
    /** Keyboard X — segments, morph, zoom (same preset). */
    structure: () => applyMode('structure'),
    /** B — motion + colors + shapes in one hit (same preset). */
    party: () => applyMode('party'),
    /** Y / V / R — hop to another saved preset (same shader). */
    preset: () => applyMode('preset'),
  };
}
