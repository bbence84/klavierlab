import { Song, SongNote } from '../types/music';
import { BUNDLED_MIDI_SONGS } from './bundledMidiSongs';

function buildNotes(
  bpm: number,
  beatsPerMeasure: number,
  raw: {
    beat: number;       // 0-indexed beat from start
    durBeats: number;   // length in beats
    midi: number;
    hand: 'right' | 'left';
    finger?: 1 | 2 | 3 | 4 | 5;
  }[]
): SongNote[] {
  const secPerBeat = 60 / bpm;
  const leadInSec = 1.2; // 1.2s visual preparation time before first note hits keyboard

  return raw.map((item, idx) => {
    const startTime = Number((leadInSec + item.beat * secPerBeat).toFixed(3));
    const duration = Number((item.durBeats * secPerBeat * 0.92).toFixed(3));
    const measure = Math.floor(item.beat / beatsPerMeasure) + 1;
    return {
      id: `note-${idx}-${item.midi}`,
      midi: item.midi,
      startTime,
      duration,
      hand: item.hand,
      finger: item.finger,
      velocity: item.hand === 'right' ? 96 : 82,
      measure,
    };
  });
}

function computeSongDuration(notes: SongNote[]): number {
  if (notes.length === 0) return 10;
  const maxEnd = Math.max(...notes.map((n) => n.startTime + n.duration));
  return Number(maxEnd.toFixed(2));
}

const RAW_INITIAL_SONGS: Song[] = [
  {
    id: 'boci-boci-tarka-rh',
    title: 'Boci, boci tarka (Right-Hand Solo)',
    titleHu: 'Boci, boci tarka (Jobb kéz szóló)',
    composer: 'Hungarian Folk Song',
    composerHu: 'Magyar gyermekdal',
    level: 1,
    bpm: 84,
    timeSignature: [2, 4],
    keySignature: 'C Major',
    category: 'Beginner Lesson',
    handArrangement: 'right-only',
    description:
      'Authentic 2/4 Hungarian folk song sheet music for the Right Hand: C4 E4 C4 E4 | G4 G4 | C4 E4 C4 E4 | G4 G4 | C5 B4 A4 G4 | F4 A4 | G4 F4 E4 D4 | C4 C4.',
    descriptionHu:
      'Az eredeti 2/4-es kotta szerinti jobb kezes dallam: Bo-ci, bo-ci (C4 E4 C4 E4) | tar-ka (G4 G4) | Se fü-le, se (C4 E4 C4 E4) | far-ka (G4 G4) | O-da me-gyünk (C5 B4 A4 G4) | lak-ni (F4 A4) | A-hol te-jet (G4 F4 E4 D4) | kap-ni (C4 C4).',
    focusSkill: '2/4 Meter · Authentic Melody (C4–C5) · Right Hand Only',
    focusSkillHu: '2/4-es ütem · Eredeti kottahű dallam (C4–C5) · Csak jobb kéz',
    durationSeconds: 12.6,
    notes: buildNotes(84, 2, [
      // Measure 1 (2/4): "Bo - ci, bo - ci" (C4 E4 C4 E4 — eighth notes)
      { beat: 0, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 0.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 2 },
      { beat: 1, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 1.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 2 },
      // Measure 2 (2/4): "tar - ka," (G4 G4 — quarter notes)
      { beat: 2, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      { beat: 3, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      // Measure 3 (2/4): "Se fü - le, se" (C4 E4 C4 E4 — eighth notes)
      { beat: 4, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 4.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 2 },
      { beat: 5, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 5.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 2 },
      // Measure 4 (2/4): "far - ka," (G4 G4 — quarter notes)
      { beat: 6, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      { beat: 7, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      // Measure 5 (2/4): "O - da me - gyünk" (C5 B4 A4 G4 — eighth notes)
      { beat: 8, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 8.5, durBeats: 0.5, midi: 71, hand: 'right', finger: 4 },
      { beat: 9, durBeats: 0.5, midi: 69, hand: 'right', finger: 3 },
      { beat: 9.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 2 },
      // Measure 6 (2/4): "lak - ni," (F4 A4 — quarter notes)
      { beat: 10, durBeats: 1, midi: 65, hand: 'right', finger: 1 },
      { beat: 11, durBeats: 1, midi: 69, hand: 'right', finger: 4 },
      // Measure 7 (2/4): "A - hol te - jet" (G4 F4 E4 D4 — eighth notes)
      { beat: 12, durBeats: 0.5, midi: 67, hand: 'right', finger: 4 },
      { beat: 12.5, durBeats: 0.5, midi: 65, hand: 'right', finger: 3 },
      { beat: 13, durBeats: 0.5, midi: 64, hand: 'right', finger: 2 },
      { beat: 13.5, durBeats: 0.5, midi: 62, hand: 'right', finger: 1 },
      // Measure 8 (2/4): "kap - ni." (C4 C4 — quarter notes)
      { beat: 14, durBeats: 1, midi: 60, hand: 'right', finger: 1 },
      { beat: 15, durBeats: 1, midi: 60, hand: 'right', finger: 1 },
    ]),
  },
  {
    id: 'friends-theme-full',
    title: 'Friends Theme Song — I’ll Be There for You (Full Two-Hand Score)',
    titleHu: 'Jóbarátok főcímdal — Friends Theme (Teljes kétkezes kotta — 20 ütem)',
    composer: 'The Rembrandts',
    composerHu: 'The Rembrandts (Friends / Jóbarátok)',
    level: 3,
    bpm: 190,
    timeSignature: [4, 4],
    keySignature: 'A Major',
    category: 'Traditional',
    handArrangement: 'two-hands',
    description:
      'Authentic 20-measure two-hand transcription of the Friends Theme Song at ♩ = 190 BPM in A Major: Measures 1–4 iconic guitar intro riff (C#5–B4–A4–G♮4), Measures 5–12 syncopated verse ("So no one told you life was gonna be this way..." + Clap 4x), and Measures 13–20 pre-chorus build-up ("It’s like you’re always stuck in second gear...").',
    descriptionHu:
      'A Jóbarátok (Friends) főcímdalának kottahű, 20 ütemes kétkezes zongoraváltozata (♩ = 190 BPM, A-dúr): 1–4. ütem ikonikus gitár-intró (C#5–B4–A4–G♮4), 5–12. ütem szinkópás verze („So no one told you life was gonna be this way...” + Clap 4x), 13–20. ütem átvezetés és nyolcad-fokozás E2 basszussal.',
    focusSkill: 'Upbeat Syncopation · A Major (F#, C#, G♮ Blues Note) · Two-Hand Groove',
    focusSkillHu: 'Szinkópás ritmus · A-dúr (F#, C#, G♮ blues hang) · Kétkezes kíséret',
    durationSeconds: 27,
    notes: buildNotes(190, 4, [
      // ==================== SYSTEM 1 (Measures 1–4: Iconic Intro Riff) ====================
      // Measure 1 (Beat 0..4): RH rest C#5 C#5 B4 A4 G♮4(tied) | LH A2 whole note
      { beat: 1, durBeats: 1, midi: 73, hand: 'right', finger: 4 },
      { beat: 2, durBeats: 0.5, midi: 73, hand: 'right', finger: 4 },
      { beat: 2.5, durBeats: 0.5, midi: 71, hand: 'right', finger: 3 },
      { beat: 3, durBeats: 0.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 3.5, durBeats: 1, midi: 67, hand: 'right', finger: 1 },
      { beat: 0, durBeats: 4, midi: 45, hand: 'left', finger: 2 },

      // Measure 2 (Beat 4..8): RH (tied G♮4) G♮4 A4 B4 A4 | LH A2 whole note
      { beat: 4.5, durBeats: 1, midi: 67, hand: 'right', finger: 1 },
      { beat: 5.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 6, durBeats: 1, midi: 71, hand: 'right', finger: 3 },
      { beat: 7, durBeats: 1, midi: 69, hand: 'right', finger: 2 },
      { beat: 4, durBeats: 4, midi: 45, hand: 'left', finger: 2 },

      // Measure 3 (Beat 8..12): RH rest C#5 C#5 B4 A4 G♮4(tied) | LH A2 tied across M3–M4
      { beat: 9, durBeats: 1, midi: 73, hand: 'right', finger: 4 },
      { beat: 10, durBeats: 0.5, midi: 73, hand: 'right', finger: 4 },
      { beat: 10.5, durBeats: 0.5, midi: 71, hand: 'right', finger: 3 },
      { beat: 11, durBeats: 0.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 11.5, durBeats: 1, midi: 67, hand: 'right', finger: 1 },
      { beat: 8, durBeats: 8, midi: 45, hand: 'left', finger: 2 },

      // Measure 4 (Beat 12..16): RH (tied G♮4) G♮4 A4 B4 A4 | LH (tied A2)
      { beat: 12.5, durBeats: 1, midi: 67, hand: 'right', finger: 1 },
      { beat: 13.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 14, durBeats: 1, midi: 71, hand: 'right', finger: 3 },
      { beat: 15, durBeats: 1, midi: 69, hand: 'right', finger: 2 },

      // ==================== SYSTEM 2 (Measures 5–8: "So no one told you..." + Clap 4x) ====================
      // Measure 5 (Beat 16..20): RH rest E4 A4(tied) B4 C#5(tied) | LH A2 dotted-quarter groove -> E2
      { beat: 17, durBeats: 0.5, midi: 64, hand: 'right', finger: 1 },
      { beat: 17.5, durBeats: 1, midi: 69, hand: 'right', finger: 2 },
      { beat: 18.5, durBeats: 1, midi: 71, hand: 'right', finger: 3 },
      { beat: 19.5, durBeats: 1.5, midi: 73, hand: 'right', finger: 4 },
      { beat: 16, durBeats: 1.5, midi: 45, hand: 'left', finger: 1 },
      { beat: 17.5, durBeats: 1, midi: 45, hand: 'left', finger: 1 },
      { beat: 18.5, durBeats: 1, midi: 45, hand: 'left', finger: 1 },
      { beat: 19.5, durBeats: 0.5, midi: 40, hand: 'left', finger: 5 },

      // Measure 6 (Beat 20..24): RH (tied C#5) B4 A4(tied) A4. | LH A2 groove -> E2
      { beat: 21, durBeats: 0.5, midi: 71, hand: 'right', finger: 3 },
      { beat: 21.5, durBeats: 1, midi: 69, hand: 'right', finger: 2 },
      { beat: 22.5, durBeats: 1.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 20, durBeats: 1.5, midi: 45, hand: 'left', finger: 1 },
      { beat: 21.5, durBeats: 1, midi: 45, hand: 'left', finger: 1 },
      { beat: 22.5, durBeats: 1, midi: 45, hand: 'left', finger: 1 },
      { beat: 23.5, durBeats: 0.5, midi: 40, hand: 'left', finger: 5 },

      // Measure 7 (Beat 24..28): RH A4 E4 A4 B4 B4(tied to M8) | LH A2 groove -> E2
      { beat: 24, durBeats: 0.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 24.5, durBeats: 1, midi: 64, hand: 'right', finger: 1 },
      { beat: 25.5, durBeats: 1, midi: 69, hand: 'right', finger: 2 },
      { beat: 26.5, durBeats: 1, midi: 71, hand: 'right', finger: 3 },
      { beat: 27.5, durBeats: 4.5, midi: 71, hand: 'right', finger: 3 },
      { beat: 24, durBeats: 1.5, midi: 45, hand: 'left', finger: 1 },
      { beat: 25.5, durBeats: 1, midi: 45, hand: 'left', finger: 1 },
      { beat: 26.5, durBeats: 1, midi: 45, hand: 'left', finger: 1 },
      { beat: 27.5, durBeats: 0.5, midi: 40, hand: 'left', finger: 5 },

      // Measure 8 (Beat 28..32): "Clap 4x" — RH tied B4 whole | LH G♮2 whole note
      { beat: 28, durBeats: 4, midi: 43, hand: 'left', finger: 3 },

      // ==================== SYSTEM 3 (Measures 9–12: "Your job's a joke...") ====================
      // Measure 9 (Beat 32..36): RH rest A4 A4(tied) B4 C#5(tied) | LH A2 groove -> E2
      { beat: 33, durBeats: 0.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 33.5, durBeats: 1.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 35, durBeats: 0.5, midi: 71, hand: 'right', finger: 3 },
      { beat: 35.5, durBeats: 1.5, midi: 73, hand: 'right', finger: 4 },
      { beat: 32, durBeats: 1.5, midi: 45, hand: 'left', finger: 1 },
      { beat: 33.5, durBeats: 1, midi: 45, hand: 'left', finger: 1 },
      { beat: 34.5, durBeats: 1, midi: 45, hand: 'left', finger: 1 },
      { beat: 35.5, durBeats: 0.5, midi: 40, hand: 'left', finger: 5 },

      // Measure 10 (Beat 36..40): RH (tied C#5) B4 A4 A4 rest E4 | LH A2 groove -> E2
      { beat: 37, durBeats: 0.5, midi: 71, hand: 'right', finger: 3 },
      { beat: 37.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 38, durBeats: 1, midi: 69, hand: 'right', finger: 2 },
      { beat: 39.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 1 },
      { beat: 36, durBeats: 1.5, midi: 45, hand: 'left', finger: 1 },
      { beat: 37.5, durBeats: 1, midi: 45, hand: 'left', finger: 1 },
      { beat: 38.5, durBeats: 1, midi: 45, hand: 'left', finger: 1 },
      { beat: 39.5, durBeats: 0.5, midi: 40, hand: 'left', finger: 5 },

      // Measure 11 (Beat 40..44): RH D5 C#5 B4 A4 E5(tied to M12) | LH A2 groove -> B2
      { beat: 40, durBeats: 1, midi: 74, hand: 'right', finger: 4 },
      { beat: 41, durBeats: 1, midi: 73, hand: 'right', finger: 3 },
      { beat: 42, durBeats: 0.5, midi: 71, hand: 'right', finger: 2 },
      { beat: 42.5, durBeats: 1, midi: 69, hand: 'right', finger: 1 },
      { beat: 43.5, durBeats: 4.5, midi: 76, hand: 'right', finger: 5 },
      { beat: 40, durBeats: 1.5, midi: 45, hand: 'left', finger: 2 },
      { beat: 41.5, durBeats: 1, midi: 45, hand: 'left', finger: 2 },
      { beat: 42.5, durBeats: 1, midi: 45, hand: 'left', finger: 2 },
      { beat: 43.5, durBeats: 0.5, midi: 47, hand: 'left', finger: 1 },

      // Measure 12 (Beat 44..48): RH (tied E5 whole) | LH A2 whole note
      { beat: 44, durBeats: 4, midi: 45, hand: 'left', finger: 2 },

      // ==================== SYSTEM 4 (Measures 13–16: "It's like you're always stuck...") ====================
      // Measure 13 (Beat 48..52): RH rest D5 D5(tied) D5 D5(tied) | LH G♮2 whole note
      { beat: 49, durBeats: 0.5, midi: 74, hand: 'right', finger: 4 },
      { beat: 49.5, durBeats: 1, midi: 74, hand: 'right', finger: 4 },
      { beat: 50.5, durBeats: 1, midi: 74, hand: 'right', finger: 4 },
      { beat: 51.5, durBeats: 1, midi: 74, hand: 'right', finger: 4 },
      { beat: 48, durBeats: 4, midi: 43, hand: 'left', finger: 3 },

      // Measure 14 (Beat 52..56): RH (tied D5) D5 D5(tied) D5. | LH B2 whole note
      { beat: 52.5, durBeats: 1, midi: 74, hand: 'right', finger: 4 },
      { beat: 53.5, durBeats: 1, midi: 74, hand: 'right', finger: 4 },
      { beat: 54.5, durBeats: 1.5, midi: 74, hand: 'right', finger: 4 },
      { beat: 52, durBeats: 4, midi: 47, hand: 'left', finger: 1 },

      // Measure 15 (Beat 56..60): RH D5 C#5 C#5(tied across M15–M16) | LH A2 dotted-half + E2 quarter
      { beat: 56, durBeats: 0.5, midi: 74, hand: 'right', finger: 4 },
      { beat: 56.5, durBeats: 1, midi: 73, hand: 'right', finger: 3 },
      { beat: 57.5, durBeats: 4.5, midi: 73, hand: 'right', finger: 3 },
      { beat: 56, durBeats: 3, midi: 45, hand: 'left', finger: 2 },
      { beat: 59, durBeats: 1, midi: 40, hand: 'left', finger: 5 },

      // Measure 16 (Beat 60..64): RH (tied C#5 half) rest B4 C#5 | LH A2 syncopated groove
      { beat: 63, durBeats: 0.5, midi: 71, hand: 'right', finger: 2 },
      { beat: 63.5, durBeats: 0.5, midi: 73, hand: 'right', finger: 3 },
      { beat: 60, durBeats: 1.5, midi: 45, hand: 'left', finger: 1 },
      { beat: 61.5, durBeats: 1.5, midi: 45, hand: 'left', finger: 1 },
      { beat: 63, durBeats: 1, midi: 45, hand: 'left', finger: 1 },

      // ==================== SYSTEM 5 (Measures 17–20: "When it hasn't been your day...") ====================
      // Measure 17 (Beat 64..68): RH D5 D5 D5(tied) D5 D5(tied) | LH G♮2 whole note
      { beat: 64, durBeats: 0.5, midi: 74, hand: 'right', finger: 4 },
      { beat: 64.5, durBeats: 1, midi: 74, hand: 'right', finger: 4 },
      { beat: 65.5, durBeats: 1.5, midi: 74, hand: 'right', finger: 4 },
      { beat: 67, durBeats: 0.5, midi: 74, hand: 'right', finger: 4 },
      { beat: 67.5, durBeats: 1.5, midi: 74, hand: 'right', finger: 4 },
      { beat: 64, durBeats: 4, midi: 43, hand: 'left', finger: 3 },

      // Measure 18 (Beat 68..72): RH (tied D5) C#5 B4 B4 A4 A4(tied) | LH F#2 whole note
      { beat: 69, durBeats: 0.5, midi: 73, hand: 'right', finger: 3 },
      { beat: 69.5, durBeats: 0.5, midi: 71, hand: 'right', finger: 2 },
      { beat: 70, durBeats: 1, midi: 71, hand: 'right', finger: 2 },
      { beat: 71, durBeats: 0.5, midi: 69, hand: 'right', finger: 1 },
      { beat: 71.5, durBeats: 1.5, midi: 69, hand: 'right', finger: 1 },
      { beat: 68, durBeats: 4, midi: 42, hand: 'left', finger: 4 },

      // Measure 19 (Beat 72..76): RH (tied A4) rest E4 A4 B4 C#5 | LH E2 whole note
      { beat: 73.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 1 },
      { beat: 74, durBeats: 0.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 74.5, durBeats: 0.5, midi: 71, hand: 'right', finger: 3 },
      { beat: 75, durBeats: 1, midi: 73, hand: 'right', finger: 4 },
      { beat: 72, durBeats: 4, midi: 40, hand: 'left', finger: 5 },

      // Measure 20 (Beat 76..80): RH B4(tied half+quarter) A4 | LH 8x E2 driving eighth notes
      { beat: 76, durBeats: 3, midi: 71, hand: 'right', finger: 3 },
      { beat: 79, durBeats: 1, midi: 69, hand: 'right', finger: 2 },
      { beat: 76, durBeats: 0.5, midi: 40, hand: 'left', finger: 5 },
      { beat: 76.5, durBeats: 0.5, midi: 40, hand: 'left', finger: 5 },
      { beat: 77, durBeats: 0.5, midi: 40, hand: 'left', finger: 5 },
      { beat: 77.5, durBeats: 0.5, midi: 40, hand: 'left', finger: 5 },
      { beat: 78, durBeats: 0.5, midi: 40, hand: 'left', finger: 5 },
      { beat: 78.5, durBeats: 0.5, midi: 40, hand: 'left', finger: 5 },
      { beat: 79, durBeats: 0.5, midi: 40, hand: 'left', finger: 5 },
      { beat: 79.5, durBeats: 0.5, midi: 40, hand: 'left', finger: 5 },
    ]),
  },
  {
    id: 'friends-theme-rh',
    title: 'Friends Theme Song (Right-Hand Solo Melody)',
    titleHu: 'Jóbarátok főcímdal — Friends Theme (Jobb kéz szóló dallam)',
    composer: 'The Rembrandts',
    composerHu: 'The Rembrandts (Friends / Jóbarátok)',
    level: 2,
    bpm: 160,
    timeSignature: [4, 4],
    keySignature: 'A Major',
    category: 'Beginner Lesson',
    handArrangement: 'right-only',
    description:
      'Right-Hand solo arrangement of the 20-measure Friends Theme Song ("I’ll Be There for You"): includes the guitar intro riff, verse melody, and pre-chorus with ergonomic 1–5 fingerings and no left-hand accompaniment.',
    descriptionHu:
      'A Jóbarátok (Friends) 20 ütemes főcímdala kifejezetten egykezes (jobb kéz szóló) gyakorláshoz, kényelmes 1–5 ujjrenddel, bal kéz nélkül.',
    focusSkill: 'Right-Hand Solo · Pop Syncopation in A Major',
    focusSkillHu: 'Csak jobb kéz · Szinkópás pop-dallam A-dúrban',
    durationSeconds: 31,
    notes: buildNotes(160, 4, [
      // Measure 1–4: Intro Riff
      { beat: 1, durBeats: 1, midi: 73, hand: 'right', finger: 4 },
      { beat: 2, durBeats: 0.5, midi: 73, hand: 'right', finger: 4 },
      { beat: 2.5, durBeats: 0.5, midi: 71, hand: 'right', finger: 3 },
      { beat: 3, durBeats: 0.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 3.5, durBeats: 1, midi: 67, hand: 'right', finger: 1 },
      { beat: 4.5, durBeats: 1, midi: 67, hand: 'right', finger: 1 },
      { beat: 5.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 6, durBeats: 1, midi: 71, hand: 'right', finger: 3 },
      { beat: 7, durBeats: 1, midi: 69, hand: 'right', finger: 2 },
      { beat: 9, durBeats: 1, midi: 73, hand: 'right', finger: 4 },
      { beat: 10, durBeats: 0.5, midi: 73, hand: 'right', finger: 4 },
      { beat: 10.5, durBeats: 0.5, midi: 71, hand: 'right', finger: 3 },
      { beat: 11, durBeats: 0.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 11.5, durBeats: 1, midi: 67, hand: 'right', finger: 1 },
      { beat: 12.5, durBeats: 1, midi: 67, hand: 'right', finger: 1 },
      { beat: 13.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 14, durBeats: 1, midi: 71, hand: 'right', finger: 3 },
      { beat: 15, durBeats: 1, midi: 69, hand: 'right', finger: 2 },
      // Measure 5–8: "So no one told you life was gonna be this way"
      { beat: 17, durBeats: 0.5, midi: 64, hand: 'right', finger: 1 },
      { beat: 17.5, durBeats: 1, midi: 69, hand: 'right', finger: 2 },
      { beat: 18.5, durBeats: 1, midi: 71, hand: 'right', finger: 3 },
      { beat: 19.5, durBeats: 1.5, midi: 73, hand: 'right', finger: 4 },
      { beat: 21, durBeats: 0.5, midi: 71, hand: 'right', finger: 3 },
      { beat: 21.5, durBeats: 1, midi: 69, hand: 'right', finger: 2 },
      { beat: 22.5, durBeats: 1.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 24, durBeats: 0.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 24.5, durBeats: 1, midi: 64, hand: 'right', finger: 1 },
      { beat: 25.5, durBeats: 1, midi: 69, hand: 'right', finger: 2 },
      { beat: 26.5, durBeats: 1, midi: 71, hand: 'right', finger: 3 },
      { beat: 27.5, durBeats: 4.5, midi: 71, hand: 'right', finger: 3 },
      // Measure 9–12: "Your job's a joke, you're broke, your love life's D.O.A."
      { beat: 33, durBeats: 0.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 33.5, durBeats: 1.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 35, durBeats: 0.5, midi: 71, hand: 'right', finger: 3 },
      { beat: 35.5, durBeats: 1.5, midi: 73, hand: 'right', finger: 4 },
      { beat: 37, durBeats: 0.5, midi: 71, hand: 'right', finger: 3 },
      { beat: 37.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 38, durBeats: 1, midi: 69, hand: 'right', finger: 2 },
      { beat: 39.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 1 },
      { beat: 40, durBeats: 1, midi: 74, hand: 'right', finger: 4 },
      { beat: 41, durBeats: 1, midi: 73, hand: 'right', finger: 3 },
      { beat: 42, durBeats: 0.5, midi: 71, hand: 'right', finger: 2 },
      { beat: 42.5, durBeats: 1, midi: 69, hand: 'right', finger: 1 },
      { beat: 43.5, durBeats: 4.5, midi: 76, hand: 'right', finger: 5 },
      // Measure 13–16: "It's like you're always stuck in second gear"
      { beat: 49, durBeats: 0.5, midi: 74, hand: 'right', finger: 4 },
      { beat: 49.5, durBeats: 1, midi: 74, hand: 'right', finger: 4 },
      { beat: 50.5, durBeats: 1, midi: 74, hand: 'right', finger: 4 },
      { beat: 51.5, durBeats: 1, midi: 74, hand: 'right', finger: 4 },
      { beat: 52.5, durBeats: 1, midi: 74, hand: 'right', finger: 4 },
      { beat: 53.5, durBeats: 1, midi: 74, hand: 'right', finger: 4 },
      { beat: 54.5, durBeats: 1.5, midi: 74, hand: 'right', finger: 4 },
      { beat: 56, durBeats: 0.5, midi: 74, hand: 'right', finger: 4 },
      { beat: 56.5, durBeats: 1, midi: 73, hand: 'right', finger: 3 },
      { beat: 57.5, durBeats: 4.5, midi: 73, hand: 'right', finger: 3 },
      { beat: 63, durBeats: 0.5, midi: 71, hand: 'right', finger: 2 },
      { beat: 63.5, durBeats: 0.5, midi: 73, hand: 'right', finger: 3 },
      // Measure 17–20: "When it hasn't been your day, your week, your month, or even your year"
      { beat: 64, durBeats: 0.5, midi: 74, hand: 'right', finger: 4 },
      { beat: 64.5, durBeats: 1, midi: 74, hand: 'right', finger: 4 },
      { beat: 65.5, durBeats: 1.5, midi: 74, hand: 'right', finger: 4 },
      { beat: 67, durBeats: 0.5, midi: 74, hand: 'right', finger: 4 },
      { beat: 67.5, durBeats: 1.5, midi: 74, hand: 'right', finger: 4 },
      { beat: 69, durBeats: 0.5, midi: 73, hand: 'right', finger: 3 },
      { beat: 69.5, durBeats: 0.5, midi: 71, hand: 'right', finger: 2 },
      { beat: 70, durBeats: 1, midi: 71, hand: 'right', finger: 2 },
      { beat: 71, durBeats: 0.5, midi: 69, hand: 'right', finger: 1 },
      { beat: 71.5, durBeats: 1.5, midi: 69, hand: 'right', finger: 1 },
      { beat: 73.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 1 },
      { beat: 74, durBeats: 0.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 74.5, durBeats: 0.5, midi: 71, hand: 'right', finger: 3 },
      { beat: 75, durBeats: 1, midi: 73, hand: 'right', finger: 4 },
      { beat: 76, durBeats: 3, midi: 71, hand: 'right', finger: 3 },
      { beat: 79, durBeats: 1, midi: 69, hand: 'right', finger: 2 },
    ]),
  },
  {
    id: 'mi-vagyunk-a-grund-full',
    title: 'Mi vagyunk a grund (Full Two-Hand Sheet Music)',
    titleHu: 'Mi vagyunk a grund (Teljes kétkezes kotta — 24 ütem)',
    composer: 'László Dés · A Pál utcai fiúk',
    composerHu: 'Dés László – Geszti Péter (A Pál utcai fiúk)',
    level: 3,
    bpm: 100,
    timeSignature: [4, 4],
    keySignature: 'C Major',
    category: 'Traditional',
    handArrangement: 'two-hands',
    description:
      'Complete 24-measure two-hand piano transcription of "Mi vagyunk a grund" at 100 BPM: Measures 1–8 iconic arpeggio intro, Measures 9–16 syncopated verse ("Álljunk össze hát..."), and Measures 17–24 anthem chorus ("Mi vagyunk a grund!"). Use the Hand selector in the studio to practice Right Hand, Left Hand, or Both Hands.',
    descriptionHu:
      'A „Mi vagyunk a grund” teljes, 24 ütemes kétkezes zongorakottája (♩ = 100 BPM): 1–8. ütem bevezető téma nyolcad-akkordfelbontással, 9–16. ütem verzédallam („Álljunk össze hát...”), 17–24. ütem refrén („Mi vagyunk a grund!”). A stúdióban külön gyakorolhatod csak a jobb kezet, csak a bal kezet, vagy mindkettőt együtt!',
    focusSkill: 'Syncopated Rhythm · Broken Chord Bass & Octave Groove',
    focusSkillHu: 'Szinkópás dallam · Bal kezes akkordfelbontás és oktávbasszus',
    durationSeconds: 59,
    notes: buildNotes(100, 4, [
      // ==================== SYSTEM 1 (Measures 1–5) ====================
      // Measure 1 (Beat 0..4): RH E4 D4 C4 G4(tied) _ E4 | LH C3-E3-G3 arpeggio
      { beat: 0, durBeats: 0.5, midi: 64, hand: 'right', finger: 3 },
      { beat: 0.5, durBeats: 0.5, midi: 62, hand: 'right', finger: 2 },
      { beat: 1, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 1.5, durBeats: 1.5, midi: 67, hand: 'right', finger: 5 },
      { beat: 3.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 3 },
      { beat: 0, durBeats: 0.5, midi: 48, hand: 'left', finger: 5 },
      { beat: 0.5, durBeats: 0.5, midi: 52, hand: 'left', finger: 3 },
      { beat: 1, durBeats: 0.5, midi: 55, hand: 'left', finger: 1 },
      { beat: 1.5, durBeats: 0.5, midi: 48, hand: 'left', finger: 5 },
      { beat: 2, durBeats: 0.5, midi: 52, hand: 'left', finger: 3 },
      { beat: 2.5, durBeats: 0.5, midi: 55, hand: 'left', finger: 1 },
      { beat: 3, durBeats: 0.5, midi: 48, hand: 'left', finger: 5 },
      { beat: 3.5, durBeats: 0.5, midi: 52, hand: 'left', finger: 3 },

      // Measure 2 (Beat 4..8): RH G4 E4 A4 G4(tied) _ D4 | LH G2-B2-D3 arpeggio
      { beat: 4, durBeats: 0.5, midi: 67, hand: 'right', finger: 4 },
      { beat: 4.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 2 },
      { beat: 5, durBeats: 0.5, midi: 69, hand: 'right', finger: 5 },
      { beat: 5.5, durBeats: 1.5, midi: 67, hand: 'right', finger: 4 },
      { beat: 7.5, durBeats: 0.5, midi: 62, hand: 'right', finger: 2 },
      { beat: 4, durBeats: 0.5, midi: 43, hand: 'left', finger: 5 },
      { beat: 4.5, durBeats: 0.5, midi: 47, hand: 'left', finger: 3 },
      { beat: 5, durBeats: 0.5, midi: 50, hand: 'left', finger: 1 },
      { beat: 5.5, durBeats: 0.5, midi: 43, hand: 'left', finger: 5 },
      { beat: 6, durBeats: 0.5, midi: 47, hand: 'left', finger: 3 },
      { beat: 6.5, durBeats: 0.5, midi: 50, hand: 'left', finger: 1 },
      { beat: 7, durBeats: 0.5, midi: 43, hand: 'left', finger: 5 },
      { beat: 7.5, durBeats: 0.5, midi: 47, hand: 'left', finger: 3 },

      // Measure 3 (Beat 8..12): RH E4 D4 C4 G4(tied) E4 E4 G4 | LH A2-C3-E3 arpeggio
      { beat: 8, durBeats: 0.5, midi: 64, hand: 'right', finger: 3 },
      { beat: 8.5, durBeats: 0.5, midi: 62, hand: 'right', finger: 2 },
      { beat: 9, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 9.5, durBeats: 1, midi: 67, hand: 'right', finger: 5 },
      { beat: 10.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 3 },
      { beat: 11, durBeats: 0.5, midi: 64, hand: 'right', finger: 3 },
      { beat: 11.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 5 },
      { beat: 8, durBeats: 0.5, midi: 45, hand: 'left', finger: 5 },
      { beat: 8.5, durBeats: 0.5, midi: 48, hand: 'left', finger: 3 },
      { beat: 9, durBeats: 0.5, midi: 52, hand: 'left', finger: 1 },
      { beat: 9.5, durBeats: 0.5, midi: 45, hand: 'left', finger: 5 },
      { beat: 10, durBeats: 0.5, midi: 48, hand: 'left', finger: 3 },
      { beat: 10.5, durBeats: 0.5, midi: 52, hand: 'left', finger: 1 },
      { beat: 11, durBeats: 0.5, midi: 45, hand: 'left', finger: 5 },
      { beat: 11.5, durBeats: 0.5, midi: 48, hand: 'left', finger: 3 },

      // Measure 4 (Beat 12..16): RH C5 B4 A4 G4(tied) _ D4 | LH F2-A2-C3 arpeggio
      { beat: 12, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 12.5, durBeats: 0.5, midi: 71, hand: 'right', finger: 4 },
      { beat: 13, durBeats: 0.5, midi: 69, hand: 'right', finger: 3 },
      { beat: 13.5, durBeats: 1.5, midi: 67, hand: 'right', finger: 2 },
      { beat: 15.5, durBeats: 0.5, midi: 62, hand: 'right', finger: 1 },
      { beat: 12, durBeats: 0.5, midi: 41, hand: 'left', finger: 5 },
      { beat: 12.5, durBeats: 0.5, midi: 45, hand: 'left', finger: 3 },
      { beat: 13, durBeats: 0.5, midi: 48, hand: 'left', finger: 1 },
      { beat: 13.5, durBeats: 0.5, midi: 41, hand: 'left', finger: 5 },
      { beat: 14, durBeats: 0.5, midi: 45, hand: 'left', finger: 3 },
      { beat: 14.5, durBeats: 0.5, midi: 48, hand: 'left', finger: 1 },
      { beat: 15, durBeats: 0.5, midi: 41, hand: 'left', finger: 5 },
      { beat: 15.5, durBeats: 0.5, midi: 45, hand: 'left', finger: 3 },

      // Measure 5 (Beat 16..20): RH E4 D4 C4 G4(tied) _ E4 | LH C3-E3-G3 arpeggio
      { beat: 16, durBeats: 0.5, midi: 64, hand: 'right', finger: 3 },
      { beat: 16.5, durBeats: 0.5, midi: 62, hand: 'right', finger: 2 },
      { beat: 17, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 17.5, durBeats: 1.5, midi: 67, hand: 'right', finger: 5 },
      { beat: 19.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 3 },
      { beat: 16, durBeats: 0.5, midi: 48, hand: 'left', finger: 5 },
      { beat: 16.5, durBeats: 0.5, midi: 52, hand: 'left', finger: 3 },
      { beat: 17, durBeats: 0.5, midi: 55, hand: 'left', finger: 1 },
      { beat: 17.5, durBeats: 0.5, midi: 48, hand: 'left', finger: 5 },
      { beat: 18, durBeats: 0.5, midi: 52, hand: 'left', finger: 3 },
      { beat: 18.5, durBeats: 0.5, midi: 55, hand: 'left', finger: 1 },
      { beat: 19, durBeats: 0.5, midi: 48, hand: 'left', finger: 5 },
      { beat: 19.5, durBeats: 0.5, midi: 52, hand: 'left', finger: 3 },

      // ==================== SYSTEM 2 (Measures 6–10) ====================
      // Measure 6 (Beat 20..24): RH G4 E4 A4 G4(tied) _ D4 | LH G2-B2-D3 arpeggio
      { beat: 20, durBeats: 0.5, midi: 67, hand: 'right', finger: 4 },
      { beat: 20.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 2 },
      { beat: 21, durBeats: 0.5, midi: 69, hand: 'right', finger: 5 },
      { beat: 21.5, durBeats: 1.5, midi: 67, hand: 'right', finger: 4 },
      { beat: 23.5, durBeats: 0.5, midi: 62, hand: 'right', finger: 2 },
      { beat: 20, durBeats: 0.5, midi: 43, hand: 'left', finger: 5 },
      { beat: 20.5, durBeats: 0.5, midi: 47, hand: 'left', finger: 3 },
      { beat: 21, durBeats: 0.5, midi: 50, hand: 'left', finger: 1 },
      { beat: 21.5, durBeats: 0.5, midi: 43, hand: 'left', finger: 5 },
      { beat: 22, durBeats: 0.5, midi: 47, hand: 'left', finger: 3 },
      { beat: 22.5, durBeats: 0.5, midi: 50, hand: 'left', finger: 1 },
      { beat: 23, durBeats: 0.5, midi: 43, hand: 'left', finger: 5 },
      { beat: 23.5, durBeats: 0.5, midi: 47, hand: 'left', finger: 3 },

      // Measure 7 (Beat 24..28): RH E4 D4 C4 G4(tied) E4 E4 G4 | LH A2-C3-E3 arpeggio
      { beat: 24, durBeats: 0.5, midi: 64, hand: 'right', finger: 3 },
      { beat: 24.5, durBeats: 0.5, midi: 62, hand: 'right', finger: 2 },
      { beat: 25, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 25.5, durBeats: 1, midi: 67, hand: 'right', finger: 5 },
      { beat: 26.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 3 },
      { beat: 27, durBeats: 0.5, midi: 64, hand: 'right', finger: 3 },
      { beat: 27.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 5 },
      { beat: 24, durBeats: 0.5, midi: 45, hand: 'left', finger: 5 },
      { beat: 24.5, durBeats: 0.5, midi: 48, hand: 'left', finger: 3 },
      { beat: 25, durBeats: 0.5, midi: 52, hand: 'left', finger: 1 },
      { beat: 25.5, durBeats: 0.5, midi: 45, hand: 'left', finger: 5 },
      { beat: 26, durBeats: 0.5, midi: 48, hand: 'left', finger: 3 },
      { beat: 26.5, durBeats: 0.5, midi: 52, hand: 'left', finger: 1 },
      { beat: 27, durBeats: 0.5, midi: 45, hand: 'left', finger: 5 },
      { beat: 27.5, durBeats: 0.5, midi: 48, hand: 'left', finger: 3 },

      // Measure 8 (Beat 28..32): RH C5 B4 A4 G4 _ C4 C4 G4(tied) | LH F2-A2-C3 arpeggio
      { beat: 28, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 28.5, durBeats: 0.5, midi: 71, hand: 'right', finger: 4 },
      { beat: 29, durBeats: 0.5, midi: 69, hand: 'right', finger: 3 },
      { beat: 29.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 2 },
      { beat: 30.5, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 31, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 31.5, durBeats: 1, midi: 67, hand: 'right', finger: 5 },
      { beat: 28, durBeats: 0.5, midi: 41, hand: 'left', finger: 5 },
      { beat: 28.5, durBeats: 0.5, midi: 45, hand: 'left', finger: 3 },
      { beat: 29, durBeats: 0.5, midi: 48, hand: 'left', finger: 1 },
      { beat: 29.5, durBeats: 0.5, midi: 41, hand: 'left', finger: 5 },
      { beat: 30, durBeats: 0.5, midi: 45, hand: 'left', finger: 3 },
      { beat: 30.5, durBeats: 0.5, midi: 48, hand: 'left', finger: 1 },
      { beat: 31, durBeats: 0.5, midi: 41, hand: 'left', finger: 5 },
      { beat: 31.5, durBeats: 0.5, midi: 45, hand: 'left', finger: 3 },

      // Measure 9 (Beat 32..36): Verse "Álljunk össze hát..." | LH C2-C3-C2-C2
      { beat: 32.5, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 33, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 33.5, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      { beat: 34.5, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 35, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 35.5, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      { beat: 32, durBeats: 1.5, midi: 36, hand: 'left', finger: 5 },
      { beat: 33.5, durBeats: 0.5, midi: 48, hand: 'left', finger: 1 },
      { beat: 34, durBeats: 1.5, midi: 36, hand: 'left', finger: 5 },
      { beat: 35.5, durBeats: 0.5, midi: 36, hand: 'left', finger: 5 },

      // Measure 10 (Beat 36..40): RH _ C4 A4 G4(tied) C4 C4 G4(tied) | LH G2-G3-G2-G2
      { beat: 36.5, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 37, durBeats: 0.5, midi: 69, hand: 'right', finger: 5 },
      { beat: 37.5, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      { beat: 38.5, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 39, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 39.5, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      { beat: 36, durBeats: 1.5, midi: 43, hand: 'left', finger: 5 },
      { beat: 37.5, durBeats: 0.5, midi: 55, hand: 'left', finger: 1 },
      { beat: 38, durBeats: 1.5, midi: 43, hand: 'left', finger: 5 },
      { beat: 39.5, durBeats: 0.5, midi: 43, hand: 'left', finger: 5 },

      // ==================== SYSTEM 3 (Measures 11–14) ====================
      // Measure 11 (Beat 40..44): RH _ C4 C4 G4(tied) C4 C4 G4(tied) | LH C2-C3-C2-C2
      { beat: 40.5, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 41, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 41.5, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      { beat: 42.5, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 43, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 43.5, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      { beat: 40, durBeats: 1.5, midi: 36, hand: 'left', finger: 5 },
      { beat: 41.5, durBeats: 0.5, midi: 48, hand: 'left', finger: 1 },
      { beat: 42, durBeats: 1.5, midi: 36, hand: 'left', finger: 5 },
      { beat: 43.5, durBeats: 0.5, midi: 36, hand: 'left', finger: 5 },

      // Measure 12 (Beat 44..48): RH _ C4 A4 G4(tied) C4 C4 G4(tied) | LH G2-G3-G2-G2
      { beat: 44.5, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 45, durBeats: 0.5, midi: 69, hand: 'right', finger: 5 },
      { beat: 45.5, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      { beat: 46.5, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 47, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 47.5, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      { beat: 44, durBeats: 1.5, midi: 43, hand: 'left', finger: 5 },
      { beat: 45.5, durBeats: 0.5, midi: 55, hand: 'left', finger: 1 },
      { beat: 46, durBeats: 1.5, midi: 43, hand: 'left', finger: 5 },
      { beat: 47.5, durBeats: 0.5, midi: 43, hand: 'left', finger: 5 },

      // Measure 13 (Beat 48..52): RH _ C4 C4 G4(tied) C4 C4 G4(tied) | LH A2-A3-A2-A2
      { beat: 48.5, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 49, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 49.5, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      { beat: 50.5, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 51, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 51.5, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      { beat: 48, durBeats: 1.5, midi: 45, hand: 'left', finger: 5 },
      { beat: 49.5, durBeats: 0.5, midi: 57, hand: 'left', finger: 1 },
      { beat: 50, durBeats: 1.5, midi: 45, hand: 'left', finger: 5 },
      { beat: 51.5, durBeats: 0.5, midi: 45, hand: 'left', finger: 5 },

      // Measure 14 (Beat 52..56): RH _ C4 A4 G4(tied) C4 C4 G4(tied) | LH G2-G3-G2-G2
      { beat: 52.5, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 53, durBeats: 0.5, midi: 69, hand: 'right', finger: 5 },
      { beat: 53.5, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      { beat: 54.5, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 55, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 55.5, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      { beat: 52, durBeats: 1.5, midi: 43, hand: 'left', finger: 5 },
      { beat: 53.5, durBeats: 0.5, midi: 55, hand: 'left', finger: 1 },
      { beat: 54, durBeats: 1.5, midi: 43, hand: 'left', finger: 5 },
      { beat: 55.5, durBeats: 0.5, midi: 43, hand: 'left', finger: 5 },

      // ==================== SYSTEM 4 (Measures 15–19) ====================
      // Measure 15 (Beat 56..60): RH _ C4 C4 G4(tied) F4 E4 D4(tied to M16) | LH C2-C3-C2-C2
      { beat: 56.5, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 57, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 57.5, durBeats: 1, midi: 67, hand: 'right', finger: 5 },
      { beat: 58.5, durBeats: 0.5, midi: 65, hand: 'right', finger: 4 },
      { beat: 59, durBeats: 0.5, midi: 64, hand: 'right', finger: 3 },
      { beat: 59.5, durBeats: 1.5, midi: 62, hand: 'right', finger: 2 },
      { beat: 56, durBeats: 1.5, midi: 36, hand: 'left', finger: 5 },
      { beat: 57.5, durBeats: 0.5, midi: 48, hand: 'left', finger: 1 },
      { beat: 58, durBeats: 1.5, midi: 36, hand: 'left', finger: 5 },
      { beat: 59.5, durBeats: 0.5, midi: 36, hand: 'left', finger: 5 },

      // Measure 16 (Beat 60..64): Dramatic stop before Chorus | LH G2 quarter note
      { beat: 60, durBeats: 1, midi: 43, hand: 'left', finger: 2 },

      // Measure 17 (Beat 64..68): Chorus "Mi vagyunk a grund!" | RH C5 A4 C5 A4 G4 C5(tied) | LH A2-A3-A2
      { beat: 65, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 65.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 3 },
      { beat: 66, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 66.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 3 },
      { beat: 67, durBeats: 0.5, midi: 67, hand: 'right', finger: 2 },
      { beat: 67.5, durBeats: 1, midi: 72, hand: 'right', finger: 5 },
      { beat: 64, durBeats: 1.5, midi: 45, hand: 'left', finger: 5 },
      { beat: 65.5, durBeats: 0.5, midi: 57, hand: 'left', finger: 1 },
      { beat: 66, durBeats: 2, midi: 45, hand: 'left', finger: 5 },

      // Measure 18 (Beat 68..72): RH C5 A4 C5 A4 G4 C5(tied) | LH F2-F3-F2
      { beat: 69, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 69.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 3 },
      { beat: 70, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 70.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 3 },
      { beat: 71, durBeats: 0.5, midi: 67, hand: 'right', finger: 2 },
      { beat: 71.5, durBeats: 1, midi: 72, hand: 'right', finger: 5 },
      { beat: 68, durBeats: 1.5, midi: 41, hand: 'left', finger: 5 },
      { beat: 69.5, durBeats: 0.5, midi: 53, hand: 'left', finger: 1 },
      { beat: 70, durBeats: 2, midi: 41, hand: 'left', finger: 5 },

      // Measure 19 (Beat 72..76): RH C5 G4 C5 G4 C5 B4(tied) | LH C2-C3-C2
      { beat: 73, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 73.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 2 },
      { beat: 74, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 74.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 2 },
      { beat: 75, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 75.5, durBeats: 1, midi: 71, hand: 'right', finger: 4 },
      { beat: 72, durBeats: 1.5, midi: 36, hand: 'left', finger: 5 },
      { beat: 73.5, durBeats: 0.5, midi: 48, hand: 'left', finger: 1 },
      { beat: 74, durBeats: 2, midi: 36, hand: 'left', finger: 5 },

      // ==================== SYSTEM 5 (Measures 20–24) ====================
      // Measure 20 (Beat 76..80): RH holds B4 | LH G2-G3-G2
      { beat: 76, durBeats: 1.5, midi: 43, hand: 'left', finger: 5 },
      { beat: 77.5, durBeats: 0.5, midi: 55, hand: 'left', finger: 1 },
      { beat: 78, durBeats: 2, midi: 43, hand: 'left', finger: 5 },

      // Measure 21 (Beat 80..84): RH C5 A4 C5 A4 G4 C5(tied) | LH A2-A3-A2
      { beat: 81, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 81.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 3 },
      { beat: 82, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 82.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 3 },
      { beat: 83, durBeats: 0.5, midi: 67, hand: 'right', finger: 2 },
      { beat: 83.5, durBeats: 1, midi: 72, hand: 'right', finger: 5 },
      { beat: 80, durBeats: 1.5, midi: 45, hand: 'left', finger: 5 },
      { beat: 81.5, durBeats: 0.5, midi: 57, hand: 'left', finger: 1 },
      { beat: 82, durBeats: 2, midi: 45, hand: 'left', finger: 5 },

      // Measure 22 (Beat 84..88): RH _ G4 C5 G4 C5 A4 G4 C5(tied) | LH F2-F3-F2
      { beat: 84.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 2 },
      { beat: 85, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 85.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 2 },
      { beat: 86, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 86.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 3 },
      { beat: 87, durBeats: 0.5, midi: 67, hand: 'right', finger: 2 },
      { beat: 87.5, durBeats: 1, midi: 72, hand: 'right', finger: 5 },
      { beat: 84, durBeats: 1.5, midi: 41, hand: 'left', finger: 5 },
      { beat: 85.5, durBeats: 0.5, midi: 53, hand: 'left', finger: 1 },
      { beat: 86, durBeats: 2, midi: 41, hand: 'left', finger: 5 },

      // Measure 23 (Beat 88..92): RH _ G4 C5 G4 C5 G4 D5 C5(tied to M24) | LH C2-C3-C2
      { beat: 88.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 1 },
      { beat: 89, durBeats: 0.5, midi: 72, hand: 'right', finger: 4 },
      { beat: 89.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 1 },
      { beat: 90, durBeats: 0.5, midi: 72, hand: 'right', finger: 4 },
      { beat: 90.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 1 },
      { beat: 91, durBeats: 0.5, midi: 74, hand: 'right', finger: 5 },
      { beat: 91.5, durBeats: 1.5, midi: 72, hand: 'right', finger: 4 },
      { beat: 88, durBeats: 1.5, midi: 36, hand: 'left', finger: 5 },
      { beat: 89.5, durBeats: 0.5, midi: 48, hand: 'left', finger: 1 },
      { beat: 90, durBeats: 2, midi: 36, hand: 'left', finger: 5 },

      // Measure 24 (Beat 92..96): Final Bass Resolution G2 dotted half note
      { beat: 92, durBeats: 3, midi: 43, hand: 'left', finger: 2 },
    ]),
  },
  {
    id: 'mi-vagyunk-a-grund-rh',
    title: 'Mi vagyunk a grund (Right-Hand Solo Melody)',
    titleHu: 'Mi vagyunk a grund (Jobb kéz szóló dallam)',
    composer: 'László Dés · A Pál utcai fiúk',
    composerHu: 'Dés László – Geszti Péter (A Pál utcai fiúk)',
    level: 2,
    bpm: 100,
    timeSignature: [4, 4],
    keySignature: 'C Major',
    category: 'Beginner Lesson',
    handArrangement: 'right-only',
    description:
      'Right-Hand solo edition of "Mi vagyunk a grund" featuring the iconic 8-measure intro melody and the soaring chorus ("Mi vagyunk a grund!") without left-hand accompaniment.',
    descriptionHu:
      'A „Mi vagyunk a grund” kifejezetten egykezes (jobb kéz szóló) változata: az 1–8. ütem ikonikus bevezető dallama és a refrén („Mi vagyunk a grund!”) bal kéz nélkül.',
    focusSkill: 'Right-Hand Solo · Iconic Intro & Chorus Melody',
    focusSkillHu: 'Csak jobb kéz · Bevezető téma és refrén dallam',
    durationSeconds: 38,
    notes: buildNotes(100, 4, [
      // Measure 1: E4 D4 C4 G4(1.5) _ E4
      { beat: 0, durBeats: 0.5, midi: 64, hand: 'right', finger: 3 },
      { beat: 0.5, durBeats: 0.5, midi: 62, hand: 'right', finger: 2 },
      { beat: 1, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 1.5, durBeats: 1.5, midi: 67, hand: 'right', finger: 5 },
      { beat: 3.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 3 },
      // Measure 2: G4 E4 A4 G4(1.5) _ D4
      { beat: 4, durBeats: 0.5, midi: 67, hand: 'right', finger: 4 },
      { beat: 4.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 2 },
      { beat: 5, durBeats: 0.5, midi: 69, hand: 'right', finger: 5 },
      { beat: 5.5, durBeats: 1.5, midi: 67, hand: 'right', finger: 4 },
      { beat: 7.5, durBeats: 0.5, midi: 62, hand: 'right', finger: 2 },
      // Measure 3: E4 D4 C4 G4(1) E4 E4 G4
      { beat: 8, durBeats: 0.5, midi: 64, hand: 'right', finger: 3 },
      { beat: 8.5, durBeats: 0.5, midi: 62, hand: 'right', finger: 2 },
      { beat: 9, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 9.5, durBeats: 1, midi: 67, hand: 'right', finger: 5 },
      { beat: 10.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 3 },
      { beat: 11, durBeats: 0.5, midi: 64, hand: 'right', finger: 3 },
      { beat: 11.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 5 },
      // Measure 4: C5 B4 A4 G4(1.5) _ D4
      { beat: 12, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 12.5, durBeats: 0.5, midi: 71, hand: 'right', finger: 4 },
      { beat: 13, durBeats: 0.5, midi: 69, hand: 'right', finger: 3 },
      { beat: 13.5, durBeats: 1.5, midi: 67, hand: 'right', finger: 2 },
      { beat: 15.5, durBeats: 0.5, midi: 62, hand: 'right', finger: 1 },
      // Measure 5: E4 D4 C4 G4(1.5) _ E4
      { beat: 16, durBeats: 0.5, midi: 64, hand: 'right', finger: 3 },
      { beat: 16.5, durBeats: 0.5, midi: 62, hand: 'right', finger: 2 },
      { beat: 17, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 17.5, durBeats: 1.5, midi: 67, hand: 'right', finger: 5 },
      { beat: 19.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 3 },
      // Measure 6: G4 E4 A4 G4(1.5) _ D4
      { beat: 20, durBeats: 0.5, midi: 67, hand: 'right', finger: 4 },
      { beat: 20.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 2 },
      { beat: 21, durBeats: 0.5, midi: 69, hand: 'right', finger: 5 },
      { beat: 21.5, durBeats: 1.5, midi: 67, hand: 'right', finger: 4 },
      { beat: 23.5, durBeats: 0.5, midi: 62, hand: 'right', finger: 2 },
      // Measure 7: E4 D4 C4 G4(1) E4 E4 G4
      { beat: 24, durBeats: 0.5, midi: 64, hand: 'right', finger: 3 },
      { beat: 24.5, durBeats: 0.5, midi: 62, hand: 'right', finger: 2 },
      { beat: 25, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 25.5, durBeats: 1, midi: 67, hand: 'right', finger: 5 },
      { beat: 26.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 3 },
      { beat: 27, durBeats: 0.5, midi: 64, hand: 'right', finger: 3 },
      { beat: 27.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 5 },
      // Measure 8: C5 B4 A4 G4
      { beat: 28, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 28.5, durBeats: 0.5, midi: 71, hand: 'right', finger: 4 },
      { beat: 29, durBeats: 0.5, midi: 69, hand: 'right', finger: 3 },
      { beat: 29.5, durBeats: 1.5, midi: 67, hand: 'right', finger: 2 },
      // Measure 9–16: Chorus ("Mi vagyunk a grund!")
      { beat: 33, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 33.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 3 },
      { beat: 34, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 34.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 3 },
      { beat: 35, durBeats: 0.5, midi: 67, hand: 'right', finger: 2 },
      { beat: 35.5, durBeats: 1, midi: 72, hand: 'right', finger: 5 },
      { beat: 37, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 37.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 3 },
      { beat: 38, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 38.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 3 },
      { beat: 39, durBeats: 0.5, midi: 67, hand: 'right', finger: 2 },
      { beat: 39.5, durBeats: 1, midi: 72, hand: 'right', finger: 5 },
      { beat: 41, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 41.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 2 },
      { beat: 42, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 42.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 2 },
      { beat: 43, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 43.5, durBeats: 1.5, midi: 71, hand: 'right', finger: 4 },
      { beat: 49, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 49.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 3 },
      { beat: 50, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 50.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 3 },
      { beat: 51, durBeats: 0.5, midi: 67, hand: 'right', finger: 2 },
      { beat: 51.5, durBeats: 1, midi: 72, hand: 'right', finger: 5 },
      { beat: 52.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 2 },
      { beat: 53, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 53.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 2 },
      { beat: 54, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 54.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 3 },
      { beat: 55, durBeats: 0.5, midi: 67, hand: 'right', finger: 2 },
      { beat: 55.5, durBeats: 1, midi: 72, hand: 'right', finger: 5 },
      { beat: 56.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 1 },
      { beat: 57, durBeats: 0.5, midi: 72, hand: 'right', finger: 4 },
      { beat: 57.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 1 },
      { beat: 58, durBeats: 0.5, midi: 72, hand: 'right', finger: 4 },
      { beat: 58.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 1 },
      { beat: 59, durBeats: 0.5, midi: 74, hand: 'right', finger: 5 },
      { beat: 59.5, durBeats: 2, midi: 72, hand: 'right', finger: 4 },
    ]),
  },
  {
    id: 'lesson-rh-five-finger',
    title: 'Lesson 1: Right-Hand Five-Finger Stepping',
    titleHu: '1. Lecke: Jobb kezes ötujjas alapgyakorlat',
    composer: 'Beginner Foundation Drill',
    composerHu: 'Kezdő alapgyakorlat',
    level: 1,
    bpm: 76,
    timeSignature: [4, 4],
    keySignature: 'C Major',
    category: 'Beginner Lesson',
    handArrangement: 'right-only',
    description:
      'Pure Right-Hand exercise with zero left-hand notes. Place your Right Thumb (Finger 1) on Middle C (C4) and walk smoothly up to G4 (Finger 5) and back down.',
    descriptionHu:
      'Tisztán jobb kezes gyakorlat bal kéz nélkül. Helyezd a jobb hüvelykujjad (1-es ujj) az egyvonalas C-re (C4), és sétálj fel G4-ig (5-ös ujj), majd vissza.',
    focusSkill: 'Right-Hand Finger Numbers 1–5 (One Hand Only)',
    focusSkillHu: 'Jobb kéz 1–5 ujjrend (Csak egy kéz)',
    durationSeconds: 23,
    notes: buildNotes(76, 4, [
      // Measure 1: Ascending step C4 -> G4
      { beat: 0, durBeats: 1, midi: 60, hand: 'right', finger: 1 },
      { beat: 1, durBeats: 1, midi: 62, hand: 'right', finger: 2 },
      { beat: 2, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      { beat: 3, durBeats: 1, midi: 65, hand: 'right', finger: 4 },
      // Measure 2: Peak on G4 and step down
      { beat: 4, durBeats: 2, midi: 67, hand: 'right', finger: 5 },
      { beat: 6, durBeats: 1, midi: 65, hand: 'right', finger: 4 },
      { beat: 7, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      // Measure 3: Step down to C4 and up to E4
      { beat: 8, durBeats: 1, midi: 62, hand: 'right', finger: 2 },
      { beat: 9, durBeats: 2, midi: 60, hand: 'right', finger: 1 },
      { beat: 11, durBeats: 1, midi: 62, hand: 'right', finger: 2 },
      // Measure 4: Gentle thirds (C4 - E4 - G4)
      { beat: 12, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      { beat: 13, durBeats: 1, midi: 62, hand: 'right', finger: 2 },
      { beat: 14, durBeats: 2, midi: 60, hand: 'right', finger: 1 },
      // Measure 5: Skipping fingers 1 -> 3 -> 5
      { beat: 16, durBeats: 1, midi: 60, hand: 'right', finger: 1 },
      { beat: 17, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      { beat: 18, durBeats: 1, midi: 67, hand: 'right', finger: 5 },
      { beat: 19, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      // Measure 6: Final descending resolution
      { beat: 20, durBeats: 1, midi: 65, hand: 'right', finger: 4 },
      { beat: 21, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      { beat: 22, durBeats: 1, midi: 62, hand: 'right', finger: 2 },
      { beat: 23, durBeats: 3, midi: 60, hand: 'right', finger: 1 },
    ]),
  },
  {
    id: 'lesson-lh-bass-anchor',
    title: 'Lesson 2: Left-Hand Bass Clef Explorer',
    titleHu: '2. Lecke: Bal kezes basszuskulcs alapok',
    composer: 'Beginner Foundation Drill',
    composerHu: 'Kezdő alapgyakorlat',
    level: 1,
    bpm: 74,
    timeSignature: [4, 4],
    keySignature: 'C Major',
    category: 'Beginner Lesson',
    handArrangement: 'left-only',
    description:
      'Pure Left-Hand lesson with zero right-hand notes. Place your Left Pinky (Finger 5) on Bass C (C3) and Left Thumb (Finger 1) on G3 to build left-hand confidence.',
    descriptionHu:
      'Tisztán bal kezes gyakorlat jobb kéz nélkül. Helyezd a bal kisujjad (5-ös ujj) a kis C-re (C3), a hüvelykujjad (1-es ujj) pedig a G3-ra.',
    focusSkill: 'Left-Hand Finger Independence (One Hand Only)',
    focusSkillHu: 'Bal kéz ujjfüggetlenség (Csak bal kéz)',
    durationSeconds: 23,
    notes: buildNotes(74, 4, [
      // Measure 1: Ascending from C3 (Finger 5) to G3 (Finger 1)
      { beat: 0, durBeats: 1, midi: 48, hand: 'left', finger: 5 },
      { beat: 1, durBeats: 1, midi: 50, hand: 'left', finger: 4 },
      { beat: 2, durBeats: 1, midi: 52, hand: 'left', finger: 3 },
      { beat: 3, durBeats: 1, midi: 53, hand: 'left', finger: 2 },
      // Measure 2: Hold G3 and descend
      { beat: 4, durBeats: 2, midi: 55, hand: 'left', finger: 1 },
      { beat: 6, durBeats: 1, midi: 53, hand: 'left', finger: 2 },
      { beat: 7, durBeats: 1, midi: 52, hand: 'left', finger: 3 },
      // Measure 3
      { beat: 8, durBeats: 2, midi: 50, hand: 'left', finger: 4 },
      { beat: 10, durBeats: 2, midi: 48, hand: 'left', finger: 5 },
      // Measure 4: Arpeggio triad C3 - E3 - G3 - E3
      { beat: 12, durBeats: 1, midi: 48, hand: 'left', finger: 5 },
      { beat: 13, durBeats: 1, midi: 52, hand: 'left', finger: 3 },
      { beat: 14, durBeats: 1, midi: 55, hand: 'left', finger: 1 },
      { beat: 15, durBeats: 1, midi: 52, hand: 'left', finger: 3 },
      // Measure 5: Stepwise cadence
      { beat: 16, durBeats: 1, midi: 53, hand: 'left', finger: 2 },
      { beat: 17, durBeats: 1, midi: 52, hand: 'left', finger: 3 },
      { beat: 18, durBeats: 1, midi: 50, hand: 'left', finger: 4 },
      { beat: 19, durBeats: 1, midi: 55, hand: 'left', finger: 1 },
      // Measure 6
      { beat: 20, durBeats: 4, midi: 48, hand: 'left', finger: 5 },
    ]),
  },
  {
    id: 'lesson-alternating-echo',
    title: 'Lesson 3: Call & Response (Alternating Hands)',
    titleHu: '3. Lecke: Felelgetős (Váltott kezes gyakorlat)',
    composer: 'Beginner Foundation Drill',
    composerHu: 'Kezdő alapgyakorlat',
    level: 1,
    bpm: 80,
    timeSignature: [4, 4],
    keySignature: 'C Major',
    category: 'Beginner Lesson',
    handArrangement: 'alternating-hands',
    description:
      'Only one hand plays at a time. Your Left Hand plays a 4-note phrase in the bass, then rests while your Right Hand echoes the same pattern an octave higher.',
    descriptionHu:
      'Egyszerre mindig csak az egyik kezed játszik! A bal kéz lejátszik egy 4 hangos motívumot, majd pihen, miközben a jobb kéz egy oktávval feljebb megismétli.',
    focusSkill: 'Alternating Hands — Never Playing Simultaneously',
    focusSkillHu: 'Váltott kéz — Sosem szólnak egyszerre',
    durationSeconds: 24,
    notes: buildNotes(80, 4, [
      // Measure 1: Left Hand Call (C3-D3-E3-G3)
      { beat: 0, durBeats: 1, midi: 48, hand: 'left', finger: 5 },
      { beat: 1, durBeats: 1, midi: 50, hand: 'left', finger: 4 },
      { beat: 2, durBeats: 1, midi: 52, hand: 'left', finger: 3 },
      { beat: 3, durBeats: 1, midi: 55, hand: 'left', finger: 1 },
      // Measure 2: Right Hand Echo (C4-D4-E4-G4)
      { beat: 4, durBeats: 1, midi: 60, hand: 'right', finger: 1 },
      { beat: 5, durBeats: 1, midi: 62, hand: 'right', finger: 2 },
      { beat: 6, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      { beat: 7, durBeats: 1, midi: 67, hand: 'right', finger: 5 },
      // Measure 3: Left Hand Descending Call (G3-F3-E3-D3)
      { beat: 8, durBeats: 1, midi: 55, hand: 'left', finger: 1 },
      { beat: 9, durBeats: 1, midi: 53, hand: 'left', finger: 2 },
      { beat: 10, durBeats: 1, midi: 52, hand: 'left', finger: 3 },
      { beat: 11, durBeats: 1, midi: 50, hand: 'left', finger: 4 },
      // Measure 4: Right Hand Descending Echo (G4-F4-E4-D4)
      { beat: 12, durBeats: 1, midi: 67, hand: 'right', finger: 5 },
      { beat: 13, durBeats: 1, midi: 65, hand: 'right', finger: 4 },
      { beat: 14, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      { beat: 15, durBeats: 1, midi: 62, hand: 'right', finger: 2 },
      // Measure 5: Continuous scale passing from Left Hand into Right Hand
      { beat: 16, durBeats: 1, midi: 53, hand: 'left', finger: 4 },
      { beat: 17, durBeats: 1, midi: 55, hand: 'left', finger: 3 },
      { beat: 18, durBeats: 1, midi: 57, hand: 'left', finger: 2 },
      { beat: 19, durBeats: 1, midi: 59, hand: 'left', finger: 1 },
      // Measure 6: Right Hand takes over at Middle C
      { beat: 20, durBeats: 1, midi: 60, hand: 'right', finger: 1 },
      { beat: 21, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      { beat: 22, durBeats: 2, midi: 60, hand: 'right', finger: 1 },
    ]),
  },
  {
    id: 'ode-to-joy-rh-solo',
    title: 'Ode to Joy — Right-Hand Solo Edition',
    titleHu: 'Örömóda — Jobb kéz szóló változat',
    composer: 'Ludwig van Beethoven',
    composerHu: 'Ludwig van Beethoven',
    level: 1,
    bpm: 84,
    timeSignature: [4, 4],
    keySignature: 'C Major',
    category: 'Classical',
    handArrangement: 'right-only',
    description:
      'Play Beethoven’s famous melody using strictly your Right Hand alone (Fingers 1 to 5 on C4–G4). Ideal first classical song before introducing two-hand accompaniment.',
    descriptionHu:
      'Beethoven híres dallama kizárólag jobb kézre (C4–G4 ötujjas fekvésben). Tökéletes első klasszikus darab a kétkezes játék előtt.',
    focusSkill: 'Single-Hand Melodic Phrasing & Rhythm',
    focusSkillHu: 'Egykezes dallamvezetés és egyenletes negyedek',
    durationSeconds: 24,
    notes: buildNotes(84, 4, [
      // Measure 1
      { beat: 0, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      { beat: 1, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      { beat: 2, durBeats: 1, midi: 65, hand: 'right', finger: 4 },
      { beat: 3, durBeats: 1, midi: 67, hand: 'right', finger: 5 },
      // Measure 2
      { beat: 4, durBeats: 1, midi: 67, hand: 'right', finger: 5 },
      { beat: 5, durBeats: 1, midi: 65, hand: 'right', finger: 4 },
      { beat: 6, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      { beat: 7, durBeats: 1, midi: 62, hand: 'right', finger: 2 },
      // Measure 3
      { beat: 8, durBeats: 1, midi: 60, hand: 'right', finger: 1 },
      { beat: 9, durBeats: 1, midi: 60, hand: 'right', finger: 1 },
      { beat: 10, durBeats: 1, midi: 62, hand: 'right', finger: 2 },
      { beat: 11, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      // Measure 4
      { beat: 12, durBeats: 1.5, midi: 64, hand: 'right', finger: 3 },
      { beat: 13.5, durBeats: 0.5, midi: 62, hand: 'right', finger: 2 },
      { beat: 14, durBeats: 2, midi: 62, hand: 'right', finger: 2 },
      // Measure 5
      { beat: 16, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      { beat: 17, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      { beat: 18, durBeats: 1, midi: 65, hand: 'right', finger: 4 },
      { beat: 19, durBeats: 1, midi: 67, hand: 'right', finger: 5 },
      // Measure 6
      { beat: 20, durBeats: 1, midi: 67, hand: 'right', finger: 5 },
      { beat: 21, durBeats: 1, midi: 65, hand: 'right', finger: 4 },
      { beat: 22, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      { beat: 23, durBeats: 1, midi: 62, hand: 'right', finger: 2 },
      // Measure 7
      { beat: 24, durBeats: 1, midi: 60, hand: 'right', finger: 1 },
      { beat: 25, durBeats: 1, midi: 60, hand: 'right', finger: 1 },
      { beat: 26, durBeats: 1, midi: 62, hand: 'right', finger: 2 },
      { beat: 27, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      // Measure 8
      { beat: 28, durBeats: 1.5, midi: 62, hand: 'right', finger: 2 },
      { beat: 29.5, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 30, durBeats: 2, midi: 60, hand: 'right', finger: 1 },
    ]),
  },
  {
    id: 'scarborough-alternating',
    title: 'Scarborough Fair (Hand-to-Hand Melody)',
    titleHu: 'Scarborough Fair (Kézről kézre járó dallam)',
    composer: 'Traditional Ballad',
    composerHu: 'Hagyományos ballada',
    level: 1,
    bpm: 82,
    timeSignature: [3, 4],
    keySignature: 'A Minor / Dorian',
    category: 'Traditional',
    handArrangement: 'alternating-hands',
    description:
      'Arranged so the melody passes between your Left Hand and Right Hand one note at a time. You never have to press two keys at once.',
    descriptionHu:
      'A dallam egymás után adogatja a hangokat a bal és a jobb kéz között. Sosem kell egyszerre két billentyűt leütnöd.',
    focusSkill: 'Reading Treble & Bass Clefs with One Note at a Time',
    focusSkillHu: 'Violinkulcs és basszuskulcs olvasása váltott kézzel',
    durationSeconds: 22,
    notes: buildNotes(82, 3, [
      // Measure 1: Left Hand starts on A3
      { beat: 0, durBeats: 2, midi: 57, hand: 'left', finger: 1 },
      { beat: 2, durBeats: 1, midi: 57, hand: 'left', finger: 1 },
      // Measure 2: Right Hand answers on E4
      { beat: 3, durBeats: 2, midi: 64, hand: 'right', finger: 3 },
      { beat: 5, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      // Measure 3: Right Hand steps B3/C4/D4
      { beat: 6, durBeats: 1, midi: 62, hand: 'right', finger: 2 },
      { beat: 7, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      { beat: 8, durBeats: 1, midi: 60, hand: 'right', finger: 1 },
      // Measure 4: Left Hand resolves to A3
      { beat: 9, durBeats: 3, midi: 57, hand: 'left', finger: 1 },
      // Measure 5: Right Hand climbs to G4 -> A4
      { beat: 12, durBeats: 1, midi: 64, hand: 'right', finger: 2 },
      { beat: 13, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      { beat: 14, durBeats: 1, midi: 69, hand: 'right', finger: 5 },
      // Measure 6: Right Hand descends G4 -> E4 -> D4
      { beat: 15, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      { beat: 16, durBeats: 1, midi: 64, hand: 'right', finger: 2 },
      { beat: 17, durBeats: 1, midi: 62, hand: 'right', finger: 1 },
      // Measure 7: Hand-off back to Left Hand
      { beat: 18, durBeats: 2, midi: 64, hand: 'right', finger: 3 },
      { beat: 20, durBeats: 1, midi: 59, hand: 'left', finger: 1 },
      // Measure 8: Final A3 in Left Hand
      { beat: 21, durBeats: 3, midi: 57, hand: 'left', finger: 2 },
    ]),
  },
  {
    id: 'boci-boci-tarka-duet',
    title: 'Boci, boci tarka (Two-Hand Duet)',
    titleHu: 'Boci, boci tarka (Kétkezes változat kísérettel)',
    composer: 'Hungarian Folk Song',
    composerHu: 'Magyar gyermekdal',
    level: 2,
    bpm: 86,
    timeSignature: [2, 4],
    keySignature: 'C Major',
    category: 'Traditional',
    handArrangement: 'two-hands',
    description:
      'Authentic 2/4 Hungarian folk melody (C4 E4 C4 E4 | G4 G4 | C4 E4 C4 E4 | G4 G4 | C5 B4 A4 G4 | F4 A4 | G4 F4 E4 D4 | C4 C4) accompanied by Left-Hand bass notes.',
    descriptionHu:
      'Az eredeti 2/4-es kottahű dallam (C4 E4 C4 E4 | G4 G4 | C4 E4 C4 E4 | G4 G4 | C5 B4 A4 G4 | F4 A4 | G4 F4 E4 D4 | C4 C4) egyszerű bal kezes basszuskísérettel.',
    focusSkill: '2/4 Meter · Authentic Octave Melody & Left-Hand Bass',
    focusSkillHu: '2/4-es ütem · Eredeti dallam és bal kezes basszuskíséret',
    durationSeconds: 12.4,
    notes: buildNotes(86, 2, [
      // Measure 1 (2/4): "Bo - ci, bo - ci" (C4 E4 C4 E4 + LH C3)
      { beat: 0, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 0, durBeats: 2, midi: 48, hand: 'left', finger: 5 },
      { beat: 0.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 2 },
      { beat: 1, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 1.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 2 },
      // Measure 2 (2/4): "tar - ka," (G4 G4 + LH G3)
      { beat: 2, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      { beat: 2, durBeats: 2, midi: 55, hand: 'left', finger: 1 },
      { beat: 3, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      // Measure 3 (2/4): "Se fü - le, se" (C4 E4 C4 E4 + LH C3)
      { beat: 4, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 4, durBeats: 2, midi: 48, hand: 'left', finger: 5 },
      { beat: 4.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 2 },
      { beat: 5, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 5.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 2 },
      // Measure 4 (2/4): "far - ka," (G4 G4 + LH G3)
      { beat: 6, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      { beat: 6, durBeats: 2, midi: 55, hand: 'left', finger: 1 },
      { beat: 7, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      // Measure 5 (2/4): "O - da me - gyünk" (C5 B4 A4 G4 + LH E3)
      { beat: 8, durBeats: 0.5, midi: 72, hand: 'right', finger: 5 },
      { beat: 8, durBeats: 2, midi: 52, hand: 'left', finger: 3 },
      { beat: 8.5, durBeats: 0.5, midi: 71, hand: 'right', finger: 4 },
      { beat: 9, durBeats: 0.5, midi: 69, hand: 'right', finger: 3 },
      { beat: 9.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 2 },
      // Measure 6 (2/4): "lak - ni," (F4 A4 + LH F3)
      { beat: 10, durBeats: 1, midi: 65, hand: 'right', finger: 1 },
      { beat: 10, durBeats: 2, midi: 53, hand: 'left', finger: 2 },
      { beat: 11, durBeats: 1, midi: 69, hand: 'right', finger: 4 },
      // Measure 7 (2/4): "A - hol te - jet" (G4 F4 E4 D4 + LH G3)
      { beat: 12, durBeats: 0.5, midi: 67, hand: 'right', finger: 4 },
      { beat: 12, durBeats: 2, midi: 55, hand: 'left', finger: 1 },
      { beat: 12.5, durBeats: 0.5, midi: 65, hand: 'right', finger: 3 },
      { beat: 13, durBeats: 0.5, midi: 64, hand: 'right', finger: 2 },
      { beat: 13.5, durBeats: 0.5, midi: 62, hand: 'right', finger: 1 },
      // Measure 8 (2/4): "kap - ni." (C4 C4 + LH C3)
      { beat: 14, durBeats: 1, midi: 60, hand: 'right', finger: 1 },
      { beat: 14, durBeats: 2, midi: 48, hand: 'left', finger: 5 },
      { beat: 15, durBeats: 1, midi: 60, hand: 'right', finger: 1 },
    ]),
  },
  {
    id: 'ode-to-joy',
    title: 'Ode to Joy — Two-Hand Duet',
    titleHu: 'Örömóda — Kétkezes változat',
    composer: 'Ludwig van Beethoven',
    composerHu: 'Ludwig van Beethoven',
    level: 2,
    bpm: 88,
    timeSignature: [4, 4],
    keySignature: 'C Major',
    category: 'Classical',
    handArrangement: 'two-hands',
    description:
      'Combines the Right-Hand Ode to Joy melody with gentle Left-Hand whole-note anchors on Beat 1 of each measure.',
    descriptionHu:
      'A jobb kezes Örömóda dallamot egészhangos bal kezes basszushangokkal egészíti ki minden ütem első ütésén.',
    focusSkill: 'First Two-Hand Coordination (Melody + Held Bass)',
    focusSkillHu: 'Első kétkezes koordináció (Dallam + tartott basszus)',
    durationSeconds: 24,
    notes: buildNotes(88, 4, [
      // Measure 1
      { beat: 0, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      { beat: 0, durBeats: 4, midi: 48, hand: 'left', finger: 5 },
      { beat: 1, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      { beat: 2, durBeats: 1, midi: 65, hand: 'right', finger: 4 },
      { beat: 3, durBeats: 1, midi: 67, hand: 'right', finger: 5 },
      // Measure 2
      { beat: 4, durBeats: 1, midi: 67, hand: 'right', finger: 5 },
      { beat: 4, durBeats: 4, midi: 55, hand: 'left', finger: 1 },
      { beat: 5, durBeats: 1, midi: 65, hand: 'right', finger: 4 },
      { beat: 6, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      { beat: 7, durBeats: 1, midi: 62, hand: 'right', finger: 2 },
      // Measure 3
      { beat: 8, durBeats: 1, midi: 60, hand: 'right', finger: 1 },
      { beat: 8, durBeats: 4, midi: 48, hand: 'left', finger: 5 },
      { beat: 9, durBeats: 1, midi: 60, hand: 'right', finger: 1 },
      { beat: 10, durBeats: 1, midi: 62, hand: 'right', finger: 2 },
      { beat: 11, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      // Measure 4
      { beat: 12, durBeats: 1.5, midi: 64, hand: 'right', finger: 3 },
      { beat: 12, durBeats: 4, midi: 55, hand: 'left', finger: 1 },
      { beat: 13.5, durBeats: 0.5, midi: 62, hand: 'right', finger: 2 },
      { beat: 14, durBeats: 2, midi: 62, hand: 'right', finger: 2 },
      // Measure 5
      { beat: 16, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      { beat: 16, durBeats: 4, midi: 48, hand: 'left', finger: 5 },
      { beat: 17, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      { beat: 18, durBeats: 1, midi: 65, hand: 'right', finger: 4 },
      { beat: 19, durBeats: 1, midi: 67, hand: 'right', finger: 5 },
      // Measure 6
      { beat: 20, durBeats: 1, midi: 67, hand: 'right', finger: 5 },
      { beat: 20, durBeats: 4, midi: 53, hand: 'left', finger: 2 },
      { beat: 21, durBeats: 1, midi: 65, hand: 'right', finger: 4 },
      { beat: 22, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      { beat: 23, durBeats: 1, midi: 62, hand: 'right', finger: 2 },
      // Measure 7
      { beat: 24, durBeats: 1, midi: 60, hand: 'right', finger: 1 },
      { beat: 24, durBeats: 2, midi: 48, hand: 'left', finger: 5 },
      { beat: 25, durBeats: 1, midi: 60, hand: 'right', finger: 1 },
      { beat: 26, durBeats: 1, midi: 62, hand: 'right', finger: 2 },
      { beat: 26, durBeats: 2, midi: 55, hand: 'left', finger: 1 },
      { beat: 27, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      // Measure 8
      { beat: 28, durBeats: 1.5, midi: 62, hand: 'right', finger: 2 },
      { beat: 28, durBeats: 4, midi: 48, hand: 'left', finger: 5 },
      { beat: 29.5, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 30, durBeats: 2, midi: 60, hand: 'right', finger: 1 },
    ]),
  },
  {
    id: 'twinkle-little-star',
    title: 'Ah! Vous dirai-je, Maman (Twinkle Theme)',
    titleHu: 'Hull a pelyhes fehér hó (Mozart téma)',
    composer: 'W.A. Mozart / Traditional',
    composerHu: 'W.A. Mozart / Hagyományos',
    level: 2,
    bpm: 84,
    timeSignature: [4, 4],
    keySignature: 'C Major',
    category: 'Traditional',
    handArrangement: 'two-hands',
    description:
      'Teaches clean fifth interval leaps (C4 to G4) and gentle descending steps with balanced wrist movement.',
    descriptionHu:
      'A tiszta kvintugrásokat (C4–G4) és az egyenletes ereszkedő skálalépéseket gyakoroltatja két kézzel.',
    focusSkill: 'Interval Fifths & Half-Note Bass Support',
    focusSkillHu: 'Kvintugrások és félhangos basszuskíséret',
    durationSeconds: 24,
    notes: buildNotes(84, 4, [
      // Measure 1
      { beat: 0, durBeats: 1, midi: 60, hand: 'right', finger: 1 },
      { beat: 0, durBeats: 4, midi: 48, hand: 'left', finger: 5 },
      { beat: 1, durBeats: 1, midi: 60, hand: 'right', finger: 1 },
      { beat: 2, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      { beat: 3, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      // Measure 2
      { beat: 4, durBeats: 1, midi: 69, hand: 'right', finger: 5 },
      { beat: 4, durBeats: 2, midi: 53, hand: 'left', finger: 2 },
      { beat: 5, durBeats: 1, midi: 69, hand: 'right', finger: 5 },
      { beat: 6, durBeats: 2, midi: 67, hand: 'right', finger: 4 },
      { beat: 6, durBeats: 2, midi: 52, hand: 'left', finger: 3 },
      // Measure 3
      { beat: 8, durBeats: 1, midi: 65, hand: 'right', finger: 3 },
      { beat: 8, durBeats: 2, midi: 50, hand: 'left', finger: 4 },
      { beat: 9, durBeats: 1, midi: 65, hand: 'right', finger: 3 },
      { beat: 10, durBeats: 1, midi: 64, hand: 'right', finger: 2 },
      { beat: 10, durBeats: 2, midi: 48, hand: 'left', finger: 5 },
      { beat: 11, durBeats: 1, midi: 64, hand: 'right', finger: 2 },
      // Measure 4
      { beat: 12, durBeats: 1, midi: 62, hand: 'right', finger: 2 },
      { beat: 12, durBeats: 2, midi: 55, hand: 'left', finger: 1 },
      { beat: 13, durBeats: 1, midi: 62, hand: 'right', finger: 2 },
      { beat: 14, durBeats: 2, midi: 60, hand: 'right', finger: 1 },
      { beat: 14, durBeats: 2, midi: 48, hand: 'left', finger: 5 },
      // Measure 5
      { beat: 16, durBeats: 1, midi: 67, hand: 'right', finger: 5 },
      { beat: 16, durBeats: 2, midi: 52, hand: 'left', finger: 3 },
      { beat: 17, durBeats: 1, midi: 67, hand: 'right', finger: 5 },
      { beat: 18, durBeats: 1, midi: 65, hand: 'right', finger: 4 },
      { beat: 18, durBeats: 2, midi: 53, hand: 'left', finger: 2 },
      { beat: 19, durBeats: 1, midi: 65, hand: 'right', finger: 4 },
      // Measure 6
      { beat: 20, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      { beat: 20, durBeats: 2, midi: 52, hand: 'left', finger: 3 },
      { beat: 21, durBeats: 1, midi: 64, hand: 'right', finger: 3 },
      { beat: 22, durBeats: 2, midi: 62, hand: 'right', finger: 2 },
      { beat: 22, durBeats: 2, midi: 55, hand: 'left', finger: 1 },
      // Measure 7
      { beat: 24, durBeats: 1, midi: 60, hand: 'right', finger: 1 },
      { beat: 24, durBeats: 2, midi: 48, hand: 'left', finger: 5 },
      { beat: 25, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      { beat: 26, durBeats: 1, midi: 69, hand: 'right', finger: 5 },
      { beat: 26, durBeats: 2, midi: 53, hand: 'left', finger: 2 },
      { beat: 27, durBeats: 1, midi: 67, hand: 'right', finger: 4 },
      // Measure 8
      { beat: 28, durBeats: 1, midi: 65, hand: 'right', finger: 3 },
      { beat: 28, durBeats: 2, midi: 55, hand: 'left', finger: 1 },
      { beat: 29, durBeats: 1, midi: 62, hand: 'right', finger: 2 },
      { beat: 30, durBeats: 2, midi: 60, hand: 'right', finger: 1 },
      { beat: 30, durBeats: 2, midi: 48, hand: 'left', finger: 5 },
    ]),
  },
  {
    id: 'minuet-in-g',
    title: 'Minuet in G Major (BWV Anh. 114)',
    titleHu: 'G-dúr menüett (BWV Anh. 114)',
    composer: 'J.S. Bach / Christian Petzold',
    composerHu: 'J.S. Bach / Christian Petzold',
    level: 3,
    bpm: 96,
    timeSignature: [3, 4],
    keySignature: 'G Major',
    category: 'Baroque',
    handArrangement: 'two-hands',
    description:
      'Classic Notebook for Anna Magdalena Bach piece in 3/4 waltz meter. Develops independent eighth-note runs in the right hand against a poised bass line.',
    descriptionHu:
      'Anna Magdalena Bach kottásfüzetének legismertebb darabja 3/4-es lüktetésben. Fejleszti a jobb kéz nyolcadmeneteit és a két kéz függetlenségét.',
    focusSkill: '3/4 Meter & Two-Hand Independence',
    focusSkillHu: '3/4-es lüktetés és kétkezes függetlenség',
    durationSeconds: 22,
    notes: buildNotes(96, 3, [
      // Measure 1
      { beat: 0, durBeats: 1, midi: 74, hand: 'right', finger: 5 },
      { beat: 0, durBeats: 2, midi: 55, hand: 'left', finger: 3 },
      { beat: 1, durBeats: 0.5, midi: 67, hand: 'right', finger: 1 },
      { beat: 1.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 2, durBeats: 0.5, midi: 71, hand: 'right', finger: 3 },
      { beat: 2, durBeats: 1, midi: 57, hand: 'left', finger: 2 },
      { beat: 2.5, durBeats: 0.5, midi: 72, hand: 'right', finger: 4 },
      // Measure 2
      { beat: 3, durBeats: 1, midi: 74, hand: 'right', finger: 5 },
      { beat: 3, durBeats: 3, midi: 59, hand: 'left', finger: 1 },
      { beat: 4, durBeats: 1, midi: 67, hand: 'right', finger: 1 },
      { beat: 5, durBeats: 1, midi: 67, hand: 'right', finger: 1 },
      // Measure 3
      { beat: 6, durBeats: 1, midi: 76, hand: 'right', finger: 3 },
      { beat: 6, durBeats: 3, midi: 60, hand: 'left', finger: 1 },
      { beat: 7, durBeats: 0.5, midi: 72, hand: 'right', finger: 1 },
      { beat: 7.5, durBeats: 0.5, midi: 74, hand: 'right', finger: 2 },
      { beat: 8, durBeats: 0.5, midi: 76, hand: 'right', finger: 3 },
      { beat: 8.5, durBeats: 0.5, midi: 78, hand: 'right', finger: 4 },
      // Measure 4
      { beat: 9, durBeats: 1, midi: 79, hand: 'right', finger: 5 },
      { beat: 9, durBeats: 3, midi: 59, hand: 'left', finger: 2 },
      { beat: 10, durBeats: 1, midi: 67, hand: 'right', finger: 1 },
      { beat: 11, durBeats: 1, midi: 67, hand: 'right', finger: 1 },
      // Measure 5
      { beat: 12, durBeats: 1, midi: 72, hand: 'right', finger: 4 },
      { beat: 12, durBeats: 3, midi: 57, hand: 'left', finger: 3 },
      { beat: 13, durBeats: 0.5, midi: 74, hand: 'right', finger: 5 },
      { beat: 13.5, durBeats: 0.5, midi: 72, hand: 'right', finger: 4 },
      { beat: 14, durBeats: 0.5, midi: 71, hand: 'right', finger: 3 },
      { beat: 14.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 2 },
      // Measure 6
      { beat: 15, durBeats: 1, midi: 71, hand: 'right', finger: 3 },
      { beat: 15, durBeats: 3, midi: 55, hand: 'left', finger: 4 },
      { beat: 16, durBeats: 0.5, midi: 72, hand: 'right', finger: 4 },
      { beat: 16.5, durBeats: 0.5, midi: 71, hand: 'right', finger: 3 },
      { beat: 17, durBeats: 0.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 17.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 1 },
      // Measure 7
      { beat: 18, durBeats: 1, midi: 66, hand: 'right', finger: 2 },
      { beat: 18, durBeats: 2, midi: 50, hand: 'left', finger: 5 },
      { beat: 19, durBeats: 0.5, midi: 67, hand: 'right', finger: 1 },
      { beat: 19.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 20, durBeats: 0.5, midi: 71, hand: 'right', finger: 3 },
      { beat: 20, durBeats: 1, midi: 55, hand: 'left', finger: 1 },
      { beat: 20.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 1 },
      // Measure 8
      { beat: 21, durBeats: 3, midi: 69, hand: 'right', finger: 2 },
      { beat: 21, durBeats: 3, midi: 50, hand: 'left', finger: 5 },
    ]),
  },
  {
    id: 'clair-de-lune-theme',
    title: 'Clair de Lune (Simplified Theme in C)',
    titleHu: 'Clair de Lune — Holdfény (C-dúr átirat)',
    composer: 'Claude Debussy',
    composerHu: 'Claude Debussy',
    level: 3,
    bpm: 72,
    timeSignature: [3, 4],
    keySignature: 'C Major Arrangement',
    category: 'Romantic',
    handArrangement: 'two-hands',
    description:
      'Transposed from D-flat major to C major for beginners so you can focus on expressive touch velocity and gentle lyrical phrasing.',
    descriptionHu:
      'Desz-dúrból C-dúrba transzponált kezdőbarát változat a kifejező billentés és a lírai dallamformálás gyakorlásához.',
    focusSkill: 'Dynamic Touch Control & Lyrical Legato',
    focusSkillHu: 'Dinamikai billentés és legato dallamformálás',
    durationSeconds: 25,
    notes: buildNotes(72, 3, [
      // Measure 1
      { beat: 0, durBeats: 3, midi: 48, hand: 'left', finger: 5 },
      { beat: 0, durBeats: 3, midi: 55, hand: 'left', finger: 1 },
      { beat: 1, durBeats: 1, midi: 76, hand: 'right', finger: 5 },
      { beat: 2, durBeats: 1, midi: 72, hand: 'right', finger: 3 },
      // Measure 2
      { beat: 3, durBeats: 3, midi: 53, hand: 'left', finger: 2 },
      { beat: 3, durBeats: 1.5, midi: 69, hand: 'right', finger: 2 },
      { beat: 4.5, durBeats: 0.5, midi: 71, hand: 'right', finger: 3 },
      { beat: 5, durBeats: 1, midi: 69, hand: 'right', finger: 2 },
      // Measure 3
      { beat: 6, durBeats: 3, midi: 52, hand: 'left', finger: 3 },
      { beat: 6, durBeats: 1.5, midi: 67, hand: 'right', finger: 1 },
      { beat: 7.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 3 },
      { beat: 8, durBeats: 1, midi: 67, hand: 'right', finger: 2 },
      // Measure 4
      { beat: 9, durBeats: 3, midi: 50, hand: 'left', finger: 4 },
      { beat: 9, durBeats: 2, midi: 65, hand: 'right', finger: 2 },
      { beat: 11, durBeats: 1, midi: 64, hand: 'right', finger: 1 },
      // Measure 5
      { beat: 12, durBeats: 3, midi: 48, hand: 'left', finger: 5 },
      { beat: 12, durBeats: 1.5, midi: 62, hand: 'right', finger: 2 },
      { beat: 13.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 3 },
      { beat: 14, durBeats: 1, midi: 60, hand: 'right', finger: 1 },
      // Measure 6
      { beat: 15, durBeats: 3, midi: 43, hand: 'left', finger: 5 },
      { beat: 15, durBeats: 3, midi: 55, hand: 'left', finger: 1 },
      { beat: 16, durBeats: 1, midi: 67, hand: 'right', finger: 5 },
      { beat: 17, durBeats: 1, midi: 62, hand: 'right', finger: 2 },
      // Measure 7
      { beat: 18, durBeats: 3, midi: 48, hand: 'left', finger: 5 },
      { beat: 18, durBeats: 3, midi: 60, hand: 'right', finger: 1 },
      { beat: 18, durBeats: 3, midi: 64, hand: 'right', finger: 3 },
    ]),
  },
  {
    id: 'fur-elise',
    title: 'Für Elise (Bagatelle No. 25 — Alternating Arpeggios)',
    titleHu: 'Für Elise (Váltott kezes akkordfelbontással)',
    composer: 'Ludwig van Beethoven',
    composerHu: 'Ludwig van Beethoven',
    level: 4,
    bpm: 100,
    timeSignature: [3, 4],
    keySignature: 'A Minor',
    category: 'Classical',
    handArrangement: 'alternating-hands',
    description:
      'Signature chromatic E5–D#5 semitone oscillation where the Left Hand arpeggio hands off seamlessly to the Right Hand one note at a time.',
    descriptionHu:
      'Az ikonikus E5–D#5 félhang-váltakozás, ahol a bal kéz felbontott akkordja hangról hangra adja át a dallamot a jobb kéznek.',
    focusSkill: 'Chromatic Semitone & Cross-Hand Arpeggio Flow',
    focusSkillHu: 'Kromatikus félhanglépés és kézváltós akkordfelbontás',
    durationSeconds: 24,
    notes: buildNotes(100, 3, [
      // Pickup + Measure 1
      { beat: 0, durBeats: 0.5, midi: 76, hand: 'right', finger: 5 },
      { beat: 0.5, durBeats: 0.5, midi: 75, hand: 'right', finger: 4 },
      { beat: 1, durBeats: 0.5, midi: 76, hand: 'right', finger: 5 },
      { beat: 1.5, durBeats: 0.5, midi: 75, hand: 'right', finger: 4 },
      { beat: 2, durBeats: 0.5, midi: 76, hand: 'right', finger: 5 },
      { beat: 2.5, durBeats: 0.5, midi: 71, hand: 'right', finger: 2 },
      // Measure 2
      { beat: 3, durBeats: 0.5, midi: 74, hand: 'right', finger: 4 },
      { beat: 3.5, durBeats: 0.5, midi: 72, hand: 'right', finger: 3 },
      { beat: 4, durBeats: 0.5, midi: 69, hand: 'right', finger: 1 },
      { beat: 4.5, durBeats: 0.5, midi: 52, hand: 'left', finger: 2 },
      { beat: 5, durBeats: 0.5, midi: 57, hand: 'left', finger: 1 },
      // Measure 3
      { beat: 5.5, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 6, durBeats: 0.5, midi: 64, hand: 'right', finger: 2 },
      { beat: 6.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 4 },
      { beat: 7, durBeats: 0.5, midi: 71, hand: 'right', finger: 5 },
      { beat: 7.5, durBeats: 0.5, midi: 52, hand: 'left', finger: 2 },
      { beat: 8, durBeats: 0.5, midi: 56, hand: 'left', finger: 1 },
      // Measure 4
      { beat: 8.5, durBeats: 0.5, midi: 64, hand: 'right', finger: 1 },
      { beat: 9, durBeats: 0.5, midi: 68, hand: 'right', finger: 2 },
      { beat: 9.5, durBeats: 0.5, midi: 71, hand: 'right', finger: 3 },
      { beat: 10, durBeats: 0.5, midi: 72, hand: 'right', finger: 4 },
      { beat: 10.5, durBeats: 0.5, midi: 52, hand: 'left', finger: 2 },
      { beat: 11, durBeats: 0.5, midi: 57, hand: 'left', finger: 1 },
      // Measure 5
      { beat: 12, durBeats: 0.5, midi: 76, hand: 'right', finger: 5 },
      { beat: 12.5, durBeats: 0.5, midi: 75, hand: 'right', finger: 4 },
      { beat: 13, durBeats: 0.5, midi: 76, hand: 'right', finger: 5 },
      { beat: 13.5, durBeats: 0.5, midi: 75, hand: 'right', finger: 4 },
      { beat: 14, durBeats: 0.5, midi: 76, hand: 'right', finger: 5 },
      { beat: 14.5, durBeats: 0.5, midi: 71, hand: 'right', finger: 2 },
      // Measure 6
      { beat: 15, durBeats: 0.5, midi: 74, hand: 'right', finger: 4 },
      { beat: 15.5, durBeats: 0.5, midi: 72, hand: 'right', finger: 3 },
      { beat: 16, durBeats: 0.5, midi: 69, hand: 'right', finger: 1 },
      { beat: 16.5, durBeats: 0.5, midi: 52, hand: 'left', finger: 2 },
      { beat: 17, durBeats: 0.5, midi: 57, hand: 'left', finger: 1 },
      // Measure 7
      { beat: 17.5, durBeats: 0.5, midi: 60, hand: 'right', finger: 1 },
      { beat: 18, durBeats: 0.5, midi: 64, hand: 'right', finger: 2 },
      { beat: 18.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 4 },
      { beat: 19, durBeats: 1, midi: 71, hand: 'right', finger: 5 },
      { beat: 20, durBeats: 0.5, midi: 64, hand: 'right', finger: 1 },
      { beat: 20.5, durBeats: 0.5, midi: 72, hand: 'right', finger: 4 },
      { beat: 21, durBeats: 0.5, midi: 71, hand: 'right', finger: 3 },
      // Measure 8
      { beat: 21.5, durBeats: 2.5, midi: 69, hand: 'right', finger: 2 },
    ]),
  },
  {
    id: 'prelude-in-c-bwv846',
    title: 'Prelude in C Major (BWV 846 — Well-Tempered Clavier)',
    titleHu: 'C-dúr prelúdium (BWV 846 — Wohltemperiertes Klavier)',
    composer: 'Johann Sebastian Bach',
    composerHu: 'Johann Sebastian Bach',
    level: 5,
    bpm: 92,
    timeSignature: [4, 4],
    keySignature: 'C Major',
    category: 'Baroque',
    handArrangement: 'two-hands',
    description:
      'Masterpiece of continuous broken arpeggios where the left hand holds the bass root and third while the right hand weaves three-note ascending figures.',
    descriptionHu:
      'Folyamatos akkordfelbontásokra épülő remekmű, amelyben a bal kéz tartja az alaphangot és a tercet, miközben a jobb kéz hármashangzat-felbontásokat sző.',
    focusSkill: 'Interlocking Arpeggio Pattern & Voicing',
    focusSkillHu: 'Összefonódó akkordfelbontások és szólamvezetés',
    durationSeconds: 26,
    notes: buildNotes(92, 4, [
      // Measure 1 (C Major: C4-E4-G4-C5-E5)
      { beat: 0, durBeats: 4, midi: 60, hand: 'left', finger: 5 },
      { beat: 0.5, durBeats: 3.5, midi: 64, hand: 'left', finger: 3 },
      { beat: 1, durBeats: 0.5, midi: 67, hand: 'right', finger: 1 },
      { beat: 1.5, durBeats: 0.5, midi: 72, hand: 'right', finger: 3 },
      { beat: 2, durBeats: 0.5, midi: 76, hand: 'right', finger: 5 },
      { beat: 2.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 1 },
      { beat: 3, durBeats: 0.5, midi: 72, hand: 'right', finger: 3 },
      { beat: 3.5, durBeats: 0.5, midi: 76, hand: 'right', finger: 5 },
      // Measure 2 (Dm7/C: C4-D4-A4-D5-F5)
      { beat: 4, durBeats: 4, midi: 60, hand: 'left', finger: 5 },
      { beat: 4.5, durBeats: 3.5, midi: 62, hand: 'left', finger: 4 },
      { beat: 5, durBeats: 0.5, midi: 69, hand: 'right', finger: 1 },
      { beat: 5.5, durBeats: 0.5, midi: 74, hand: 'right', finger: 3 },
      { beat: 6, durBeats: 0.5, midi: 77, hand: 'right', finger: 5 },
      { beat: 6.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 1 },
      { beat: 7, durBeats: 0.5, midi: 74, hand: 'right', finger: 3 },
      { beat: 7.5, durBeats: 0.5, midi: 77, hand: 'right', finger: 5 },
      // Measure 3 (G7/B: B3-D4-G4-D5-F5)
      { beat: 8, durBeats: 4, midi: 59, hand: 'left', finger: 5 },
      { beat: 8.5, durBeats: 3.5, midi: 62, hand: 'left', finger: 3 },
      { beat: 9, durBeats: 0.5, midi: 67, hand: 'right', finger: 1 },
      { beat: 9.5, durBeats: 0.5, midi: 74, hand: 'right', finger: 4 },
      { beat: 10, durBeats: 0.5, midi: 77, hand: 'right', finger: 5 },
      { beat: 10.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 1 },
      { beat: 11, durBeats: 0.5, midi: 74, hand: 'right', finger: 4 },
      { beat: 11.5, durBeats: 0.5, midi: 77, hand: 'right', finger: 5 },
      // Measure 4 (C Major return: C4-E4-G4-C5-E5)
      { beat: 12, durBeats: 4, midi: 60, hand: 'left', finger: 5 },
      { beat: 12.5, durBeats: 3.5, midi: 64, hand: 'left', finger: 3 },
      { beat: 13, durBeats: 0.5, midi: 67, hand: 'right', finger: 1 },
      { beat: 13.5, durBeats: 0.5, midi: 72, hand: 'right', finger: 3 },
      { beat: 14, durBeats: 0.5, midi: 76, hand: 'right', finger: 5 },
      { beat: 14.5, durBeats: 0.5, midi: 67, hand: 'right', finger: 1 },
      { beat: 15, durBeats: 0.5, midi: 72, hand: 'right', finger: 3 },
      { beat: 15.5, durBeats: 0.5, midi: 76, hand: 'right', finger: 5 },
      // Measure 5 (Am/C: C4-E4-A4-E5-A5)
      { beat: 16, durBeats: 4, midi: 60, hand: 'left', finger: 5 },
      { beat: 16.5, durBeats: 3.5, midi: 64, hand: 'left', finger: 3 },
      { beat: 17, durBeats: 0.5, midi: 69, hand: 'right', finger: 1 },
      { beat: 17.5, durBeats: 0.5, midi: 76, hand: 'right', finger: 3 },
      { beat: 18, durBeats: 0.5, midi: 81, hand: 'right', finger: 5 },
      { beat: 18.5, durBeats: 0.5, midi: 69, hand: 'right', finger: 1 },
      { beat: 19, durBeats: 0.5, midi: 76, hand: 'right', finger: 3 },
      { beat: 19.5, durBeats: 0.5, midi: 81, hand: 'right', finger: 5 },
      // Measure 6 Final Cadence Chord
      { beat: 20, durBeats: 4, midi: 48, hand: 'left', finger: 5 },
      { beat: 20, durBeats: 4, midi: 55, hand: 'left', finger: 1 },
      { beat: 20, durBeats: 4, midi: 64, hand: 'right', finger: 1 },
      { beat: 20, durBeats: 4, midi: 67, hand: 'right', finger: 2 },
      { beat: 20, durBeats: 4, midi: 72, hand: 'right', finger: 5 },
    ]),
  },

  // ─────────────────────────────────────────────────────────────────────
  // CHORDS · dedicated chord-practice folder (teaches + validates stacked notes)
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'chords-major-triads-rh',
    title: 'Major Triads · Right Hand',
    titleHu: 'Dúr hármashangzatok · Jobb kéz',
    composer: 'KlavierLab Exercise',
    composerHu: 'KlavierLab gyakorlat',
    level: 1,
    bpm: 60,
    timeSignature: [4, 4],
    keySignature: 'C Major',
    category: 'Chords',
    handArrangement: 'right-only',
    description:
      'Four root-position major triads in the right hand: C (C4-E4-G4), F (C4-F4-A4), G (B3-D4-G4) and back to C. Press all three notes of each chord together. Best practiced in "Wait for note" mode.',
    descriptionHu:
      'Négy alaphelyzetű dúr hármashangzat a jobb kézzel: C (C4-E4-G4), F (C4-F4-A4), G (H3-D4-G4) és vissza C-re. Minden akkord három hangját egyszerre üsd le. Leginkább a „Várj a hangra” módban gyakorolható.',
    focusSkill: 'Root-Position Triads · Simultaneous Notes · Right Hand',
    focusSkillHu: 'Alaphelyzetű hármashangzatok · Egyszerre leütött hangok · Jobb kéz',
    durationSeconds: 12,
    notes: buildNotes(60, 4, [
      // C major (C4 E4 G4)
      { beat: 0, durBeats: 2, midi: 60, hand: 'right', finger: 1 },
      { beat: 0, durBeats: 2, midi: 64, hand: 'right', finger: 3 },
      { beat: 0, durBeats: 2, midi: 67, hand: 'right', finger: 5 },
      // F major (C4 F4 A4)
      { beat: 2, durBeats: 2, midi: 60, hand: 'right', finger: 1 },
      { beat: 2, durBeats: 2, midi: 65, hand: 'right', finger: 3 },
      { beat: 2, durBeats: 2, midi: 69, hand: 'right', finger: 5 },
      // G major (B3 D4 G4)
      { beat: 4, durBeats: 2, midi: 59, hand: 'right', finger: 1 },
      { beat: 4, durBeats: 2, midi: 62, hand: 'right', finger: 2 },
      { beat: 4, durBeats: 2, midi: 67, hand: 'right', finger: 5 },
      // C major (C4 E4 G4)
      { beat: 6, durBeats: 2, midi: 60, hand: 'right', finger: 1 },
      { beat: 6, durBeats: 2, midi: 64, hand: 'right', finger: 3 },
      { beat: 6, durBeats: 2, midi: 67, hand: 'right', finger: 5 },
    ]),
  },
  {
    id: 'chords-triad-inversions-rh',
    title: 'C Major Triad Inversions',
    titleHu: 'C-dúr hármashangzat fordítások',
    composer: 'KlavierLab Exercise',
    composerHu: 'KlavierLab gyakorlat',
    level: 2,
    bpm: 60,
    timeSignature: [4, 4],
    keySignature: 'C Major',
    category: 'Chords',
    handArrangement: 'right-only',
    description:
      'The C major triad in all three positions: root (C4-E4-G4), first inversion (E4-G4-C5), second inversion (G4-C5-E5), and back to root up an octave (C5-E5-G5). Learn how the same chord changes shape.',
    descriptionHu:
      'A C-dúr hármashangzat mindhárom helyzetben: alaphelyzet (C4-E4-G4), első fordítás (E4-G4-C5), második fordítás (G4-C5-E5), majd vissza alaphelyzetbe egy oktávval feljebb (C5-E5-G5). Ismerd meg, hogyan változik ugyanazon akkord alakja.',
    focusSkill: 'Triad Inversions · Hand Shape · Right Hand',
    focusSkillHu: 'Hármashangzat-fordítások · Kéztartás · Jobb kéz',
    durationSeconds: 12,
    notes: buildNotes(60, 4, [
      // Root (C4 E4 G4)
      { beat: 0, durBeats: 2, midi: 60, hand: 'right', finger: 1 },
      { beat: 0, durBeats: 2, midi: 64, hand: 'right', finger: 3 },
      { beat: 0, durBeats: 2, midi: 67, hand: 'right', finger: 5 },
      // 1st inversion (E4 G4 C5)
      { beat: 2, durBeats: 2, midi: 64, hand: 'right', finger: 1 },
      { beat: 2, durBeats: 2, midi: 67, hand: 'right', finger: 2 },
      { beat: 2, durBeats: 2, midi: 72, hand: 'right', finger: 5 },
      // 2nd inversion (G4 C5 E5)
      { beat: 4, durBeats: 2, midi: 67, hand: 'right', finger: 1 },
      { beat: 4, durBeats: 2, midi: 72, hand: 'right', finger: 3 },
      { beat: 4, durBeats: 2, midi: 76, hand: 'right', finger: 5 },
      // Root octave up (C5 E5 G5)
      { beat: 6, durBeats: 2, midi: 72, hand: 'right', finger: 1 },
      { beat: 6, durBeats: 2, midi: 76, hand: 'right', finger: 3 },
      { beat: 6, durBeats: 2, midi: 79, hand: 'right', finger: 5 },
    ]),
  },
  {
    id: 'chords-pop-progression-two-hands',
    title: 'Pop Progression · I–V–vi–IV',
    titleHu: 'Popakkordmenet · I–V–vi–IV',
    composer: 'KlavierLab Exercise',
    composerHu: 'KlavierLab gyakorlat',
    level: 3,
    bpm: 66,
    timeSignature: [4, 4],
    keySignature: 'C Major',
    category: 'Chords',
    handArrangement: 'two-hands',
    description:
      'The classic four-chord pop progression in C: C major, G major, A minor, F major. The left hand plays the bass root while the right hand plays the full triad — both struck together. Great for two-hand chord coordination.',
    descriptionHu:
      'A klasszikus négyakkordos popmenet C-ben: C-dúr, G-dúr, a-moll, F-dúr. A bal kéz a basszus alaphangot játssza, a jobb kéz a teljes hármashangzatot — egyszerre leütve. Kiváló a kétkezes akkordösszehangoláshoz.',
    focusSkill: 'Two-Hand Chords · Chord Progression · Bass + Triad',
    focusSkillHu: 'Kétkezes akkordok · Akkordmenet · Basszus + hármashangzat',
    durationSeconds: 15,
    notes: buildNotes(66, 4, [
      // C major — bass C3 + triad C4 E4 G4
      { beat: 0, durBeats: 4, midi: 48, hand: 'left', finger: 5 },
      { beat: 0, durBeats: 4, midi: 60, hand: 'right', finger: 1 },
      { beat: 0, durBeats: 4, midi: 64, hand: 'right', finger: 3 },
      { beat: 0, durBeats: 4, midi: 67, hand: 'right', finger: 5 },
      // G major — bass G2 + triad G3 B3 D4
      { beat: 4, durBeats: 4, midi: 43, hand: 'left', finger: 5 },
      { beat: 4, durBeats: 4, midi: 55, hand: 'right', finger: 1 },
      { beat: 4, durBeats: 4, midi: 59, hand: 'right', finger: 3 },
      { beat: 4, durBeats: 4, midi: 62, hand: 'right', finger: 5 },
      // A minor — bass A2 + triad A3 C4 E4
      { beat: 8, durBeats: 4, midi: 45, hand: 'left', finger: 5 },
      { beat: 8, durBeats: 4, midi: 57, hand: 'right', finger: 1 },
      { beat: 8, durBeats: 4, midi: 60, hand: 'right', finger: 3 },
      { beat: 8, durBeats: 4, midi: 64, hand: 'right', finger: 5 },
      // F major — bass F2 + triad F3 A3 C4
      { beat: 12, durBeats: 4, midi: 41, hand: 'left', finger: 5 },
      { beat: 12, durBeats: 4, midi: 53, hand: 'right', finger: 1 },
      { beat: 12, durBeats: 4, midi: 57, hand: 'right', finger: 3 },
      { beat: 12, durBeats: 4, midi: 60, hand: 'right', finger: 5 },
    ]),
  },
];

export const INITIAL_SONGS: Song[] = [...RAW_INITIAL_SONGS, ...BUNDLED_MIDI_SONGS].map((song) => ({
  ...song,
  durationSeconds: computeSongDuration(song.notes),
}));

export const LEVEL_TITLES: Record<number, string> = {
  1: 'Level 1 · Single-Hand Foundations',
  2: 'Level 2 · First Two-Hand Duets',
  3: 'Level 3 · Expressive Phrasing',
  4: 'Level 4 · Arpeggio & Harmony Flow',
  5: 'Level 5 · Concert Repertoire',
};

export const HAND_ARRANGEMENT_LABELS: Record<Song['handArrangement'], string> = {
  'right-only': 'Right Hand Only',
  'left-only': 'Left Hand Only',
  'alternating-hands': 'Alternating Hands (One at a Time)',
  'two-hands': 'Two Hands Together',
};
