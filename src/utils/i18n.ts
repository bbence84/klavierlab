export type Language = 'hu' | 'en';
export type ThemeMode = 'dark' | 'light';

export const UI_TEXT = {
  hu: {
    // Top bar (strict 3 zones)
    navStudio: 'Gyakorló Stúdió',
    navLibrary: 'Kottatár',
    navProgress: 'Szintek és Statisztika',
    navSetup: 'MIDI Csatlakozás',
    connectMidiBtn: 'MIDI Zongora Csatlakoztatása',
    connectedPrefix: 'Csatlakoztatva:',

    // Sub-toolbar & global switches
    langLabel: 'Nyelv',
    themeDark: 'Sötét mód',
    themeLight: 'Világos mód',

    // Studio Controls
    uploadMid: 'Kotta feltöltése (MIDI / MusicXML)',
    startPractice: 'Indítás',
    resumePractice: 'Folytatás',
    pause: 'Szünet',
    restartTitle: 'Újrakezdés',
    modeWaitForNote: 'Várakozó mód (Wait-for-Note)',
    modeContinuous: 'Folyamatos tempó',
    listenDemo: 'Demó meghallgatása',
    handBoth: 'Mindkét kéz',
    handAlternating: 'Váltott kéz',
    handRight: 'Jobb kéz',
    handLeft: 'Bal kéz',
    tempoLabel: 'Tempó',
    finishAndGrade: 'Befejezés és Értékelés',

    // Metronome & Secondary Bar
    metronomeOn: 'Metronóm Be',
    metronomeOff: 'Metronóm Ki',
    beatLabel: 'Ütem',
    accuracy: 'Pontosság',
    streak: 'Sorozat',
    score: 'Pontszám',
    level: 'Szint',
    sheetMusicToggle: 'Kotta nézet',
    fallingNotesToggle: 'Lehulló sávok',
    keyLabelsToggle: 'Billentyűjelek',
    synthOn: 'Zongorahang Be',
    synthMuted: 'Némítva',

    // MIDI Upload Title Dialog
    midiModalTitle: 'Feltöltött kotta elnevezése',
    midiModalSubtitle: 'Add meg a zenemű címét a Kottatárba mentés előtt',
    midiTitleLabel: 'Zenemű címe',
    midiTitlePlaceholder: 'Pl. Für Elise vagy Saját gyakorlat',
    midiComposerLabel: 'Zeneszerző / Megjegyzés (opcionális)',
    midiComposerPlaceholder: 'Pl. zeneszerző vagy saját gyakorlat',
    midiSaveAndPractice: 'Mentés és Gyakorlás most',
    midiSaveOnly: 'Mentés a Kottatárba',
    midiCancel: 'Mégse',

    // Sheet Music & Canvas Overlays
    grandStaffTitle: 'Interaktív Kotta (Violinkulcs és Basszuskulcs)',
    meterSuffix: 'Ütemmutató',
    trebleLegend: 'Violinkulcs: Jobb kéz (Dallam)',
    bassLegend: 'Basszuskulcs: Bal kéz (Kíséret)',
    nowMarker: 'MOST',
    rightHandLegend: '■ Jobb kéz (R1–R5)',
    leftHandLegend: '■ Bal kéz (L1–L5)',
    waitModeHint: 'Várakozó mód: Megáll a lejátszás, amíg le nem ütöd a hangot',
    contModeHint: 'Folyamatos mód: Valós idejű ritmus- és tempóértékelés',
    actionRequired: '▲ LEÜTENDŐ HANG:',
    pressInstructionPrefix: 'Üsd le:',
    pressInstructionSuffix: 'a MIDI vagy képernyő-zongorán',
    rightHandShort: 'Jobb kéz',
    leftHandShort: 'Bal kéz',
    fingerShort: 'Ujj',

    // Feedback badges
    fbPerfect: '● TÖKÉLETES IDŐZÍTÉS',
    fbGood: '◆ JÓ LEÜTÉS',
    fbEarly: '▲ KISSÉ KORAI',
    fbLate: '▼ KISSÉ KÉSŐI',
    fbWrong: '✕ TÉVES BILLENTYŰ',
    fbMiss: '○ KIMARADT HANG',
    playedKey: 'Leütött:',
    expectedKey: 'Várt hang:',

    // Hand arrangement labels
    arrRightOnly: 'Csak jobb kéz',
    arrLeftOnly: 'Csak bal kéz',
    arrAlternating: 'Váltott kéz (egyszerre egy kéz)',
    arrTwoHands: 'Kétkezes (együtt)',

    // Level Titles
    lvl1Title: '1. Szint · Egykezes alapok',
    lvl2Title: '2. Szint · Első kétkezes dalok',
    lvl3Title: '3. Szint · Dallamformálás',
    lvl4Title: '4. Szint · Akkordfelbontások',
    lvl5Title: '5. Szint · Koncert repertoár',
  },
  en: {
    // Top bar (strict 3 zones)
    navStudio: 'Practice Studio',
    navLibrary: 'Song Library',
    navProgress: 'Progress & Levels',
    navSetup: 'MIDI Setup',
    connectMidiBtn: 'Connect MIDI Keyboard',
    connectedPrefix: 'Connected:',

    // Sub-toolbar & global switches
    langLabel: 'Language',
    themeDark: 'Dark Mode',
    themeLight: 'Light Mode',

    // Studio Controls
    uploadMid: 'Import score (MIDI / MusicXML)',
    startPractice: 'Start Practice',
    resumePractice: 'Resume',
    pause: 'Pause',
    restartTitle: 'Restart piece',
    modeWaitForNote: 'Wait-for-Note',
    modeContinuous: 'Continuous Tempo',
    listenDemo: 'Listen Demo',
    handBoth: 'Both Hands',
    handAlternating: 'Alternating Hands',
    handRight: 'Right Hand',
    handLeft: 'Left Hand',
    tempoLabel: 'Tempo',
    finishAndGrade: 'Finish & Grade',

    // Metronome & Secondary Bar
    metronomeOn: 'Metronome On',
    metronomeOff: 'Metronome Off',
    beatLabel: 'Beat',
    accuracy: 'Accuracy',
    streak: 'Streak',
    score: 'Score',
    level: 'Level',
    sheetMusicToggle: 'Sheet Music',
    fallingNotesToggle: 'Falling Notes',
    keyLabelsToggle: 'Key Labels',
    synthOn: 'Piano Synth On',
    synthMuted: 'Synth Muted',

    // MIDI Upload Title Dialog
    midiModalTitle: 'Name imported score',
    midiModalSubtitle: 'Title and composer',
    midiTitleLabel: 'Piece Title',
    midiTitlePlaceholder: 'e.g. Für Elise or Custom Practice Etude',
    midiComposerLabel: 'Composer / Subtitle (optional)',
    midiComposerPlaceholder: 'e.g. Composer or custom exercise',
    midiSaveAndPractice: 'Save & Open in Studio',
    midiSaveOnly: 'Save to Library',
    midiCancel: 'Cancel',

    // Sheet Music & Canvas Overlays
    grandStaffTitle: 'Interactive Grand Staff',
    meterSuffix: 'Meter',
    trebleLegend: 'Treble: Right Hand (Melody)',
    bassLegend: 'Bass: Left Hand (Harmony)',
    nowMarker: 'NOW',
    rightHandLegend: '■ Right Hand (R1–R5)',
    leftHandLegend: '■ Left Hand (L1–L5)',
    waitModeHint: 'Wait-for-Note Mode: Pauses for your key press',
    contModeHint: 'Continuous Tempo Mode: Real-time rhythm grading',
    actionRequired: '▲ ACTION REQUIRED:',
    pressInstructionPrefix: 'Press',
    pressInstructionSuffix: 'on your MIDI or studio keyboard',
    rightHandShort: 'Right Hand',
    leftHandShort: 'Left Hand',
    fingerShort: 'Finger',

    // Feedback badges
    fbPerfect: '● PERFECT TIMING',
    fbGood: '◆ GOOD HIT',
    fbEarly: '▲ SLIGHTLY EARLY',
    fbLate: '▼ SLIGHTLY LATE',
    fbWrong: '✕ WRONG KEY PRESSED',
    fbMiss: '○ MISSED NOTE',
    playedKey: 'Played',
    expectedKey: 'Expected',

    // Hand arrangement labels
    arrRightOnly: 'Right Hand Only',
    arrLeftOnly: 'Left Hand Only',
    arrAlternating: 'Alternating Hands (One at a Time)',
    arrTwoHands: 'Two Hands Together',

    // Level Titles
    lvl1Title: 'Level 1 · Single-Hand Foundations',
    lvl2Title: 'Level 2 · First Two-Hand Duets',
    lvl3Title: 'Level 3 · Expressive Phrasing',
    lvl4Title: 'Level 4 · Arpeggio & Harmony Flow',
    lvl5Title: 'Level 5 · Concert Repertoire',
  },
};

export function getLevelTitle(level: number, lang: Language): string {
  const t = UI_TEXT[lang];
  switch (level) {
    case 1:
      return t.lvl1Title;
    case 2:
      return t.lvl2Title;
    case 3:
      return t.lvl3Title;
    case 4:
      return t.lvl4Title;
    case 5:
    default:
      return t.lvl5Title;
  }
}

export function getHandArrangementLabel(
  arr: 'right-only' | 'left-only' | 'alternating-hands' | 'two-hands',
  lang: Language
): string {
  const t = UI_TEXT[lang];
  switch (arr) {
    case 'right-only':
      return t.arrRightOnly;
    case 'left-only':
      return t.arrLeftOnly;
    case 'alternating-hands':
      return t.arrAlternating;
    case 'two-hands':
    default:
      return t.arrTwoHands;
  }
}
