export const MENU_BIG_MODE_KEY = 'lobby-visualizer-menu-big-mode';

export function loadMenuBigMode() {
  try {
    return localStorage.getItem(MENU_BIG_MODE_KEY) === 'true';
  } catch {
    /* ignore */
  }
  return false;
}

export function saveMenuBigMode(enabled) {
  try {
    localStorage.setItem(MENU_BIG_MODE_KEY, String(Boolean(enabled)));
  } catch {
    /* ignore */
  }
}

export function applyMenuBigMode(element, enabled = false) {
  if (!element) return;
  element.classList.toggle('menu-big-mode', Boolean(enabled));
  element.dispatchEvent(new CustomEvent('menubigmodechange'));
}
