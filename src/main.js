import { loadCustomShaders } from './shaders/loader.js';
import { Visualizer } from './Visualizer.js';
import { PresetManager, SHADER_IDS } from './PresetManager.js';
import { SettingsPanel } from './SettingsPanel.js';
import { DriftManager } from './DriftManager.js';
import { MusicMode } from './MusicMode.js';
import { createTutorial } from './Tutorial.js';
import { mountTransportBar } from './TransportBar.js';

const hint = document.getElementById('hint');
const heroLogo = document.querySelector('.hero-logo-mark');

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

function setOverlayLogo(url) {
  if (!heroLogo) return;
  if (!url) {
    heroLogo.classList.add('is-hidden');
    return;
  }
  heroLogo.classList.remove('is-hidden');
  heroLogo.style.setProperty('--hero-logo-url', `url("${url}")`);
}

async function start() {
  const logoOptions = [{ label: 'None', value: 'none' }, ...loadOverlayLogos()];
  const defaultLogo = logoOptions.find((o) => o.value === 'none') ?? logoOptions[0];
  setOverlayLogo(null);

  const custom = await loadCustomShaders();
  if (custom.length) {
    console.info('Loaded custom shaders:', custom.join(', '));
  }

  const presetManager = new PresetManager();
  const driftManager = new DriftManager();
  const musicMode = new MusicMode();
  const visualizer = new Visualizer(document.body);
  visualizer.renderer.debug.checkShaderErrors = import.meta.env.DEV;

  for (const id of custom) {
    visualizer.registerShader(id);
  }

  const settings = new SettingsPanel({
    presetManager,
    driftManager,
    musicMode,
    visualizer,
    logoOptions,
    initialLogo: 'none',
    onLogoChange: (value) => {
      setOverlayLogo(value === 'none' ? null : value);
    },
    onChange: ({ shader, values }) => {
      Object.assign(presetManager.currentPreset.values, values);
      presetManager.currentPreset.shader = shader;
    },
  });

  const tutorial = createTutorial();
  mountTransportBar(settings.gui.domElement, {
    onRewind: () => presetManager.prev({ randomize: false, immediate: true }),
    onRandomPreset: () => presetManager.createRandomPreset({ immediate: true }),
    onFastForward: () => presetManager.next({ randomize: false, immediate: true }),
    onSave: () => {
      const preset = presetManager.saveCurrent({
        name: settings.state.preset,
        shader: settings.state.shader,
        values: settings.getValues(),
      });
      settings.applyExternalState({
        shader: preset.shader,
        values: preset.values,
        presetName: preset.name,
      });
    },
    onInfo: () => tutorial.toggle(),
  });

  let uiHidden = false;
  let hintHidden = false;

  function applyPresetState({ shader, values }, presetName, updateGui = true) {
    visualizer.setShader(shader);
    visualizer.applyValues(values);
    if (updateGui) {
      settings.applyExternalState({ shader, values, presetName });
    }
  }

  applyPresetState(
    {
      shader: presetManager.currentPreset.shader,
      values: { ...presetManager.currentPreset.values },
    },
    presetManager.currentPreset.name,
  );

  presetManager.subscribe((event, detail) => {
    if (event === 'transitionStart') {
      applyPresetState(
        { shader: detail.toShader, values: detail.toState.values },
        detail.to.name,
      );
    }
    if (event === 'transitionEnd') {
      applyPresetState(
        { shader: detail.shader, values: detail.values },
        detail.preset.name,
      );
    }
    if (event === 'preset') {
      applyPresetState(
        { shader: detail.shader, values: detail.values },
        detail.preset.name,
      );
      if (musicMode.enabled) {
        musicMode.captureBaseline(settings.getValues());
        musicMode.currentShader = detail.shader;
      }
    }
    if (event === 'transitionEnd' && musicMode.enabled) {
      musicMode.captureBaseline(settings.getValues());
      musicMode.currentShader = detail.shader;
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
      !musicMode.enabled ? driftManager.update(dt, settings.getValues()) : null;
    if (driftValues) {
      settings.applyDrift(driftValues);
    }

    const transition = presetManager.update(dt, () => settings.getValues());

    const shader = presetManager.isTransitioning
      ? transition.shader
      : settings.state.shader;
    let values = presetManager.isTransitioning
      ? transition.values
      : settings.getValues();

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
      visualizer.applyValues(values);
    }

    if (presetManager.isTransitioning) {
      settings.state.preset = presetManager.isTransitioning
        ? `${presetManager.fromState?.shader ?? ''} → ${presetManager.toState?.shader ?? ''}`
        : presetManager.currentPreset.name;
    }

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
    if (e.code === 'ArrowRight') presetManager.next({ randomize: false });
    if (e.code === 'ArrowLeft') presetManager.prev({ randomize: false });
    if (e.code === 'KeyR') presetManager.randomPreset();
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
    '\nSpace: settings | i / ?: tutorial | F: fullscreen | H: hide UI | ←/→: presets | R: random preset',
  );
}

start().catch(console.error);
