const ENABLED_KEY = 'lobby-viz-text-enabled';
const CONTENT_KEY = 'lobby-viz-text-content';
const SIZE_KEY = 'lobby-viz-text-size';
const OPACITY_KEY = 'lobby-viz-text-opacity';
const COLOR_KEY = 'lobby-viz-text-color';
const POSITION_KEY = 'lobby-viz-text-position';
const AUTOFIT_KEY = 'lobby-viz-text-autofit';
const LINE_HEIGHT_KEY = 'lobby-viz-text-line-height';
const FONT_KEY = 'lobby-viz-text-font';
const EFFECT_KEY = 'lobby-viz-text-effect';
const EFFECT_SPEED_KEY = 'lobby-viz-text-effect-speed';
const DRIFT_KEY = 'lobby-viz-text-drift';
const DRIFT_SPEED_KEY = 'lobby-viz-text-drift-speed';
const DRIFT_DIRECTION_KEY = 'lobby-viz-text-drift-direction';
const TRACKING_KEY = 'lobby-viz-text-tracking';
const STROKE_KEY = 'lobby-viz-text-stroke';
const ALIGN_KEY = 'lobby-viz-text-align';
const EFFECT_AMOUNT_KEY = 'lobby-viz-text-effect-amount';

export const TEXT_SIZE_MIN = 40;
export const TEXT_SIZE_MAX = 1200;

export const TEXT_FONTS = {
  System: 'system-ui, -apple-system, sans-serif',
  Sans: 'Arial, Helvetica, sans-serif',
  Serif: 'Georgia, serif',
  Times: '"Times New Roman", Times, serif',
  Palatino: 'Palatino, "Palatino Linotype", serif',
  Mono: '"Courier New", Courier, monospace',
  Verdana: 'Verdana, Geneva, sans-serif',
  Trebuchet: '"Trebuchet MS", sans-serif',
  Impact: 'Impact, Haettenschweiler, sans-serif',
  Hand: '"Comic Sans MS", "Segoe Print", cursive',
};

export const TEXT_EFFECTS = {
  None: 'none',
  Scale: 'scale',
  Wobble: 'wobble',
  Rotate: 'rotate',
  Pulse: 'pulse',
  Bounce: 'bounce',
  Shake: 'shake',
  Fade: 'fade',
  Wave: 'wave',
  Skew: 'skew',
  Orbit: 'orbit',
  Glitch: 'glitch',
};

export const TEXT_DRIFT_DIRECTIONS = {
  Right: 'right',
  Left: 'left',
  Up: 'up',
  Down: 'down',
  Diagonal: 'diagonal',
  Wander: 'wander',
};

export const TEXT_POSITIONS = {
  Top: 'top',
  Center: 'center',
  Bottom: 'bottom',
};

export const TEXT_ALIGNS = {
  Left: 'left',
  Center: 'center',
  Right: 'right',
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
    return Number.isFinite(n) ? Math.max(TEXT_SIZE_MIN, Math.min(TEXT_SIZE_MAX, n)) : 100;
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

export function loadStoredTextFont() {
  try {
    const stored = localStorage.getItem(FONT_KEY);
    return stored && TEXT_FONTS[stored] ? stored : 'System';
  } catch {
    return 'System';
  }
}

export function saveTextFont(font) {
  try {
    localStorage.setItem(FONT_KEY, TEXT_FONTS[font] ? font : 'System');
  } catch {
    /* ignore */
  }
}

function loadEnum(key, allowed, fallback) {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function loadStoredTextEffect() {
  return loadEnum(EFFECT_KEY, Object.values(TEXT_EFFECTS), 'none');
}

export function saveTextEffect(effect) {
  const next = Object.values(TEXT_EFFECTS).includes(effect) ? effect : 'none';
  try {
    localStorage.setItem(EFFECT_KEY, next);
  } catch {
    /* ignore */
  }
}

export function loadStoredTextEffectSpeed() {
  try {
    const n = Number(localStorage.getItem(EFFECT_SPEED_KEY));
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 45;
  } catch {
    return 45;
  }
}

export function saveTextEffectSpeed(speed) {
  try {
    localStorage.setItem(EFFECT_SPEED_KEY, String(speed));
  } catch {
    /* ignore */
  }
}

export function loadStoredTextDrift() {
  try {
    return localStorage.getItem(DRIFT_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveTextDrift(enabled) {
  try {
    localStorage.setItem(DRIFT_KEY, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function loadStoredTextDriftSpeed() {
  try {
    const n = Number(localStorage.getItem(DRIFT_SPEED_KEY));
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 30;
  } catch {
    return 30;
  }
}

export function saveTextDriftSpeed(speed) {
  try {
    localStorage.setItem(DRIFT_SPEED_KEY, String(speed));
  } catch {
    /* ignore */
  }
}

function loadPercent(key, fallback, min = 0, max = 100) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  } catch {
    return fallback;
  }
}

export function loadStoredTextTracking() {
  return loadPercent(TRACKING_KEY, 40);
}

export function saveTextTracking(value) {
  try { localStorage.setItem(TRACKING_KEY, String(value)); } catch { /* ignore */ }
}

export function loadStoredTextStroke() {
  return loadPercent(STROKE_KEY, 0);
}

export function saveTextStroke(value) {
  try { localStorage.setItem(STROKE_KEY, String(value)); } catch { /* ignore */ }
}

export function loadStoredTextAlign() {
  try {
    const raw = localStorage.getItem(ALIGN_KEY);
    return raw === 'left' || raw === 'right' ? raw : 'center';
  } catch {
    return 'center';
  }
}

export function saveTextAlign(value) {
  try { localStorage.setItem(ALIGN_KEY, value); } catch { /* ignore */ }
}

export function loadStoredTextEffectAmount() {
  return loadPercent(EFFECT_AMOUNT_KEY, 70);
}

export function saveTextEffectAmount(value) {
  try { localStorage.setItem(EFFECT_AMOUNT_KEY, String(value)); } catch { /* ignore */ }
}

export function loadStoredTextDriftDirection() {
  return loadEnum(DRIFT_DIRECTION_KEY, Object.values(TEXT_DRIFT_DIRECTIONS), 'right');
}

export function saveTextDriftDirection(direction) {
  try {
    localStorage.setItem(DRIFT_DIRECTION_KEY, direction);
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
  let font = loadStoredTextFont();
  let effect = loadStoredTextEffect();
  let effectSpeed = loadStoredTextEffectSpeed();
  let drift = loadStoredTextDrift();
  let driftSpeed = loadStoredTextDriftSpeed();
  let driftDirection = loadStoredTextDriftDirection();
  let tracking = loadStoredTextTracking();
  let stroke = loadStoredTextStroke();
  let align = loadStoredTextAlign();
  let effectAmount = loadStoredTextEffectAmount();
  let driftX = 0;
  let driftY = 0;
  let wanderAngle = 0.4;
  let motionTime = 0;
  let lastFrame = 0;
  let frame = 0;

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

  function fitScale() {
    const raw = el.style.getPropertyValue('--text-fit-scale');
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  function motionActive() {
    return effect !== 'none' || drift;
  }

  function paintMotion(time = motionTime) {
    if (!el) return;
    const amp = Math.max(0.05, (effectSpeed / 100) * (effectAmount / 70));
    const t = time;
    let tx = driftX;
    let ty = driftY;
    let rot = 0;
    let skew = 0;
    let sc = (size / 100) * fitScale();
    let op = opacity / 100;

    if (effect === 'scale') sc *= 1 + 0.22 * amp * Math.sin(t * 2.2);
    if (effect === 'wobble') rot = Math.sin(t * 3.4) * 10 * amp;
    if (effect === 'rotate') rot = (t * 48 * amp) % 360;
    if (effect === 'pulse') {
      sc *= 1 + 0.14 * amp * Math.sin(t * 4);
      op *= 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(t * 4));
    }
    if (effect === 'bounce') ty -= Math.abs(Math.sin(t * 3.1)) * 36 * amp;
    if (effect === 'shake') {
      tx += Math.sin(t * 47) * 7 * amp;
      ty += Math.cos(t * 53) * 5 * amp;
    }
    if (effect === 'fade') op *= 0.15 + 0.85 * (0.5 + 0.5 * Math.sin(t * 2.4 * amp));
    if (effect === 'wave') tx += Math.sin(t * 2.1) * 42 * amp;
    if (effect === 'skew') skew = Math.sin(t * 1.7) * 16 * amp;
    if (effect === 'orbit') {
      tx += Math.cos(t * (0.6 + amp)) * 48 * amp;
      ty += Math.sin(t * (0.6 + amp)) * 32 * amp;
    }
    if (effect === 'glitch') {
      const hit = Math.sin(t * 9) > 0.72;
      if (hit) {
        tx += Math.sin(t * 80) * 16 * amp;
        el.style.textShadow = `${6 * amp}px 0 #f3c, ${-6 * amp}px 0 #3cf`;
      } else {
        el.style.textShadow = '';
      }
    } else {
      el.style.textShadow = '';
    }

    const shiftX = align === 'center' ? 'translateX(-50%)' : '';
    const shiftY = position === 'center' ? 'translateY(-50%)' : '';
    const anchor = `${shiftX} ${shiftY}`.trim();
    el.style.transform = `${anchor} translate(${tx}px, ${ty}px) rotate(${rot}deg) skewX(${skew}deg) scale(${sc})`;
    el.style.opacity = String(Math.max(0, Math.min(1, op)));
  }

  function stepMotion(now) {
    if (!motionActive() || !enabled || !content.trim()) return;
    const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0.016;
    lastFrame = now;
    motionTime += dt * (0.35 + effectSpeed / 70);
    if (drift) {
      const px = (driftSpeed / 100) * 90 * dt;
      if (driftDirection === 'wander') {
        wanderAngle += dt * 0.35;
        driftX += Math.cos(wanderAngle) * px;
        driftY += Math.sin(wanderAngle * 0.7) * px;
      } else if (driftDirection === 'left') driftX -= px;
      else if (driftDirection === 'up') driftY -= px;
      else if (driftDirection === 'down') driftY += px;
      else if (driftDirection === 'diagonal') {
        driftX += px * 0.7;
        driftY += px * 0.45;
      } else driftX += px;
      const limit = Math.max(window.innerWidth, window.innerHeight) * 0.55;
      if (Math.abs(driftX) > limit) driftX = -Math.sign(driftX) * limit;
      if (Math.abs(driftY) > limit) driftY = -Math.sign(driftY) * limit;
    }
    paintMotion();
    frame = requestAnimationFrame(stepMotion);
  }

  function syncMotion() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
    if (motionActive() && enabled && content.trim()) {
      frame = requestAnimationFrame(stepMotion);
    } else {
      paintMotion(0);
    }
  }

  function applyStyles() {
    if (!el) return;
    el.style.setProperty('--text-font', TEXT_FONTS[font] || TEXT_FONTS.System);
    if (textarea) textarea.style.fontFamily = TEXT_FONTS[font] || TEXT_FONTS.System;
    el.style.setProperty('--text-line-height', `${lineHeight / 100}`);
    el.dataset.color = color;
    el.dataset.position = position;
    el.dataset.align = align;
    el.style.letterSpacing = `${((tracking - 40) / 100).toFixed(3)}em`;
    const strokePx = (stroke / 100) * 10;
    el.style.webkitTextStroke = strokePx > 0.2 ? `${strokePx.toFixed(2)}px ${color === 'black' ? '#fff' : '#000'}` : '';
    el.textContent = content;
    el.classList.toggle('is-hidden', !enabled || !content.trim());
    if (!enabled || !content.trim()) {
      el.style.setProperty('--text-fit-scale', '1');
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      return;
    }
    applyAutoFit();
    syncMotion();
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
    size = Math.max(TEXT_SIZE_MIN, Math.min(TEXT_SIZE_MAX, percent));
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

  function setFont(next) {
    font = TEXT_FONTS[next] ? next : 'System';
    saveTextFont(font);
    applyStyles();
  }

  function setEffect(next) {
    effect = Object.values(TEXT_EFFECTS).includes(next) ? next : 'none';
    saveTextEffect(effect);
    syncMotion();
  }

  function setEffectSpeed(percent) {
    effectSpeed = Math.max(0, Math.min(100, percent));
    saveTextEffectSpeed(effectSpeed);
  }

  function setDrift(next) {
    drift = Boolean(next);
    saveTextDrift(drift);
    if (!drift) {
      driftX = 0;
      driftY = 0;
    }
    syncMotion();
  }

  function setDriftSpeed(percent) {
    driftSpeed = Math.max(0, Math.min(100, percent));
    saveTextDriftSpeed(driftSpeed);
  }

  function setDriftDirection(next) {
    driftDirection = Object.values(TEXT_DRIFT_DIRECTIONS).includes(next) ? next : 'right';
    saveTextDriftDirection(driftDirection);
  }

  function setTracking(percent) {
    tracking = Math.max(0, Math.min(100, percent));
    saveTextTracking(tracking);
    applyStyles();
  }

  function setStroke(percent) {
    stroke = Math.max(0, Math.min(100, percent));
    saveTextStroke(stroke);
    applyStyles();
  }

  function setAlign(next) {
    align = next === 'left' || next === 'right' ? next : 'center';
    saveTextAlign(align);
    applyStyles();
  }

  function setEffectAmount(percent) {
    effectAmount = Math.max(0, Math.min(100, percent));
    saveTextEffectAmount(effectAmount);
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
    setFont,
    setEffect,
    setEffectSpeed,
    setDrift,
    setDriftSpeed,
    setDriftDirection,
    setTracking,
    setStroke,
    setAlign,
    setEffectAmount,
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
    getFont: () => font,
  };
}
