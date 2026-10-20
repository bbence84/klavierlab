const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const WHITE_NOTE_INDICES = [0, 2, 4, 5, 7, 9, 11];

// Standard 49-key studio view range: C2 (MIDI 36) to C6 (MIDI 84)
// Covers all beginner/intermediate repertoire + 2-hand bass/treble comfortably on desktop viewports
export const DEFAULT_MIN_MIDI = 36; // C2
export const DEFAULT_MAX_MIDI = 84; // C6

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[midi % 12] || 'C';
  return `${name}${octave}`;
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function isBlackKey(midi: number): boolean {
  const pitchClass = midi % 12;
  return !WHITE_NOTE_INDICES.includes(pitchClass);
}

export interface KeyGeometry {
  midi: number;
  noteName: string;
  isBlack: boolean;
  xNormalized: number;     // 0..1 left edge across keyboard width
  widthNormalized: number; // 0..1 width across keyboard width
  whiteKeyIndex: number;   // index among white keys
}

// Geometry is fully determined by (minMidi, maxMidi) and never changes at runtime,
// so we memoize per range. The falling-notes canvas redraws every animation frame
// and must NOT rebuild these arrays + Map each time (avoids per-frame GC churn on
// lower-powered tablets).
const geometryCache = new Map<
  string,
  { keys: KeyGeometry[]; byMidi: Map<number, KeyGeometry>; whiteKeyCount: number }
>();

/**
 * Computes exact normalized horizontal positions [0..1] for every MIDI key in [minMidi, maxMidi]
 * so both the FallingNotesCanvas and PianoKeyboard share identical lane geometry.
 *
 * The result is cached per (minMidi, maxMidi) range and returned by reference. Callers must
 * treat the returned structures as immutable.
 */
export function computeKeyboardGeometry(
  minMidi: number = DEFAULT_MIN_MIDI,
  maxMidi: number = DEFAULT_MAX_MIDI
): { keys: KeyGeometry[]; byMidi: Map<number, KeyGeometry>; whiteKeyCount: number } {
  const cacheKey = `${minMidi}:${maxMidi}`;
  const cached = geometryCache.get(cacheKey);
  if (cached) return cached;

  const whiteKeys: number[] = [];
  for (let m = minMidi; m <= maxMidi; m++) {
    if (!isBlackKey(m)) {
      whiteKeys.push(m);
    }
  }

  const whiteKeyCount = whiteKeys.length;
  const whiteWidth = 1 / whiteKeyCount;
  const blackWidth = whiteWidth * 0.62;

  const keys: KeyGeometry[] = [];
  const byMidi = new Map<number, KeyGeometry>();

  let currentWhiteIdx = 0;
  for (let m = minMidi; m <= maxMidi; m++) {
    const black = isBlackKey(m);
    if (!black) {
      const geom: KeyGeometry = {
        midi: m,
        noteName: midiToNoteName(m),
        isBlack: false,
        xNormalized: currentWhiteIdx * whiteWidth,
        widthNormalized: whiteWidth,
        whiteKeyIndex: currentWhiteIdx,
      };
      keys.push(geom);
      byMidi.set(m, geom);
      currentWhiteIdx++;
    } else {
      // Position black key slightly offset depending on pitch class for realistic acoustic spacing
      const pitchClass = m % 12;
      let offsetRatio = 0.5;
      if (pitchClass === 1 || pitchClass === 6) offsetRatio = 0.56; // C#, F# slightly left
      if (pitchClass === 3 || pitchClass === 10) offsetRatio = 0.44; // D#, A# slightly right

      const center = currentWhiteIdx * whiteWidth;
      const geom: KeyGeometry = {
        midi: m,
        noteName: midiToNoteName(m),
        isBlack: true,
        xNormalized: center - blackWidth * offsetRatio,
        widthNormalized: blackWidth,
        whiteKeyIndex: currentWhiteIdx - 1,
      };
      keys.push(geom);
      byMidi.set(m, geom);
    }
  }

  const result = { keys, byMidi, whiteKeyCount };
  geometryCache.set(cacheKey, result);
  return result;
}

/**
 * Returns diatonic staff step relative to C4 (Middle C = step 0).
 * Every step is 1 diatonic letter (C=0, D=1, E=2, F=3, G=4, A=5, B=6).
 * Useful for positioning notes accurately on Treble and Bass clefs.
 */
export function midiToDiatonicStepFromC4(midi: number): {
  diatonicStep: number; // 0 = C4, 1 = D4, 2 = E4 ... -1 = B3, -2 = A3
  isSharp: boolean;
} {
  const octaveOffset = Math.floor(midi / 12) - 5; // MIDI 60 is octave 4 (60/12 = 5)
  const pitchClass = midi % 12;
  const pitchClassToStep: Record<number, { step: number; sharp: boolean }> = {
    0: { step: 0, sharp: false },  // C
    1: { step: 0, sharp: true },   // C#
    2: { step: 1, sharp: false },  // D
    3: { step: 1, sharp: true },   // D#
    4: { step: 2, sharp: false },  // E
    5: { step: 3, sharp: false },  // F
    6: { step: 3, sharp: true },   // F#
    7: { step: 4, sharp: false },  // G
    8: { step: 4, sharp: true },   // G#
    9: { step: 5, sharp: false },  // A
    10: { step: 5, sharp: true },  // A#
    11: { step: 6, sharp: false },  // B
  };
  const info = pitchClassToStep[pitchClass] || { step: 0, sharp: false };
  return {
    diatonicStep: octaveOffset * 7 + info.step,
    isSharp: info.sharp,
  };
}

// Computer keyboard mapping (2 octaves + bass support) for playing without hardware
export const COMPUTER_KEY_TO_MIDI: Record<string, number> = {
  // Lower octave (C3 to B3)
  z: 48, // C3
  s: 49, // C#3
  x: 50, // D3
  d: 51, // D#3
  c: 52, // E3
  v: 53, // F3
  g: 54, // F#3
  b: 55, // G3
  h: 56, // G#3
  n: 57, // A3
  j: 58, // A#3
  m: 59, // B3
  // Middle/Upper octave (C4 to E5)
  a: 60, // C4 (Middle C)
  w: 61, // C#4
  q: 60, // C4 alias
  '2': 61,
  r: 62, // D4
  e: 63, // D#4
  t: 64, // E4
  y: 65, // F4
  '6': 66, // F#4
  u: 67, // G4
  '7': 68, // G#4
  i: 69, // A4
  '8': 70, // A#4
  o: 71, // B4
  p: 72, // C5
  '[': 74, // D5
  ']': 76, // E5
};

// Also provide intuitive home-row mapping C4..E5 when user presses standard A S D F G H J K L ; '
export const HOME_ROW_KEY_TO_MIDI: Record<string, number> = {
  a: 60, // C4
  w: 61, // C#4
  s: 62, // D4
  e: 63, // D#4
  d: 64, // E4
  f: 65, // F4
  t: 66, // F#4
  g: 67, // G4
  y: 68, // G#4
  h: 69, // A4
  u: 70, // A#4
  j: 71, // B4
  k: 72, // C5
  o: 73, // C#5
  l: 74, // D5
  p: 75, // D#5
  ';': 76, // E5
  "'": 77, // F5
  // Bass keys on bottom row Z X C V B N M
  z: 48, // C3
  x: 50, // D3
  c: 52, // E3
  v: 53, // F3
  b: 55, // G3
  n: 57, // A3
  m: 59, // B3
};

export const MIDI_TO_HOME_KEY_LABEL: Record<number, string> = {
  48: 'Z',
  50: 'X',
  52: 'C',
  53: 'V',
  55: 'B',
  57: 'N',
  59: 'M',
  60: 'A',
  61: 'W',
  62: 'S',
  63: 'E',
  64: 'D',
  65: 'F',
  66: 'T',
  67: 'G',
  68: 'Y',
  69: 'H',
  70: 'U',
  71: 'J',
  72: 'K',
  73: 'O',
  74: 'L',
  75: 'P',
  76: ';',
};
