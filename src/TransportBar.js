const FLASH_MS = 1000;

function refitTransportBar(titleEl) {
  const fitWrap = titleEl?.querySelector('.transport-fit');
  const cluster = fitWrap?.querySelector('.transport-cluster');
  if (!fitWrap || !cluster) return;

  cluster.style.transform = '';
  cluster.style.width = '';
  fitWrap.style.height = '';

  const available = fitWrap.clientWidth;
  const needed = cluster.scrollWidth;
  const scale = needed > 0 && available > 0 ? Math.min(1, available / needed) : 1;

  if (scale < 0.999) {
    const height = cluster.offsetHeight;
    cluster.style.width = `${needed}px`;
    cluster.style.transform = `scale(${scale})`;
    cluster.style.transformOrigin = 'left top';
    fitWrap.style.height = `${height * scale}px`;
  }
}

function attachTransportFit(guiElement, titleEl) {
  const fit = () => refitTransportBar(titleEl);

  const observer = new ResizeObserver(() => fit());
  observer.observe(guiElement);
  observer.observe(titleEl);

  guiElement.addEventListener('menubigmodechange', fit);
  window.addEventListener('resize', fit);
  requestAnimationFrame(fit);

  return fit;
}

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

function createBtn(label, title, className = 'transport-btn') {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.setAttribute('aria-label', title);
  btn.setAttribute('title', title);
  btn.textContent = label;
  btn.addEventListener('click', (e) => e.stopPropagation());
  btn.addEventListener('pointerdown', (e) => e.stopPropagation());
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

export function mountTransportBar(guiElement, handlers) {
  const titleEl = guiElement.querySelector('.title');
  if (!titleEl) return null;

  titleEl.classList.add('gui-title-row');
  titleEl.textContent = '';

  const transport = document.createElement('div');
  transport.className = 'transport-cluster';

  const actions = document.createElement('div');
  actions.className = 'title-actions';

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
  driftAll.setAttribute('aria-pressed', 'false');
  bindBtn(driftAll, handlers.onDriftAllToggle);

  const smoothTransitions = createBtn(
    '∿',
    'Smooth preset transitions — toggle cross-fade',
    'transport-btn smooth-btn',
  );
  smoothTransitions.setAttribute('aria-pressed', 'false');
  bindBtn(smoothTransitions, handlers.onSmoothTransitionsToggle);

  const autocycle = createBtn(
    '⟳',
    'Auto-cycle presets — toggle autoplay',
    'transport-btn autocycle-btn',
  );
  autocycle.setAttribute('aria-pressed', 'false');
  bindBtn(autocycle, handlers.onAutoCycleToggle);

  const save = createBtn('💾', 'Save preset', 'transport-btn save-btn');
  const info = createBtn('i', 'Tutorial', 'transport-btn info-btn');

  bindBtn(save, handlers.onSave);
  bindBtn(info, handlers.onInfo);

  actions.append(save, info);
  transport.append(shaderNav.group, presetNav.group, driftAll, smoothTransitions, autocycle, actions);
  transport.addEventListener('click', (e) => e.stopPropagation());
  transport.addEventListener('pointerdown', (e) => e.stopPropagation());
  actions.addEventListener('click', (e) => e.stopPropagation());
  actions.addEventListener('pointerdown', (e) => e.stopPropagation());

  const fitWrap = document.createElement('div');
  fitWrap.className = 'transport-fit';
  fitWrap.append(transport);
  titleEl.append(fitWrap);

  const refit = attachTransportFit(guiElement, titleEl);

  function setAutocycleActive(active) {
    autocycle.classList.toggle('is-active', active);
    autocycle.setAttribute('aria-pressed', String(active));
  }

  function setSmoothTransitionsActive(active) {
    smoothTransitions.classList.toggle('is-active', active);
    smoothTransitions.setAttribute('aria-pressed', String(active));
  }

  function setDriftAllActive(active) {
    driftAll.classList.toggle('is-active', active);
    driftAll.setAttribute('aria-pressed', String(active));
  }

  setAutocycleActive(Boolean(handlers.getAutoCycle?.()));
  setSmoothTransitionsActive(handlers.getSmoothTransitions?.() !== false);
  setDriftAllActive(Boolean(handlers.getDriftAll?.()));

  function setShaderLabel(name) {
    const text = name || 'Shader';
    shaderNav.groupLabel.textContent = text;
    shaderNav.groupLabel.setAttribute('title', text);
    refit();
  }

  function setPresetLabel(current, total) {
    const text = total > 0 ? `${current}/${total}` : '—';
    const title = total > 0 ? `Preset ${current} of ${total}` : 'No presets for this shader';
    presetNav.groupLabel.textContent = text;
    presetNav.groupLabel.setAttribute('title', title);
    refit();
  }

  const controls = {
    shaderPrev: shaderNav.prev,
    shaderNext: shaderNav.next,
    presetPrev: presetNav.prev,
    presetNext: presetNav.next,
    driftAll,
    smoothTransitions,
    autocycle,
    save,
    info,
  };

  function flashControl(id) {
    flashButton(controls[id]);
  }

  return {
    ...controls,
    flashControl,
    refit,
    setAutocycleActive,
    setSmoothTransitionsActive,
    setDriftAllActive,
    setShaderLabel,
    setPresetLabel,
  };
}
