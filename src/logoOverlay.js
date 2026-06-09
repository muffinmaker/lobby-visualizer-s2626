const CUSTOM_LOGO_KEY = 'lobby-viz-custom-logo';
const LOGO_SCALE_KEY = 'lobby-viz-logo-scale';
const LOGO_OPACITY_KEY = 'lobby-viz-logo-opacity';
const LOGO_SELECTION_KEY = 'lobby-viz-logo-selection';
const CUSTOM_LOGO_VALUE = '__custom__';
const MAX_CUSTOM_LOGO_BYTES = 4 * 1024 * 1024;

export { CUSTOM_LOGO_VALUE };

export function loadStoredCustomLogo() {
  try {
    const raw = localStorage.getItem(CUSTOM_LOGO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.dataUrl) return null;
    const label = parsed.filename?.trim() || 'Custom';
    return { label, value: CUSTOM_LOGO_VALUE, dataUrl: parsed.dataUrl };
  } catch {
    return null;
  }
}

export function saveCustomLogoToStorage(filename, dataUrl) {
  const approxBytes = Math.ceil((dataUrl.length * 3) / 4);
  if (approxBytes > MAX_CUSTOM_LOGO_BYTES) {
    return {
      error: 'too_large',
      message: `Image is too large to save (${Math.round(approxBytes / 1024)} KB). Use a file under ~3 MB.`,
    };
  }
  try {
    localStorage.setItem(
      CUSTOM_LOGO_KEY,
      JSON.stringify({ filename: filename || 'Custom', dataUrl }),
    );
    return { ok: true };
  } catch {
    return {
      error: 'storage_failed',
      message: 'Could not save logo — browser storage may be full.',
    };
  }
}

export function loadStoredLogoScale() {
  try {
    const raw = localStorage.getItem(LOGO_SCALE_KEY);
    if (raw == null) return 100;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(10, Math.min(200, n)) : 100;
  } catch {
    return 100;
  }
}

export function saveLogoScale(scale) {
  try {
    localStorage.setItem(LOGO_SCALE_KEY, String(scale));
  } catch {
    /* ignore */
  }
}

export function loadStoredLogoOpacity() {
  try {
    const raw = localStorage.getItem(LOGO_OPACITY_KEY);
    if (raw == null) return 100;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 100;
  } catch {
    return 100;
  }
}

export function saveLogoOpacity(opacity) {
  try {
    localStorage.setItem(LOGO_OPACITY_KEY, String(opacity));
  } catch {
    /* ignore */
  }
}

export function loadStoredLogoSelection() {
  try {
    return localStorage.getItem(LOGO_SELECTION_KEY) || 'none';
  } catch {
    return 'none';
  }
}

export function saveLogoSelection(value) {
  try {
    localStorage.setItem(LOGO_SELECTION_KEY, value);
  } catch {
    /* ignore */
  }
}

export function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file selected'));
      return;
    }
    const type = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();
    const isPng = type === 'image/png' || name.endsWith('.png');
    const isJpeg =
      type === 'image/jpeg' || type === 'image/jpg' || name.endsWith('.jpg') || name.endsWith('.jpeg');
    if (!isPng && !isJpeg) {
      reject(new Error('Please choose a PNG or JPG image.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve({ filename: file.name || 'Custom', dataUrl: reader.result });
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });
}

export function createLogoOverlayController() {
  const heroLogo = document.querySelector('.hero-logo-mark');
  let customDataUrl = loadStoredCustomLogo()?.dataUrl ?? null;
  let scale = loadStoredLogoScale();
  let opacity = loadStoredLogoOpacity();

  function applyScale() {
    if (!heroLogo) return;
    heroLogo.style.setProperty('--logo-scale', String(scale / 100));
  }

  function applyOpacity() {
    if (!heroLogo) return;
    heroLogo.style.setProperty('--logo-opacity', String(opacity / 100));
  }

  function resolveLogoUrl(value) {
    if (!value || value === 'none') return null;
    if (value === CUSTOM_LOGO_VALUE) return customDataUrl;
    return value;
  }

  function setLogo(value) {
    if (!heroLogo) return;
    const url = resolveLogoUrl(value);
    if (!url) {
      heroLogo.classList.add('is-hidden');
      heroLogo.removeAttribute('src');
      return;
    }
    heroLogo.classList.remove('is-hidden');
    if (heroLogo.getAttribute('src') !== url) {
      heroLogo.src = url;
    }
  }

  function setScale(percent) {
    scale = Math.max(10, Math.min(200, percent));
    applyScale();
    saveLogoScale(scale);
  }

  function setOpacity(percent) {
    opacity = Math.max(0, Math.min(100, percent));
    applyOpacity();
    saveLogoOpacity(opacity);
  }

  function setCustomLogo({ filename, dataUrl }) {
    customDataUrl = dataUrl;
    return { label: filename || 'Custom', value: CUSTOM_LOGO_VALUE, dataUrl };
  }

  function getCustomDataUrl() {
    return customDataUrl;
  }

  applyScale();
  applyOpacity();

  return {
    setLogo,
    setScale,
    setOpacity,
    setCustomLogo,
    getCustomDataUrl,
    getScale: () => scale,
    getOpacity: () => opacity,
    resolveLogoUrl,
  };
}
