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
import { createGamepadPsyche } from './gamepadPsyche.js';
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
import {
  colliderShapeId,
  computeLogoColliderHalfExtents,
} from './logoCollider.js';
import {
  createLogoPackController,
  loadStoredLogoPack,
  loadStoredLogoPackDrift,
  loadStoredLogoPackDriftSpeed,
  loadStoredLogoPackTextVisible,
  loadStoredLogoPackSymbol,
  loadStoredLogoPackVariant,
  saveLogoPackTextVisible,
} from './logoPacks.js';
import {
  createTextOverlayController,
  loadStoredTextColor,
  loadStoredTextContent,
  loadStoredTextEnabled,
  loadStoredTextAutoFit,
  loadStoredTextOpacity,
  loadStoredTextLineHeight,
  loadStoredTextPosition,
  loadStoredTextSize,
} from './textOverlay.js';
import { LITE_MODE_KEY } from './liteMode.js';

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
  const logoPack = createLogoPackController();
  const textOverlay = createTextOverlayController();
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
    if (logoPack.isActive()) {
      logoPack.setPack('none');
      settings.state.logoPack = 'none';
      settings.refreshLogoPackSymbolDropdown();
      settings.updateLogoPackSymbolCtrl();
    }
    applyLogoDisplay();
  });

  let settings;
  let visualizer;
  let packTextModeActive = false;
  let manualTextSnapshot = null;

  function applyLogoDisplay() {
    if (logoPack.isActive()) {
      logoOverlay.setLogo(logoPack.getCurrentUrl());
      updateFlowLogoColliderUniforms();
      return;
    }
    logoOverlay.setLogo(settings?.state?.logoOverlay ?? initialLogo);
    updateFlowLogoColliderUniforms();
  }

  function updateFlowLogoColliderUniforms() {
    const flowUniforms = visualizer?.materials?.flow?.uniforms;
    if (!flowUniforms) return;
    const hasLogo =
      logoPack.isActive() || (settings?.state?.logoOverlay && settings.state.logoOverlay !== 'none');
    flowUniforms.uLogoColliderVisible.value = hasLogo ? 1 : 0;

    if (!hasLogo) return;

    const imageSize = logoOverlay.getImageSize?.() ?? { w: 100, h: 100 };
    const { halfX, halfY } = computeLogoColliderHalfExtents({
      camera: visualizer.pointCamera,
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      imageW: imageSize.w,
      imageH: imageSize.h,
      logoScalePercent: logoOverlay.getScale?.() ?? 100,
    });
    flowUniforms.uLogoColliderHalfExtents.value.set(halfX, halfY);

    const colliderKind = logoPack.isActive()
      ? logoPack.getColliderKind?.() ?? 'ellipse'
      : 'ellipse';
    flowUniforms.uLogoColliderShape.value = colliderShapeId(colliderKind);
  }

  function syncPackTextOverlay() {
    const shouldShowPackText = Boolean(settings?.state?.logoPackTextVisible) && logoPack.isActive();
    if (shouldShowPackText) {
      if (!packTextModeActive) {
        manualTextSnapshot = {
          enabled: textOverlay.getEnabled(),
          content: textOverlay.getContent(),
        };
        packTextModeActive = true;
      }
      textOverlay.setContent(logoPack.getCurrentText());
      textOverlay.setEnabled(true);
      if (settings && !settings.state.textEnabled) {
        settings.state.textEnabled = true;
        settings.textEnabledCtrl?.updateDisplay();
      }
      return;
    }

    if (!packTextModeActive) return;
    packTextModeActive = false;
    const restore = manualTextSnapshot;
    manualTextSnapshot = null;
    if (!restore) return;

    textOverlay.setContent(restore.content);
    textOverlay.setEnabled(restore.enabled);
    if (settings) {
      settings.state.textEnabled = restore.enabled;
      settings.textEnabledCtrl?.updateDisplay();
    }
  }

  logoPack.onChange = () => {
    if (settings) {
      settings.syncLogoPackSymbolDisplay(logoPack.getSymbolId());
      if (logoPack.isActive() && !logoPack.isDriftEnabled() && settings.state.logoPackDrift) {
        settings.state.logoPackDrift = false;
        settings.logoPackDriftController?.updateDisplay();
        settings.updateLogoPackSymbolCtrl();
      }
    }
    applyLogoDisplay();
    syncPackTextOverlay();
  };

  function cycleLogoPack(delta) {
    if (!logoPack.isActive()) return;
    const symbolId = logoPack.cycleSymbol(delta);
    if (!symbolId || !settings) return;
    settings.state.logoPackDrift = false;
    settings.logoPackDriftController?.updateDisplay();
    settings.syncLogoPackSymbolDisplay(symbolId);
    settings.updateLogoPackSymbolCtrl();
    applyLogoDisplay();
  }

  const custom = await loadCustomShaders();
  if (custom.length) {
    console.info('Loaded custom shaders:', custom.join(', '));
  }

  const presetManager = new PresetManager();
  const driftManager = new DriftManager();
  const musicMode = new MusicMode();
  visualizer = new Visualizer(document.body);
  visualizer.onViewportResize = () => updateFlowLogoColliderUniforms();
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
      if (logoPack.isActive()) {
        logoPack.setPack('none');
        settings.state.logoPack = 'none';
        settings.refreshLogoPackSymbolDropdown();
        settings.updateLogoPackSymbolCtrl();
      }
      applyLogoDisplay();
    },
    onLogoScaleChange: (value) => {
      logoOverlay.setScale(value);
      updateFlowLogoColliderUniforms();
    },
    onLogoOpacityChange: (value) => {
      logoOverlay.setOpacity(value);
    },
    onAddLogoRequest: () => {
      logoFileInput.click();
    },
    initialLogoPack: loadStoredLogoPack(),
    initialLogoPackSymbol: loadStoredLogoPackSymbol(),
    initialLogoPackVariant: loadStoredLogoPackVariant(),
    initialLogoPackDrift: loadStoredLogoPackDrift(),
    initialLogoPackDriftSpeed: loadStoredLogoPackDriftSpeed(),
    initialLogoPackTextVisible: loadStoredLogoPackTextVisible(),
    onLogoPackChange: (value) => {
      logoPack.setPack(value);
      if (value !== 'none' && settings.state.logoOverlay !== 'none') {
        settings.state.logoOverlay = 'none';
        settings.logoController?.updateDisplay();
        saveLogoSelection('none');
      }
      settings.updateLogoPackSymbolCtrl();
      applyLogoDisplay();
    },
    onLogoPackSymbolChange: (value) => {
      logoPack.setSymbol(value);
      applyLogoDisplay();
    },
    onLogoPackVariantChange: (value) => {
      logoPack.setVariant(value);
      applyLogoDisplay();
    },
    onLogoPackDriftChange: (value) => {
      logoPack.setDrift(value);
      settings.updateLogoPackSymbolCtrl();
      applyLogoDisplay();
    },
    onLogoPackDriftSpeedChange: (value) => {
      logoPack.setDriftSpeed(value);
    },
    onLogoPackTextVisibleChange: (value) => {
      saveLogoPackTextVisible(value);
      syncPackTextOverlay();
    },
    onLogoPackCycle: (delta) => {
      cycleLogoPack(delta);
    },
    initialTextEnabled: loadStoredTextEnabled(),
    initialTextSize: loadStoredTextSize(),
    initialTextOpacity: loadStoredTextOpacity(),
    initialTextColor: loadStoredTextColor(),
    initialTextPosition: loadStoredTextPosition(),
    initialTextAutoFit: loadStoredTextAutoFit(),
    initialTextLineHeight: loadStoredTextLineHeight(),
    onTextEnabledChange: (value) => {
      textOverlay.setEnabled(value);
    },
    onTextSizeChange: (value) => {
      textOverlay.setSize(value);
    },
    onTextOpacityChange: (value) => {
      textOverlay.setOpacity(value);
    },
    onTextColorChange: (value) => {
      textOverlay.setColor(value);
    },
    onTextPositionChange: (value) => {
      textOverlay.setPosition(value);
    },
    onTextAutoFitChange: (value) => {
      textOverlay.setAutoFit(value);
    },
    onTextLineHeightChange: (value) => {
      textOverlay.setLineHeight(value);
    },
    onOpenNotepad: () => {
      textOverlay.openNotepad();
    },
    onChange: ({ shader, values }) => {
      presetManager.setActiveShader(shader);
      const uniforms = {};
      for (const [key, value] of Object.entries(values)) {
        if (key.startsWith('u')) uniforms[key] = value;
      }
      Object.assign(presetManager.currentPreset.values, uniforms);
      if (shader === 'flow') updateFlowLogoColliderUniforms();
    },
  });

  logoPack.setPack(loadStoredLogoPack());
  logoPack.setSymbol(loadStoredLogoPackSymbol());
  logoPack.setVariant(loadStoredLogoPackVariant());
  logoPack.setDrift(loadStoredLogoPackDrift());
  logoPack.setDriftSpeed(loadStoredLogoPackDriftSpeed());
  logoOverlay.onImageLoad = () => updateFlowLogoColliderUniforms();
  applyLogoDisplay();
  updateFlowLogoColliderUniforms();

  textOverlay.setContent(loadStoredTextContent());
  syncPackTextOverlay();

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
    getDriftAll: () => settings.isDriftAllEnabled(),
    onDriftAllToggle: () => {
      const enabled = settings.toggleDriftAll();
      transport?.setDriftAllActive?.(enabled);
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

  settings.onDriftStateChange = () => {
    transport?.setDriftAllActive?.(settings.isDriftAllEnabled());
  };

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

  const psyche = createGamepadPsyche({
    settings,
    onToast: showGamepadToast,
  });

  const gamepad = createGamepadController(
    {
      shaderPrev: () => {
        flashTransport('shaderPrev');
        onShaderPrev();
      },
      shaderNext: () => {
        flashTransport('shaderNext');
        onShaderNext();
      },
      psycheUp: () => psyche.adjustVertical(1),
      psycheDown: () => psyche.adjustVertical(-1),
      psycheLess: () => psyche.adjustHorizontal(-1),
      psycheMore: () => psyche.adjustHorizontal(1),
      presetNext: () => {
        flashTransport('presetNext');
        onPresetNext();
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
      chaosPartyBurst: () => chaos.party(),
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
  const notepadPanel = document.getElementById('notepad-panel');

  function applyPresetState(
    { shader, values, display },
    presetName,
    { updateGui = true, changeShader = false, syncSmooth = false } = {},
  ) {
    const trailSettings = {
      motionTrails: settings.state.motionTrails,
      trailsNeverDecay: settings.state.trailsNeverDecay,
    };
    if (changeShader && shader) {
      visualizer.setShader(shader, { ...values, ...trailSettings });
      presetManager.setActiveShader(shader);
    }
    visualizer.applyValues({ ...values, ...trailSettings }, { syncSmooth });
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

  if (settings.state.liteMode) {
    settings.setLiteMode(true, { silent: true, skipSave: true, init: true });
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== LITE_MODE_KEY || event.newValue == null) return;
    settings.setLiteMode(event.newValue === 'true', { silent: true, skipSave: true });
  });

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

    logoPack.update(dt);

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
      visualizer.applyValues(values, { deferRebuild: true });
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

  const DOUBLE_SPACE_MS = 400;
  let lastSpacePressAt = 0;

  window.addEventListener('keydown', (e) => {
    const notepadOpen = notepadPanel?.classList.contains('is-open');

    if (e.code === 'Escape' && tutorial.isOpen()) {
      tutorial.close();
      return;
    }
    if (e.code === 'Escape' && notepadOpen) {
      textOverlay.closeNotepad();
      return;
    }
    if (notepadOpen) {
      return;
    }
    if (e.code === 'Slash' && e.shiftKey) {
      e.preventDefault();
      tutorial.toggle();
      return;
    }
    if (e.code === 'Space') {
      e.preventDefault();
      const now = performance.now();
      if (now - lastSpacePressAt < DOUBLE_SPACE_MS) {
        lastSpacePressAt = 0;
        const label = settings.cycleMenuPosition();
        if (label) showGamepadToast(`Menu: ${label}`);
        return;
      }
      lastSpacePressAt = now;
      settings.toggleVisible();
    }
    if (e.code === 'KeyF') toggleFullscreen();
    if (e.code === 'KeyH') toggleUI();
    if (e.code === 'ArrowRight') psyche.adjustHorizontal(1);
    if (e.code === 'ArrowLeft') psyche.adjustHorizontal(-1);
    if (e.code === 'ArrowUp') psyche.adjustVertical(1);
    if (e.code === 'ArrowDown') psyche.adjustVertical(-1);
    if (e.code === 'KeyZ') chaos.motion();
    if (e.code === 'KeyC') chaos.color();
    if (e.code === 'KeyX') chaos.structure();
    if (e.code === 'KeyB') chaos.party();
    if (e.code === 'KeyV' || e.code === 'KeyY') chaos.preset();
    if (e.code === 'KeyR') chaos.preset();
    if (!(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLInputElement)) {
      if (e.code === 'BracketRight') cycleLogoPack(1);
      if (e.code === 'BracketLeft') cycleLogoPack(-1);
    }
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
    '\nSpace: settings | Space×2: move menu | ?: tutorial | F: fullscreen | H: hide UI | [ ]: prev/next pack logo | ↑/↓: zoom | ←/→: element counts | Z/C/X/B/V: motion/colors/shapes/party/preset | USB gamepad: see tutorial',
  );
}

start().catch(console.error);
