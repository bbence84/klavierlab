export type HandType = 'right' | 'left';
export type HandSelection = 'both' | 'right' | 'left';
export type HandArrangement = 'right-only' | 'left-only' | 'alternating-hands' | 'two-hands';
export type PracticeMode = 'wait-for-note' | 'continuous';
export type SoundEngine = 'original' | 'sampled';
export type HitGrade = 'perfect' | 'good' | 'early' | 'late' | 'miss' | 'wrong';

export interface SongNote {
  id: string;
  midi: number;         // MIDI note number (60 = C4 Middle C)
  startTime: number;    // Start time in seconds at 100% tempo
  duration: number;     // Duration in seconds at 100% tempo
  hand: HandType;       // 'right' (melody/treble) or 'left' (accompaniment/bass)
  finger?: 1 | 2 | 3 | 4 | 5; // Suggested piano fingering
  velocity?: number;    // 0-127
  measure?: number;     // 1-indexed measure number
  status?: 'pending' | 'hit' | 'missed' | 'auto';
  hitGrade?: HitGrade;
  timingDeltaMs?: number;
}

export interface Song {
  id: string;
  title: string;
  titleHu?: string;
  composer: string;
  composerHu?: string;
  level: 1 | 2 | 3 | 4 | 5;
  bpm: number;
  timeSignature: [number, number]; // e.g., [4, 4] or [3, 4]
  keySignature: string;            // e.g., 'C Major', 'G Major', 'A Minor'
  category: 'Beginner Lesson' | 'Classical' | 'Traditional' | 'Romantic' | 'Baroque' | 'Custom MIDI' | 'MusicXML' | 'Soundtrack';
  handArrangement: HandArrangement;
  description: string;
  descriptionHu?: string;
  focusSkill: string;
  focusSkillHu?: string;
  durationSeconds: number;
  notes: SongNote[];
  isCustomMidi?: boolean;
  importFormat?: 'midi' | 'musicxml';
}

export interface SessionStats {
  id: string;
  songId: string;
  songTitle: string;
  songLevel: number;
  timestamp: string;
  mode: PracticeMode;
  handSelection: HandSelection;
  tempoMultiplier: number; // e.g. 1.0 = 100%
  totalTargetNotes: number;
  perfectHits: number;
  goodHits: number;
  earlyLateHits: number;
  missedNotes: number;
  wrongKeyPresses: number;
  accuracyPercent: number;
  avgTimingOffsetMs: number; // negative = early, positive = late
  maxStreak: number;
  score: number;
  xpEarned: number;
  measureAccuracies: { measure: number; accuracy: number; total: number }[];
}

export interface AdaptiveRecommendation {
  headline: string;
  rationale: string;
  actionLabel: string;
  recommendedTempo: number;
  recommendedMode: PracticeMode;
  recommendedHand: HandSelection;
  nextSongId?: string;
  adjustmentType: 'increase-challenge' | 'maintain-solidify' | 'ease-difficulty';
}

export interface PlayerProfile {
  xp: number;
  level: number;
  levelTitle: string;
  sessionsCompleted: number;
  totalNotesHit: number;
  currentStreakDays: number;
  bestAccuracyBySong: Record<string, number>;
  history: SessionStats[];
}

export interface MidiPacketLog {
  id: string;
  timestamp: string;
  source: 'BLE-MIDI' | 'WebMIDI' | 'Virtual';
  rawHex: string;
  type: 'Note On' | 'Note Off' | 'Control';
  midi: number;
  noteName: string;
  velocity: number;
}

export interface MidiConnectionInfo {
  outputAvailable?: boolean;
  outputName?: string | null;
  outputErrorMessage?: string | null;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  transport: 'none' | 'web-bluetooth' | 'web-midi';
  deviceName: string | null;
  errorMessage: string | null;
  webBluetoothSupported: boolean;
  webMidiSupported: boolean;
}
