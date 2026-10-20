import { HandSelection, PracticeMode, Song, SoundEngine } from '../types/music';

export const PRACTICE_PREFERENCES_KEY = 'klavierlab_practice_preferences_v1';

export interface PracticePreferences {
  activeView: 'studio' | 'library' | 'progress' | 'setup';
  selectedSongId: string | null;
  practiceMode: PracticeMode;
  handSelection: HandSelection;
  tempoMultiplier: number;
  isAutoDemo: boolean;
  showGrandStaff: boolean;
  showFallingNotes: boolean;
  showKeyShortcuts: boolean;
  isMuted: boolean;
  isMetronomeEnabled: boolean;
  soundEngine: SoundEngine;
}

const DEFAULT_PREFERENCES: PracticePreferences = {
  activeView: 'studio', selectedSongId: null, practiceMode: 'wait-for-note',
  handSelection: 'both', tempoMultiplier: 1, isAutoDemo: false,
  showGrandStaff: true, showFallingNotes: true, showKeyShortcuts: true,
  isMuted: false, isMetronomeEnabled: false,
  soundEngine: 'original',
};

export function readPracticePreferences(): PracticePreferences {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(PRACTICE_PREFERENCES_KEY) || 'null');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return { ...DEFAULT_PREFERENCES };
    const values = saved as Record<string, unknown>;
    const preferences = { ...DEFAULT_PREFERENCES };
    if (values.activeView === 'studio' || values.activeView === 'library' || values.activeView === 'progress' || values.activeView === 'setup') preferences.activeView = values.activeView;
    if (typeof values.selectedSongId === 'string') preferences.selectedSongId = values.selectedSongId;
    if (values.practiceMode === 'continuous' || values.practiceMode === 'wait-for-note') preferences.practiceMode = values.practiceMode;
    if (values.handSelection === 'both' || values.handSelection === 'left' || values.handSelection === 'right') preferences.handSelection = values.handSelection;
    if (values.soundEngine === 'original' || values.soundEngine === 'sampled') preferences.soundEngine = values.soundEngine;
    if (typeof values.tempoMultiplier === 'number' && Number.isFinite(values.tempoMultiplier) && values.tempoMultiplier >= 0.5 && values.tempoMultiplier <= 1.25) {
      preferences.tempoMultiplier = Math.round(values.tempoMultiplier * 20) / 20;
    }
    for (const key of ['isAutoDemo', 'showGrandStaff', 'showFallingNotes', 'showKeyShortcuts', 'isMuted', 'isMetronomeEnabled'] as const) {
      if (typeof values[key] === 'boolean') preferences[key] = values[key];
    }
    return preferences;
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function writePracticePreferences(preferences: PracticePreferences) {
  try { localStorage.setItem(PRACTICE_PREFERENCES_KEY, JSON.stringify(preferences)); } catch {}
}

export function validHandSelection(song: Song, preferred: HandSelection): HandSelection {
  const hasRight = song.notes.some(note => note.hand === 'right');
  const hasLeft = song.notes.some(note => note.hand === 'left');
  if (!hasLeft) return 'right';
  if (!hasRight) return 'left';
  return preferred;
}