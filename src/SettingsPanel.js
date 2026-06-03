import GUI from 'lil-gui';
import { defaultResolutionScale } from './Visualizer.js';
import { SHADERS, GLOBAL_UNIFORMS, getShaderChoices } from './shaders/index.js';
import { mergeShaderDefaults, normalizeUiValues } from './uniformMap.js';
import { SHAPE_OPTIONS } from './shapeOptions.js';

export class SettingsPanel {
  constructor({
    presetManager,
    visualizer,
    driftManager,
    musicMode,
    onChange,
    logoOptions = [{ label: 'None', value: 'none' }],
    initialLogo = 'none',
    onLogoChange,
  }) {
    this.presetManager = presetManager;
    this.visualizer = visualizer;
    this.driftManager = driftManager;
    this.musicMode = musicMode;
    this.onChange = onChange;
    this.logoOptions = logoOptions;
    this.onLogoChange = onLogoChange;
    this.visible = true;
    this.shaderFolder = null;
    this.uniformControllers = new Map();
    this.driftToggles = new Map();
    this.folderDriftActions = [];

    this.state = {
      shader: presetManager.currentPreset.shader,
      preset: presetManager.currentPreset.name,
      logoOverlay: initialLogo,
      autoCycle: presetManager.autoCycle,
      cycleInterval: presetManager.cycleInterval,
      transitionDuration: presetManager.transitionDuration,
      randomizeOnCycle: presetManager.randomizeOnCycle,
      driftInterval: driftManager.interval,
      driftDuration: driftManager.duration,
      driftSpeed: driftManager.speed,
      driftSpeedAuto: driftManager.speedAuto,
      trailsEnabled: true,
      resolutionScale: visualizer.resolutionScale ?? defaultResolutionScale(),
      menuOpacity: 80,
      musicEnabled: false,
      musicSource: 'mic',
      musicSensitivity: 65,
      musicResponse: 55,
      musicLevel: 0,
      musicStatus: 'Off',
      background: '#020208',
      ...this.flattenValues(presetManager.currentPreset),
    };

    this.gui = new GUI({ title: '', width: 360 });
    this.presetController = null;
    this.build();

    this.presetManager.subscribe((event, detail) => {
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
    });
  }

  flattenValues(preset) {
    return { ...preset.values };
  }

  build() {
    const pm = this.presetManager;
    const dm = this.driftManager;

    this.gui.add(this.state, 'shader', getShaderChoices()).name('Shader').onChange((id) => {
      mergeShaderDefaults(this.state, id);
      const values = this.getValues();
      this.onChange?.({ shader: id, values });
      this.visualizer.setShader(id, values);
      this.rebuildShaderFolder(id);
      this.syncValuesToVisualizer();
      if (this.musicMode?.enabled) {
        this.musicMode.currentShader = id;
        this.musicMode.captureBaseline(this.getValues());
      }
    });

    this.presetController = this.gui
      .add(this.state, 'preset', pm.getPresetNames())
      .name('Preset')
      .onChange((name) => {
        pm.goToByName(name, { immediate: false, randomize: false });
      });

    const logoChoices = this.logoOptions.reduce((acc, option) => {
      acc[option.label] = option.value;
      return acc;
    }, {});

    this.gui
      .add(this.state, 'logoOverlay', logoChoices)
      .name('Logo')
      .onChange((value) => {
        this.onLogoChange?.(value);
      });

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
    cycle.add(this.state, 'autoCycle').name('Enabled').onChange((v) => {
      pm.autoCycle = v;
    });
    cycle.add(this.state, 'cycleInterval', 10, 180, 1).name('Interval (s)').onChange((v) => {
      pm.cycleInterval = v;
    });
    cycle.add(this.state, 'transitionDuration', 2, 20, 0.5).name('Transition (s)').onChange((v) => {
      pm.transitionDuration = v;
    });
    cycle.add(this.state, 'randomizeOnCycle').name('Randomize Presets').onChange((v) => {
      pm.randomizeOnCycle = v;
    });
    cycle.add({ next: () => pm.next() }, 'next').name('Next Preset');
    cycle.add({ random: () => pm.randomPreset() }, 'random').name('Random Preset');

    const drift = this.gui.addFolder('Drift Timing');
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

    const display = this.gui.addFolder('Display');
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
        this.visualizer.setResolutionScale(v);
      });
    display.add(this.state, 'trailsEnabled').name('Motion Trails').onChange((v) => {
      this.visualizer.setTrailsEnabled(v);
    });
    display.addColor(this.state, 'background').name('Background').onChange((v) => {
      this.visualizer.setBackgroundColor(v);
    });

    this.globalFolder = this.gui.addFolder('Global');
    this.addUniformControls(this.globalFolder, GLOBAL_UNIFORMS);

    this.rebuildShaderFolder(this.state.shader);
    this.applyMenuOpacity(this.state.menuOpacity);
    this.gui.close();
  }

  applyMenuOpacity(percent) {
    const alpha = Math.max(0, Math.min(100, percent)) / 100;
    document.documentElement.style.setProperty('--menu-bg-alpha', String(alpha));
  }

  refreshPresetDropdown() {
    if (!this.presetController) return;
    this.presetController.options(this.presetManager.getPresetNames());
    this.presetController.updateDisplay();
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
      this.addUniformRow(folder, key, spec);
    }
  }

  addUniformRow(folder, key, spec) {
    const label = this.labelFor(key, spec);
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

    if (!spec.rebuild && spec.kind !== 'palette' && spec.kind !== 'shape') {
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
        (entry) => entry.specs === GLOBAL_UNIFORMS,
      );
    }

    const shader = SHADERS[shaderId];
    mergeShaderDefaults(this.state, shaderId);
    this.shaderFolder = this.gui.addFolder(shader.label);
    this.addUniformControls(this.shaderFolder, shader.uniforms);
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
      uColorSpread: 'Color Spread',
      uTintRed: 'Tint Red',
      uTintGreen: 'Tint Green',
      uTintBlue: 'Tint Blue',
      uZoom: 'Zoom',
    };
    if (names[key]) return names[key];
    return key.replace(/^u/, '').replace(/([A-Z])/g, ' $1').trim();
  }

  getValues() {
    const values = {};
    for (const key of Object.keys(this.state)) {
      if (key.startsWith('u')) values[key] = this.state[key];
    }
    return values;
  }

  applyDrift(driftValues) {
    if (!driftValues || this.musicMode?.enabled) return;
    const normalized = normalizeUiValues(
      { ...this.state, ...driftValues },
      this.state.shader,
    );
    for (const [key, value] of Object.entries(normalized)) {
      if (key.startsWith('u')) this.state[key] = value;
    }
    this.gui.controllersRecursive().forEach((c) => c.updateDisplay());
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

  applyExternalState({ shader, values, presetName }) {
    if (shader && shader !== this.state.shader) {
      this.state.shader = shader;
      mergeShaderDefaults(this.state, shader);
      this.visualizer.setShader(shader, this.getValues());
      this.rebuildShaderFolder(shader);
      this.gui.controllersRecursive().forEach((c) => c.updateDisplay());
    }

    if (presetName) {
      this.state.preset = presetName;
    }

    if (values) {
      Object.assign(this.state, values);
      this.gui.controllersRecursive().forEach((c) => c.updateDisplay());
    }

    this.syncValuesToVisualizer();
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
  }

  toggleVisible() {
    this.setVisible(!this.visible);
  }

  destroy() {
    this.gui.destroy();
  }
}
