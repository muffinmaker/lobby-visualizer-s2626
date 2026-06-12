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
      <p>When <strong>⟳ Auto-cycle</strong> (transport bar) or <strong>Auto Cycle → Enabled</strong> is on, the app automatically moves through presets on a timer.</p>
      <p>It is <strong>off by default</strong> — presets only change when you pick one or use the transport bar’s <strong>▲ ▼</strong> buttons beside the preset number.</p>
      <p>Turn it on if you want unattended lobby playback. Adjust <strong>Interval</strong> and <strong>Transition</strong> for cross-fade timing. <strong>Randomize Presets</strong> randomizes values each time it cycles.</p>
      <p><strong>∿ Smooth transitions</strong> (transport bar, before ⟳) or <strong>Auto Cycle → Smooth transitions</strong> cross-fades slider values when changing presets. Turn it off for instant preset switches.</p>
    `,
  },
  {
    title: 'Keyboard shortcuts',
    body: `
      <ul class="tutorial-keys">
        <li><kbd>Space</kbd> Toolbar → options → hide (cycles)</li>
        <li><kbd>F</kbd> Fullscreen</li>
        <li><kbd>H</kbd> Hide settings UI</li>
        <li><strong>◀ ▶</strong> (transport bar, around shader name) Previous / next shader — changes which slider set is shown</li>
        <li><strong>▲ ▼</strong> (transport bar, beside preset number) Previous / next preset for the current shader</li>
        <li><kbd>↑</kbd> <kbd>↓</kbd> Zoom / warp plus psychedelic motion (rotate, twist, pulse, speed… — varies by shader)</li>
        <li><kbd>←</kbd> <kbd>→</kbd> Spirograph: gear ratio · others: fewer / more elements (orbits, mirrors, particles…)</li>
        <li><strong>↻ Drift all</strong> (transport bar) Toggle slow random drift on every slider (global + shader)</li>
        <li><strong>∿ Smooth transitions</strong> (transport bar) Toggle preset cross-fade vs instant</li>
        <li><strong>⟳ Auto-cycle</strong> (transport bar, end) Toggle auto-cycling presets</li>
        <li><kbd>Z</kbd> Random <em>motion</em> on current preset (speed, bloom, trails…)</li>
        <li><kbd>C</kbd> Random <em>colors</em> on current preset (palette, tints, hues…)</li>
        <li><kbd>X</kbd> Random <em>shapes</em> (segments, morph, pen stamps…)</li>
        <li><kbd>B</kbd> <em>Party burst</em> — random motion, colors, and shapes together</li>
        <li><kbd>V</kbd> or <kbd>Y</kbd> or <kbd>R</kbd> Random <em>preset</em> — another saved look, same shader</li>
        <li><kbd>?</kbd> This tutorial</li>
        <li><kbd>Esc</kbd> Close tutorial</li>
      </ul>
    `,
  },
  {
    title: 'USB gamepad (SNES-style)',
    body: `
      <p>Plug in a USB SNES-style controller (D-pad, Start, Select, A/B/X/Y). Press any button once after the page has focus so the browser can detect the pad. A brief toast appears when a controller connects.</p>
      <p>Shoulders and face buttons use edge-triggered presses (~250&nbsp;ms debounce). The D-pad supports <strong>hold-to-repeat</strong> for live zoom and element tweaks. Face buttons each do something different on the <strong>same preset</strong> — motion, party burst, colors, or a preset hop. Mapping is identical on every shader. A brief toast at the top left confirms each action.</p>
      <ul class="tutorial-keys">
        <li><strong>L / R</strong> (shoulder buttons) Previous / next shader</li>
        <li><strong>D-pad ▲ ▼</strong> Zoom / warp + psychedelic motion (hold to slide faster)</li>
        <li><strong>D-pad ◀ ▶</strong> Spirograph: gear ratio · others: fewer / more elements (hold)</li>
        <li><strong>Start</strong> Toggle fullscreen (same as <kbd>F</kbd>)</li>
        <li><strong>Select</strong> Toolbar → options → hide (same as <kbd>Space</kbd>)</li>
        <li><strong>A</strong> Random <em>motion</em> — speed, bloom, trails (same preset)</li>
        <li><strong>B</strong> <em>Party burst</em> — random motion, colors, and shapes (same preset)</li>
        <li><strong>X</strong> Random <em>colors</em> — palette, tints, hues (same preset)</li>
        <li><strong>Y</strong> Random <em>preset</em> — jump to another saved look (same shader)</li>
      </ul>
      <p><kbd>Space</kbd> or <strong>Select</strong> cycles: <strong>toolbar only</strong> → <strong>full options</strong> → <strong>hidden</strong> → toolbar… With <strong>full options</strong> open, the D-pad navigates settings: <strong>▲ ▼</strong> move the highlight (section headings and sliders), <strong>◀ ▶</strong> adjust a slider or <strong>expand / collapse</strong> a section heading (hold to slide faster on sliders), <strong>B</strong> randomize the focused row (or toggle a section). <kbd>H</kbd> also toggles UI visibility.</p>
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
      <p><strong>Lite mode (multi-screen)</strong> in Display caps resolution, turns off motion trails, and limits pens/particles/bloom for smoother framerate when running several fullscreen windows on one GPU. It syncs across browser tabs on the same machine.</p>
      <p><strong>Resolution %</strong> lowers render quality to save GPU power — try 50–75% on slower machines. Motion trails and high particle counts also use more resources; set Motion Trails to 0 if needed.</p>
      <p><strong>Motion Trails</strong> (0–100) controls trail strength on shaders that support it (Spirograph, Spiro, Flow). Per-shader trail decay sliders in each shader folder fine-tune persistence at full strength. Enable <strong>Trails never decay</strong> to keep trails permanently (no fade between frames).</p>
      <p>For weak lobby GPUs running <strong>Spirograph</strong>, pick the built-in <strong>Lobby Safe</strong> preset: it uses fewer pens, turns motion trails off, sets Resolution % to 75, and uses conservative speed and brightness.</p>
      <p><strong>Kaleidoscope</strong> presets such as <strong>Jade Carousel</strong>, <strong>Ember Fold</strong>, and <strong>Crystal Swap</strong> showcase multi-shape morph (Shape Count 2–4 + Shape Morph). Saturation and Bloom vary the color theme per preset.</p>
      <p>The transport bar has <strong>◀ ▶</strong> around the shader name to switch visual styles (and which sliders appear), and <strong>▲ ▼</strong> beside the <strong>preset number</strong> (e.g. <strong>3/11</strong>) to step through saved combinations for that shader. <strong>↻</strong> toggles drift on every slider (global + shader); <strong>∿</strong> toggles smooth preset cross-fades; <strong>⟳</strong> toggles auto-cycle. <strong>↺ Reset preset</strong> in the settings panel restores built-in defaults for the current preset name.</p>
      <p><strong>Background Red / Green / Blue</strong> (Display) sets the canvas and trail fade color — independent of square, tint, or palette colors in each shader.</p>
      <p><strong>Logo</strong> overlays a built-in mark at the center of the screen. Choose <strong>None</strong> to hide it. <strong>Add logo</strong> uploads your own PNG or JPG (saved in this browser). <strong>Logo Scale %</strong> resizes the overlay; <strong>Logo Opacity %</strong> controls transparency (0–100).</p>
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
