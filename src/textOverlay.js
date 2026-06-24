const ENABLED_KEY = 'lobby-viz-text-enabled';
const CONTENT_KEY = 'lobby-viz-text-content';
const SIZE_KEY = 'lobby-viz-text-size';
const OPACITY_KEY = 'lobby-viz-text-opacity';
const COLOR_KEY = 'lobby-viz-text-color';
const POSITION_KEY = 'lobby-viz-text-position';
const AUTOFIT_KEY = 'lobby-viz-text-autofit';
const LINE_HEIGHT_KEY = 'lobby-viz-text-line-height';

export const TEXT_POSITIONS = {
  Top: 'top',
  Center: 'center',
  Bottom: 'bottom',
};

export function loadStoredTextEnabled() {
  try {
    return localStorage.getItem(ENABLED_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveTextEnabled(enabled) {
  try {
    localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function loadStoredTextContent() {
  try {
    return localStorage.getItem(CONTENT_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveTextContent(text) {
  try {
    localStorage.setItem(CONTENT_KEY, text);
  } catch {
    /* ignore */
  }
}

export function loadStoredTextSize() {
  try {
    const raw = localStorage.getItem(SIZE_KEY);
    if (raw == null) return 100;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(40, Math.min(240, n)) : 100;
  } catch {
    return 100;
  }
}

export function saveTextSize(size) {
  try {
    localStorage.setItem(SIZE_KEY, String(size));
  } catch {
    /* ignore */
  }
}

export function loadStoredTextOpacity() {
  try {
    const raw = localStorage.getItem(OPACITY_KEY);
    if (raw == null) return 100;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 100;
  } catch {
    return 100;
  }
}

export function saveTextOpacity(opacity) {
  try {
    localStorage.setItem(OPACITY_KEY, String(opacity));
  } catch {
    /* ignore */
  }
}

export function loadStoredTextColor() {
  try {
    return localStorage.getItem(COLOR_KEY) === 'black' ? 'black' : 'white';
  } catch {
    return 'white';
  }
}

export function saveTextColor(color) {
  try {
    localStorage.setItem(COLOR_KEY, color === 'black' ? 'black' : 'white');
  } catch {
    /* ignore */
  }
}

export function loadStoredTextPosition() {
  try {
    const v = localStorage.getItem(POSITION_KEY);
    return v === 'top' || v === 'bottom' ? v : 'center';
  } catch {
    return 'center';
  }
}

export function saveTextPosition(position) {
  try {
    localStorage.setItem(POSITION_KEY, position);
  } catch {
    /* ignore */
  }
}

export function loadStoredTextAutoFit() {
  try {
    return localStorage.getItem(AUTOFIT_KEY) !== '0';
  } catch {
    return true;
  }
}

export function saveTextAutoFit(enabled) {
  try {
    localStorage.setItem(AUTOFIT_KEY, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function loadStoredTextLineHeight() {
  try {
    const raw = localStorage.getItem(LINE_HEIGHT_KEY);
    if (raw == null) return 135;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(90, Math.min(220, Math.round(n))) : 135;
  } catch {
    return 135;
  }
}

export function saveTextLineHeight(lineHeight) {
  try {
    localStorage.setItem(LINE_HEIGHT_KEY, String(lineHeight));
  } catch {
    /* ignore */
  }
}

export function createTextOverlayController() {
  const el = document.getElementById('hero-text');
  const notepad = document.getElementById('notepad-panel');
  const textarea = document.getElementById('notepad-input');
  const closeBtn = document.getElementById('notepad-close');

  let enabled = loadStoredTextEnabled();
  let content = loadStoredTextContent();
  let size = loadStoredTextSize();
  let opacity = loadStoredTextOpacity();
  let color = loadStoredTextColor();
  let position = loadStoredTextPosition();
  let autoFit = loadStoredTextAutoFit();
  let lineHeight = loadStoredTextLineHeight();

  function applyAutoFit() {
    if (!el) return;
    if (!autoFit) {
      el.style.setProperty('--text-fit-scale', '1');
      return;
    }
    const prev = el.style.getPropertyValue('--text-fit-scale');
    el.style.setProperty('--text-fit-scale', '1');

    const bounds = el.getBoundingClientRect();
    const maxW = window.innerWidth * 0.94;
    const maxH = window.innerHeight * 0.84;
    const widthScale = bounds.width > 0 ? Math.min(1, maxW / bounds.width) : 1;
    const heightScale = bounds.height > 0 ? Math.min(1, maxH / bounds.height) : 1;
    const scale = Math.max(0.35, Math.min(widthScale, heightScale));
    el.style.setProperty('--text-fit-scale', String(scale));
    if (!Number.isFinite(scale)) {
      el.style.setProperty('--text-fit-scale', prev || '1');
    }
  }

  function applyStyles() {
    if (!el) return;
    el.style.setProperty('--text-size', `${size / 100}`);
    el.style.setProperty('--text-line-height', `${lineHeight / 100}`);
    el.style.setProperty('--text-opacity', String(opacity / 100));
    el.dataset.color = color;
    el.dataset.position = position;
    el.textContent = content;
    el.classList.toggle('is-hidden', !enabled || !content.trim());
    if (!enabled || !content.trim()) {
      el.style.setProperty('--text-fit-scale', '1');
      return;
    }
    applyAutoFit();
  }

  function setEnabled(next) {
    enabled = Boolean(next);
    saveTextEnabled(enabled);
    applyStyles();
  }

  function setContent(next) {
    content = next ?? '';
    saveTextContent(content);
    applyStyles();
  }

  function setSize(percent) {
    size = Math.max(40, Math.min(240, percent));
    saveTextSize(size);
    applyStyles();
  }

  function setOpacity(percent) {
    opacity = Math.max(0, Math.min(100, percent));
    saveTextOpacity(opacity);
    applyStyles();
  }

  function setColor(next) {
    color = next === 'black' ? 'black' : 'white';
    saveTextColor(color);
    applyStyles();
  }

  function setPosition(next) {
    position = next === 'top' || next === 'bottom' ? next : 'center';
    saveTextPosition(position);
    applyStyles();
  }

  function setAutoFit(next) {
    autoFit = Boolean(next);
    saveTextAutoFit(autoFit);
    applyStyles();
  }

  function setLineHeight(percent) {
    lineHeight = Math.max(90, Math.min(220, percent));
    saveTextLineHeight(lineHeight);
    applyStyles();
  }

  function openNotepad() {
    if (!notepad || !textarea) return;
    textarea.value = content;
    notepad.classList.add('is-open');
    textarea.focus();
  }

  function closeNotepad() {
    if (!notepad) return;
    notepad.classList.remove('is-open');
  }

  if (textarea) {
    let saveTimer = null;
    textarea.addEventListener('input', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        setContent(textarea.value);
      }, 200);
    });
  }

  closeBtn?.addEventListener('click', closeNotepad);
  notepad?.addEventListener('click', (e) => {
    if (e.target === notepad) closeNotepad();
  });
  window.addEventListener('resize', applyAutoFit);

  applyStyles();

  return {
    setEnabled,
    setContent,
    setSize,
    setOpacity,
    setColor,
    setPosition,
    setAutoFit,
    setLineHeight,
    openNotepad,
    closeNotepad,
    getEnabled: () => enabled,
    getContent: () => content,
    getSize: () => size,
    getOpacity: () => opacity,
    getColor: () => color,
    getPosition: () => position,
    getAutoFit: () => autoFit,
    getLineHeight: () => lineHeight,
  };
}
