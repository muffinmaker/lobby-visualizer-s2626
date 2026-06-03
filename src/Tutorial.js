const SECTIONS = [
  {
    title: 'Quick start',
    body: `
      <p>This is a fullscreen visualizer for lobby projections. Press <kbd>Space</kbd> to open or close the settings panel.</p>
      <p>Pick a <strong>Shader</strong> for the visual style, then tweak sliders. Use <strong>Preset</strong> to load saved combinations.</p>
    `,
  },
  {
    title: 'Drift ↻',
    body: `
      <p>The <strong>↻</strong> toggle beside a slider slowly drifts that value over time — pause, then blend to a new random target.</p>
      <p><strong>↻ Drift all</strong> in a folder turns drift on for every parameter in that section. Use <strong>Drift Timing</strong> to set how long it waits and how long each blend takes.</p>
    `,
  },
  {
    title: 'Auto Cycle',
    body: `
      <p>When <strong>Auto Cycle → Enabled</strong> is on, the app automatically moves through presets on a timer.</p>
      <p>It is <strong>off by default</strong> — presets only change when you pick one, or use <kbd>←</kbd> <kbd>→</kbd> / <strong>Next Preset</strong>.</p>
      <p>Turn it on if you want unattended lobby playback. Adjust <strong>Interval</strong> and <strong>Transition</strong> for cross-fade timing. <strong>Randomize Presets</strong> randomizes values each time it cycles.</p>
    `,
  },
  {
    title: 'Keyboard shortcuts',
    body: `
      <ul class="tutorial-keys">
        <li><kbd>Space</kbd> Settings panel</li>
        <li><kbd>F</kbd> Fullscreen</li>
        <li><kbd>H</kbd> Hide settings UI</li>
        <li><kbd>←</kbd> <kbd>→</kbd> Previous / next preset</li>
        <li><kbd>R</kbd> Random preset</li>
        <li><kbd>?</kbd> This tutorial</li>
        <li><kbd>Esc</kbd> Close tutorial</li>
      </ul>
    `,
  },
  {
    title: 'Music Mode',
    body: `
      <p><strong>Music Mode</strong> listens to audio and drives Speed, Brightness, Bloom, Scale, and other sliders in real time.</p>
      <p><strong>Microphone</strong> (default) — picks up room / PA sound. Allow mic access when prompted.</p>
      <p><strong>Tab / screen audio</strong> — share a browser tab playing music and enable <em>Share tab audio</em> in the picker.</p>
    `,
  },
  {
    title: 'Display & performance',
    body: `
      <p><strong>Resolution %</strong> lowers render quality to save GPU power — try 50–75% on slower machines. Motion trails and high particle counts also use more resources; turn trails off if needed.</p>
      <p><strong>Motion Trails</strong> leaves fading trails on shaders that support it (Spocks, Spiro, Flow).</p>
      <p><strong>Background</strong> sets the clear color behind the visuals.</p>
    `,
  },
];

function renderSections() {
  return SECTIONS.map(
    (section) => `
      <section class="tutorial-section">
        <h3>${section.title}</h3>
        ${section.body}
      </section>
    `,
  ).join('');
}

export function createTutorial() {
  const root = document.createElement('div');
  root.id = 'tutorial-root';
  root.innerHTML = `
    <div id="tutorial" class="tutorial hidden" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div class="tutorial-backdrop" data-tutorial-close></div>
      <div class="tutorial-panel">
        <button type="button" class="tutorial-close" aria-label="Close tutorial" data-tutorial-close>×</button>
        <h2 id="tutorial-title">Help</h2>
        <p class="tutorial-lead">Shaders, presets, drift, and playback controls.</p>
        ${renderSections()}
      </div>
    </div>
  `;

  document.body.appendChild(root);

  const dialog = root.querySelector('#tutorial');
  const panel = root.querySelector('.tutorial-panel');

  function open() {
    dialog.classList.remove('hidden');
    panel.focus();
  }

  function close() {
    dialog.classList.add('hidden');
    panel.focus();
  }

  function toggle() {
    if (dialog.classList.contains('hidden')) open();
    else close();
  }

  dialog.querySelectorAll('[data-tutorial-close]').forEach((el) => {
    el.addEventListener('click', close);
  });

  panel.setAttribute('tabindex', '-1');

  return {
    open,
    close,
    toggle,
    isOpen: () => !dialog.classList.contains('hidden'),
  };
}
