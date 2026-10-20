import { Song } from '../types/music';
import { parseMidiFileBuffer } from '../utils/midiFileParser';

const midiFiles = import.meta.glob<string>('./midi/*.{mid,midi}', { eager: true, query: '?url&inline', import: 'default' });

interface BundledScore {
  fileName: string;
  id: string;
  title: string;
  level: Song['level'];
  category: Song['category'];
  composer?: string;
}

const SCORES: BundledScore[] = [
  { fileName: 'BujjBujjZoldAg.midi', id: 'repertoire-bujj-bujj-zold-ag', title: 'Bújj, bújj, zöld ág', level: 1, category: 'Traditional' },
  { fileName: 'CsigaBigaGyereKi.midi', id: 'repertoire-csiga-biga-gyere-ki', title: 'Csiga-biga, gyere ki', level: 1, category: 'Traditional' },
  { fileName: 'KisKeceLanyom.midi', id: 'repertoire-kis-kece-lanyom', title: 'Kis kece lányom', level: 1, category: 'Traditional' },
  { fileName: 'SussFelNap.midi', id: 'repertoire-suss-fel-nap', title: 'Süss fel, nap', level: 1, category: 'Traditional' },
  { fileName: 'TavasziSzel.midi', id: 'repertoire-tavaszi-szel', title: 'Tavaszi szél', level: 1, category: 'Traditional' },
  { fileName: 'TelapoIttVan.midi', id: 'repertoire-telapo-itt-van', title: 'Télapó itt van', level: 1, category: 'Traditional' },
  { fileName: 'Hans Zimmer - Interstellar Theme EASY MIDI(Your Piano Tutorials).mid', id: 'repertoire-interstellar-easy', title: 'Interstellar Theme (Easy)', level: 3, category: 'Soundtrack', composer: 'Hans Zimmer' },
];

export const BUNDLED_MIDI_SONGS: Song[] = SCORES.map(score => {
  const source = midiFiles[`./midi/${score.fileName}`];
  if (!source?.includes(';base64,')) throw new Error(`Missing bundled MIDI asset: ${score.fileName}`);
  const bytes = Uint8Array.from(atob(source.split(',')[1]), character => character.charCodeAt(0));
  const parsed = parseMidiFileBuffer(bytes.buffer, score.fileName);
  const notes = parsed.notes.map((note, index) => ({ ...note, id: `${score.id}-${index}`, startTime: Number((note.startTime + 0.2).toFixed(3)), finger: undefined }));
  return {
    ...parsed,
    id: score.id,
    title: score.title,
    titleHu: score.title,
    composer: score.composer || "Hungarian children's song",
    composerHu: score.composer || 'Magyar gyermekdal',
    category: score.category,
    level: score.level,
    isCustomMidi: false,
    importFormat: 'midi',
    notes,
    durationSeconds: Number(Math.max(...notes.map(note => note.startTime + note.duration)).toFixed(2)),
    description: `User-supplied MIDI arrangement from ${score.fileName}. ${notes.length} notes; original event timing and velocity retained within the studio MIDI import limits.`,
    descriptionHu: `Felhasználó által biztosított MIDI-feldolgozás: ${score.fileName}. ${notes.length} hang; az eredeti időzítés és leütési erősség a stúdió importkorlátain belül megmarad.`,
    focusSkill: parsed.handArrangement === 'right-only' ? 'Right-hand melody and rhythm' : 'Two-hand coordination and accompaniment',
    focusSkillHu: parsed.handArrangement === 'right-only' ? 'Jobb kezes dallam és ritmus' : 'Kétkezes koordináció és kíséret',
  };
});