export const MENU_POSITION_KEY = 'lobby-visualizer-menu-position';

export const MENU_POSITIONS = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];

export const MENU_POSITION_LABELS = {
  'top-right': 'Top right',
  'top-left': 'Top left',
  'bottom-right': 'Bottom right',
  'bottom-left': 'Bottom left',
};

const DEFAULT_POSITION = 'top-right';

export function loadMenuPosition() {
  try {
    const stored = localStorage.getItem(MENU_POSITION_KEY);
    if (stored && MENU_POSITIONS.includes(stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_POSITION;
}

export function saveMenuPosition(position) {
  try {
    localStorage.setItem(MENU_POSITION_KEY, position);
  } catch {
    /* ignore */
  }
}

export function applyMenuPosition(element, position = DEFAULT_POSITION) {
  if (!element) return;

  const next = MENU_POSITIONS.includes(position) ? position : DEFAULT_POSITION;
  for (const id of MENU_POSITIONS) {
    element.classList.toggle(`menu-pos-${id}`, id === next);
  }
}

export function nextMenuPosition(current) {
  const idx = MENU_POSITIONS.indexOf(current);
  const nextIndex = (Math.max(0, idx) + 1) % MENU_POSITIONS.length;
  return MENU_POSITIONS[nextIndex];
}
