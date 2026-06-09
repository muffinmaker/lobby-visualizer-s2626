import { loadCustomShaders } from './shaders/loader.js';
import { Visualizer } from './Visualizer.js';
import { PresetManager, SHADER_IDS } from './PresetManager.js';
import { SettingsPanel } from './SettingsPanel.js';
import { DriftManager } from './DriftManager.js';
import { MusicMode } from './MusicMode.js';
import { createTutorial } from './Tutorial.js';
import { mountTransportBar } from './TransportBar.js';
import { createGamepadController, showGamepadToast } from './GamepadController.js';
import { createGamepadChaos } from './gamepadChaos.js';
import { getShaderLabel } from './shaders/index.js';
import {
  CUSTOM_LOGO_VALUE,
  createLogoOverlayController,
  loadStoredCustomLogo,
  loadStoredLogoScale,
  loadStoredLogoOpacity,
  loadStoredLogoSelection,
  readImageFile,
  saveCustomLogoToStorage,
  saveLogoSelection,
} from './logoOverlay.js';

const hint = document.getElementById('hint');

const LOGO_LABELS = {
  'Space21_logo_WEB_small': 'Space21',
  'Space21_logo_WEB_small_nega': 'Space21 Light',
  'TiLA Logo Wide': 'TiLA',
};

function loadOverlayLogos() {
  const resources = import.meta.glob('../reference/*.png', {
    eager: true,
    import: 'default',
  });
  return Object.entries(resources)
    .map(([path, url]) => {
      const file = path.split('/').pop() ?? path;
      const stem = file.replace(/\.png$/i, '');
      const label = LOGO_LABELS[stem] ?? stem.replace(/_/g, ' ').replace(/ logo.*$/i, '');
      return { label, value: url };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

function mountLogoOverlayAboveCanvas(visualizer) {
  const overlay = document.getElementById('overlay');
  const canvas = visualizer?.renderer?.domElement;
  if (!overlay || !canvas) return;

  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.zIndex = '0';
  canvas.style.pointerEvents = 'none';

  overlay.style.zIndex = '15';
  document.body.appendChild(overlay);
}

function createLogoFileInput(onFile) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png,image/jpeg,.jpg,.png';
  input.hidden = true;
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      await onFile(file);
    } catch (err) {
      window.alert(err?.message ?? 'Could not load image.');
    }
  });
  document.body.appendChild(input);
  return input;
}

async function start() {
  const logoOverlay = createLogoOverlayController();
  const logoOptions = [{ label: 'None', value: 'none' }, ...loadOverlayLogos()];
  const storedCustom = loadStoredCustomLogo();
  if (storedCustom) {
    logoOverlay.setCustomLogo(storedCustom);
    const existing = logoOptions.find((o) => o.value === CUSTOM_LOGO_VALUE);
    if (existing) {
      existing.label = storedCustom.label;
    } else {
      logoOptions.push({ label: storedCustom.label, value: CUSTOM_LOGO_VALUE });
    }
  }

  const initialLogoScale = loadStoredLogoScale();
  const initialLogoOpacity = loadStoredLogoOpacity();
  logoOverlay.setScale(initialLogoScale);
  logoOverlay.setOpacity(initialLogoOpacity);

  let initialLogo = loadStoredLogoSelection();
  if (initialLogo !== 'none' && !logoOptions.some((o) => o.value === initialLogo)) {
    initialLogo = 'none';
  }
  if (initialLogo === CUSTOM_LOGO_VALUE && !storedCustom) {
    initialLogo = 'none';
  }

  const logoFileInput = createLogoFileInput(async (file) => {
    const { filename, dataUrl } = await readImageFile(file);
    const saved = saveCustomLogoToStorage(filename, dataUrl);
    if (saved.error) {
      window.alert(saved.message);
      return;
    }

    const customOption = logoOverlay.setCustomLogo({ filename, dataUrl });
    const existing = logoOptions.find((o) => o.value === CUSTOM_LOGO_VALUE);
    if (existing) {
      existing.label = customOption.label;
    } else {
      logoOptions.push(customOption);
    }

    settings.refreshLogoDropdown();
    settings.setLogoSelection(CUSTOM_LOGO_VALUE);
    saveLogoSelection(CUSTOM_LOGO_VALUE);
  });

  let settings;

  const custom = await loadCustomShaders();
  if (custom.length) {
    console.info('Loaded custom shaders:', custom.join(', '));
  }

  const presetManager = new PresetManager();
  const driftManager = new DriftManager();
  const musicMode = new MusicMode();
  const visualizer = new Visualizer(document.body);
  mountLogoOverlayAboveCanvas(visualizer);
  visualizer.renderer.debug.checkShaderErrors = import.meta.env.DEV;

  for (const id of custom) {
    visualizer.registerShader(id);
  }

  settings = new SettingsPanel({
    presetManager,
    driftManager,
    musicMode,
    visualizer,
    logoOptions,
    initialLogo,
    initialLogoScale,
    initialLogoOpacity,
    onLogoChange: (value) => {
      saveLogoSelection(value);
      logoOverlay.setLogo(value);
    },
    onLogoScaleChange: (value) => {
      logoOverlay.setScale(value);
    },
    onLogoOpacityChange: (value) => {
      logoOverlay.setOpacity(value);
    },
    onAddLogoRequest: () => {
      logoFileInput.click();
    },
    onChange: ({ shader, values }) => {
      presetManager.setActiveShader(shader);
      const uniforms = {};
      for (const [key, value] of Object.entries(values)) {
        if (key.startsWith('u')) uniforms[key] = value;
      }
      Object.assign(presetManager.currentPreset.values, uniforms);
    },
  });

  logoOverlay.setLogo(initialLogo);

  presetManager.setLiveValuesGetter(() => settings.getValues());

  const tutorial = createTutorial();

  function onPresetPrev() {
    presetManager.setActiveShader(settings.state.shader);
    presetManager.syncCurrentIndexForShader(settings.state.preset);
    presetManager.prev({ randomize: false });
    refreshPresetTransportLabel();
  }

  function onPresetNext() {
    presetManager.setActiveShader(settings.state.shader);
    presetManager.syncCurrentIndexForShader(settings.state.preset);
    presetManager.next({ randomize: false });
    refreshPresetTransportLabel();
  }

  function onShaderPrev() {
    settings.cycleShader(-1);
    refreshShaderTransportLabel();
  }

  function onShaderNext() {
    settings.cycleShader(1);
    refreshShaderTransportLabel();
  }

  function onSavePreset() {
    const allValues = settings.getValues();
    const values = {};
    for (const [key, value] of Object.entries(allValues)) {
      if (key.startsWith('u')) values[key] = value;
    }

    const defaultName = presetManager.suggestSaveName();
    const input = window.prompt('Save preset as:', defaultName);
    if (input === null) return;

    let name = input.trim();
    if (!name) return;

    if (presetManager.isBuiltin(name)) {
      window.alert(`"${name}" is a built-in preset. Choose a different name.`);
      return;
    }

    let result = presetManager.saveCurrent({
      name,
      shader: settings.state.shader,
      values,
      overwrite: false,
    });

    if (result?.error === 'builtin') return;

    if (result?.conflict) {
      const overwrite = window.confirm(
        `"${name}" already exists. Overwrite with current settings?`,
      );
      if (!overwrite) return;
      result = presetManager.saveCurrent({
        name,
        shader: settings.state.shader,
        values,
        overwrite: true,
      });
    }

    if (!result || result.conflict || result.error) return;

    settings.applyExternalState({
      values: result.values,
      presetName: result.name,
    });
  }

  function refreshPresetTransportLabel() {
    presetManager.setActiveShader(settings.state.shader);
    presetManager.syncCurrentIndexForShader(settings.state.preset);
    const { current, total } = presetManager.getPresetPosition(settings.state.shader);
    transport?.setPresetLabel?.(current, total);
  }

  const transport = mountTransportBar(settings.gui.domElement, {
    getShaderLabel: () => getShaderLabel(settings.state.shader),
    getPresetLabel: () => {
      const { current, total } = presetManager.getPresetPosition(settings.state.shader);
      return total > 0 ? `${current}/${total}` : '—';
    },
    getAutoCycle: () => presetManager.autoCycle,
    onAutoCycleToggle: () => presetManager.setAutoCycle(!presetManager.autoCycle),
    getSmoothTransitions: () => presetManager.smoothTransitions,
    onSmoothTransitionsToggle: () =>
      presetManager.setSmoothTransitions(!presetManager.smoothTransitions),
    onShaderPrev,
    onShaderNext,
    onPresetPrev,
    onPresetNext,
    onSave: onSavePreset,
    onInfo: () => tutorial.toggle(),
  });

  function flashTransport(id) {
    transport?.flashControl?.(id);
  }

  function refreshGamepadLabels() {
    refreshShaderTransportLabel();
    refreshPresetTransportLabel();
  }

  const chaos = createGamepadChaos({
    presetManager,
    settings,
    onRefreshLabels: refreshGamepadLabels,
    onToast: showGamepadToast,
  });

  const gamepad = createGamepadController(
    {
      presetPrev: () => {
        flashTransport('presetPrev');
        onPresetPrev();
      },
      presetNext: () => {
        flashTransport('presetNext');
        onPresetNext();
      },
      shaderPrev: () => {
        flashTransport('shaderPrev');
        onShaderPrev();
      },
      shaderNext: () => {
        flashTransport('shaderNext');
        onShaderNext();
      },
      toggleSettings: () => settings.toggleVisible(),
      toggleFullscreen,
      menuNavigateUp: () => settings.gamepadNavigate(-1),
      menuNavigateDown: () => settings.gamepadNavigate(1),
      menuAdjustLeft: (repeating) => settings.gamepadAdjust(-1, repeating),
      menuAdjustRight: (repeating) => settings.gamepadAdjust(1, repeating),
      menuRandom: () => settings.gamepadRandomizeFocused(),
      chaosNewPreset: () => chaos.motion(),
      chaosFullShuffle: () => chaos.preset(),
      chaosJumpPreset: () => chaos.structure(),
      chaosRandomizeSliders: () => chaos.color(),
    },
    { isMenuMode: () => settings.isGamepadMenuActive() },
  );

  function refreshShaderTransportLabel(shaderId = settings.state.shader) {
    transport?.setShaderLabel?.(getShaderLabel(shaderId));
  }

  presetManager.subscribe((event, detail) => {
    if (event === 'autoCycleChanged') {
      transport?.setAutocycleActive?.(detail.enabled);
    }
    if (event === 'smoothTransitionsChanged') {
      transport?.setSmoothTransitionsActive?.(detail.enabled);
    }
    if (event === 'activeShaderChanged') {
      refreshShaderTransportLabel(detail.shader);
      refreshPresetTransportLabel();
    }
    if (
      event === 'preset' ||
      event === 'transitionStart' ||
      event === 'transitionEnd' ||
      event === 'presetsChanged' ||
      event === 'presetSaved'
    ) {
      refreshPresetTransportLabel();
    }
  });

  refreshShaderTransportLabel();
  refreshPresetTransportLabel();

  let uiHidden = false;
  let hintHidden = false;

  function applyPresetState(
    { shader, values, display },
    presetName,
    { updateGui = true, changeShader = false, syncSmooth = false } = {},
  ) {
    if (changeShader && shader) {
      visualizer.setShader(shader);
      presetManager.setActiveShader(shader);
    }
    visualizer.applyValues(values, { syncSmooth });
    if (updateGui) {
      settings.applyExternalState({
        ...(changeShader && shader ? { shader } : {}),
        values,
        presetName,
        display,
      });
    } else if (display) {
      settings.applyDisplaySettings(display);
    }
  }

  applyPresetState(
    {
      shader: presetManager.currentPreset.shader,
      values: { ...presetManager.currentPreset.values },
    },
    presetManager.currentPreset.name,
    { changeShader: true },
  );
  presetManager.setActiveShader(settings.state.shader);

  presetManager.subscribe((event, detail) => {
    if (event === 'transitionEnd') {
      applyPresetState(
        { values: detail.values, display: detail.preset?.display },
        detail.preset.name,
        { syncSmooth: true },
      );
    }
    if (event === 'preset') {
      const shader = detail.shader ?? detail.preset.shader;
      applyPresetState(
        { shader, values: detail.values, display: detail.display },
        detail.preset.name,
        {
          syncSmooth: true,
          changeShader: Boolean(shader && shader !== settings.state.shader),
        },
      );
      if (musicMode.enabled) {
        musicMode.captureBaseline(settings.getValues());
        musicMode.currentShader = settings.state.shader;
      }
    }
    if (event === 'transitionEnd' && musicMode.enabled) {
      musicMode.captureBaseline(settings.getValues());
      musicMode.currentShader = settings.state.shader;
    }
  });

  let running = true;

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) {
      visualizer.clock.getDelta();
      requestAnimationFrame(tick);
    }
  });

  function tick() {
    if (!running) return;
    const dt = visualizer.render();

    const driftValues =
      !musicMode.enabled && !presetManager.isTransitioning
        ? driftManager.update(dt, settings.getValues())
        : null;
    if (driftValues) {
      settings.applyDrift(driftValues);
    }

    const transition = presetManager.update(dt, () => settings.getValues());

    let values = presetManager.isTransitioning
      ? transition.values
      : settings.getValues();

    const shader = settings.state.shader;
    const shaderChanged = shader !== visualizer.currentShaderId;

    if (musicMode.enabled && !presetManager.isTransitioning) {
      musicMode.currentShader = shader;
      const modulated = musicMode.update(dt);
      if (modulated) {
        values = modulated;
        if (shaderChanged) {
          visualizer.setShader(shader, modulated);
        }
        visualizer.applyValues(modulated);
      }
      settings.refreshMusicMeters();
    } else if (shaderChanged) {
      visualizer.setShader(shader, values);
      visualizer.applyValues(values);
    } else if (presetManager.isTransitioning) {
      visualizer.applyValues(values, { syncSmooth: true, deferRebuild: true });
    }

    if (presetManager.isTransitioning) {
      settings.syncGuiValues(transition.values);
      settings.state.preset = presetManager.currentPreset.name;
      settings.presetController?.updateDisplay();
      refreshPresetTransportLabel();
    }

    gamepad.update();

    requestAnimationFrame(tick);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  function toggleUI() {
    uiHidden = !uiHidden;
    settings.setVisible(!uiHidden);
    if (!hintHidden) {
      hint.classList.toggle('hidden', uiHidden);
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && tutorial.isOpen()) {
      tutorial.close();
      return;
    }
    if (e.code === 'Slash' && e.shiftKey) {
      e.preventDefault();
      tutorial.toggle();
      return;
    }
    if (e.code === 'Space') {
      e.preventDefault();
      settings.toggleVisible();
    }
    if (e.code === 'KeyF') toggleFullscreen();
    if (e.code === 'KeyH') toggleUI();
    if (e.code === 'ArrowRight') {
      flashTransport('shaderNext');
      onShaderNext();
    }
    if (e.code === 'ArrowLeft') {
      flashTransport('shaderPrev');
      onShaderPrev();
    }
    if (e.code === 'ArrowDown') {
      flashTransport('presetNext');
      onPresetNext();
    }
    if (e.code === 'ArrowUp') {
      flashTransport('presetPrev');
      onPresetPrev();
    }
    if (e.code === 'KeyZ') chaos.motion();
    if (e.code === 'KeyC') chaos.color();
    if (e.code === 'KeyX') chaos.structure();
    if (e.code === 'KeyV' || e.code === 'KeyY') chaos.preset();
    if (e.code === 'KeyR') chaos.preset();
  });

  setTimeout(() => {
    hintHidden = true;
    hint.classList.add('hidden');
  }, 8000);

  requestAnimationFrame(tick);

  console.info(
    '%cLobby Visualizer',
    'font-weight:bold;font-size:14px',
    `\nShaders: ${SHADER_IDS.join(', ')}`,
    '\nSpace: settings | ?: tutorial | F: fullscreen | H: hide UI | ←/→: shaders | ↑/↓: presets | Z/X/C/V: random motion/shapes/colors/preset | USB gamepad: see tutorial',
  );
}

start().catch(console.error);
