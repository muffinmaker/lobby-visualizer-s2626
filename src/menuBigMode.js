export const MENU_SCALE_KEY = 'lobby-visualizer-menu-scale';
const LEGACY_BIG_MODE_KEY = 'lobby-visualizer-menu-big-mode';

export const MENU_SCALE_MIN = 100;
export const MENU_SCALE_MAX = 300;

function clampScale(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return MENU_SCALE_MIN;
  return Math.max(MENU_SCALE_MIN, Math.min(MENU_SCALE_MAX, n));
}

/** 100 is the normal menu. 300 matches the old big-menu size. */
export function loadMenuScale() {
  try {
    const raw = localStorage.getItem(MENU_SCALE_KEY);
    if (raw != null && raw !== '') return clampScale(raw);
    if (localStorage.getItem(LEGACY_BIG_MODE_KEY) === 'true') return MENU_SCALE_MAX;
  } catch {
    /* ignore */
  }
  return MENU_SCALE_MIN;
}

export function saveMenuScale(scale) {
  try {
    localStorage.setItem(MENU_SCALE_KEY, String(clampScale(scale)));
  } catch {
    /* ignore */
  }
}

export function applyMenuScale(element, scale = MENU_SCALE_MIN) {
  if (!element) return;
  const ui = clampScale(scale);
  const factor = ui / 100;
  element.style.setProperty('--menu-scale', String(factor));
  element.classList.toggle('menu-big-mode', factor > 1.02);
  element.dispatchEvent(new CustomEvent('menubigmodechange'));
}
