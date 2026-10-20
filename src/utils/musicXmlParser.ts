import { strFromU8, unzipSync } from 'fflate';
import { Song, SongNote } from '../types/music';
import { DEFAULT_MAX_MIDI, DEFAULT_MIN_MIDI } from './musicTheory';
import { titleFromFileName } from './scoreMetadata';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_XML_BYTES = 20 * 1024 * 1024;
const MAX_NOTES = 10000;
const PITCH_STEPS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const BEAT_UNITS: Record<string, number> = { whole: 4, half: 2, quarter: 1, eighth: 0.5, '16th': 0.25, '32nd': 0.125 };

interface ScoreNote {
  midi: number;
  beat: number;
  length: number;
  hand: 'right' | 'left';
  finger?: SongNote['finger'];
  measure: number;
}

interface PartState {
  divisions: number;
  beats: number;
  beatType: number;
  staves: number;
  clefs: Map<number, string>;
  transpositions: Map<number, number>;
}

const children = (element: Element, name: string): Element[] =>
  Array.from(element.children).filter(child => child.localName === name);
const child = (element: Element, name: string): Element | undefined => children(element, name)[0];
const text = (element: Element, name: string): string => child(element, name)?.textContent?.trim() || '';
const descendants = (element: Element, name: string): Element[] =>
  Array.from(element.getElementsByTagName('*')).filter(node => node.localName === name);

function positive(value: string, label: string): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`Invalid MusicXML ${label}.`);
  return number;
}

function xmlDocument(xml: string): Document {
  if (/<!ENTITY\s/i.test(xml)) throw new Error('MusicXML entity declarations are not supported.');
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.getElementsByTagName('parsererror').length) throw new Error('Invalid MusicXML: malformed XML.');
  return document;
}

function decodeXml(bytes: Uint8Array): string {
  const prefix = strFromU8(bytes.subarray(0, 200));
  const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le'
    : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be'
    : prefix.match(/<\?xml[^>]*encoding=["']([^"']+)["']/i)?.[1] || 'utf-8';
  return new TextDecoder(encoding).decode(bytes);
}

export function parseMusicXmlFileBuffer(buffer: ArrayBuffer, fileName: string): Song {
  if (buffer.byteLength > MAX_FILE_BYTES) throw new Error('Score files must be smaller than 10 MB.');
  let bytes = new Uint8Array(buffer);
  if (/\.mxl$/i.test(fileName) || (bytes[0] === 0x50 && bytes[1] === 0x4b)) {
    let totalSize = 0;
    let entryCount = 0;
    const files = unzipSync(bytes, {
      filter: file => {
        totalSize += file.originalSize;
        entryCount++;
        if (totalSize > MAX_XML_BYTES || entryCount > 1000) throw new Error('MusicXML archive is too large.');
        return true;
      },
    });
    const container = files['META-INF/container.xml'];
    if (!container) throw new Error('Invalid MXL archive: missing META-INF/container.xml.');
    const containerRoot = xmlDocument(decodeXml(container)).documentElement;
    const roots = descendants(containerRoot, 'rootfile');
    const rootFile = roots.find(root => root.getAttribute('media-type') === 'application/vnd.recordare.musicxml+xml') || roots[0];
    const path = rootFile?.getAttribute('full-path');
    if (!path || !Object.hasOwn(files, path)) throw new Error('Invalid MXL archive: score document not found.');
    bytes = files[path];
  }
  return parseMusicXml(decodeXml(bytes), fileName);
}

export function parseMusicXml(xml: string, fileName: string): Song {
  if (new TextEncoder().encode(xml).byteLength > MAX_XML_BYTES) throw new Error('MusicXML document is too large.');
  let defaultTempo = 120;
  if (/^[{\[]/.test(xml.trimStart())) {
    let exported: unknown;
    try {
      exported = JSON.parse(xml);
    } catch {
      throw new Error('Invalid score export: malformed JSON.');
    }
    if (!exported || typeof exported !== 'object' || Array.isArray(exported)
      || !('musicxml' in exported) || typeof exported.musicxml !== 'string' || !exported.musicxml.trim()) {
      throw new Error('Invalid score export: expected a nonempty musicxml string.');
    }
    const metadata = 'meta' in exported && exported.meta && typeof exported.meta === 'object' ? exported.meta : undefined;
    const tempo = 'tempo_bpm' in exported && exported.tempo_bpm != null ? exported.tempo_bpm
      : metadata && 'tempo_bpm' in metadata ? metadata.tempo_bpm : undefined;
    if (tempo != null) {
      if (typeof tempo !== 'string' && typeof tempo !== 'number') throw new Error('Invalid score export tempo.');
      defaultTempo = positive(String(tempo), 'export tempo');
    }
    xml = exported.musicxml;
  }
  const root = xmlDocument(xml).documentElement;
  if (root.localName !== 'score-partwise' && root.localName !== 'score-timewise') {
    throw new Error('Expected a MusicXML score-partwise or score-timewise document.');
  }
  const parts = new Map<string, Element[]>();
  if (root.localName === 'score-partwise') {
    for (const part of children(root, 'part')) parts.set(part.getAttribute('id') || String(parts.size), children(part, 'measure'));
  } else {
    const measures = children(root, 'measure');
    for (const [index, measure] of measures.entries()) {
      for (const part of children(measure, 'part')) {
        const id = part.getAttribute('id') || 'P1';
        const entries = parts.get(id) || new Array<Element>(measures.length);
        entries[index] = part;
        parts.set(id, entries);
      }
    }
  }
  const states = new Map<string, PartState>();
  const notes: ScoreNote[] = [];
  const ties = new Map<string, ScoreNote>();
  const tempos = [{ beat: 0, bpm: defaultTempo }];
  let initialTime: [number, number] | undefined;
  let keySignature = 'C Major';
  let hasKey = false;
  let measureStart = 0;
  let eventCount = 0;
  const measureCount = Math.max(0, ...Array.from(parts.values(), measures => measures.length));

  for (let index = 0; index < measureCount; index++) {
    let measureLength = 0;
    let nominalLength = 0;
    let implicit = false;
    for (const [partId, measures] of parts) {
      const measure = measures[index];
      if (!measure) continue;
      implicit ||= (root.localName === 'score-timewise' ? measure.parentElement : measure)?.getAttribute('implicit') === 'yes';
      const state = states.get(partId) || { divisions: 1, beats: 4, beatType: 4, staves: 1, clefs: new Map(), transpositions: new Map() };
      states.set(partId, state);
      let position = 0;
      let partLength = 0;
      const chordStarts = new Map<string, number>();
      for (const event of Array.from(measure.children)) {
        if (++eventCount > 250000) throw new Error('MusicXML score contains too many events.');
        if (event.localName === 'attributes') {
          if (child(event, 'divisions')) state.divisions = positive(text(event, 'divisions'), 'divisions');
          if (child(event, 'staves')) state.staves = positive(text(event, 'staves'), 'staff count');
          const time = child(event, 'time');
          if (time) {
            const counts = children(time, 'beats').map(node => (node.textContent || '').split('+').reduce((sum, value) => sum + positive(value, 'time signature'), 0));
            const units = children(time, 'beat-type').map(node => positive(node.textContent || '', 'beat unit'));
            if (!counts.length || counts.length !== units.length || new Set(units).size > 1) throw new Error('This MusicXML time signature is not supported.');
            state.beats = counts.reduce((sum, count) => sum + count, 0);
            state.beatType = units[0];
            initialTime ||= [state.beats, state.beatType];
          }
          for (const clef of children(event, 'clef')) state.clefs.set(Number(clef.getAttribute('number') || 1), text(clef, 'sign'));
          for (const transpose of children(event, 'transpose')) {
            const shift = Number(text(transpose, 'chromatic') || 0) + Number(text(transpose, 'octave-change') || 0) * 12;
            if (!Number.isInteger(shift)) throw new Error('Microtonal transposition is not supported.');
            state.transpositions.set(Number(transpose.getAttribute('number') || 0), shift);
          }
          const key = child(event, 'key');
          if (key && !hasKey) {
            const fifths = Number(text(key, 'fifths') || 0);
            const minor = text(key, 'mode') === 'minor';
            const names = minor ? ['Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#']
              : ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
            keySignature = `${names[fifths + 7] || 'C'} ${minor ? 'Minor' : 'Major'}`;
            hasKey = true;
          }
        } else if (event.localName === 'backup' || event.localName === 'forward') {
          const amount = positive(text(event, 'duration'), 'voice duration') / state.divisions;
          position += event.localName === 'backup' ? -amount : amount;
          if (position < -0.000001) throw new Error('Invalid MusicXML: backup precedes the measure.');
          position = Math.max(0, position);
          partLength = Math.max(partLength, position);
        } else if (event.localName === 'direction' || event.localName === 'sound') {
          const sound = event.localName === 'sound' ? event : child(event, 'sound');
          const metronome = descendants(event, 'metronome')[0];
          let bpm = sound?.getAttribute('tempo');
          if (!bpm && metronome && BEAT_UNITS[text(metronome, 'beat-unit')]) {
            const dots = children(metronome, 'beat-unit-dot').length;
            bpm = String(positive(text(metronome, 'per-minute'), 'tempo') * BEAT_UNITS[text(metronome, 'beat-unit')] * (2 - 2 ** -dots));
          }
          if (bpm) {
            const offset = Number(text(event, 'offset') || 0) / state.divisions;
            if (!Number.isFinite(offset)) throw new Error('Invalid MusicXML tempo offset.');
            tempos.push({ beat: Math.max(0, measureStart + position + offset), bpm: positive(bpm, 'tempo') });
          }
        } else if (event.localName === 'note') {
          if (child(event, 'grace')) continue;
          const duration = text(event, 'duration');
          const rest = child(event, 'rest');
          const length = duration ? positive(duration, 'note duration') / state.divisions
            : rest?.getAttribute('measure') === 'yes' ? state.beats * 4 / state.beatType : 0;
          if (!length) throw new Error('MusicXML note is missing a duration.');
          const staff = Number(text(event, 'staff') || 1);
          const voice = text(event, 'voice') || '1';
          const chordKey = voice;
          const isChord = Boolean(child(event, 'chord'));
          const onset = isChord ? chordStarts.get(chordKey) : position;
          if (onset === undefined) throw new Error('Invalid MusicXML chord without a preceding note.');
          if (!isChord) {
            chordStarts.set(chordKey, onset);
            position += length;
          }
          partLength = Math.max(partLength, onset + length);
          if (rest || child(event, 'unpitched') || child(event, 'cue')) continue;
          const pitch = child(event, 'pitch');
          if (!pitch) throw new Error('MusicXML note is missing pitch information.');
          const step = PITCH_STEPS[text(pitch, 'step')];
          const octave = Number(text(pitch, 'octave'));
          const alter = Number(text(pitch, 'alter') || 0);
          const midi = (octave + 1) * 12 + step + alter + (state.transpositions.get(staff) ?? state.transpositions.get(0) ?? 0);
          if (!text(pitch, 'octave') || !Number.isInteger(octave) || !Number.isInteger(alter) || !Number.isInteger(midi)) throw new Error('Invalid or microtonal MusicXML pitch.');
          if (midi < DEFAULT_MIN_MIDI || midi > DEFAULT_MAX_MIDI) throw new Error('This score includes notes outside the supported C2-C6 piano range.');
          const clef = state.clefs.get(staff);
          const hand = state.staves > 1 || staff > 1 ? staff > 1 ? 'left' : 'right'
            : clef === 'F' ? 'left' : clef === 'G' ? 'right' : midi < 60 ? 'left' : 'right';
          const fingering = Number(descendants(event, 'fingering')[0]?.textContent);
          const finger = Number.isInteger(fingering) && fingering >= 1 && fingering <= 5 ? fingering as SongNote['finger'] : undefined;
          const tieEvents = [...children(event, 'tie'), ...descendants(event, 'tied')];
          const startsTie = tieEvents.some(tie => tie.getAttribute('type') === 'start');
          const stopsTie = tieEvents.some(tie => tie.getAttribute('type') === 'stop');
          const tieKey = `${partId}:${voice}:${staff}:${midi}`;
          const previous = ties.get(tieKey);
          let note: ScoreNote;
          if (stopsTie && previous && Math.abs(previous.beat + previous.length - measureStart - onset) < 0.00001) {
            previous.length += length;
            note = previous;
          } else {
            note = { midi, beat: measureStart + onset, length, hand, finger, measure: index + 1 };
            notes.push(note);
            if (notes.length > MAX_NOTES) throw new Error('MusicXML scores may contain at most 10,000 notes.');
          }
          if (startsTie) ties.set(tieKey, note);
          else ties.delete(tieKey);
        }
      }
      nominalLength = Math.max(nominalLength, state.beats * 4 / state.beatType);
      measureLength = Math.max(measureLength, partLength);
    }
    measureStart += implicit && measureLength > 0 ? measureLength : Math.max(measureLength, nominalLength);
  }
  if (!notes.length) throw new Error('No playable pitched notes were found in the MusicXML score.');
  tempos.sort((first, second) => first.beat - second.beat);
  const tempoSegments: { beat: number; bpm: number; seconds: number }[] = [];
  for (const tempo of tempos) {
    const previous = tempoSegments.at(-1);
    const seconds = previous ? previous.seconds + (tempo.beat - previous.beat) * 60 / previous.bpm : 0;
    if (previous?.beat === tempo.beat) tempoSegments.pop();
    tempoSegments.push({ ...tempo, seconds });
  }
  const secondsAt = (beat: number): number => {
    let lower = 0;
    let upper = tempoSegments.length - 1;
    while (lower < upper) {
      const middle = Math.ceil((lower + upper) / 2);
      if (tempoSegments[middle].beat <= beat) lower = middle;
      else upper = middle - 1;
    }
    const segment = tempoSegments[lower];
    return segment.seconds + (beat - segment.beat) * 60 / segment.bpm;
  };
  notes.sort((first, second) => first.beat - second.beat || first.midi - second.midi);
  const sessionNotes: SongNote[] = notes.map((note, index) => ({
    id: `musicxml-note-${index}`,
    midi: note.midi,
    startTime: secondsAt(note.beat) + 1.2,
    duration: secondsAt(note.beat + note.length) - secondsAt(note.beat),
    hand: note.hand,
    finger: note.finger,
    measure: note.measure,
    velocity: 85,
  }));
  const durationSeconds = Math.max(...sessionNotes.map(note => note.startTime + note.duration));
  const hasRight = notes.some(note => note.hand === 'right');
  const hasLeft = notes.some(note => note.hand === 'left');
  const simultaneous = new Map<number, Set<string>>();
  for (const note of notes) {
    const hands = simultaneous.get(note.beat) || new Set<string>();
    hands.add(note.hand);
    simultaneous.set(note.beat, hands);
  }
  const handArrangement = !hasLeft ? 'right-only' : !hasRight ? 'left-only'
    : Array.from(simultaneous.values()).some(hands => hands.size > 1) ? 'two-hands' : 'alternating-hands';
  const density = notes.length / Math.max(5, durationSeconds);
  const level = density < 1.3 ? 1 : density < 2.2 ? 2 : density < 3.2 ? 3 : density < 4.5 ? 4 : 5;
  const creator = descendants(root, 'creator').find(element => element.getAttribute('type') === 'composer');
  return {
    id: `musicxml-upload-${crypto.randomUUID()}`,
    title: descendants(root, 'work-title')[0]?.textContent?.trim() || text(root, 'movement-title') || titleFromFileName(fileName),
    composer: creator?.textContent?.trim() || '',
    level,
    bpm: tempos.filter(tempo => tempo.beat === 0).at(-1)?.bpm || defaultTempo,
    timeSignature: initialTime || [4, 4],
    keySignature,
    category: 'MusicXML',
    handArrangement,
    description: `Imported from ${fileName} (${notes.length} notes). Written score order; repeats and ornaments are not expanded.`,
    focusSkill: 'Score reading and hand coordination',
    durationSeconds,
    notes: sessionNotes,
    importFormat: 'musicxml',
  };
}