const PACK_KEY = 'lobby-viz-logo-pack';
const PACK_SYMBOL_KEY = 'lobby-viz-logo-pack-symbol';
const PACK_VARIANT_KEY = 'lobby-viz-logo-pack-variant';
const PACK_DRIFT_KEY = 'lobby-viz-logo-pack-drift';
const PACK_DRIFT_SPEED_KEY = 'lobby-viz-logo-pack-drift-speed';
const PACK_TEXT_VISIBLE_KEY = 'lobby-viz-logo-pack-text-visible';

function svgDataUrl(svg) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function monoSymbol(draw, { viewBox = '0 0 100 100', color }) {
  return svgDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none">${draw(color)}</svg>`,
  );
}

function symbol(id, label, meaning, draw) {
  return {
    id,
    label,
    meaning,
    white: monoSymbol(draw, { color: '#ffffff' }),
    black: monoSymbol(draw, { color: '#000000' }),
  };
}

const PRIDE_SYMBOLS = [
  symbol('rainbow', 'Rainbow', 'A broad symbol of LGBTQ+ pride and community diversity.', (c) => {
    const arcs = [38, 30, 22, 14, 6].map(
      (r, i) =>
        `<path d="M ${50 - r} 72 A ${r} ${r} 0 0 1 ${50 + r} 72" stroke="${c}" stroke-width="5" fill="none"/>`,
    );
    return arcs.join('');
  }),
  symbol('lambda', 'Lambda', 'Used by gay liberation groups as a sign of unity and resistance.', (c) =>
    `<path d="M32 78 L50 22 L68 78 M38 58 H62" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),
  symbol('triangle', 'Pink Triangle', 'Reclaimed from persecution history as a symbol of queer resilience.', (c) =>
    `<path d="M50 18 L82 78 H18 Z" stroke="${c}" stroke-width="5" fill="none"/>`,
  ),
  symbol('trans', 'Trans Symbol', 'Represents transgender identity, transition, and gender diversity.', (c) =>
    `<circle cx="50" cy="50" r="30" stroke="${c}" stroke-width="5"/>
     <path d="M50 20 V44 M50 20 L42 28 M50 20 L58 28" stroke="${c}" stroke-width="5" stroke-linecap="round"/>
     <path d="M34 58 H66 M34 58 L38 54 M34 58 L38 62" stroke="${c}" stroke-width="5" stroke-linecap="round"/>
     <path d="M66 58 L62 54 M66 58 L62 62" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`,
  ),
  symbol('progress', 'Progress Flag', 'Highlights inclusion across race, trans identities, and the wider queer community.', (c) => `
    <rect x="14" y="24" width="10" height="52" fill="${c}"/>
    <rect x="26" y="24" width="10" height="52" fill="${c}" opacity="0.85"/>
    <rect x="38" y="24" width="10" height="52" fill="${c}" opacity="0.7"/>
    <rect x="50" y="24" width="10" height="52" fill="${c}" opacity="0.55"/>
    <rect x="62" y="24" width="10" height="52" fill="${c}" opacity="0.4"/>
    <path d="M74 24 L90 50 L74 76 Z" fill="${c}"/>`),
  symbol('heart', 'Heart', 'Represents love, care, and solidarity across the community.', (c) =>
    `<path d="M50 78 C28 58 14 46 14 32 C14 22 22 16 30 16 C38 16 44 20 50 28 C56 20 62 16 70 16 C78 16 86 22 86 32 C86 46 72 58 50 78 Z" stroke="${c}" stroke-width="4" fill="none"/>`,
  ),
  symbol('equality', 'Equality', 'A sign for equal rights, dignity, and legal recognition.', (c) =>
    `<path d="M28 40 H72 M28 60 H72" stroke="${c}" stroke-width="8" stroke-linecap="round"/>
     <circle cx="50" cy="50" r="34" stroke="${c}" stroke-width="4" fill="none"/>`,
  ),
  symbol('bi', 'Bi Triangles', 'Inspired by bi pride motifs, representing attraction across more than one gender.', (c) =>
    `<path d="M30 70 L50 24 L70 70 Z" stroke="${c}" stroke-width="5" fill="none"/>
     <path d="M38 70 L50 42 L62 70 Z" stroke="${c}" stroke-width="4" fill="none"/>`,
  ),
  symbol('pan', 'Pan', 'Inspired by pan pride, representing attraction regardless of gender.', (c) =>
    `<path d="M50 20 L78 70 H22 Z" stroke="${c}" stroke-width="5" fill="none"/>
     <circle cx="50" cy="52" r="10" stroke="${c}" stroke-width="4" fill="none"/>`,
  ),
  symbol('labrys', 'Labrys', 'A historic lesbian/feminist symbol associated with strength and self-determination.', (c) =>
    `<path d="M50 22 V78" stroke="${c}" stroke-width="5" stroke-linecap="round"/>
     <path d="M28 30 C18 18 12 28 22 38 L36 48" stroke="${c}" stroke-width="5" stroke-linecap="round" fill="none"/>
     <path d="M72 30 C82 18 88 28 78 38 L64 48" stroke="${c}" stroke-width="5" stroke-linecap="round" fill="none"/>
     <path d="M36 48 L28 58 L44 58 Z M64 48 L72 58 L56 58 Z" stroke="${c}" stroke-width="4" fill="none"/>`,
  ),
];

export const LOGO_PACKS = {
  none: { id: 'none', label: 'None', symbols: [] },
  pride: { id: 'pride', label: 'Pride', symbols: PRIDE_SYMBOLS },
};

export const LOGO_PACK_CHOICES = Object.fromEntries(
  Object.values(LOGO_PACKS).map((p) => [p.label, p.id]),
);

export function getPack(packId) {
  return LOGO_PACKS[packId] ?? LOGO_PACKS.none;
}

export function getPackSymbolChoices(packId) {
  const pack = getPack(packId);
  if (!pack.symbols.length) return { '—': 'rainbow' };
  return Object.fromEntries(pack.symbols.map((s) => [s.label, s.id]));
}

export function getSymbolUrl(packId, symbolId, variant = 'white') {
  const pack = getPack(packId);
  const symbol = pack.symbols.find((s) => s.id === symbolId) ?? pack.symbols[0];
  if (!symbol) return null;
  return variant === 'black' ? symbol.black : symbol.white;
}

export function loadStoredLogoPack() {
  try {
    return localStorage.getItem(PACK_KEY) || 'none';
  } catch {
    return 'none';
  }
}

export function saveLogoPack(value) {
  try {
    localStorage.setItem(PACK_KEY, value);
  } catch {
    /* ignore */
  }
}

export function loadStoredLogoPackSymbol() {
  try {
    return localStorage.getItem(PACK_SYMBOL_KEY) || PRIDE_SYMBOLS[0].id;
  } catch {
    return PRIDE_SYMBOLS[0].id;
  }
}

export function saveLogoPackSymbol(value) {
  try {
    localStorage.setItem(PACK_SYMBOL_KEY, value);
  } catch {
    /* ignore */
  }
}

export function loadStoredLogoPackVariant() {
  try {
    const v = localStorage.getItem(PACK_VARIANT_KEY);
    return v === 'black' ? 'black' : 'white';
  } catch {
    return 'white';
  }
}

export function saveLogoPackVariant(value) {
  try {
    localStorage.setItem(PACK_VARIANT_KEY, value);
  } catch {
    /* ignore */
  }
}

export function loadStoredLogoPackDrift() {
  try {
    return localStorage.getItem(PACK_DRIFT_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveLogoPackDrift(enabled) {
  try {
    localStorage.setItem(PACK_DRIFT_KEY, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function loadStoredLogoPackDriftSpeed() {
  try {
    const raw = localStorage.getItem(PACK_DRIFT_SPEED_KEY);
    if (raw == null) return 50;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(1, Math.min(100, Math.round(n))) : 50;
  } catch {
    return 50;
  }
}

export function saveLogoPackDriftSpeed(speed) {
  try {
    localStorage.setItem(PACK_DRIFT_SPEED_KEY, String(speed));
  } catch {
    /* ignore */
  }
}

export function loadStoredLogoPackTextVisible() {
  try {
    return localStorage.getItem(PACK_TEXT_VISIBLE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveLogoPackTextVisible(enabled) {
  try {
    localStorage.setItem(PACK_TEXT_VISIBLE_KEY, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function driftSpeedToInterval(speed) {
  const t = (Math.max(1, Math.min(100, speed)) - 1) / 99;
  return 120 - t * 117;
}

export function createLogoPackController() {
  let packId = loadStoredLogoPack();
  let symbolId = loadStoredLogoPackSymbol();
  let variant = loadStoredLogoPackVariant();
  let driftEnabled = loadStoredLogoPackDrift();
  let driftSpeed = loadStoredLogoPackDriftSpeed();
  let elapsed = 0;
  let driftIndex = 0;
  let onChange = null;

  function pack() {
    return getPack(packId);
  }

  function symbols() {
    return pack().symbols;
  }

  function normalizeSymbolId() {
    const list = symbols();
    if (!list.length) return symbolId;
    if (!list.some((s) => s.id === symbolId)) {
      symbolId = list[0].id;
      saveLogoPackSymbol(symbolId);
    }
    return symbolId;
  }

  function currentSymbolId() {
    if (driftEnabled && packId !== 'none') {
      const list = symbols();
      if (!list.length) return symbolId;
      return list[driftIndex % list.length].id;
    }
    return normalizeSymbolId();
  }

  function getCurrentUrl() {
    if (packId === 'none') return null;
    return getSymbolUrl(packId, currentSymbolId(), variant);
  }

  function getCurrentSymbol() {
    const list = symbols();
    if (!list.length || packId === 'none') return null;
    const id = currentSymbolId();
    return list.find((s) => s.id === id) ?? list[0] ?? null;
  }

  function getCurrentText() {
    const symbol = getCurrentSymbol();
    if (!symbol) return '';
    if (!symbol.meaning) return symbol.label;
    return `${symbol.label}\n${symbol.meaning}`;
  }

  function isActive() {
    return packId !== 'none' && Boolean(getCurrentUrl());
  }

  function emit() {
    onChange?.(getCurrentUrl());
  }

  function setPack(nextPackId) {
    packId = nextPackId in LOGO_PACKS ? nextPackId : 'none';
    saveLogoPack(packId);
    driftIndex = 0;
    elapsed = 0;
    normalizeSymbolId();
    emit();
  }

  function setSymbol(nextSymbolId) {
    symbolId = nextSymbolId;
    saveLogoPackSymbol(symbolId);
    const list = symbols();
    const idx = list.findIndex((s) => s.id === symbolId);
    if (idx >= 0) driftIndex = idx;
    emit();
  }

  function setVariant(nextVariant) {
    variant = nextVariant === 'black' ? 'black' : 'white';
    saveLogoPackVariant(variant);
    emit();
  }

  function setDrift(enabled) {
    driftEnabled = Boolean(enabled);
    saveLogoPackDrift(driftEnabled);
    elapsed = 0;
    if (driftEnabled) {
      const list = symbols();
      const idx = list.findIndex((s) => s.id === symbolId);
      driftIndex = idx >= 0 ? idx : 0;
    }
    emit();
  }

  function setDriftSpeed(speed) {
    driftSpeed = Math.max(1, Math.min(100, Math.round(speed)));
    saveLogoPackDriftSpeed(driftSpeed);
    elapsed = 0;
  }

  function cycleSymbol(delta) {
    const list = symbols();
    if (!list.length || packId === 'none') return null;

    const currentId = currentSymbolId();
    let idx = list.findIndex((s) => s.id === currentId);
    if (idx < 0) idx = 0;
    idx = (idx + delta + list.length) % list.length;

    symbolId = list[idx].id;
    driftIndex = idx;
    saveLogoPackSymbol(symbolId);
    elapsed = 0;

    if (driftEnabled) {
      driftEnabled = false;
      saveLogoPackDrift(false);
    }

    emit();
    return symbolId;
  }

  function update(dt) {
    if (!driftEnabled || packId === 'none') return;
    const list = symbols();
    if (list.length < 2) return;

    elapsed += dt;
    const interval = Math.max(3, driftSpeedToInterval(driftSpeed));
    if (elapsed < interval) return;

    elapsed = 0;
    driftIndex = (driftIndex + 1) % list.length;
    emit();
  }

  normalizeSymbolId();

  return {
    getPackId: () => packId,
    getSymbolId: () => currentSymbolId(),
    getStoredSymbolId: () => normalizeSymbolId(),
    getVariant: () => variant,
    isDriftEnabled: () => driftEnabled,
    getDriftSpeed: () => driftSpeed,
    isActive,
    getCurrentUrl,
    getCurrentText,
    setPack,
    setSymbol,
    setVariant,
    setDrift,
    setDriftSpeed,
    cycleSymbol,
    update,
    set onChange(fn) {
      onChange = fn;
    },
  };
}
