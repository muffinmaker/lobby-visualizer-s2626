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

/**
 * Launchkey Mini pads (notes 36–38, and the same pads an octave up at 96–98).
 * Any other note advances the preset. Hold blackout and strobe; tap Invert.
 */
export const LAUNCHKEY_PAD_NOTES = {
  invert: [36, 96],
  blackout: [37, 97],
  strobe: [38, 98],
};

/**
 * CC 21–24: Launchkey Mini knobs in basic/custom mode.
 * CC 7: a volume-style fader, including the DDJ-FLX4 channel fader when it sends CC 7.
 * The FLX4’s other knobs are not fixed here; they vary by Pioneer’s MIDI mode.
 */
export const MIDI_CC_TO_SETTING = {
  7: 'uSpeed',
  21: 'uZoom',
  22: 'uSpeed',
  23: 'uBloom',
  24: 'uBrightness',
};

export const MIDI_MAP_NOTE = 'Launchkey pads: 36 Invert, 37 hold black, 38 hold strobe (also 96–98). Other notes: next preset. Knobs: CC 21 Zoom, 22 Speed, 23 Bloom, 24 Brightness. DDJ-FLX4 fader: CC 7 Speed.';
