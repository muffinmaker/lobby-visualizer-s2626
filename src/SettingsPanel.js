import GUI from 'lil-gui';
import { defaultResolutionScale } from './Visualizer.js';
import {
  SHADERS,
  BACKGROUND_UNIFORMS,
  GLOBAL_UNIFORMS,
  SHADER_IDS,
  getShaderChoices,
} from './shaders/index.js';
import { mergeShaderDefaults, normalizeUiValues } from './uniformMap.js';
import { SHAPE_OPTIONS, TRAIL_SHAPE_OPTIONS } from './shapeOptions.js';
import { randomBetween, randomizeUniform } from './randomize.js';
import {
  applyLiteLimits,
  loadLiteMode,
  saveLiteMode,
  snapshotLiteRestoreFields,
} from './liteMode.js';
import { showGamepadToast } from './GamepadController.js';
import {
  applyMenuPosition as setMenuPositionOnElement,
  loadMenuPosition,
  MENU_POSITION_LABELS,
  MENU_POSITIONS,
  nextMenuPosition,
  saveMenuPosition,
} from './menuPosition.js';
import { applyMenuBigMode, loadMenuBigMode, saveMenuBigMode } from './menuBigMode.js';
import {
  LOGO_PACK_CHOICES,
  getPackSymbolChoices,
} from './logoPacks.js';
import { TEXT_POSITIONS } from './textOverlay.js';

const TRAIL_SHADERS = new Set(['spocks', 'spiro', 'flow']);
const FLOW_LOGO_COLLIDER_KEYS = new Set(['uLogoCollider', 'uLogoColliderBounce', 'uLogoColliderRadius']);

function formatDisplayValue(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function configureNumberController(controller) {
  if (!controller?.domElement?.classList?.contains('number') || controller._displayFormatted) {
    return controller;
  }

  const original = controller.updateDisplay.bind(controller);
  controller.updateDisplay = function updateDisplayWithFormat() {
    original();
    if (this.$input && !this._inputFocused) {
      this.$input.value = formatDisplayValue(this.getValue());
    }
    return this;
  };
  controller._displayFormatted = true;
  controller.updateDisplay();
  return controller;
}

export class SettingsPanel {
  constructor({
    presetManager,
    visualizer,
    driftManager,
    musicMode,
    onChange,
    logoOptions = [{ label: 'None', value: 'none' }],
    initialLogo = 'none',
    initialLogoScale = 100,
    initialLogoOpacity = 100,
    onLogoChange,
    onLogoScaleChange,
    onLogoOpacityChange,
    onAddLogoRequest,
    initialLogoPack = 'none',
    initialLogoPackSymbol = 'rainbow',
    initialLogoPackVariant = 'white',
    initialLogoPackDrift = false,
    initialLogoPackDriftSpeed = 50,
    initialLogoPackTextVisible = false,
    onLogoPackChange,
    onLogoPackSymbolChange,
    onLogoPackVariantChange,
    onLogoPackDriftChange,
    onLogoPackDriftSpeedChange,
    onLogoPackTextVisibleChange,
    onLogoPackCycle,
    initialTextEnabled = false,
    initialTextSize = 100,
    initialTextOpacity = 100,
    initialTextColor = 'white',
    initialTextPosition = 'center',
    initialTextAutoFit = true,
    initialTextLineHeight = 135,
    onTextEnabledChange,
    onTextSizeChange,
    onTextOpacityChange,
    onTextColorChange,
    onTextPositionChange,
    onTextAutoFitChange,
    onTextLineHeightChange,
    onOpenNotepad,
  }) {
    this.presetManager = presetManager;
    this.visualizer = visualizer;
    this.driftManager = driftManager;
    this.musicMode = musicMode;
    this.onChange = onChange;
    this.logoOptions = logoOptions;
    this.onLogoChange = onLogoChange;
    this.onLogoScaleChange = onLogoScaleChange;
    this.onLogoOpacityChange = onLogoOpacityChange;
    this.onAddLogoRequest = onAddLogoRequest;
    this.onLogoPackChange = onLogoPackChange;
    this.onLogoPackSymbolChange = onLogoPackSymbolChange;
    this.onLogoPackVariantChange = onLogoPackVariantChange;
    this.onLogoPackDriftChange = onLogoPackDriftChange;
    this.onLogoPackDriftSpeedChange = onLogoPackDriftSpeedChange;
    this.onLogoPackTextVisibleChange = onLogoPackTextVisibleChange;
    this.onLogoPackCycle = onLogoPackCycle;
    this.onTextEnabledChange = onTextEnabledChange;
    this.onTextSizeChange = onTextSizeChange;
    this.onTextOpacityChange = onTextOpacityChange;
    this.onTextColorChange = onTextColorChange;
    this.onTextPositionChange = onTextPositionChange;
    this.onTextAutoFitChange = onTextAutoFitChange;
    this.onTextLineHeightChange = onTextLineHeightChange;
    this.onOpenNotepad = onOpenNotepad;
    this.visible = true;
    this.gamepadMenuActive = false;
    this.navigableItems = [];
    this.gamepadFocusIndex = 0;
    this.shaderFolder = null;
    this.uniformControllers = new Map();
    this.driftToggles = new Map();
    this.folderDriftActions = [];
    this.liteRestore = null;

    this.state = {
      shader: presetManager.currentPreset.shader,
      preset: presetManager.currentPreset.name,
      logoOverlay: initialLogo,
      logoScale: initialLogoScale,
      logoOpacity: initialLogoOpacity,
      logoPack: initialLogoPack,
      logoPackSymbol: initialLogoPackSymbol,
      logoPackVariant: initialLogoPackVariant,
      logoPackDrift: initialLogoPackDrift,
      logoPackDriftSpeed: initialLogoPackDriftSpeed,
      logoPackTextVisible: initialLogoPackTextVisible,
      textEnabled: initialTextEnabled,
      textSize: initialTextSize,
      textOpacity: initialTextOpacity,
      textColor: initialTextColor,
      textPosition: initialTextPosition,
      textAutoFit: initialTextAutoFit,
      textLineHeight: initialTextLineHeight,
      autoCycle: presetManager.autoCycle,
      cycleInterval: presetManager.cycleInterval,
      transitionDuration: presetManager.transitionDuration,
      smoothTransitions: presetManager.smoothTransitions,
      randomizeOnCycle: presetManager.randomizeOnCycle,
      driftInterval: driftManager.interval,
      driftDuration: driftManager.duration,
      driftSpeed: driftManager.speed,
      driftSpeedAuto: driftManager.speedAuto,
      motionTrails: 100,
      trailsNeverDecay: false,
      resolutionScale: visualizer.resolutionScale ?? defaultResolutionScale(),
      liteMode: loadLiteMode(),
      menuOpacity: 80,
      menuPosition: loadMenuPosition(),
      menuBigMode: loadMenuBigMode(),
      musicEnabled: false,
      musicSource: 'mic',
      musicSensitivity: 65,
      musicResponse: 55,
      musicLevel: 0,
      musicStatus: 'Off',
      ...this.flattenValues(presetManager.currentPreset),
    };
    mergeShaderDefaults(this.state, this.state.shader);

    this.gui = new GUI({ title: '', width: 360 });
    this.presetController = null;
    this.build();

    this.presetManager.subscribe((event, detail) => {
      if (event === 'activeShaderChanged') {
        this.refreshPresetDropdown();
      }
      if (event === 'presetsChanged') {
        this.refreshPresetDropdown();
        if (detail?.preset?.name) {
          this.state.preset = detail.preset.name;
          this.presetController?.updateDisplay();
        }
      }
      if (event === 'presetSaved' && detail?.preset?.name) {
        this.state.preset = detail.preset.name;
        this.presetController?.updateDisplay();
      }
      if (event === 'preset' && detail?.preset?.name) {
        this.state.preset = detail.preset.name;
        this.presetController?.updateDisplay();
      }
      if (event === 'transitionStart' && detail?.to?.name) {
        this.state.preset = detail.to.name;
        this.presetController?.updateDisplay();
      }
      if (event === 'autoCycleChanged') {
        this.state.autoCycle = detail.enabled;
        this.autoCycleCtrl?.updateDisplay();
      }
      if (event === 'smoothTransitionsChanged') {
        this.state.smoothTransitions = detail.enabled;
        this.smoothTransitionsCtrl?.updateDisplay();
      }
      if (
        event === 'preset' ||
        event === 'presetsChanged' ||
        event === 'presetSaved' ||
        event === 'transitionStart' ||
        event === 'transitionEnd' ||
        event === 'activeShaderChanged'
      ) {
        this.refreshResetPresetButton();
      }
    });
  }

  flattenValues(preset) {
    return { ...preset.values };
  }

  build() {
    mergeShaderDefaults(this.state, this.state.shader);

    const pm = this.presetManager;
    const dm = this.driftManager;

    this.buildDisplaySection();
    this.buildDriftSection(dm);
    this.buildGlobalSection();
    this.rebuildShaderFolder(this.state.shader);

    this.gui.add(this.state, 'shader', getShaderChoices()).name('Shader').onChange((id) => {
      this.setShader(id);
    });

    this.presetController = this.gui
      .add(this.state, 'preset', pm.getPresetNames(this.state.shader))
      .name('Preset')
      .onChange((name) => {
        pm.setActiveShader(this.state.shader);
        pm.syncCurrentIndexForShader(name);
        pm.goToByName(name, { randomize: false, shader: this.state.shader });
      });

    const resetActions = {
      resetPreset: () => pm.resetToOriginals(),
    };
    this.resetPresetCtrl = this.gui.add(resetActions, 'resetPreset').name('↺ Reset preset');
    this.refreshResetPresetButton();

    this.buildLogoSection();
    this.buildTextOverlaySection();

    if (this.musicMode) {
      const mm = this.musicMode;
      mm.sensitivity = this.state.musicSensitivity;
      mm.response = this.state.musicResponse;
      mm.source = this.state.musicSource;
      mm.onDisabled = () => {
        this.state.musicEnabled = false;
        this.state.musicStatus = mm.status;
        this.musicEnabledCtrl?.updateDisplay();
        this.musicStatusCtrl?.updateDisplay();
        this.syncValuesToVisualizer();
      };

      const music = this.gui.addFolder('Music Mode');
      this.musicEnabledCtrl = music.add(this.state, 'musicEnabled').name('Enabled').onChange(async (v) => {
        const ok = await mm.setEnabled(v, () => this.getValues());
        if (!ok) {
          this.state.musicEnabled = false;
          this.musicEnabledCtrl.updateDisplay();
        } else {
          mm.currentShader = this.state.shader;
          if (!v) this.syncValuesToVisualizer();
        }
        this.state.musicStatus = mm.status;
        this.musicStatusCtrl?.updateDisplay();
      });
      music
        .add(this.state, 'musicSource', { Microphone: 'mic', 'Tab / screen audio': 'tab' })
        .name('Source')
        .onChange(async (src) => {
          mm.source = src;
          if (this.state.musicEnabled) {
            await mm.setSource(src, () => this.getValues());
            mm.currentShader = this.state.shader;
          }
        });
      music.add(this.state, 'musicSensitivity', 10, 100, 1).name('Sensitivity').onChange((v) => {
        mm.sensitivity = v;
      });
      music.add(this.state, 'musicResponse', 10, 100, 1).name('Response').onChange((v) => {
        mm.response = v;
      });
      this.musicLevelCtrl = music.add(this.state, 'musicLevel', 0, 100, 1).name('Level').listen(false);
      this.musicLevelCtrl.disable(true);
      this.musicStatusCtrl = music.add(this.state, 'musicStatus').name('Status');
      this.musicStatusCtrl.disable(true);
    }

    const cycle = this.gui.addFolder('Auto Cycle');
    this.autoCycleCtrl = cycle.add(this.state, 'autoCycle').name('Enabled').onChange((v) => {
      pm.setAutoCycle(v);
    });
    cycle.add(this.state, 'cycleInterval', 10, 180, 1).name('Interval (s)').onChange((v) => {
      pm.cycleInterval = v;
    });
    this.smoothTransitionsCtrl = cycle
      .add(this.state, 'smoothTransitions')
      .name('Smooth transitions')
      .onChange((v) => {
        pm.setSmoothTransitions(v);
      });
    cycle.add(this.state, 'transitionDuration', 2, 20, 0.5).name('Transition (s)').onChange((v) => {
      pm.transitionDuration = v;
    });
    cycle.add(this.state, 'randomizeOnCycle').name('Randomize Presets').onChange((v) => {
      pm.randomizeOnCycle = v;
    });
    cycle.add({ next: () => pm.next() }, 'next').name('Next Preset');
    cycle.add({ random: () => pm.randomPreset() }, 'random').name('Random Preset');

    this.applyMenuOpacity(this.state.menuOpacity);
    this.applyMenuPosition(this.state.menuPosition);
    this.applyMenuBigMode(this.state.menuBigMode);
    this.patchNumberControllers();
    this.gui.close();
  }

  buildLogoSection() {
    const logo = this.gui.addFolder('Logo');
    this.logoFolder = logo;
    const flowSpecs = SHADERS.flow?.uniforms ?? {};
    for (const key of FLOW_LOGO_COLLIDER_KEYS) {
      if (this.state[key] === undefined && flowSpecs[key]) {
        this.state[key] = flowSpecs[key].value;
      }
    }

    this.logoController = logo
      .add(this.state, 'logoOverlay', this.buildLogoChoices())
      .name('Image')
      .onChange((value) => {
        this.onLogoChange?.(value);
      });

    const logoActions = {
      addLogo: () => this.onAddLogoRequest?.(),
      prevPackLogo: () => this.onLogoPackCycle?.(-1),
      nextPackLogo: () => this.onLogoPackCycle?.(1),
    };
    logo.add(logoActions, 'addLogo').name('Add image');
    this.logoPackPrevCtrl = logo.add(logoActions, 'prevPackLogo').name('◀ Prev pack logo');
    this.logoPackNextCtrl = logo.add(logoActions, 'nextPackLogo').name('Next pack logo ▶');

    logo
      .add(this.state, 'logoScale', 10, 200, 1)
      .name('Scale %')
      .onChange((value) => {
        this.onLogoScaleChange?.(value);
      });

    logo
      .add(this.state, 'logoOpacity', 0, 100, 1)
      .name('Opacity %')
      .onChange((value) => {
        this.onLogoOpacityChange?.(value);
      });

    this.logoPackController = logo
      .add(this.state, 'logoPack', LOGO_PACK_CHOICES)
      .name('Pack')
      .onChange((value) => {
        this.refreshLogoPackSymbolDropdown();
        this.updateLogoPackSymbolCtrl();
        this.onLogoPackChange?.(value);
      });

    this.logoPackSymbolController = logo
      .add(this.state, 'logoPackSymbol', getPackSymbolChoices(this.state.logoPack))
      .name('Pack symbol')
      .onChange((value) => {
        this.onLogoPackSymbolChange?.(value);
      });

    this.logoPackVariantController = logo
      .add(this.state, 'logoPackVariant', { White: 'white', Black: 'black' })
      .name('Pack variant')
      .onChange((value) => {
        this.onLogoPackVariantChange?.(value);
      });

    this.logoPackDriftController = logo
      .add(this.state, 'logoPackDrift')
      .name('Pack drift (auto)')
      .onChange((value) => {
        this.updateLogoPackSymbolCtrl();
        this.onLogoPackDriftChange?.(value);
      });

    this.logoPackDriftSpeedCtrl = logo
      .add(this.state, 'logoPackDriftSpeed', 1, 100, 1)
      .name('Pack drift speed')
      .onChange((value) => {
        this.onLogoPackDriftSpeedChange?.(value);
      });

    this.logoPackTextVisibleCtrl = logo
      .add(this.state, 'logoPackTextVisible')
      .name('Show pack text')
      .onChange((value) => {
        this.onLogoPackTextVisibleChange?.(value);
      });

    this.logoColliderCtrl = logo
      .add(this.state, 'uLogoCollider', 0, 1, 1)
      .name('Logo Collider')
      .onChange(() => this.handleValueChange());
    logo
      .add(this.state, 'uLogoColliderBounce', flowSpecs.uLogoColliderBounce?.min ?? 0.2, flowSpecs.uLogoColliderBounce?.max ?? 2.6, flowSpecs.uLogoColliderBounce?.step ?? 1)
      .name('Logo Bounce')
      .onChange(() => this.handleValueChange());

    this.updateLogoPackSymbolCtrl();
  }

  syncLogoPackSymbolDisplay(symbolId) {
    if (!symbolId) return;
    this.state.logoPackSymbol = symbolId;
    this.logoPackSymbolController?.updateDisplay();
  }

  refreshLogoPackSymbolDropdown() {
    if (!this.logoPackSymbolController) return;
    const choices = getPackSymbolChoices(this.state.logoPack);
    const values = Object.values(choices);
    if (values.length && !values.includes(this.state.logoPackSymbol)) {
      this.state.logoPackSymbol = values[0];
    }
    this.logoPackSymbolController.options(choices);
    this.logoPackSymbolController.updateDisplay();
  }

  updateLogoPackSymbolCtrl() {
    if (!this.logoPackSymbolController) return;
    const packActive = this.state.logoPack !== 'none';
    const drift = this.state.logoPackDrift;
    if (!packActive || drift) this.logoPackSymbolController.disable();
    else this.logoPackSymbolController.enable();
    this.logoPackDriftController?.disable(!packActive);
    this.logoPackDriftSpeedCtrl?.disable(!packActive || !drift);
    this.logoPackVariantController?.disable(!packActive);
    this.logoPackTextVisibleCtrl?.disable(!packActive);
    this.logoPackPrevCtrl?.disable(!packActive);
    this.logoPackNextCtrl?.disable(!packActive);
    this.logoPackSymbolController.updateDisplay();
  }

  buildTextOverlaySection() {
    const text = this.gui.addFolder('Text Overlay');
    this.textOverlayFolder = text;

    text.add(this.state, 'textEnabled').name('Enabled').onChange((value) => {
      this.onTextEnabledChange?.(value);
    });

    const textActions = {
      openNotepad: () => this.onOpenNotepad?.(),
    };
    text.add(textActions, 'openNotepad').name('Open notepad');

    text
      .add(this.state, 'textSize', 40, 240, 1)
      .name('Text size %')
      .onChange((value) => {
        this.onTextSizeChange?.(value);
      });

    text
      .add(this.state, 'textOpacity', 0, 100, 1)
      .name('Text opacity %')
      .onChange((value) => {
        this.onTextOpacityChange?.(value);
      });

    text
      .add(this.state, 'textColor', { White: 'white', Black: 'black' })
      .name('Text color')
      .onChange((value) => {
        this.onTextColorChange?.(value);
      });

    text
      .add(this.state, 'textPosition', TEXT_POSITIONS)
      .name('Position')
      .onChange((value) => {
        this.onTextPositionChange?.(value);
      });

    text.add(this.state, 'textAutoFit').name('Auto-fit text').onChange((value) => {
      this.onTextAutoFitChange?.(value);
    });

    text
      .add(this.state, 'textLineHeight', 90, 220, 1)
      .name('Line spacing %')
      .onChange((value) => {
        this.onTextLineHeightChange?.(value);
      });
  }

  buildDisplaySection() {
    const display = this.gui.addFolder('Display');
    this.displayFolder = display;
    this.liteModeCtrl = display
      .add(this.state, 'liteMode')
      .name('Lite mode (multi-screen)')
      .onChange((enabled) => {
        this.setLiteMode(enabled);
      });
    this.menuPositionCtrl = display
      .add(this.state, 'menuPosition', MENU_POSITION_LABELS)
      .name('Menu position')
      .onChange((position) => {
        this.setMenuPosition(position);
      });
    display
      .add(this.state, 'menuBigMode')
      .name('Big menu (distance view)')
      .onChange((enabled) => {
        this.setMenuBigMode(enabled);
      });
    display
      .add(this.state, 'menuOpacity', 30, 100, 1)
      .name('Menu Opacity')
      .onChange((v) => {
        this.applyMenuOpacity(v);
      });
    display
      .add(this.state, 'resolutionScale', 25, 100, 1)
      .name('Resolution %')
      .onChange((v) => {
        if (this.state.liteMode) {
          v = Math.min(v, 50);
          this.state.resolutionScale = v;
          this.gui.controllersRecursive().forEach((c) => c.updateDisplay());
        }
        this.visualizer.setResolutionScale(v);
      });
    this.motionTrailsCtrl = display
      .add(this.state, 'motionTrails', 0, 100, 1)
      .name('Motion Trails')
      .onChange((v) => {
        if (!this.state.liteMode && TRAIL_SHADERS.has(this.state.shader)) {
          this.state.motionTrails = 100;
          this.motionTrailsCtrl.updateDisplay();
        }
        this.updateTrailsNeverDecayCtrl();
        this.handleValueChange();
      });
    this.trailsNeverDecayCtrl = display
      .add(this.state, 'trailsNeverDecay')
      .name('Trails never decay')
      .onChange(() => this.handleValueChange());
    this.updateTrailsNeverDecayCtrl();
    this.addUniformControls(display, BACKGROUND_UNIFORMS);
  }

  buildDriftSection(dm) {
    const drift = this.gui.addFolder('Drift Timing');
    this.driftFolder = drift;
    drift.add(this.state, 'driftInterval', 15, 240, 1).name('Pause (s)').onChange((v) => {
      dm.interval = v;
    });
    drift.add(this.state, 'driftDuration', 10, 180, 1).name('Blend (s)').onChange((v) => {
      dm.duration = v;
    });
    drift.add(this.state, 'driftSpeedAuto').name('Speed Auto').onChange((v) => {
      dm.speedAuto = v;
      this.driftSpeedCtrl.disable(v);
    });
    this.driftSpeedCtrl = drift
      .add(this.state, 'driftSpeed', 1, 100, 1)
      .name('Drift Speed')
      .onChange((v) => {
        dm.speed = v;
      });
    this.driftSpeedCtrl.disable(this.state.driftSpeedAuto);
  }

  buildGlobalSection() {
    this.globalSpecs = Object.fromEntries(
      Object.entries(GLOBAL_UNIFORMS).filter(([key]) => !(key in BACKGROUND_UNIFORMS)),
    );
    this.globalFolder = this.gui.addFolder('Global');
    this.addUniformControls(this.globalFolder, this.globalSpecs);
  }

  placeShaderFolderAfterGlobal() {
    if (!this.globalFolder?.domElement || !this.shaderFolder?.domElement) return;
    const parent = this.globalFolder.domElement.parentElement;
    if (!parent) return;
    parent.insertBefore(this.shaderFolder.domElement, this.globalFolder.domElement.nextSibling);
  }

  patchNumberControllers() {
    this.gui.controllersRecursive().forEach((controller) => configureNumberController(controller));
  }

  applyMenuOpacity(percent) {
    const alpha = Math.max(0, Math.min(100, percent)) / 100;
    document.documentElement.style.setProperty('--menu-bg-alpha', String(alpha));
  }

  applyMenuPosition(position) {
    setMenuPositionOnElement(this.gui.domElement, position);
  }

  setMenuPosition(position) {
    if (!MENU_POSITIONS.includes(position)) return null;
    this.state.menuPosition = position;
    this.applyMenuPosition(position);
    saveMenuPosition(position);
    this.menuPositionCtrl?.setValue(position);
    return MENU_POSITION_LABELS[position];
  }

  cycleMenuPosition() {
    return this.setMenuPosition(nextMenuPosition(this.state.menuPosition));
  }

  applyMenuBigMode(enabled) {
    applyMenuBigMode(this.gui.domElement, enabled);
  }

  setMenuBigMode(enabled) {
    this.state.menuBigMode = Boolean(enabled);
    this.applyMenuBigMode(this.state.menuBigMode);
    saveMenuBigMode(this.state.menuBigMode);
  }

  updateTrailsNeverDecayCtrl() {
    if (!this.trailsNeverDecayCtrl) return;
    if (this.state.liteMode) {
      this.trailsNeverDecayCtrl.disable();
      return;
    }
    if (this.state.motionTrails > 0) this.trailsNeverDecayCtrl.enable();
    else this.trailsNeverDecayCtrl.disable();
  }

  updateLiteControls() {
    if (this.motionTrailsCtrl) {
      if (this.state.liteMode) this.motionTrailsCtrl.disable();
      else this.motionTrailsCtrl.enable();
    }
    this.updateTrailsNeverDecayCtrl();
  }

  valuesForLiteClamp() {
    return {
      ...this.getValues(),
      resolutionScale: this.state.resolutionScale,
    };
  }

  setLiteMode(enabled, { silent = false, skipSave = false, init = false } = {}) {
    const next = Boolean(enabled);
    if (next === this.state.liteMode) return;

    if (next && !this.liteRestore && !init) {
      this.liteRestore = snapshotLiteRestoreFields(this.valuesForLiteClamp());
    }

    this.state.liteMode = next;
    if (!skipSave) saveLiteMode(next);
    this.visualizer.setLiteMode(next);

    if (next) {
      const clamped = applyLiteLimits(this.state.shader, this.valuesForLiteClamp());
      Object.assign(this.state, clamped);
      this.visualizer.setResolutionScale(clamped.resolutionScale);
    } else if (this.liteRestore) {
      Object.assign(this.state, this.liteRestore);
      this.liteRestore = null;
      this.visualizer.setResolutionScale(this.state.resolutionScale);
    }

    this.updateLiteControls();
    this.liteModeCtrl?.updateDisplay();
    this.gui.controllersRecursive().forEach((c) => c.updateDisplay());
    this.syncValuesToVisualizer();
    this.handleValueChange(true);

    if (!silent) {
      showGamepadToast(
        next
          ? 'Lite mode on — lower res, no trails, fewer elements'
          : 'Lite mode off — restored display settings',
      );
    }
  }

  buildLogoChoices() {
    return this.logoOptions.reduce((acc, option) => {
      acc[option.label] = option.value;
      return acc;
    }, {});
  }

  refreshLogoDropdown() {
    if (!this.logoController) return;
    this.logoController.options(this.buildLogoChoices());
    this.logoController.updateDisplay();
  }

  setLogoSelection(value) {
    this.state.logoOverlay = value;
    this.logoController?.updateDisplay();
    this.onLogoChange?.(value);
  }

  setShader(shaderId) {
    if (!shaderId || shaderId === this.state.shader) return shaderId;

    const pm = this.presetManager;
    mergeShaderDefaults(this.state, shaderId);
    this.state.shader = shaderId;
    if (!this.state.liteMode && TRAIL_SHADERS.has(shaderId)) {
      this.state.motionTrails = 100;
      this.motionTrailsCtrl?.updateDisplay();
    }
    const values = this.getValues();
    pm.setActiveShader(shaderId);
    this.onChange?.({ shader: shaderId, values });
    this.visualizer.setShader(shaderId, values);
    this.rebuildShaderFolder(shaderId);
    this.applyLiteIfEnabled();
    this.refreshPresetDropdown();
    pm.syncCurrentIndexForShader(this.state.preset);
    this.gui.controllersRecursive().forEach((c) => c.updateDisplay());
    if (this.musicMode?.enabled) {
      this.musicMode.currentShader = shaderId;
      this.musicMode.captureBaseline(this.getValues());
    }
    return shaderId;
  }

  cycleShader(delta) {
    const idx = SHADER_IDS.indexOf(this.state.shader);
    if (idx < 0) return null;
    const nextIdx = (idx + delta + SHADER_IDS.length) % SHADER_IDS.length;
    return this.setShader(SHADER_IDS[nextIdx]);
  }

  refreshPresetDropdown() {
    if (!this.presetController) return;
    const names = this.presetManager.getPresetNames(this.state.shader);
    this.presetController.options(names);
    if (names.length && !names.includes(this.state.preset)) {
      this.state.preset = names[0];
    }
    this.presetController.updateDisplay();
  }

  refreshResetPresetButton() {
    if (!this.resetPresetCtrl) return;
    const canReset = this.presetManager.canResetToOriginals();
    if (canReset) this.resetPresetCtrl.enable();
    else this.resetPresetCtrl.disable();
  }

  addUniformControls(folder, specs) {
    const driftAllKey = `driftAll_${this.folderDriftActions.length}`;
    const driftAllState = { [driftAllKey]: false };
    const driftAllCtrl = folder.add(driftAllState, driftAllKey).name('↻ Drift all');
    this.folderDriftActions.push({ ctrl: driftAllCtrl, specs, stateKey: driftAllKey, state: driftAllState });

    driftAllCtrl.onChange((enabled) => {
      this.setFolderDrift(specs, enabled);
      for (const [key] of Object.entries(specs)) {
        const toggle = this.driftToggles.get(key);
        if (toggle) {
          toggle.checked = enabled && !specs[key].rebuild;
          toggle.parentElement.classList.toggle('is-active', toggle.checked);
        }
      }
    });

    for (const [key, spec] of Object.entries(specs)) {
      if (specs === SHADERS.flow?.uniforms && FLOW_LOGO_COLLIDER_KEYS.has(key)) continue;
      this.addUniformRow(folder, key, spec);
    }
  }

  addUniformRow(folder, key, spec) {
    const label = this.labelFor(key, spec);
    if (this.state[key] === undefined) {
      this.state[key] = spec.value;
    }
    this.driftManager.register(key, spec, this.state[key]);

    let controller;
    if (spec.kind === 'palette') {
      controller = folder
        .add(this.state, key, {
          Classic: 0,
          Warm: 1,
          Cool: 2,
          Neon: 3,
          Pastel: 4,
          Fire: 5,
          Ocean: 6,
          Mono: 7,
        })
        .name('Palette')
        .onChange(() => {
          if (this.driftManager.isEnabled(key)) {
            this.driftManager.resetFrom(key, this.state[key]);
          }
          this.handleValueChange();
        });
    } else if (spec.kind === 'shape') {
      controller = folder
        .add(this.state, key, { ...SHAPE_OPTIONS })
        .name(label)
        .onChange(() => {
          if (this.driftManager.isEnabled(key)) {
            this.driftManager.resetFrom(key, this.state[key]);
          }
          this.handleValueChange();
        });
    } else if (spec.kind === 'trailShape') {
      controller = folder
        .add(this.state, key, { ...TRAIL_SHAPE_OPTIONS })
        .name(label)
        .onChange(() => {
          if (this.driftManager.isEnabled(key)) {
            this.driftManager.resetFrom(key, this.state[key]);
          }
          this.handleValueChange();
        });
    } else if (spec.rebuild) {
      controller = folder
        .add(this.state, key, spec.min, spec.max, spec.step)
        .name(label)
        .onFinishChange(() => this.handleValueChange(true));
    } else {
      controller = folder
        .add(this.state, key, spec.min, spec.max, spec.step)
        .name(label)
        .onChange(() => {
          if (this.driftManager.isEnabled(key)) {
            this.driftManager.resetFrom(key, this.state[key]);
          }
          this.handleValueChange();
        });
    }

    this.uniformControllers.set(key, controller);
    configureNumberController(controller);

    if (!spec.rebuild && spec.kind !== 'palette' && spec.kind !== 'shape' && spec.kind !== 'trailShape') {
      this.attachDriftToggle(controller, key, spec);
    }
  }

  attachDriftToggle(controller, key, spec) {
    const row = controller.domElement;
    row.classList.add('param-row');

    const wrap = document.createElement('label');
    wrap.className = 'drift-toggle';
    wrap.title = 'Slowly drift this value over time';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.addEventListener('change', () => {
      const enabled = checkbox.checked;
      wrap.classList.toggle('is-active', enabled);
      this.driftManager.setEnabled(key, spec, enabled, this.state[key]);
      this.syncFolderDriftToggles(spec);
      this.notifyDriftStateChange();
    });

    const icon = document.createElement('span');
    icon.className = 'drift-toggle-icon';
    icon.textContent = '↻';

    wrap.append(checkbox, icon);
    const widget = row.querySelector('.widget');
    (widget ?? row).appendChild(wrap);
    this.driftToggles.set(key, checkbox);
  }

  setFolderDrift(specs, enabled) {
    this.driftManager.setEnabledMany(Object.entries(specs), enabled, this.getValues());
    this.notifyDriftStateChange();
  }

  getDriftableEntries() {
    const specs = {
      ...BACKGROUND_UNIFORMS,
      ...this.globalSpecs,
      ...(SHADERS[this.state.shader]?.uniforms ?? {}),
    };
    return Object.entries(specs).filter(
      ([, spec]) => !spec.rebuild && spec.kind !== 'palette' && spec.kind !== 'shape' && spec.kind !== 'trailShape',
    );
  }

  isDriftAllEnabled() {
    const entries = this.getDriftableEntries();
    if (!entries.length) return false;
    return entries.every(([key]) => this.driftManager.isEnabled(key));
  }

  toggleDriftAll() {
    const next = !this.isDriftAllEnabled();
    this.setDriftAll(next);
    return next;
  }

  setDriftAll(enabled) {
    const entries = this.getDriftableEntries();
    this.driftManager.setEnabledMany(entries, enabled, this.getValues());

    for (const [key] of entries) {
      const toggle = this.driftToggles.get(key);
      if (!toggle) continue;
      toggle.checked = enabled;
      toggle.parentElement?.classList.toggle('is-active', enabled);
    }

    for (const { ctrl, specs, stateKey, state } of this.folderDriftActions) {
      const keys = Object.keys(specs).filter(
        (key) =>
          !specs[key].rebuild &&
          specs[key].kind !== 'palette' &&
          specs[key].kind !== 'shape' &&
          specs[key].kind !== 'trailShape',
      );
      const allOn = enabled && keys.length > 0;
      const anyOn = enabled && keys.length > 0;
      state[stateKey] = allOn;
      ctrl.updateDisplay();
      ctrl.domElement.classList.toggle('partial-drift', anyOn && !allOn);
    }

    this.notifyDriftStateChange();
  }

  notifyDriftStateChange() {
    this.onDriftStateChange?.();
  }

  syncFolderDriftToggles(specs) {
    for (const { ctrl, specs: folderSpecs, stateKey, state } of this.folderDriftActions) {
      if (folderSpecs !== specs) continue;
      const keys = Object.keys(specs).filter((key) => !specs[key].rebuild);
      const allOn = keys.length > 0 && keys.every((key) => this.driftManager.isEnabled(key));
      const anyOn = keys.some((key) => this.driftManager.isEnabled(key));
      state[stateKey] = allOn;
      ctrl.updateDisplay();
      ctrl.domElement.classList.toggle('partial-drift', anyOn && !allOn);
    }
    this.notifyDriftStateChange();
  }

  rebuildShaderFolder(shaderId) {
    if (this.shaderFolder) {
      for (const key of [...this.uniformControllers.keys()]) {
        if (!GLOBAL_UNIFORMS[key]) {
          this.uniformControllers.delete(key);
          this.driftToggles.delete(key);
          this.driftManager.unregister(key);
        }
      }
      this.shaderFolder.destroy();
      this.folderDriftActions = this.folderDriftActions.filter(
        (entry) => entry.specs === this.globalSpecs || entry.specs === BACKGROUND_UNIFORMS,
      );
    }

    const shader = SHADERS[shaderId];
    mergeShaderDefaults(this.state, shaderId);
    this.shaderFolder = this.gui.addFolder(shader.label);
    this.addUniformControls(this.shaderFolder, shader.uniforms);
    this.placeShaderFolderAfterGlobal();
    const focusKey = this.navigableItems[this.gamepadFocusIndex]?.key;
    this.refreshGamepadMenuAfterRebuild(focusKey);
    this.notifyDriftStateChange();
  }

  labelFor(key, spec) {
    const names = {
      uSegments: 'Mirrors',
      uCenterShape: 'Center Shape',
      uCenterSize: 'Center Size',
      uCenterStrength: 'Center Strength',
      uShapeCount: 'Shape Count',
      uShape2: 'Shape 2',
      uShape3: 'Shape 3',
      uShape4: 'Shape 4',
      uShapeMorph: 'Shape Morph',
      uHueShift: 'Hue Shift',
      uColorSpeed: 'Color Speed',
      uColorSpread: 'Color Spread',
      uUp: 'Offset X',
      uDown: 'Offset Y',
      uScaleY: 'Scale Y',
      uScaleZ: 'Scale Z',
      uWidth: 'Square Width',
      uHeight: 'Square Height',
      uRotate: 'Rotate',
      uMyTime: 'Time Scale',
      uLineWidth: 'Line Width',
      uIterations: 'Iterations',
      uWidthRand: 'Width Random',
      uHeightRand: 'Height Random',
      uDepthPulse: 'Depth Pulse',
      uTintRed: 'Tint Red',
      uTintGreen: 'Tint Green',
      uTintBlue: 'Tint Blue',
      uLogoCollider: 'Logo Collider',
      uLogoColliderBounce: 'Logo Bounce',
      uLogoColliderRadius: 'Logo Radius',
      uBgRed: 'Background Red',
      uBgGreen: 'Background Green',
      uBgBlue: 'Background Blue',
      uRed: 'Square Red',
      uGreen: 'Square Green',
      uBlue: 'Square Blue',
      uZoom: 'Zoom',
      uChevrons: 'Wall Ribs',
      uRingSize: 'Tunnel Stretch',
      uRingWidth: 'Wall Detail',
      uTunnelDepth: 'Travel Speed',
      uSwirl: 'Twist',
      uHorizonGlow: 'Vanishing Light',
      uChevronGlow: 'Rib Glow',
      uTrailShape: 'Trail Shape',
      uColorSpeed: 'Color Drift',
    };
    if (names[key]) return names[key];
    return key.replace(/^u/, '').replace(/([A-Z])/g, ' $1').trim();
  }

  applyLiteIfEnabled() {
    if (!this.state.liteMode) return;
    const clamped = applyLiteLimits(this.state.shader, this.valuesForLiteClamp());
    Object.assign(this.state, clamped);
    this.visualizer.setResolutionScale(clamped.resolutionScale);
    this.gui.controllersRecursive().forEach((c) => c.updateDisplay());
    this.syncValuesToVisualizer();
  }

  getValues() {
    const values = {
      motionTrails: this.state.motionTrails,
      trailsNeverDecay: this.state.trailsNeverDecay,
    };
    for (const key of Object.keys(this.state)) {
      if (key.startsWith('u')) values[key] = this.state[key];
    }
    return values;
  }

  syncGuiValues(values) {
    if (!values) return;
    for (const [key, value] of Object.entries(values)) {
      if (key.startsWith('u')) this.state[key] = value;
    }
    this.gui.controllersRecursive().forEach((c) => c.updateDisplay());
  }

  applyDrift(driftValues) {
    if (!driftValues || this.musicMode?.enabled) return;
    const normalized = normalizeUiValues(
      { ...this.state, ...driftValues },
      this.state.shader,
    );
    this.syncGuiValues(normalized);
    this.handleValueChange();
  }

  handleValueChange(rebuild = false, syncSmooth = false) {
    const values = this.getValues();
    this.visualizer.applyValues(values, { syncSmooth });
    this.onChange?.({ shader: this.state.shader, values, rebuild });
  }

  syncValuesToVisualizer() {
    this.visualizer.applyValues(this.getValues());
  }

  applyDisplaySettings(display) {
    if (!display) return;
    if (display.motionTrails !== undefined) {
      const trails = Math.max(0, Math.min(100, Math.round(display.motionTrails)));
      this.state.motionTrails =
        !this.state.liteMode && TRAIL_SHADERS.has(this.state.shader) ? 100 : trails;
    }
    if (display.resolutionScale !== undefined) {
      this.state.resolutionScale = Math.max(25, Math.min(100, Math.round(display.resolutionScale)));
      this.visualizer.setResolutionScale(this.state.resolutionScale);
    }
    this.updateTrailsNeverDecayCtrl();
    this.gui.controllersRecursive().forEach((c) => c.updateDisplay());
    this.syncValuesToVisualizer();
  }

  applyExternalState({ shader, values, presetName, display }) {
    if (shader && shader !== this.state.shader) {
      this.state.shader = shader;
      mergeShaderDefaults(this.state, shader);
      this.visualizer.setShader(shader, this.getValues());
      this.rebuildShaderFolder(shader);
      this.refreshPresetDropdown();
      this.gui.controllersRecursive().forEach((c) => c.updateDisplay());
    }

    if (presetName) {
      this.state.preset = presetName;
      this.presetController?.updateDisplay();
    }

    if (values) {
      Object.assign(this.state, values);
      this.gui.controllersRecursive().forEach((c) => c.updateDisplay());
    }

    if (display) {
      this.applyDisplaySettings(display);
    } else {
      this.syncValuesToVisualizer();
    }
    this.applyLiteIfEnabled();
    if (this.musicMode?.enabled) {
      this.musicMode.currentShader = this.state.shader;
      this.musicMode.captureBaseline(this.getValues());
    }
  }

  refreshMusicMeters() {
    if (!this.musicMode) return;
    this.state.musicLevel = this.musicMode.level;
    this.state.musicStatus = this.musicMode.status;
    this.musicLevelCtrl?.updateDisplay();
    this.musicStatusCtrl?.updateDisplay();
  }

  setVisible(visible) {
    this.visible = visible;
    this.gui.domElement.style.display = visible ? '' : 'none';
    if (!visible) this.exitGamepadMenu();
  }

  openPanel() {
    this.gui.open();
    this.gui.foldersRecursive().forEach((folder) => folder.open());
  }

  /** Hidden → toolbar → full options → hidden. */
  toggleSettingsPanel() {
    if (!this.visible) {
      this.setVisible(true);
      this.gui.close();
      this.exitGamepadMenu();
      return;
    }
    if (this.gui._closed) {
      this.openPanel();
      this.refreshNavigableItems();
      this.setGamepadFocusIndex(0);
      return;
    }
    this.exitGamepadMenu();
    this.gui.close();
    this.setVisible(false);
  }

  toggleVisible() {
    this.toggleSettingsPanel();
  }

  isGamepadMenuActive() {
    return this.visible && !this.gui._closed;
  }

  isNavigableController(controller) {
    if (!controller?.domElement || controller._disabled) return false;
    const el = controller.domElement;
    if (el.classList.contains('function') || el.classList.contains('string')) return false;
    return el.classList.contains('number') || el.classList.contains('boolean') || el.classList.contains('option');
  }

  getSpecForKey(key) {
    if (GLOBAL_UNIFORMS[key]) return GLOBAL_UNIFORMS[key];
    if (BACKGROUND_UNIFORMS[key]) return BACKGROUND_UNIFORMS[key];
    const shader = SHADERS[this.state.shader];
    if (shader?.uniforms[key]) return shader.uniforms[key];
    return null;
  }

  collectNavigableItems(gui = this.gui) {
    const items = [];
    for (const child of gui.children) {
      if (gui.folders.includes(child)) {
        items.push({
          kind: 'folder',
          folder: child,
          key: `folder:${child._title}`,
        });
        if (!child._closed) {
          items.push(...this.collectNavigableItems(child));
        }
        continue;
      }
      if (gui.controllers.includes(child) && this.isNavigableController(child)) {
        const key = child.property;
        items.push({
          kind: 'controller',
          controller: child,
          key,
          spec: this.getSpecForKey(key),
        });
      }
    }
    return items;
  }

  clearGamepadFocusItem(item) {
    if (!item) return;
    if (item.kind === 'folder') {
      item.folder.$title.classList.remove('gamepad-menu-focus');
      return;
    }
    item.controller?.domElement?.classList.remove('gamepad-menu-focus');
  }

  refreshNavigableItems() {
    this.navigableItems = this.collectNavigableItems();
    if (this.gamepadFocusIndex >= this.navigableItems.length) {
      this.gamepadFocusIndex = Math.max(0, this.navigableItems.length - 1);
    }
  }

  toggleGamepadFolder(folder, { refresh = true } = {}) {
    if (!folder) return;
    const focusKey = `folder:${folder._title}`;
    if (folder._closed) {
      folder.open();
    } else {
      folder.close();
    }
    if (!refresh) return focusKey;
    this.refreshNavigableItems();
    const idx = this.navigableItems.findIndex((item) => item.key === focusKey);
    this.setGamepadFocusIndex(idx >= 0 ? idx : this.gamepadFocusIndex);
    return focusKey;
  }

  setGamepadFocusIndex(index) {
    this.clearGamepadFocusItem(this.navigableItems[this.gamepadFocusIndex]);

    if (!this.navigableItems.length) {
      this.gamepadFocusIndex = 0;
      return;
    }

    this.gamepadFocusIndex = ((index % this.navigableItems.length) + this.navigableItems.length) % this.navigableItems.length;
    const item = this.navigableItems[this.gamepadFocusIndex];
    if (item.kind === 'folder') {
      item.folder.$title.classList.add('gamepad-menu-focus');
      item.folder.$title.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    item.controller.domElement.classList.add('gamepad-menu-focus');
    item.controller.domElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  openGuiForGamepadMenu() {
    this.gui.open();
    this.gui.foldersRecursive().forEach((folder) => folder.open());
  }

  enterGamepadMenu() {
    this.setVisible(true);
    this.openGuiForGamepadMenu();
    this.gamepadMenuActive = true;
    this.refreshNavigableItems();
    this.setGamepadFocusIndex(0);
  }

  exitGamepadMenu() {
    this.clearGamepadFocusItem(this.navigableItems[this.gamepadFocusIndex]);
    this.gamepadMenuActive = false;
  }

  toggleGamepadMenu() {
    if (this.gamepadMenuActive) {
      this.exitGamepadMenu();
      return false;
    }
    this.enterGamepadMenu();
    return true;
  }

  gamepadNavigate(delta) {
    if (!this.isGamepadMenuActive()) return;
    this.refreshNavigableItems();
    if (!this.navigableItems.length) return;
    this.setGamepadFocusIndex(this.gamepadFocusIndex + delta);
  }

  gamepadAdjust(delta, repeating = false) {
    if (!this.isGamepadMenuActive()) return;
    const item = this.navigableItems[this.gamepadFocusIndex];
    if (!item) return;

    if (item.kind === 'folder') {
      if (repeating) return;
      this.toggleGamepadFolder(item.folder);
      return;
    }

    const { controller, key, spec } = item;
    const el = controller.domElement;

    if (el.classList.contains('boolean')) {
      if (repeating) return;
      controller.setValue(!controller.getValue());
      return;
    }

    if (el.classList.contains('option')) {
      const values = controller._values ?? [];
      if (!values.length) return;
      const idx = values.indexOf(controller.getValue());
      const next = (idx + delta + values.length) % values.length;
      controller.setValue(values[next]);
      return;
    }

    if (!el.classList.contains('number')) return;

    const step = controller._step ?? 1;
    const min = controller._hasMin ? controller._min : -Infinity;
    const max = controller._hasMax ? controller._max : Infinity;
    let value = controller.getValue() + delta * step;
    value = Math.max(min, Math.min(max, value));
    if (controller._hasMin || controller._hasMax) {
      controller._snapClampSetValue(value);
    } else {
      controller.setValue(value);
    }

    if (spec?.rebuild) {
      this.handleValueChange(true);
    }
  }

  gamepadRandomizeFocused() {
    if (!this.isGamepadMenuActive()) return;
    const item = this.navigableItems[this.gamepadFocusIndex];
    if (!item) return;

    if (item.kind === 'folder') {
      this.toggleGamepadFolder(item.folder);
      return;
    }

    const { controller, key, spec } = item;
    const el = controller.domElement;

    if (el.classList.contains('boolean')) {
      controller.setValue(Math.random() > 0.5);
      return;
    }

    if (el.classList.contains('option')) {
      const values = controller._values ?? [];
      if (!values.length) return;
      if (key === 'preset') {
        this.presetManager.randomPreset();
        return;
      }
      if (key === 'shader') {
        const idx = Math.floor(Math.random() * SHADER_IDS.length);
        this.setShader(SHADER_IDS[idx]);
        this.refreshNavigableItems();
        this.setGamepadFocusIndex(this.gamepadFocusIndex);
        return;
      }
      const idx = Math.floor(Math.random() * values.length);
      controller.setValue(values[idx]);
      return;
    }

    if (!el.classList.contains('number')) return;

    let value;
    if (spec) {
      value = randomizeUniform(key, spec);
      if (value === null) return;
      if (this.driftManager.isEnabled(key)) {
        this.driftManager.resetFrom(key, value);
      }
      controller.setValue(value);
      this.handleValueChange(Boolean(spec.rebuild));
      return;
    }

    const min = controller._hasMin ? controller._min : 0;
    const max = controller._hasMax ? controller._max : 100;
    value = Math.round(randomBetween(min, max));
    controller.setValue(value);
  }

  refreshGamepadMenuAfterRebuild(focusKey) {
    if (!this.isGamepadMenuActive()) return;
    this.refreshNavigableItems();
    if (!this.navigableItems.length) return;
    const idx = focusKey ? this.navigableItems.findIndex((item) => item.key === focusKey) : -1;
    this.setGamepadFocusIndex(idx >= 0 ? idx : this.gamepadFocusIndex);
  }

  destroy() {
    this.gui.destroy();
  }
}
