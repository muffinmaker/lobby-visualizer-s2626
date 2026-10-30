/** Web MIDI for a DDJ-FLX4 and a Launchkey Mini, plus any similar controller. */
export function createMidiInput({ onNote, onCc, onStatus }) {
  let access = null;
  let enabled = false;

  function handleMessage(event) {
    const [status, data1, data2] = event.data;
    const command = status & 0xf0;
    if (command === 0x90 && data2 > 0) onNote?.(data1, data2, true);
    else if (command === 0x80 || (command === 0x90 && data2 === 0)) onNote?.(data1, 0, false);
    else if (command === 0xb0) onCc?.(data1, data2);
  }

  function attachAll() {
    access?.inputs.forEach((input) => {
      input.onmidimessage = handleMessage;
    });
  }

  async function start() {
    if (!navigator.requestMIDIAccess) {
      onStatus?.('MIDI is not available in this browser');
      return false;
    }
    try {
      access = await navigator.requestMIDIAccess();
    } catch {
      onStatus?.('MIDI permission denied');
      return false;
    }
    enabled = true;
    attachAll();
    access.onstatechange = () => attachAll();
    const count = access.inputs.size;
    onStatus?.(count ? `MIDI on · ${count} input${count === 1 ? '' : 's'}` : 'MIDI on · plug in a controller');
    return true;
  }

  function stop() {
    enabled = false;
    access?.inputs.forEach((input) => {
      input.onmidimessage = null;
    });
    onStatus?.('MIDI off');
  }

  return {
    start,
    stop,
    get enabled() {
      return enabled;
    },
  };
}

export const MIDI_MAP_NOTE = 'Defaults — Launchkey Mini pads 36 Invert, 37 hold black, 38 hold strobe, 39 Performance, 40 Swap A/B (also 96–100). Other notes: next preset. Knobs CC 21 Zoom, 22 Speed, 23 Bloom, 24 Brightness, 25 Overlay mix. DDJ-FLX4 channel fader CC 7 Speed. Change these in Controls → MIDI map.';

const MIDI_MAP_KEY = 'lobby-midi-map';

export const MIDI_CC_TARGETS = {
  Speed: 'uSpeed',
  Zoom: 'uZoom',
  Scale: 'uScale',
  Bloom: 'uBloom',
  Brightness: 'uBrightness',
  'Overlay mix': 'overlayMix',
};

export const MIDI_NOTE_ACTIONS = {
  'Next preset': 'next',
  Invert: 'invert',
  'Hold black': 'blackout',
  'Hold strobe': 'strobe',
  Performance: 'performance',
  'Swap A/B': 'swap',
};

export function defaultMidiMap() {
  return {
    cc: [
      { cc: 7, target: 'uSpeed' },
      { cc: 21, target: 'uZoom' },
      { cc: 22, target: 'uSpeed' },
      { cc: 23, target: 'uBloom' },
      { cc: 24, target: 'uBrightness' },
      { cc: 25, target: 'overlayMix' },
    ],
    notes: [
      { note: 36, action: 'invert' },
      { note: 37, action: 'blackout' },
      { note: 38, action: 'strobe' },
      { note: 39, action: 'performance' },
      { note: 40, action: 'swap' },
      { note: 96, action: 'invert' },
      { note: 97, action: 'blackout' },
      { note: 98, action: 'strobe' },
      { note: 99, action: 'performance' },
      { note: 100, action: 'swap' },
    ],
  };
}

export function loadMidiMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MIDI_MAP_KEY) || '');
    if (parsed?.cc && parsed?.notes) return parsed;
  } catch {
    /* ignore */
  }
  return defaultMidiMap();
}

export function saveMidiMap(map) {
  try {
    localStorage.setItem(MIDI_MAP_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function midiCcTarget(map, cc) {
  const row = map.cc.find((entry) => Number(entry.cc) === Number(cc));
  return row?.target || null;
}

export function midiNoteAction(map, note) {
  const row = map.notes.find((entry) => Number(entry.note) === Number(note));
  return row?.action || 'next';
}
