import { Song, SongNote } from '../types/music';
import { DEFAULT_MAX_MIDI, DEFAULT_MIN_MIDI } from './musicTheory';
import { titleFromFileName } from './scoreMetadata';

interface RawTrackNote {
  midi: number;
  startTick: number;
  endTick: number;
  velocity: number;
  trackIndex: number;
  channel: number;
}

interface TempoChange {
  tick: number;
  microsecondsPerBeat: number;
}

/**
 * Parses a Standard MIDI File (.mid / .midi) binary ArrayBuffer into a playable Song object
 * with synchronized falling notes, measure numbers, and Left/Right hand assignments.
 */
export function parseMidiFileBuffer(buffer: ArrayBuffer, fileName: string): Song {
  const bytes = new Uint8Array(buffer);
  let pos = 0;

  const readString = (len: number): string => {
    let str = '';
    for (let i = 0; i < len && pos < bytes.length; i++) {
      str += String.fromCharCode(bytes[pos++]);
    }
    return str;
  };

  const readUint16 = (): number => {
    const val = (bytes[pos] << 8) | bytes[pos + 1];
    pos += 2;
    return val;
  };

  const readUint32 = (): number => {
    const val =
      ((bytes[pos] << 24) >>> 0) +
      ((bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3]);
    pos += 4;
    return val;
  };

  const readVarLen = (): number => {
    let value = 0;
    while (pos < bytes.length) {
      const b = bytes[pos++];
      value = (value << 7) | (b & 0x7f);
      if ((b & 0x80) === 0) break;
    }
    return value;
  };

  const headerChunk = readString(4);
  if (headerChunk !== 'MThd') {
    throw new Error('Invalid MIDI file: Missing MThd header chunk.');
  }

  const headerLength = readUint32();
  const formatType = readUint16();
  const numTracks = readUint16();
  const timeDivision = readUint16();

  // Advance if header is longer than 6 bytes
  if (headerLength > 6) {
    pos += headerLength - 6;
  }

  const ticksPerBeat = (timeDivision & 0x8000) === 0 ? timeDivision : 480;
  const tempoChanges: TempoChange[] = [{ tick: 0, microsecondsPerBeat: 500000 }]; // Default 120 BPM
  let timeSigNumerator = 4;
  let timeSigDenominator = 4;
  let detectedTitle = '';
  let keySignature = 'C Major / Auto-Split';

  const rawNotes: RawTrackNote[] = [];

  for (let t = 0; t < numTracks && pos < bytes.length; t++) {
    const chunkId = readString(4);
    if (chunkId !== 'MTrk') {
      const skipLen = readUint32();
      pos += skipLen;
      continue;
    }

    const trackLength = readUint32();
    const trackEnd = Math.min(bytes.length, pos + trackLength);
    let currentTick = 0;
    let runningStatus = 0;

    // Active notes map: key = `${channel}-${midi}`
    const openNotes = new Map<string, { startTick: number; velocity: number }>();

    while (pos < trackEnd) {
      const delta = readVarLen();
      currentTick += delta;

      if (pos >= trackEnd) break;

      let statusByte = bytes[pos];
      if ((statusByte & 0x80) !== 0) {
        pos++;
        // Do not overwrite runningStatus on RealTime messages
        if (statusByte < 0xf0) {
          runningStatus = statusByte;
        }
      } else {
        statusByte = runningStatus;
      }

      if (statusByte === 0xff) {
        // Meta Event
        const metaType = bytes[pos++];
        const metaLen = readVarLen();
        const metaEnd = pos + metaLen;

        if (metaType === 0x51 && metaLen === 3) {
          // Set Tempo
          const mpqn = (bytes[pos] << 16) | (bytes[pos + 1] << 8) | bytes[pos + 2];
          tempoChanges.push({ tick: currentTick, microsecondsPerBeat: mpqn });
        } else if (metaType === 0x58 && metaLen >= 2) {
          // Time Signature
          timeSigNumerator = bytes[pos];
          timeSigDenominator = Math.pow(2, bytes[pos + 1]);
        } else if (metaType === 0x59 && metaLen === 2) {
          const fifths = bytes[pos] > 127 ? bytes[pos] - 256 : bytes[pos];
          const minor = bytes[pos + 1] === 1;
          const names = minor ? ['Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#']
            : ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
          if (names[fifths + 7]) keySignature = `${names[fifths + 7]} ${minor ? 'Minor' : 'Major'}`;
        } else if (metaType === 0x03 && !detectedTitle && metaLen > 0) {
          // Sequence/Track Name
          let txt = '';
          for (let i = 0; i < metaLen; i++) {
            const ch = bytes[pos + i];
            if (ch >= 32 && ch <= 126) txt += String.fromCharCode(ch);
          }
          if (txt.trim().length > 2 && !/^(control(?:\s*track)?|conductor(?:\s*track)?|piano|track(?:\s*\d+)?)$/i.test(txt.trim())) {
            detectedTitle = txt.trim();
          }
        }
        pos = metaEnd;
      } else if (statusByte === 0xf0 || statusByte === 0xf7) {
        // SysEx event
        const sysexLen = readVarLen();
        pos += sysexLen;
      } else {
        const command = statusByte & 0xf0;
        const channel = statusByte & 0x0f;

        if (command === 0x90) {
          const midi = bytes[pos++] & 0x7f;
          const velocity = bytes[pos++] & 0x7f;
          const key = `${channel}-${midi}`;

          if (velocity > 0) {
            openNotes.set(key, { startTick: currentTick, velocity });
          } else {
            const existing = openNotes.get(key);
            if (existing) {
              rawNotes.push({
                midi,
                startTick: existing.startTick,
                endTick: Math.max(existing.startTick + 30, currentTick),
                velocity: existing.velocity,
                trackIndex: t,
                channel,
              });
              openNotes.delete(key);
            }
          }
        } else if (command === 0x80) {
          const midi = bytes[pos++] & 0x7f;
          pos++; // release velocity
          const key = `${channel}-${midi}`;
          const existing = openNotes.get(key);
          if (existing) {
            rawNotes.push({
              midi,
              startTick: existing.startTick,
              endTick: Math.max(existing.startTick + 30, currentTick),
              velocity: existing.velocity,
              trackIndex: t,
              channel,
            });
            openNotes.delete(key);
          }
        } else if (command === 0xa0 || command === 0xb0 || command === 0xe0) {
          pos += 2;
        } else if (command === 0xc0 || command === 0xd0) {
          pos += 1;
        } else {
          // Unknown byte, advance safely
          pos++;
        }
      }
    }

    pos = trackEnd;
  }

  if (rawNotes.length === 0) {
    throw new Error('No playable MIDI Note events were found in the uploaded file.');
  }

  // Sort tempo changes by tick
  tempoChanges.sort((a, b) => a.tick - b.tick);
  const primaryMpqn = tempoChanges.filter(change => change.tick === 0).at(-1)!.microsecondsPerBeat;
  const primaryBpm = Math.max(40, Math.min(200, Math.round(60000000 / primaryMpqn)));

  // Helper to convert tick to seconds using tempo map
  const tickToSeconds = (targetTick: number): number => {
    let seconds = 0;
    let lastTick = 0;
    let currentMpqn = tempoChanges[0].microsecondsPerBeat;

    for (let i = 0; i < tempoChanges.length; i++) {
      const tc = tempoChanges[i];
      if (tc.tick >= targetTick) break;
      const deltaTicks = tc.tick - lastTick;
      seconds += (deltaTicks / ticksPerBeat) * (currentMpqn / 1000000);
      lastTick = tc.tick;
      currentMpqn = tc.microsecondsPerBeat;
    }

    const remainingTicks = targetTick - lastTick;
    seconds += (remainingTicks / ticksPerBeat) * (currentMpqn / 1000000);
    return seconds;
  };

  // Sort notes chronologically
  rawNotes.sort((a, b) => a.startTick - b.startTick || a.midi - b.midi);

  // Normalize start offset so first note starts at 1.0s lead-in
  const firstNoteSec = tickToSeconds(rawNotes[0].startTick);
  const quarterBeatsPerMeasure = timeSigNumerator * 4 / timeSigDenominator;

  // Check if multi-track format 1 has distinct treble/bass tracks
  const distinctTracks = Array.from(new Set(rawNotes.map((n) => n.trackIndex)));

  const notes: SongNote[] = rawNotes.slice(0, 600).map((rn, idx) => {
    // Clamp into playable 49-key studio range by octave folding if extreme
    let midi = rn.midi;
    while (midi < DEFAULT_MIN_MIDI) midi += 12;
    while (midi > DEFAULT_MAX_MIDI) midi -= 12;

    const startTime = Math.max(0.8, Number((tickToSeconds(rn.startTick) - firstNoteSec + 1.0).toFixed(3)));
    const rawDur = tickToSeconds(rn.endTick) - tickToSeconds(rn.startTick);
    const duration = Math.max(0.18, Math.min(4.0, Number(rawDur.toFixed(3))));

    let hand: 'right' | 'left' = midi >= 60 ? 'right' : 'left';
    if (formatType === 1 && distinctTracks.length >= 2) {
      if (rn.trackIndex === distinctTracks[0] && midi >= 55) hand = 'right';
      else if (rn.trackIndex === distinctTracks[1] && midi < 64) hand = 'left';
    }

    const measure = Math.max(1, Math.floor(((rn.startTick - rawNotes[0].startTick) / ticksPerBeat) / quarterBeatsPerMeasure) + 1);
    const fingerOptions: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];
    const finger = fingerOptions[midi % 5];

    return {
      id: `custom-${idx}-${midi}`,
      midi,
      startTime,
      duration,
      hand,
      finger,
      velocity: rn.velocity,
      measure,
    };
  });

  const maxEnd = Math.max(...notes.map((n) => n.startTime + n.duration));
  const durationSeconds = Number(maxEnd.toFixed(2));

  // Estimate difficulty level 1-5 based on note density (notes per second)
  const notesPerSec = notes.length / Math.max(5, durationSeconds);
  let level: 1 | 2 | 3 | 4 | 5 = 2;
  if (notesPerSec < 1.3) level = 1;
  else if (notesPerSec < 2.2) level = 2;
  else if (notesPerSec < 3.2) level = 3;
  else if (notesPerSec < 4.5) level = 4;
  else level = 5;

  const cleanFileTitle = titleFromFileName(fileName);

  const hasRight = notes.some((n) => n.hand === 'right');
  const hasLeft = notes.some((n) => n.hand === 'left');
  let handArrangement: 'right-only' | 'left-only' | 'alternating-hands' | 'two-hands' = 'two-hands';
  if (hasRight && !hasLeft) {
    handArrangement = 'right-only';
  } else if (hasLeft && !hasRight) {
    handArrangement = 'left-only';
  } else {
    // Check if right and left hands ever overlap in time
    const hasSimultaneousHands = notes.some((n1) =>
      notes.some(
        (n2) =>
          n1.hand !== n2.hand &&
          Math.abs(n1.startTime - n2.startTime) < 0.08
      )
    );
    handArrangement = hasSimultaneousHands ? 'two-hands' : 'alternating-hands';
  }

  return {
    id: `midi-upload-${Date.now()}`,
    title: detectedTitle || cleanFileTitle || 'Imported MIDI Score',
    composer: 'Custom MIDI Import',
    level,
    bpm: primaryBpm,
    timeSignature: [timeSigNumerator, timeSigDenominator],
    keySignature,
    category: 'Custom MIDI',
    handArrangement,
    description: `Imported from ${fileName} (${notes.length} notes across ${distinctTracks.length} track${distinctTracks.length > 1 ? 's' : ''}). Automatically split into Right Hand and Left Hand parts.`,
    focusSkill: 'Custom MIDI Sight-Reading & Hand Coordination',
    durationSeconds,
    notes,
    isCustomMidi: true,
  };
}

/**
 * Generates a real Standard MIDI File (.mid) binary ArrayBuffer for J.S. Bach's
 * "Musette in D Major (BWV Anh. 126 - C Major Transcription)" so users can test
 * the MIDI upload pipeline or download a sample .mid file immediately.
 */
export function createSampleBachMidiBuffer(): { buffer: ArrayBuffer; fileName: string } {
  // Build a valid SMF Format 0 binary file with MThd and MTrk chunks
  const writeVarLen = (val: number): number[] => {
    const buffer: number[] = [val & 0x7f];
    while ((val >>= 7) > 0) {
      buffer.unshift((val & 0x7f) | 0x80);
    }
    return buffer;
  };

  const trackEvents: number[] = [];

  // Track Name Meta Event: "Bach Musette (Sample MIDI)"
  const titleStr = 'Bach Musette in C (Sample MIDI)';
  trackEvents.push(0x00, 0xff, 0x03, titleStr.length);
  for (let i = 0; i < titleStr.length; i++) {
    trackEvents.push(titleStr.charCodeAt(i));
  }

  // Tempo Meta Event: 100 BPM (600,000 microseconds per beat = 0x0927C0)
  trackEvents.push(0x00, 0xff, 0x51, 0x03, 0x09, 0x27, 0xc0);

  // Melody + Bass notes in ticks (480 ticks per quarter note)
  // Format: [deltaTicksFromPrevEvent, status, midi, velocity]
  const noteSequence: { startTick: number; durTicks: number; midi: number; vel: number }[] = [
    // Measure 1
    { startTick: 0, durTicks: 440, midi: 67, vel: 92 },   // G4 RH
    { startTick: 0, durTicks: 440, midi: 48, vel: 78 },   // C3 LH
    { startTick: 240, durTicks: 220, midi: 69, vel: 85 }, // A4
    { startTick: 480, durTicks: 220, midi: 67, vel: 88 }, // G4
    { startTick: 480, durTicks: 440, midi: 55, vel: 78 }, // G3 LH
    { startTick: 720, durTicks: 220, midi: 65, vel: 84 }, // F4
    { startTick: 960, durTicks: 440, midi: 64, vel: 94 }, // E4
    { startTick: 960, durTicks: 440, midi: 48, vel: 78 }, // C3 LH
    { startTick: 1440, durTicks: 440, midi: 60, vel: 90 },// C4
    { startTick: 1440, durTicks: 440, midi: 55, vel: 78 },// G3 LH
    // Measure 2
    { startTick: 1920, durTicks: 440, midi: 67, vel: 92 },// G4
    { startTick: 1920, durTicks: 440, midi: 48, vel: 78 },// C3 LH
    { startTick: 2160, durTicks: 220, midi: 69, vel: 86 },// A4
    { startTick: 2400, durTicks: 220, midi: 67, vel: 88 },// G4
    { startTick: 2400, durTicks: 440, midi: 55, vel: 78 },// G3 LH
    { startTick: 2640, durTicks: 220, midi: 65, vel: 84 },// F4
    { startTick: 2880, durTicks: 900, midi: 64, vel: 95 },// E4
    { startTick: 2880, durTicks: 440, midi: 48, vel: 80 },// C3 LH
    { startTick: 3360, durTicks: 440, midi: 55, vel: 78 },// G3 LH
    // Measure 3
    { startTick: 3840, durTicks: 440, midi: 62, vel: 88 },// D4
    { startTick: 3840, durTicks: 440, midi: 55, vel: 76 },// G3 LH
    { startTick: 4320, durTicks: 440, midi: 65, vel: 90 },// F4
    { startTick: 4320, durTicks: 440, midi: 59, vel: 76 },// B3 LH
    { startTick: 4800, durTicks: 440, midi: 64, vel: 92 },// E4
    { startTick: 4800, durTicks: 440, midi: 60, vel: 78 },// C4 LH
    { startTick: 5280, durTicks: 440, midi: 62, vel: 88 },// D4
    { startTick: 5280, durTicks: 440, midi: 55, vel: 76 },// G3 LH
    { startTick: 5760, durTicks: 960, midi: 60, vel: 98 },// C4 Final
    { startTick: 5760, durTicks: 960, midi: 48, vel: 88 },// C3 Final LH
  ];

  // Expand into discrete Note On / Note Off MIDI events
  const midiEvents: { tick: number; status: number; data1: number; data2: number }[] = [];
  for (const n of noteSequence) {
    midiEvents.push({ tick: n.startTick, status: 0x90, data1: n.midi, data2: n.vel });
    midiEvents.push({ tick: n.startTick + n.durTicks, status: 0x80, data1: n.midi, data2: 0 });
  }
  midiEvents.sort((a, b) => a.tick - b.tick || a.status - b.status);

  let prevTick = 0;
  for (const ev of midiEvents) {
    const delta = ev.tick - prevTick;
    prevTick = ev.tick;
    trackEvents.push(...writeVarLen(delta), ev.status, ev.data1, ev.data2);
  }

  // End of Track Meta Event
  trackEvents.push(0x00, 0xff, 0x2f, 0x00);

  const trackLen = trackEvents.length;
  const header = [
    0x4d, 0x54, 0x68, 0x64, // "MThd"
    0x00, 0x00, 0x00, 0x06, // Header length = 6
    0x00, 0x00,             // Format 0
    0x00, 0x01,             // 1 track
    0x01, 0xe0,             // 480 ticks per beat
    0x4d, 0x54, 0x72, 0x6b, // "MTrk"
    (trackLen >> 24) & 0xff,
    (trackLen >> 16) & 0xff,
    (trackLen >> 8) & 0xff,
    trackLen & 0xff,
  ];

  const fullArray = new Uint8Array([...header, ...trackEvents]);
  return {
    buffer: fullArray.buffer,
    fileName: 'Bach_Musette_in_C_Sample.mid',
  };
}
