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

export function mountMobileBar(handlers) {
  const bar = document.createElement('nav');
  bar.className = 'phone-bar';
  bar.hidden = true;
  bar.setAttribute('aria-label', 'Phone controls');

  const settingsBtn = createBtn('Sliders', 'Show sliders', 'phone-btn phone-btn--settings phone-btn--primary');
  settingsBtn.setAttribute('aria-pressed', 'false');
  settingsBtn.setAttribute('aria-expanded', 'false');
  bindBtn(settingsBtn, handlers.onSettings);

  const primaryRow = document.createElement('div');
  primaryRow.className = 'phone-bar-row phone-bar-row--primary';
  primaryRow.append(settingsBtn);

  const shaderPrev = createBtn('‹', 'Previous shader', 'phone-btn phone-btn--nav');
  const shaderNext = createBtn('›', 'Next shader', 'phone-btn phone-btn--nav');
  const shaderLabel = document.createElement('div');
  shaderLabel.className = 'phone-shader';
  shaderLabel.textContent = handlers.getShaderLabel?.() ?? 'Shader';
  bindBtn(shaderPrev, handlers.onShaderPrev);
  bindBtn(shaderNext, handlers.onShaderNext);

  const shaderRow = document.createElement('div');
  shaderRow.className = 'phone-bar-row';
  shaderRow.append(shaderPrev, shaderLabel, shaderNext);

  const presetPrev = createBtn('‹', 'Previous preset', 'phone-btn phone-btn--nav phone-btn--small');
  const presetNext = createBtn('›', 'Next preset', 'phone-btn phone-btn--nav phone-btn--small');
  const presetLabel = document.createElement('div');
  presetLabel.className = 'phone-preset';
  presetLabel.textContent = handlers.getPresetLabel?.() ?? '—';
  bindBtn(presetPrev, handlers.onPresetPrev);
  bindBtn(presetNext, handlers.onPresetNext);

  const presetGroup = document.createElement('div');
  presetGroup.className = 'phone-preset-group';
  presetGroup.append(presetPrev, presetLabel, presetNext);

  const driftAll = createBtn('Drift', 'Drift all parameters', 'phone-btn phone-btn--toggle');
  const smooth = createBtn('Fade', 'Smooth preset transitions', 'phone-btn phone-btn--toggle');
  const autocycle = createBtn('Auto', 'Auto-cycle presets', 'phone-btn phone-btn--toggle');
  const save = createBtn('Save', 'Save preset', 'phone-btn phone-btn--ghost');
  const info = createBtn('?', 'Tutorial', 'phone-btn phone-btn--ghost phone-btn--info');

  driftAll.setAttribute('aria-pressed', 'false');
  smooth.setAttribute('aria-pressed', 'false');
  autocycle.setAttribute('aria-pressed', 'false');

  bindBtn(driftAll, handlers.onDriftAllToggle);
  bindBtn(smooth, handlers.onSmoothTransitionsToggle);
  bindBtn(autocycle, handlers.onAutoCycleToggle);
  bindBtn(save, handlers.onSave);
  bindBtn(info, handlers.onInfo);

  const toggles = document.createElement('div');
  toggles.className = 'phone-toggles';
  toggles.append(driftAll, smooth, autocycle, save, info);

  const actionRow = document.createElement('div');
  actionRow.className = 'phone-bar-row phone-bar-row--actions';
  actionRow.append(presetGroup, toggles);

  bar.append(primaryRow, shaderRow, actionRow);
  document.body.append(bar);

  function setPressed(btn, active) {
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  }

  setPressed(driftAll, Boolean(handlers.getDriftAll?.()));
  setPressed(smooth, handlers.getSmoothTransitions?.() !== false);
  setPressed(autocycle, Boolean(handlers.getAutoCycle?.()));

  const controls = {
    shaderPrev,
    shaderNext,
    presetPrev,
    presetNext,
    driftAll,
    smoothTransitions: smooth,
    autocycle,
    save,
    info,
    settings: settingsBtn,
  };

  function setSettingsOpen(open) {
    settingsBtn.textContent = open ? 'Close sliders' : 'Sliders';
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
      shaderLabel.textContent = text;
      shaderLabel.title = text;
    },
    setPresetLabel(current, total) {
      const text = total > 0 ? `${current}/${total}` : '—';
      presetLabel.textContent = text;
      presetLabel.title = total > 0 ? `Preset ${current} of ${total}` : 'No presets for this shader';
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
