const FLASH_MS = 1000;

function flashButton(btn) {
  if (!btn) return;
  clearTimeout(flashButton._timers?.get(btn));
  btn.classList.remove('is-flash');
  void btn.offsetWidth;
  btn.classList.add('is-flash');
  const timer = setTimeout(() => btn.classList.remove('is-flash'), FLASH_MS);
  flashButton._timers ??= new WeakMap();
  flashButton._timers.set(btn, timer);
}

function createBtn(label, title, className) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.textContent = label;
  btn.setAttribute('aria-label', title);
  btn.title = title;
  btn.addEventListener('click', (event) => event.stopPropagation());
  btn.addEventListener('pointerdown', (event) => event.stopPropagation());
  return btn;
}

function bindBtn(btn, handler) {
  btn.addEventListener('click', () => {
    flashButton(btn);
    handler?.();
  });
}

function createNavGroup({
  label,
  prevTitle,
  nextTitle,
  onPrev,
  onNext,
  labelClassName = '',
  size = 'secondary',
  labelPosition = 'before',
  orientation = 'horizontal',
}) {
  const group = document.createElement('div');
  group.className = `transport-group transport-group--${size}`;
  if (orientation === 'vertical') {
    group.classList.add('transport-group--vertical');
  }

  const groupLabel = document.createElement('span');
  groupLabel.className = ['transport-group-label', labelClassName].filter(Boolean).join(' ');
  groupLabel.textContent = label;

  const btnClass =
    size === 'primary' ? 'transport-btn transport-btn--primary' : 'transport-btn transport-btn--secondary';
  const isVertical = orientation === 'vertical';
  const prev = createBtn(isVertical ? '▲' : '◀', prevTitle, btnClass);
  const next = createBtn(isVertical ? '▼' : '▶', nextTitle, btnClass);
  bindBtn(prev, onPrev);
  bindBtn(next, onNext);

  if (isVertical) {
    const stack = document.createElement('div');
    stack.className = 'transport-nav-stack';
    stack.append(prev, next);
    group.append(groupLabel, stack);
  } else if (labelPosition === 'between') {
    group.append(prev, groupLabel, next);
  } else {
    group.append(groupLabel, prev, next);
  }

  return { group, groupLabel, prev, next };
}

export function mountMobileBar(handlers) {
  const bar = document.createElement('nav');
  bar.className = 'phone-bar lil-gui root';
  bar.hidden = true;
  bar.setAttribute('aria-label', 'Phone controls');

  const title = document.createElement('div');
  title.className = 'title gui-title-row phone-bar-title';

  const transport = document.createElement('div');
  transport.className = 'transport-cluster';

  const settingsBtn = createBtn('Sliders', 'Show sliders', 'transport-btn phone-settings-btn');
  settingsBtn.setAttribute('aria-pressed', 'false');
  settingsBtn.setAttribute('aria-expanded', 'false');
  bindBtn(settingsBtn, handlers.onSettings);

  const shaderNav = createNavGroup({
    label: handlers.getShaderLabel?.() ?? 'Shader',
    prevTitle: 'Previous shader',
    nextTitle: 'Next shader',
    onPrev: handlers.onShaderPrev,
    onNext: handlers.onShaderNext,
    labelClassName: 'transport-shader-label',
    size: 'primary',
    labelPosition: 'between',
  });

  const presetNav = createNavGroup({
    label: handlers.getPresetLabel?.() ?? '—',
    prevTitle: 'Previous preset',
    nextTitle: 'Next preset',
    onPrev: handlers.onPresetPrev,
    onNext: handlers.onPresetNext,
    labelClassName: 'transport-preset-label',
    size: 'secondary',
    orientation: 'vertical',
  });

  const driftAll = createBtn(
    '↻',
    'Drift all parameters — toggle slow random blends',
    'transport-btn drift-all-btn',
  );
  const smooth = createBtn(
    '∿',
    'Smooth preset transitions — toggle cross-fade',
    'transport-btn smooth-btn',
  );
  const autocycle = createBtn(
    '⟳',
    'Auto-cycle presets — toggle autoplay',
    'transport-btn autocycle-btn',
  );
  const save = createBtn('💾', 'Save preset', 'transport-btn save-btn');
  const info = createBtn('i', 'Tutorial', 'transport-btn info-btn');

  driftAll.setAttribute('aria-pressed', 'false');
  smooth.setAttribute('aria-pressed', 'false');
  autocycle.setAttribute('aria-pressed', 'false');

  bindBtn(driftAll, handlers.onDriftAllToggle);
  bindBtn(smooth, handlers.onSmoothTransitionsToggle);
  bindBtn(autocycle, handlers.onAutoCycleToggle);
  bindBtn(save, handlers.onSave);
  bindBtn(info, handlers.onInfo);

  const actions = document.createElement('div');
  actions.className = 'title-actions';
  actions.append(save, info);

  transport.append(
    settingsBtn,
    shaderNav.group,
    presetNav.group,
    driftAll,
    smooth,
    autocycle,
    actions,
  );
  transport.addEventListener('click', (event) => event.stopPropagation());
  transport.addEventListener('pointerdown', (event) => event.stopPropagation());

  const fitWrap = document.createElement('div');
  fitWrap.className = 'transport-fit';
  fitWrap.append(transport);
  title.append(fitWrap);
  bar.append(title);
  document.body.append(bar);

  function setPressed(btn, active) {
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  }

  setPressed(driftAll, Boolean(handlers.getDriftAll?.()));
  setPressed(smooth, handlers.getSmoothTransitions?.() !== false);
  setPressed(autocycle, Boolean(handlers.getAutoCycle?.()));

  const controls = {
    shaderPrev: shaderNav.prev,
    shaderNext: shaderNav.next,
    presetPrev: presetNav.prev,
    presetNext: presetNav.next,
    driftAll,
    smoothTransitions: smooth,
    autocycle,
    save,
    info,
    settings: settingsBtn,
  };

  function setSettingsOpen(open) {
    settingsBtn.textContent = open ? 'Close' : 'Sliders';
    settingsBtn.title = open ? 'Hide sliders' : 'Show sliders';
    settingsBtn.setAttribute('aria-label', settingsBtn.title);
    settingsBtn.setAttribute('aria-pressed', String(open));
    settingsBtn.setAttribute('aria-expanded', String(open));
    settingsBtn.classList.toggle('is-active', open);
    document.body.classList.toggle('phone-sheet', open);
  }

  document.addEventListener('lobby-sheet', (event) => {
    setSettingsOpen(Boolean(event.detail?.open));
  });

  return {
    element: bar,
    ...controls,
    setShaderLabel(name) {
      const text = name || 'Shader';
      shaderNav.groupLabel.textContent = text;
      shaderNav.groupLabel.setAttribute('title', text);
    },
    setPresetLabel(current, total) {
      const text = total > 0 ? `${current}/${total}` : '—';
      const titleText = total > 0 ? `Preset ${current} of ${total}` : 'No presets for this shader';
      presetNav.groupLabel.textContent = text;
      presetNav.groupLabel.setAttribute('title', titleText);
    },
    setDriftAllActive(active) {
      setPressed(driftAll, active);
    },
    setSmoothTransitionsActive(active) {
      setPressed(smooth, active);
    },
    setAutocycleActive(active) {
      setPressed(autocycle, active);
    },
    setSettingsOpen,
    flashControl(id) {
      flashButton(controls[id]);
    },
  };
}
