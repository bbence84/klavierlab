import { Accidental, BarlineType, Beam, Dot, FretHandFinger, ModifierContext, Renderer, Stave, StaveConnector, StaveNote, SVGContext, TickContext, Tuplet } from 'vexflow/bravura';
import { HandSelection, Song, SongNote } from '../types/music';

export const NOTATION_HEIGHT = 280;
export const NOTATION_HEADER = 150;

interface Rhythm {
  duration: string;
  beats: number;
  dots: number;
  triplet: boolean;
}

export interface NotationEvent {
  time: number;
  duration: number;
  measure: number;
  hand: 'right' | 'left';
  notes: SongNote[];
  rhythm: Rhythm;
}

export function inferRhythm(beats: number): Rhythm {
  const choices: Rhythm[] = [];
  for (const [duration, length] of [['w', 4], ['h', 2], ['q', 1], ['8', 0.5], ['16', 0.25], ['32', 0.125]] as const) {
    choices.push({ duration, beats: length, dots: 0, triplet: false });
    choices.push({ duration, beats: length * 1.5, dots: 1, triplet: false });
    choices.push({ duration, beats: length * 1.75, dots: 2, triplet: false });
    if (length <= 1) choices.push({ duration, beats: length * 2 / 3, dots: 0, triplet: true });
  }
  const exact = choices.find(choice => Math.abs(choice.beats - beats) / choice.beats < 0.015);
  if (exact) return exact;
  const simple = choices.find(choice => !choice.triplet && choice.dots === 0 && Math.abs(choice.beats - beats) / choice.beats < 0.13);
  if (simple) return simple;
  const dotted = choices.find(choice => !choice.triplet && choice.dots === 1 && Math.abs(choice.beats - beats) / choice.beats < 0.13);
  return dotted || choices.reduce((best, choice) => Math.abs(choice.beats - beats) < Math.abs(best.beats - beats) ? choice : best);
}

export function buildNotationEvents(song: Song): NotationEvent[] {
  const secondsPerBeat = 60 / song.bpm;
  const firstTime = Math.min(...song.notes.map(note => note.startTime));
  const endTime = Math.max(...song.notes.map(note => note.startTime + note.duration));
  const measureBeats = song.timeSignature[0] * 4 / song.timeSignature[1];
  const groups = new Map<string, NotationEvent>();
  for (const note of song.notes) {
    const rhythm = inferRhythm(note.duration / secondsPerBeat);
    const key = `${note.hand}:${Math.round(note.startTime * 1000)}:${rhythm.duration}:${rhythm.dots}:${rhythm.triplet}`;
    const existing = groups.get(key);
    if (existing && !existing.notes.some(member => member.midi === note.midi)) existing.notes.push(note);
    else if (!existing) groups.set(key, { time: note.startTime, duration: note.duration, measure: note.measure || Math.floor((note.startTime - firstTime) / secondsPerBeat / measureBeats) + 1, hand: note.hand, notes: [note], rhythm });
  }
  const events = Array.from(groups.values());
  for (const hand of ['right', 'left'] as const) {
    const handEvents = events.filter(event => event.hand === hand).sort((first, second) => first.time - second.time);
    let cursor = firstTime;
    for (const event of [...handEvents, { time: endTime, duration: 0 }]) {
      let gap = event.time - cursor;
      while (gap / secondsPerBeat >= 0.24) {
        const remainingInBar = measureBeats - ((cursor - firstTime) / secondsPerBeat % measureBeats);
        const length = Math.min(gap / secondsPerBeat, remainingInBar, 4);
        if (length < 0.24) break;
        const rhythm = inferRhythm(length);
        const duration = Math.min(gap, rhythm.beats * secondsPerBeat);
        events.push({ time: cursor, duration, hand, notes: [], rhythm, measure: Math.floor((cursor - firstTime) / secondsPerBeat / measureBeats + 0.0001) + 1 });
        cursor += duration;
        gap = event.time - cursor;
      }
      cursor = Math.max(cursor, event.time + event.duration);
    }
  }
  return events.sort((first, second) => first.time - second.time || first.hand.localeCompare(second.hand));
}

export function notationKey(keySignature: string): string {
  const match = keySignature.match(/^([A-G](?:b|#)?)\s+(Major|Minor)/i);
  return match ? `${match[1]}${match[2].toLowerCase() === 'minor' ? 'm' : ''}` : 'C';
}

function pitchKey(midi: number, flats: boolean): { key: string; letter: string; accidental: string } {
  const names = flats ? ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b'] : ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
  const name = names[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return { key: `${name}/${octave}`, letter: `${name[0]}/${octave}`, accidental: name.slice(1) };
}

interface RenderOptions {
  song: Song;
  events: NotationEvent[];
  width: number;
  origin: number;
  secondsPerUnit: number;
  start: number;
  end: number;
  handSelection: HandSelection;
  light: boolean;
}

export function renderVexFlow(container: SVGGElement, options: RenderOptions): void {
  const { song, width, origin, secondsPerUnit, start, end, light, handSelection } = options;
  const holder = document.createElement('div');
  const renderer = new Renderer(holder, Renderer.Backends.SVG);
  renderer.resize(width, NOTATION_HEIGHT);
  const context = renderer.getContext() as SVGContext;
  const ink = light ? '#52525b' : '#a1a1aa';
  context.setFillStyle(ink).setStrokeStyle(ink);
  const background = light ? '#ffffff' : '#1b1c1f';
  const key = notationKey(song.keySignature);
  const majorKeys = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
  const minorKeys = ['Abm', 'Ebm', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm', 'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'A#m'];
  const fifths = (key.endsWith('m') ? minorKeys : majorKeys).indexOf(key) - 7;
  const signature = new Map<string, string>();
  for (const letter of (fifths < 0 ? 'beadgcf' : 'fcgdaeb').slice(0, Math.abs(fifths))) signature.set(letter, fifths < 0 ? 'b' : '#');
  const timeSignature = `${song.timeSignature[0]}/${song.timeSignature[1]}`;
  const treble = new Stave(0, 30, width).setBegBarType(BarlineType.NONE).setEndBarType(BarlineType.NONE);
  const bass = new Stave(0, 140, width).setBegBarType(BarlineType.NONE).setEndBarType(BarlineType.NONE);
  for (const stave of [treble, bass]) stave.setStyle({ strokeStyle: ink, fillStyle: ink }).setContext(context).draw();
  const moving = context.openGroup('notation-timeline');
  moving.classList.add('notation-timeline');
  moving.setAttribute('data-origin', String(origin));
  moving.setAttribute('data-seconds-per-unit', String(secondsPerUnit));
  const firstTime = Math.min(...song.notes.map(note => note.startTime));
  const secondsPerBar = 60 / song.bpm * song.timeSignature[0] * 4 / song.timeSignature[1];
  for (let measure = Math.max(0, Math.floor((start - firstTime) / secondsPerBar)); firstTime + measure * secondsPerBar <= end; measure++) {
    const position = NOTATION_HEADER + (firstTime + measure * secondsPerBar - origin) / secondsPerUnit;
    context.setStrokeStyle(light ? '#d4d4d8' : '#3f3f46').setLineWidth(1).beginPath().moveTo(position, treble.getYForLine(0)).lineTo(position, bass.getYForLine(4)).stroke();
    context.setFont('Academico', 10).setFillStyle(ink).fillText(String(measure + 1), position + 4, 20);
  }
  const accidentals = new Map<string, string>();
  const drawn: { event: NotationEvent; note: StaveNote }[] = [];
  for (const event of options.events.filter(event => event.time >= start - 8 && event.time <= end)) {
    const stave = event.hand === 'right' ? treble : bass;
    const members = [...event.notes].sort((first, second) => first.midi - second.midi);
    const pitches = members.map(note => pitchKey(note.midi, fifths < 0));
    const note = new StaveNote({ keys: pitches.length ? pitches.map(pitch => pitch.key) : [event.hand === 'right' ? 'b/4' : 'd/3'], clef: event.hand === 'right' ? 'treble' : 'bass', duration: `${event.rhythm.duration}${pitches.length ? '' : 'r'}`, dots: event.rhythm.dots, autoStem: true });
    if (event.rhythm.dots) for (let dot = 0; dot < event.rhythm.dots; dot++) Dot.buildAndAttach([note], { all: true });
    pitches.forEach((pitch, index) => {
      const stateKey = `${event.hand}:${event.measure}:${pitch.letter}`;
      const previous = accidentals.get(stateKey) ?? signature.get(pitch.letter[0]) ?? '';
      if (pitch.accidental !== previous) note.addModifier(new Accidental(pitch.accidental || 'n'), index);
      accidentals.set(stateKey, pitch.accidental);
      if (members[index].finger) note.addModifier(new FretHandFinger(String(members[index].finger)).setPosition('above'), index);
    });
    note.setStave(stave);
    note.addToModifierContext(new ModifierContext());
    const tick = new TickContext().addTickable(note).preFormat();
    const target = NOTATION_HEADER + (event.time - origin) / secondsPerUnit;
    tick.setX(target - (note.getAbsoluteX() - tick.getX()));
    note.setContext(context);
    drawn.push({ event, note });
  }
  const beamGroups = new Map<string, typeof drawn>();
  const beamBeats = song.timeSignature[1] === 8 && song.timeSignature[0] % 3 === 0 ? 1.5 : 1;
  for (const item of drawn) {
    if (!item.event.notes.length || !['8', '16', '32'].includes(item.event.rhythm.duration)) continue;
    const beat = Math.round((item.event.time - firstTime) * song.bpm / 60 * 96) / 96;
    const beatGroup = Math.floor((beat + 0.000001) / beamBeats);
    const id = `${item.event.hand}:${item.event.measure}:${beatGroup}:${item.event.rhythm.triplet}`;
    const entries = beamGroups.get(id) || [];
    entries.push(item);
    beamGroups.set(id, entries);
  }
  const beams: Beam[] = [];
  const tuplets: Tuplet[] = [];
  for (const items of beamGroups.values()) {
    if (items.length < 2 || items.some((item, index) => index && item.event.time <= items[index - 1].event.time)) continue;
    const beam = new Beam(items.map(item => item.note), true);
    beam.setStyle({ fillStyle: ink, strokeStyle: ink });
    beams.push(beam);
    if (items.length === 3 && items.every(item => item.event.rhythm.triplet)) tuplets.push(new Tuplet(items.map(item => item.note), { numNotes: 3, notesOccupied: 2, bracketed: false }));
  }
  for (const { event, note } of drawn) {
    const group = context.openGroup('notation-event');
    group.classList.add('notation-event');
    group.setAttribute('data-time', String(event.time));
    group.setAttribute('data-end', String(event.time + event.duration));
    group.setAttribute('data-hand', event.hand);
    group.setAttribute('data-note-ids', event.notes.map(source => source.id).join(' '));
    group.setAttribute('data-rest', String(!event.notes.length));
    const targetHand = handSelection === 'both' || handSelection === event.hand;
    const missed = event.notes.some(source => source.status === 'missed');
    const hit = event.notes.length > 0 && event.notes.every(source => source.status === 'hit');
    const color = !targetHand || !event.notes.length ? ink : missed ? '#dc2626' : hit ? '#059669' : event.hand === 'right' ? light ? '#228461' : '#87d9ba' : light ? '#a16b20' : '#e7b76c';
    group.setAttribute('opacity', targetHand ? '1' : '0.35');
    note.setStyle({ fillStyle: color, strokeStyle: color }).draw();
    context.closeGroup();
  }
  for (const beam of beams) beam.setContext(context).draw();
  for (const tuplet of tuplets) tuplet.setContext(context).draw();
  context.closeGroup();
  context.setFillStyle(background).fillRect(0, 0, NOTATION_HEADER, NOTATION_HEIGHT);
  context.setFillStyle(ink).setStrokeStyle(ink);
  const headerTreble = new Stave(0, 30, NOTATION_HEADER).addClef('treble').addKeySignature(key).addTimeSignature(timeSignature);
  const headerBass = new Stave(0, 140, NOTATION_HEADER).addClef('bass').addKeySignature(key).addTimeSignature(timeSignature);
  for (const stave of [headerTreble, headerBass]) stave.setStyle({ fillStyle: ink, strokeStyle: ink }).setContext(context).draw();
  new StaveConnector(headerTreble, headerBass).setType(StaveConnector.type.BRACE).setStyle({ fillStyle: ink, strokeStyle: ink }).setContext(context).draw();
  container.replaceChildren(...Array.from(context.svg.childNodes));
}