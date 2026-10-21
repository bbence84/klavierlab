import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FallingNotesCanvas,
  LiveFeedbackItem,
} from './components/FallingNotesCanvas';
import { PianoKeyboard } from './components/PianoKeyboard';
import { ProgressDashboardView } from './components/ProgressDashboardView';
import { SessionSummaryModal } from './components/SessionSummaryModal';
import { SetupGuideView } from './components/SetupGuideView';
import { SheetMusicBar } from './components/VexFlowSheetMusicBar';
import { SongLibraryView } from './components/SongLibraryView';
import { SongPicker } from './components/SongPicker';
import { INITIAL_SONGS, LEVEL_TITLES } from './data/songs';
import {
  AdaptiveRecommendation,
  HandSelection,
  MidiConnectionInfo,
  MidiPacketLog,
  PlayerProfile,
  PracticeMode,
  SessionStats,
  Song,
  SongNote,
  SoundEngine,
} from './types/music';
import { pianoSynth } from './utils/audioSynth';
import {
  getHandArrangementLabel,
  getLevelTitle,
  Language,
  ThemeMode,
  UI_TEXT,
} from './utils/i18n';
import { parseScoreFile, SCORE_FILE_ACCEPT } from './utils/scoreFileParser';
import { readPracticePreferences, validHandSelection, writePracticePreferences } from './utils/practicePreferences';
import { midiService } from './utils/midiService';
import { HOME_ROW_KEY_TO_MIDI, midiToNoteName } from './utils/musicTheory';
import {
  Bell,
  BookOpen,
  Bluetooth,
  CheckCircle2,
  Eye,
  Globe,
  Keyboard,
  Layers,
  Moon,
  Music,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  Piano,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Sun,
  TrendingUp,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

type ActiveView = 'studio' | 'library' | 'progress' | 'setup';

const STORAGE_KEY_PROFILE = 'klavierlab_profile_v3';
const STORAGE_KEY_CUSTOM_SONGS = 'klavierlab_custom_songs_v3';
const STORAGE_KEY_LANG = 'klavierlab_lang_v1';
const STORAGE_KEY_THEME = 'klavierlab_theme_v1';
const STORAGE_KEY_SIDEBAR = 'klavierlab_sidebar_collapsed_v1';

// Notes starting within this window (seconds) are treated as one simultaneous chord.
// Shared by the visual waiting-target set, the note matcher, and the continuous-mode
// miss sweep so chord grouping stays consistent everywhere.
const CHORD_WINDOW_SEC = 0.07;
// In continuous mode, how long (seconds) the player has to complete the remaining
// tones of a chord after striking the first one before the missing tones count as missed.
const CHORD_COMPLETE_GRACE_SEC = 0.32;
// Strictness: if the gap between the first and last struck chord tone exceeds this
// (seconds), the chord is flagged as "not played together" (rolled), reducing the grade.
const CHORD_TOGETHER_SEC = 0.12;

const DEFAULT_PROFILE: PlayerProfile = {
  xp: 640,
  level: 2,
  levelTitle: LEVEL_TITLES[2],
  sessionsCompleted: 2,
  totalNotesHit: 45,
  currentStreakDays: 3,
  bestAccuracyBySong: {
    'boci-boci-tarka-rh': 96,
    'lesson-rh-five-finger': 94,
  },
  history: [
    {
      id: 'init-session-2',
      songId: 'boci-boci-tarka-rh',
      songTitle: 'Boci, boci tarka (Jobb kéz szóló — 5 ujjas)',
      songLevel: 1,
      timestamp: 'Ma · 14:20',
      mode: 'continuous',
      handSelection: 'right',
      tempoMultiplier: 1.0,
      totalTargetNotes: 24,
      perfectHits: 21,
      goodHits: 2,
      earlyLateHits: 1,
      missedNotes: 0,
      wrongKeyPresses: 0,
      accuracyPercent: 96,
      avgTimingOffsetMs: 11,
      maxStreak: 24,
      score: 2320,
      xpEarned: 340,
      measureAccuracies: [
        { measure: 1, accuracy: 100, total: 6 },
        { measure: 2, accuracy: 100, total: 6 },
        { measure: 3, accuracy: 83, total: 6 },
        { measure: 4, accuracy: 100, total: 6 },
      ],
    },
    {
      id: 'init-session-1',
      songId: 'lesson-rh-five-finger',
      songTitle: '1. Lecke: Jobb kezes ötujjas alapgyakorlat',
      songLevel: 1,
      timestamp: 'Tegnap · 19:05',
      mode: 'wait-for-note',
      handSelection: 'right',
      tempoMultiplier: 0.9,
      totalTargetNotes: 21,
      perfectHits: 18,
      goodHits: 2,
      earlyLateHits: 1,
      missedNotes: 0,
      wrongKeyPresses: 1,
      accuracyPercent: 94,
      avgTimingOffsetMs: -9,
      maxStreak: 21,
      score: 2020,
      xpEarned: 300,
      measureAccuracies: [
        { measure: 1, accuracy: 100, total: 4 },
        { measure: 2, accuracy: 100, total: 3 },
        { measure: 3, accuracy: 100, total: 3 },
        { measure: 4, accuracy: 100, total: 3 },
        { measure: 5, accuracy: 100, total: 4 },
        { measure: 6, accuracy: 100, total: 4 },
      ],
    },
  ],
};

export default function App() {
  const [savedPreferences] = useState(readPracticePreferences);
  const [activeView, setActiveView] = useState<ActiveView>(savedPreferences.activeView);

  useEffect(() => {
    const closeMenus = (event: PointerEvent | KeyboardEvent) => {
      const isEscape = event instanceof KeyboardEvent && event.key === 'Escape';
      if (event instanceof KeyboardEvent && !isEscape) return;
      document.querySelectorAll<HTMLDetailsElement>('.options-menu[open]').forEach(menu => {
        if (isEscape || (event.target instanceof Node && !menu.contains(event.target))) {
          menu.open = false;
          if (isEscape) menu.querySelector('summary')?.focus();
        }
      });
    };
    document.addEventListener('pointerdown', closeMenus);
    document.addEventListener('keydown', closeMenus);
    return () => {
      document.removeEventListener('pointerdown', closeMenus);
      document.removeEventListener('keydown', closeMenus);
    };
  }, []);

  // Language state (Default: Hungarian 'hu', toggleable HU / EN)
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LANG);
      return saved === 'en' || saved === 'hu' ? saved : 'hu';
    } catch {
      return 'hu';
    }
  });

  // Theme state (Dark / Light mode)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      return saved === 'light' || saved === 'dark' ? saved : 'light';
    } catch {
      return 'light';
    }
  });

  // Sidebar collapse state (icon-only rail toggle)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_SIDEBAR) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SIDEBAR, String(sidebarCollapsed));
    } catch {
      // Ignore storage error
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LANG, lang);
    } catch {
      // Ignore storage error
    }
  }, [lang]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch {
      // Ignore storage error
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const t = UI_TEXT[lang];
  const isHu = lang === 'hu';
  const isLight = theme === 'light';

  // Custom uploaded MIDI songs persisted in localStorage
  const [customSongs, setCustomSongs] = useState<Song[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_SONGS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const allSongs = useMemo(() => [...INITIAL_SONGS, ...customSongs], [customSongs]);

  // Player gamified profile
  const [profile, setProfile] = useState<PlayerProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
      return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    } catch {
      // Ignore storage quota errors
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_SONGS, JSON.stringify(customSongs));
    } catch {
      // Ignore storage quota errors
    }
  }, [customSongs]);

  // Selected song & practice settings (First song is Boci, boci tarka!)
  const [selectedSongId, setSelectedSongId] = useState<string>(() =>
    allSongs.some(song => song.id === savedPreferences.selectedSongId) ? savedPreferences.selectedSongId! : INITIAL_SONGS[0].id
  );
  const currentSong = useMemo(
    () => allSongs.find((s) => s.id === selectedSongId) || allSongs[0],
    [allSongs, selectedSongId]
  );

  // Exact end time of the final note so the playhead/bar stops immediately when the music ends
  const songEndTime = useMemo(() => {
    if (!currentSong.notes || currentSong.notes.length === 0) {
      return currentSong.durationSeconds;
    }
    return Number(
      Math.max(...currentSong.notes.map((n) => n.startTime + n.duration)).toFixed(2)
    );
  }, [currentSong]);

  const [practiceMode, setPracticeMode] = useState<PracticeMode>(savedPreferences.practiceMode);
  const [handSelection, setHandSelection] = useState<HandSelection>(() => validHandSelection(currentSong, savedPreferences.handSelection));
  const [tempoMultiplier, setTempoMultiplier] = useState<number>(savedPreferences.tempoMultiplier);
  const [isAutoDemo, setIsAutoDemo] = useState<boolean>(savedPreferences.isAutoDemo);
  const [showGrandStaff, setShowGrandStaff] = useState<boolean>(savedPreferences.showGrandStaff);
  const [showFallingNotes, setShowFallingNotes] = useState<boolean>(savedPreferences.showFallingNotes);
  const [showKeyShortcuts, setShowKeyShortcuts] = useState<boolean>(savedPreferences.showKeyShortcuts);
  const [isMuted, setIsMuted] = useState<boolean>(savedPreferences.isMuted);
  const [soundEngine, setSoundEngine] = useState<SoundEngine>(savedPreferences.soundEngine);
  const [audioStatus, setAudioStatus] = useState(() => pianoSynth.getStatus());

  useEffect(() => pianoSynth.onStatus(setAudioStatus), []);
  useEffect(() => { void pianoSynth.setEngine(soundEngine); }, [soundEngine]);

  useEffect(() => { pianoSynth.setMuted(isMuted); }, [isMuted]);
  const [showSessionSummary, setShowSessionSummary] = useState(() => {
    try { return localStorage.getItem('klavierlab_show_summary_v1') !== 'false'; } catch { return true; }
  });

  useEffect(() => {
    try { localStorage.setItem('klavierlab_show_summary_v1', String(showSessionSummary)); } catch {}
  }, [showSessionSummary]);

  // Uploaded MIDI Title & Metadata Dialog State (opened immediately after file picker)
  const [pendingMidiConfig, setPendingMidiConfig] = useState<{
    song: Song;
    isRename: boolean;
  } | null>(null);
  const [customMidiTitle, setCustomMidiTitle] = useState<string>('');
  const [customMidiComposer, setCustomMidiComposer] = useState<string>('');
  const [scoreImportError, setScoreImportError] = useState<string | null>(null);

  // Metronome state (audible click + synchronized visual beat indicator)
  const [isMetronomeEnabled, setIsMetronomeEnabled] = useState<boolean>(savedPreferences.isMetronomeEnabled);
  useEffect(() => {
    writePracticePreferences({ activeView, selectedSongId, practiceMode, handSelection, tempoMultiplier, isAutoDemo, showGrandStaff, showFallingNotes, showKeyShortcuts, isMuted, isMetronomeEnabled, soundEngine });
  }, [activeView, selectedSongId, practiceMode, handSelection, tempoMultiplier, isAutoDemo, showGrandStaff, showFallingNotes, showKeyShortcuts, isMuted, isMetronomeEnabled, soundEngine]);
  const [activeBeatInMeasure, setActiveBeatInMeasure] = useState<number>(1);
  const [beatPulseActive, setBeatPulseActive] = useState<boolean>(false);

  // Playback & Note State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [sessionNotes, setSessionNotes] = useState<SongNote[]>(() =>
    currentSong.notes.map((n) => ({ ...n, status: 'pending' }))
  );

  // Live performance counters
  const [activeMidiKeys, setActiveMidiKeys] = useState<Set<number>>(new Set());
  const [wrongMidiKey, setWrongMidiKey] = useState<number | null>(null);
  const [wrongPressCount, setWrongPressCount] = useState<number>(0);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [liveScore, setLiveScore] = useState<number>(0);
  const [latestFeedback, setLatestFeedback] = useState<LiveFeedbackItem | null>(null);
  const [completedSessionStats, setCompletedSessionStats] = useState<SessionStats | null>(
    null
  );

  // Hardware MIDI state & logs
  const [connectionInfo, setConnectionInfo] = useState<MidiConnectionInfo>(() =>
    midiService.getConnectionInfo()
  );
  const [midiLogs, setMidiLogs] = useState<MidiPacketLog[]>([]);

  const quickFileInputRef = useRef<HTMLInputElement | null>(null);
  const currentTimeRef = useRef<number>(0);
  const sessionNotesRef = useRef<SongNote[]>(sessionNotes);
  const autoPlayedNoteIdsRef = useRef<Set<string>>(new Set());
  // Tracks the chord currently being assembled so we can (a) grade "played together"
  // strictness and (b) emit a single aggregated feedback when the chord completes.
  // Keyed by the chord's earliest startTime; reset whenever a new chord begins.
  const chordProgressRef = useRef<{
    key: number;          // earliest startTime of the chord group (seconds)
    size: number;         // total tones in the chord
    hitIds: Set<string>;  // tone ids already struck
    firstHitAt: number;   // performance-clock ms of the first tone struck
    lastHitAt: number;    // performance-clock ms of the most recent tone struck
  } | null>(null);
  const lastBeatIndexRef = useRef<number>(-1);
  const finalizedSessionRef = useRef<SessionStats | null>(null);
  const previousSongIdRef = useRef(currentSong.id);
  // Throttle React currentTime state updates so the whole App tree does not reconcile
  // on every animation frame (60-120fps). The falling-notes canvas reads currentTimeRef
  // directly for smooth motion; React state only drives the coarse UI (time counter,
  // position slider, sheet scroll, active-key highlight) at ~15fps.
  const lastReactTimeSyncRef = useRef<number>(0);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    sessionNotesRef.current = sessionNotes;
  }, [sessionNotes]);

  const resetSession = useCallback(
    (targetSong: Song = currentSong, startTime = 0) => {
      const end = targetSong.notes.length ? Math.max(...targetSong.notes.map(note => note.startTime + note.duration)) : targetSong.durationSeconds;
      const position = Math.max(0, Math.min(end, startTime));
      setIsPlaying(false);
      setCurrentTime(position);
      currentTimeRef.current = position;
      finalizedSessionRef.current = null;
      setCompletedSessionStats(null);
      lastBeatIndexRef.current = -1;
      setActiveBeatInMeasure(1);
      setBeatPulseActive(false);
      autoPlayedNoteIdsRef.current = new Set(targetSong.notes.filter(note => note.startTime < position).map(note => note.id));
      chordProgressRef.current = null;
      const freshNotes = targetSong.notes.map((n) => ({
        ...n,
        status: n.startTime < position ? 'auto' as const : 'pending' as const,
        hitGrade: undefined,
        timingDeltaMs: undefined,
      }));
      setSessionNotes(freshNotes);
      sessionNotesRef.current = freshNotes;
      setWrongMidiKey(null);
      setWrongPressCount(0);
      setCurrentStreak(0);
      setMaxStreak(0);
      setLiveScore(0);
      setLatestFeedback(null);
      setActiveMidiKeys(new Set());
      pianoSynth.stopAll();
      midiService.stopAllOutputNotes();
    },
    [currentSong]
  );

  useEffect(() => {
    if (previousSongIdRef.current !== currentSong.id) {
      setHandSelection(validHandSelection(currentSong, 'both'));
      previousSongIdRef.current = currentSong.id;
    }
    resetSession(currentSong);
  }, [currentSong, resetSession]);

  const changeHandSelection = (hand: HandSelection) => {
    if (isAutoDemo) {
      pianoSynth.stopAll();
      midiService.stopAllOutputNotes();
      setActiveMidiKeys(new Set());
      autoPlayedNoteIdsRef.current = new Set(sessionNotesRef.current.filter(note => note.startTime < currentTimeRef.current).map(note => note.id));
    }
    setHandSelection(hand);
  };

  const measurePositions = useMemo(() => {
    const starts = new Map<number, number>();
    for (const note of currentSong.notes) {
      const measure = note.measure || 1;
      starts.set(measure, Math.min(starts.get(measure) ?? Infinity, note.startTime));
    }
    return Array.from(starts, ([measure, time]) => ({ measure, time })).sort((first, second) => first.measure - second.measure);
  }, [currentSong]);
  const activeMeasure = measurePositions.filter(position => position.time <= currentTime + 0.001).at(-1)?.measure || measurePositions[0]?.measure || 1;

  // Compute which notes are currently waiting to be pressed
  const waitingTargetNotes = useMemo(() => {
    if (isAutoDemo) return [];
    const pendingTargetNotes = sessionNotes.filter(
      (n) =>
        n.status === 'pending' &&
        (handSelection === 'both' || n.hand === handSelection)
    );
    if (pendingTargetNotes.length === 0) return [];

    if (practiceMode === 'wait-for-note') {
      const earliestTime = pendingTargetNotes[0].startTime;
      if (currentTime >= earliestTime - 0.04) {
        return pendingTargetNotes.filter(
          (n) => Math.abs(n.startTime - earliestTime) <= CHORD_WINDOW_SEC
        );
      }
    }

    return pendingTargetNotes.filter(
      (n) => n.startTime - currentTime <= 0.35 && n.startTime - currentTime >= -0.18
    );
  }, [sessionNotes, handSelection, practiceMode, currentTime, isAutoDemo]);

  // Rounded start-times (ms) that belong to a multi-note chord. Used to give chord
  // tones a longer completion grace before the continuous-mode miss sweep fires, so a
  // player can finish striking all tones of a chord at tempo.
  const chordStartTimeMs = useMemo(() => {
    const counts = new Map<number, number>();
    for (const n of sessionNotes) {
      const key = Math.round(n.startTime * 100); // ~10ms buckets > CHORD_WINDOW_SEC groups
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const chordKeys = new Set<number>();
    for (const [key, count] of counts) if (count > 1) chordKeys.add(key);
    return chordKeys;
  }, [sessionNotes]);
  const chordStartTimeMsRef = useRef<Set<number>>(chordStartTimeMs);
  useEffect(() => {
    chordStartTimeMsRef.current = chordStartTimeMs;
  }, [chordStartTimeMs]);

  // Finalize session & compute statistics + adaptive difficulty (never triggered for Demo mode)
  const finalizeSessionAndShowModal = useCallback(
    (notesSnapshot: SongNote[], showSummary = showSessionSummary) => {
      setIsPlaying(false);
      if (isAutoDemo) return;
      if (finalizedSessionRef.current) {
        if (showSummary) setCompletedSessionStats(finalizedSessionRef.current);
        return;
      }
      const targetNotes = notesSnapshot.filter(
        (n) => n.status !== 'auto' && (handSelection === 'both' || n.hand === handSelection)
      );
      if (!targetNotes.length) return;
      const totalTargetNotes = Math.max(1, targetNotes.length);
      const perfectHits = targetNotes.filter((n) => n.hitGrade === 'perfect').length;
      const goodHits = targetNotes.filter((n) => n.hitGrade === 'good').length;
      const earlyLateHits = targetNotes.filter(
        (n) => n.hitGrade === 'early' || n.hitGrade === 'late'
      ).length;
      const hitTotal = perfectHits + goodHits + earlyLateHits;
      const missedNotes = Math.max(0, totalTargetNotes - hitTotal);

      const rawAccuracy = Math.round(
        ((perfectHits + goodHits * 0.9 + earlyLateHits * 0.7) / totalTargetNotes) * 100
      );
      const accuracyPercent = Math.max(
        0,
        Math.min(100, hitTotal === 0 ? 0 : rawAccuracy)
      );

      const timingDeltas = targetNotes
        .map((n) => n.timingDeltaMs)
        .filter((d): d is number => typeof d === 'number');
      const avgTimingOffsetMs =
        timingDeltas.length > 0
          ? Math.round(
              timingDeltas.reduce((acc, v) => acc + v, 0) / timingDeltas.length
            )
          : 0;

      const measureMap = new Map<number, { hits: number; total: number }>();
      for (const n of targetNotes) {
        const m = n.measure || 1;
        const curr = measureMap.get(m) || { hits: 0, total: 0 };
        curr.total += 1;
        if (n.status === 'hit') curr.hits += 1;
        measureMap.set(m, curr);
      }
      const measureAccuracies = Array.from(measureMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([measure, data]) => ({
          measure,
          accuracy: Math.round((data.hits / Math.max(1, data.total)) * 100),
          total: data.total,
        }));

      const xpEarned = Math.max(
        50,
        Math.round(hitTotal * 12 * tempoMultiplier + (accuracyPercent >= 90 ? 120 : 40))
      );

      const nowStr = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      const displaySongTitle =
        isHu && currentSong.titleHu ? currentSong.titleHu : currentSong.title;

      const stats: SessionStats = {
        id: `session-${Date.now()}`,
        songId: currentSong.id,
        songTitle: displaySongTitle,
        songLevel: currentSong.level,
        timestamp: `${isHu ? 'Ma' : 'Today'} · ${nowStr}`,
        mode: practiceMode,
        handSelection,
        tempoMultiplier,
        totalTargetNotes,
        perfectHits,
        goodHits,
        earlyLateHits,
        missedNotes,
        wrongKeyPresses: wrongPressCount,
        accuracyPercent,
        avgTimingOffsetMs,
        maxStreak,
        score: liveScore,
        xpEarned,
        measureAccuracies,
      };

      finalizedSessionRef.current = stats;
      setProfile((prev) => {
        const newXp = prev.xp + xpEarned;
        const newLevel = Math.min(5, Math.floor(newXp / 500) + 1);
        const prevBest = prev.bestAccuracyBySong[currentSong.id] || 0;
        return {
          ...prev,
          xp: newXp,
          level: newLevel,
          levelTitle: LEVEL_TITLES[newLevel] || `Level ${newLevel}`,
          sessionsCompleted: prev.sessionsCompleted + 1,
          totalNotesHit: prev.totalNotesHit + hitTotal,
          bestAccuracyBySong: {
            ...prev.bestAccuracyBySong,
            [currentSong.id]: Math.max(prevBest, accuracyPercent),
          },
          history: [stats, ...prev.history].slice(0, 25),
        };
      });

      if (showSummary) setCompletedSessionStats(stats);
    },
    [
      currentSong,
      handSelection,
      isAutoDemo,
      isHu,
      liveScore,
      maxStreak,
      practiceMode,
      showSessionSummary,
      tempoMultiplier,
      wrongPressCount,
    ]
  );

  // Handle incoming Note On
  const handleNoteOn = useCallback(
    (midi: number, velocity: number = 96) => {
      pianoSynth.noteOn(midi, velocity);
      setActiveMidiKeys((prev) => {
        const next = new Set(prev);
        next.add(midi);
        return next;
      });

      // Do not score or grade notes while in Auto-Demo listening mode
      if (isAutoDemo) return;

      const notes = sessionNotesRef.current;
      const nowSec = currentTimeRef.current;

      const pendingTargets = notes.filter(
        (n) =>
          n.status === 'pending' &&
          (handSelection === 'both' || n.hand === handSelection)
      );

      if (pendingTargets.length === 0) return;

      if (practiceMode === 'wait-for-note') {
        const earliestTime = pendingTargets[0].startTime;
        const activeChordGroup = pendingTargets.filter(
          (n) => Math.abs(n.startTime - earliestTime) <= CHORD_WINDOW_SEC
        );
        const isChord = activeChordGroup.length > 1;
        const matchedNote = activeChordGroup.find((n) => n.midi === midi);

        if (matchedNote) {
          if (!isPlaying) {
            setIsPlaying(true);
          }
          setWrongMidiKey(null);
          const nowMs = performance.now();

          // Maintain chord-progress tracking for aggregated feedback + "together" grading.
          let progress = chordProgressRef.current;
          if (!progress || progress.key !== earliestTime) {
            progress = { key: earliestTime, size: activeChordGroup.length, hitIds: new Set(), firstHitAt: nowMs, lastHitAt: nowMs };
            chordProgressRef.current = progress;
          }
          progress.hitIds.add(matchedNote.id);
          progress.lastHitAt = nowMs;

          const timingDeltaMs = Math.round((nowSec - matchedNote.startTime) * 1000);
          const absDelta = Math.abs(timingDeltaMs);
          const grade: 'perfect' | 'good' = absDelta <= 90 ? 'perfect' : 'good';
          const points = grade === 'perfect' ? 100 : 80;

          const updated = notes.map((n) =>
            n.id === matchedNote.id
              ? {
                  ...n,
                  status: 'hit' as const,
                  hitGrade: grade,
                  timingDeltaMs: Math.max(-120, Math.min(120, timingDeltaMs)),
                }
              : n
          );
          sessionNotesRef.current = updated;
          setSessionNotes(updated);

          setCurrentStreak((s) => {
            const nextS = s + 1;
            setMaxStreak((m) => Math.max(m, nextS));
            return nextS;
          });
          setLiveScore((sc) => sc + points);

          if (isChord) {
            const hitCount = progress.hitIds.size;
            const chordComplete = hitCount >= progress.size;
            if (chordComplete) {
              // "Played together" strictness: measure the spread of all strikes.
              const spreadSec = (progress.lastHitAt - progress.firstHitAt) / 1000;
              const tooSpread = spreadSec > CHORD_TOGETHER_SEC;
              const chordNames = activeChordGroup
                .map((n) => midiToNoteName(n.midi))
                .join(' · ');
              setLatestFeedback({
                id: `fb-${Date.now()}`,
                grade: tooSpread ? 'good' : grade,
                label: `${tooSpread ? t.chordTooSpread : t.chordComplete} · ${chordNames}`,
                sublabel: tooSpread
                  ? `${Math.round(spreadSec * 1000)}ms`
                  : `+${points} · ${t.streak} ${currentStreak + 1}`,
                timestamp: Date.now(),
              });
              chordProgressRef.current = null;
            } else {
              setLatestFeedback({
                id: `fb-${Date.now()}`,
                grade: 'good',
                label: `${t.chordPartial} (${hitCount}/${progress.size})`,
                sublabel: midiToNoteName(midi),
                timestamp: Date.now(),
              });
            }
          } else {
            setLatestFeedback({
              id: `fb-${Date.now()}`,
              grade,
              label: `${midiToNoteName(midi)} +${points}`,
              sublabel: `${
                matchedNote.hand === 'right' ? t.rightHandShort : t.leftHandShort
              }${matchedNote.finger ? ` · ${t.fingerShort} ${matchedNote.finger}` : ''}`,
              timestamp: Date.now(),
            });
          }

          if (nowSec < matchedNote.startTime) {
            currentTimeRef.current = matchedNote.startTime;
            setCurrentTime(matchedNote.startTime);
          }
        } else if (nowSec >= earliestTime - 0.35) {
          setWrongMidiKey(midi);
          setWrongPressCount((w) => w + 1);
          setCurrentStreak(0);
          const expectedNames = activeChordGroup
            .map((n) => midiToNoteName(n.midi))
            .join(', ');
          setLatestFeedback({
            id: `fb-${Date.now()}`,
            grade: 'wrong',
            label: `${t.playedKey} ${midiToNoteName(midi)}`,
            sublabel: `${t.expectedKey} ${expectedNames}`,
            timestamp: Date.now(),
          });
        }
        return;
      }

      const hitWindowSec = 0.28;
      const candidate = pendingTargets.find(
        (n) => n.midi === midi && Math.abs(nowSec - n.startTime) <= hitWindowSec
      );

      if (candidate) {
        setWrongMidiKey(null);
        const deltaMs = Math.round((nowSec - candidate.startTime) * 1000);
        const absMs = Math.abs(deltaMs);
        let grade: 'perfect' | 'good' | 'early' | 'late' = 'perfect';
        let points = 100;
        if (absMs <= 65) {
          grade = 'perfect';
          points = 100;
        } else if (absMs <= 140) {
          grade = 'good';
          points = 80;
        } else {
          grade = deltaMs < 0 ? 'early' : 'late';
          points = 60;
        }

        const updated = notes.map((n) =>
          n.id === candidate.id
            ? {
                ...n,
                status: 'hit' as const,
                hitGrade: grade,
                timingDeltaMs: deltaMs,
              }
            : n
        );
        sessionNotesRef.current = updated;
        setSessionNotes(updated);

        setCurrentStreak((s) => {
          const nextS = s + 1;
          setMaxStreak((m) => Math.max(m, nextS));
          return nextS;
        });
        setLiveScore((sc) => sc + points);

        // Chord awareness in continuous mode: a chord is any set of same-hand pending
        // targets sharing this candidate's startTime. We require all tones (the rAF
        // miss-sweep still marks un-played tones missed after the window) and emit a
        // single aggregated feedback + "played together" grade instead of per-tone noise.
        const chordGroup = pendingTargets.filter(
          (n) => Math.abs(n.startTime - candidate.startTime) <= CHORD_WINDOW_SEC
        );
        if (chordGroup.length > 1) {
          const nowMs = performance.now();
          let progress = chordProgressRef.current;
          if (!progress || progress.key !== candidate.startTime) {
            progress = { key: candidate.startTime, size: chordGroup.length, hitIds: new Set(), firstHitAt: nowMs, lastHitAt: nowMs };
            chordProgressRef.current = progress;
          }
          progress.hitIds.add(candidate.id);
          progress.lastHitAt = nowMs;
          const hitCount = progress.hitIds.size;
          const chordComplete = hitCount >= progress.size;
          const chordNames = chordGroup.map((n) => midiToNoteName(n.midi)).join(' · ');
          if (chordComplete) {
            const spreadSec = (progress.lastHitAt - progress.firstHitAt) / 1000;
            const tooSpread = spreadSec > CHORD_TOGETHER_SEC;
            setLatestFeedback({
              id: `fb-${Date.now()}`,
              grade: tooSpread ? 'good' : grade,
              label: `${tooSpread ? t.chordTooSpread : t.chordComplete} · ${chordNames}`,
              sublabel: tooSpread ? `${Math.round(spreadSec * 1000)}ms` : `+${points} · ${t.streak} ${currentStreak + 1}`,
              timestamp: Date.now(),
            });
            chordProgressRef.current = null;
          } else {
            setLatestFeedback({
              id: `fb-${Date.now()}`,
              grade: 'good',
              label: `${t.chordPartial} (${hitCount}/${progress.size})`,
              sublabel: midiToNoteName(midi),
              timestamp: Date.now(),
            });
          }
        } else {
          setLatestFeedback({
            id: `fb-${Date.now()}`,
            grade,
            label: `${midiToNoteName(midi)} (${deltaMs > 0 ? `+${deltaMs}` : deltaMs}ms)`,
            sublabel: `+${points} · ${t.streak} ${currentStreak + 1}`,
            timestamp: Date.now(),
          });
        }
      } else if (isPlaying) {
        setWrongMidiKey(midi);
        setWrongPressCount((w) => w + 1);
        setCurrentStreak(0);
        const nearest = pendingTargets[0];
        setLatestFeedback({
          id: `fb-${Date.now()}`,
          grade: 'wrong',
          label: `${t.playedKey} ${midiToNoteName(midi)}`,
          sublabel: nearest
            ? `${t.expectedKey} ${midiToNoteName(nearest.midi)}`
            : '',
          timestamp: Date.now(),
        });
      }
    },
    [currentStreak, handSelection, isAutoDemo, isPlaying, practiceMode, t]
  );

  const handleNoteOff = useCallback((midi: number) => {
    pianoSynth.noteOff(midi);
    setActiveMidiKeys((prev) => {
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });
    setWrongMidiKey((prev) => (prev === midi ? null : prev));
  }, []);

  useEffect(() => {
    const unsubNote = midiService.onNote((type, midi, velocity) => {
      if (type === 'noteon') {
        handleNoteOn(midi, velocity);
      } else {
        handleNoteOff(midi);
      }
    });

    const unsubLog = midiService.onLog((log) => {
      setMidiLogs((prev) => [log, ...prev].slice(0, 60));
    });

    const unsubStatus = midiService.onStatusChange((info) => {
      setConnectionInfo(info);
    });

    return () => {
      unsubNote();
      unsubLog();
      unsubStatus();
    };
  }, [handleNoteOn, handleNoteOff]);

  useEffect(() => {
    const depressedComputerKeys = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isPlaying && currentTimeRef.current >= songEndTime - 0.05) {
          resetSession(currentSong);
          setIsPlaying(true);
        } else {
          setIsPlaying((p) => !p);
        }
        return;
      }
      const key = e.key.toLowerCase();
      const mappedMidi = HOME_ROW_KEY_TO_MIDI[key];
      if (mappedMidi && !depressedComputerKeys.has(key)) {
        depressedComputerKeys.add(key);
        midiService.parseStandardMidiBytes([0x90, mappedMidi, 96], 'Virtual');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const mappedMidi = HOME_ROW_KEY_TO_MIDI[key];
      if (mappedMidi && depressedComputerKeys.has(key)) {
        depressedComputerKeys.delete(key);
        midiService.parseStandardMidiBytes([0x80, mappedMidi, 0], 'Virtual');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [currentSong, isPlaying, resetSession, songEndTime]);

  // Main Animation & Metronome Synchronization Loop
  useEffect(() => {
    if (!isPlaying) return;

    let animId = 0;
    let lastFrameTime = performance.now();
    const secPerBeat = 60 / currentSong.bpm;
    const beatsPerMeasure = currentSong.timeSignature[0];

    const step = (now: number) => {
      const dtSeconds = ((now - lastFrameTime) / 1000) * tempoMultiplier;
      lastFrameTime = now;

      const notes = sessionNotesRef.current;
      let currSec = currentTimeRef.current;

      if (!isAutoDemo && practiceMode === 'wait-for-note') {
        const earliestPendingTarget = notes.find(
          (n) =>
            n.status === 'pending' &&
            (handSelection === 'both' || n.hand === handSelection)
        );
        if (earliestPendingTarget && currSec + dtSeconds >= earliestPendingTarget.startTime) {
          currSec = earliestPendingTarget.startTime;
          currentTimeRef.current = currSec;
          setCurrentTime(currSec);
          lastReactTimeSyncRef.current = now;
          animId = requestAnimationFrame(step);
          return;
        }
      }

      const rawNextSec = currSec + dtSeconds;
      const reachedEnd = rawNextSec >= songEndTime;
      const nextSec = reachedEnd ? songEndTime : rawNextSec;
      currentTimeRef.current = nextSec;
      // Push to React state only ~15x/sec (or immediately at song end) to avoid a full
      // App re-render on every frame. currentTimeRef is always current for the canvas.
      if (reachedEnd || now - lastReactTimeSyncRef.current >= 66) {
        lastReactTimeSyncRef.current = now;
        setCurrentTime(nextSec);
      }

      // Synchronized Metronome Beat Calculation (only while music is actively playing before end)
      if (!reachedEnd) {
        const relativeSec = nextSec - 1.2;
        const currentBeatIndex = Math.floor(relativeSec / secPerBeat);
        if (currentBeatIndex !== lastBeatIndexRef.current && nextSec >= 0.05) {
          lastBeatIndexRef.current = currentBeatIndex;
          const beatInMeasure =
            (((currentBeatIndex % beatsPerMeasure) + beatsPerMeasure) %
              beatsPerMeasure) +
            1;
          setActiveBeatInMeasure(beatInMeasure);
          setBeatPulseActive(true);
          setTimeout(() => setBeatPulseActive(false), 140);

          if (isMetronomeEnabled) {
            pianoSynth.playMetronomeClick(beatInMeasure === 1);
          }
        }
      }

      // Walk notes in place. Only allocate a new array when a note's status actually
      // changes (continuous-mode miss), otherwise reuse the existing reference to avoid
      // creating a fresh array + objects on every animation frame (GC churn on tablets).
      let updatedNotes: SongNote[] | null = null;
      for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        const isTargetHand = handSelection === 'both' || note.hand === handSelection;

        if (
          (isAutoDemo ? isTargetHand : !isTargetHand) &&
          !autoPlayedNoteIdsRef.current.has(note.id) &&
          nextSec >= note.startTime
        ) {
          autoPlayedNoteIdsRef.current.add(note.id);
          const effectiveDur = note.duration / tempoMultiplier;
          pianoSynth.noteOn(
            note.midi,
            note.velocity || 85,
            effectiveDur
          );
          // Also send Note On / Note Off to connected USB or Bluetooth MIDI keyboard
          // so Demo Mode and automatic other-hand accompaniment play through the piano's own speakers!
          midiService.sendNoteWithDuration(
            note.midi,
            note.velocity || 85,
            effectiveDur
          );
          // Do NOT mark demo notes as player hits/perfects so Demo mode never counts as a player score
        }

        if (
          !isAutoDemo &&
          practiceMode === 'continuous' &&
          isTargetHand &&
          note.status === 'pending'
        ) {
          // Chord tones get a longer completion grace so all tones can be struck at tempo.
          const isChordTone = chordStartTimeMsRef.current.has(Math.round(note.startTime * 100));
          const missWindow = isChordTone ? CHORD_COMPLETE_GRACE_SEC : 0.26;
          if (nextSec > note.startTime + missWindow || reachedEnd) {
            if (!updatedNotes) updatedNotes = notes.slice();
            updatedNotes[i] = {
              ...note,
              status: 'missed' as const,
              hitGrade: 'miss' as const,
            };
          }
        }
      }

      if (updatedNotes) {
        sessionNotesRef.current = updatedNotes;
        setSessionNotes(updatedNotes);
      }

      if (reachedEnd) {
        setIsPlaying(false);
        setBeatPulseActive(false);
        if (!isAutoDemo) {
          finalizeSessionAndShowModal(sessionNotesRef.current);
        }
        return;
      }

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [
    currentSong.bpm,
    currentSong.timeSignature,
    finalizeSessionAndShowModal,
    handSelection,
    isAutoDemo,
    isMetronomeEnabled,
    isPlaying,
    practiceMode,
    songEndTime,
    tempoMultiplier,
  ]);

  const openMidiTitleDialog = useCallback(
    (song: Song, isRename: boolean = false) => {
      setIsPlaying(false);
      setCustomMidiTitle(song.title);
      setCustomMidiComposer(
        song.composer === 'Custom MIDI Upload' ? '' : song.composer
      );
      setPendingMidiConfig({ song, isRename });
    },
    []
  );

  const handleConfirmMidiTitle = (openInStudio: boolean) => {
    if (!pendingMidiConfig) return;
    const finalTitle =
      customMidiTitle.trim() || pendingMidiConfig.song.title || 'Imported score';
    const finalComposer =
      customMidiComposer.trim() ||
      (isHu ? 'Saját feltöltés' : 'Custom score upload');

    const finalizedSong: Song = {
      ...pendingMidiConfig.song,
      title: finalTitle,
      titleHu: finalTitle,
      composer: finalComposer,
      composerHu: finalComposer,
    };

    if (pendingMidiConfig.isRename) {
      setCustomSongs((prev) =>
        prev.map((s) => (s.id === finalizedSong.id ? finalizedSong : s))
      );
    } else {
      setCustomSongs((prev) => [finalizedSong, ...prev]);
    }

    if (openInStudio) {
      setSelectedSongId(finalizedSong.id);
      setActiveView('studio');
    }

    setPendingMidiConfig(null);
  };

  const handleQuickMidiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScoreImportError(null);
    try {
      const parsed = await parseScoreFile(file);
      openMidiTitleDialog(parsed, false);
    } catch (error: unknown) {
      setScoreImportError(error instanceof Error ? error.message : String(error));
    } finally {
      if (quickFileInputRef.current) quickFileInputRef.current.value = '';
    }
  };

  const liveAccuracyPercent = useMemo(() => {
    const resolved = sessionNotes.filter(
      (n) =>
        (handSelection === 'both' || n.hand === handSelection) &&
        (n.status === 'hit' || n.status === 'missed')
    );
    if (resolved.length === 0) return 100;
    const hits = resolved.filter((n) => n.status === 'hit').length;
    return Math.round((hits / resolved.length) * 100);
  }, [sessionNotes, handSelection]);

  const songHasRightNotes = useMemo(
    () => currentSong.notes.some((n) => n.hand === 'right'),
    [currentSong]
  );
  const songHasLeftNotes = useMemo(
    () => currentSong.notes.some((n) => n.hand === 'left'),
    [currentSong]
  );

  // Visually highlight keys on the keyboard & canvas during Auto-Demo without scoring them
  const displayedActiveMidiKeys = useMemo(() => {
    if (!isAutoDemo || !isPlaying) return activeMidiKeys;
    const combined = new Set(activeMidiKeys);
    for (const n of sessionNotes) {
      if (n.status !== 'auto' && (handSelection === 'both' || n.hand === handSelection) && currentTime >= n.startTime && currentTime <= n.startTime + n.duration) {
        combined.add(n.midi);
      }
    }
    return combined;
  }, [activeMidiKeys, currentTime, handSelection, isAutoDemo, isPlaying, sessionNotes]);

  return (
    <div
      className={`app-shell min-h-screen transition-colors duration-150 ${
        sidebarCollapsed ? 'is-collapsed' : ''
      } ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0B0F17] text-slate-100'}`}
    >
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header
        className={`app-sidebar ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-[#0B0F17] border-slate-800/90'
        }`}
      >
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#studio"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('studio');
          }}
          className={`app-brand font-display ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}
        >
          <Piano aria-hidden="true" />
          <span>KlavierLab</span>
        </a>

        {/* Zone 2: 4 concise single-line navigation links */}
        <nav
          aria-label={isHu ? 'Fő navigáció' : 'Main navigation'}
          className={`app-navigation ${
            isLight ? 'text-slate-600' : 'text-slate-400'
          }`}
        >
          <button
            onClick={() => setActiveView('studio')}
            title={isHu ? 'Gyakorlás' : 'Practice'}
            aria-label={isHu ? 'Gyakorlás' : 'Practice'}
            aria-current={activeView === 'studio' ? 'page' : undefined}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'studio'
                ? isLight
                  ? 'text-slate-900 border-b-2 border-sky-600 font-semibold'
                  : 'text-white border-b-2 border-sky-400 font-semibold'
                : isLight
                ? 'hover:text-slate-900'
                : 'hover:text-white'
            }`}
          >
            <Piano aria-hidden="true" />
            <span>{isHu ? 'Gyakorlás' : 'Practice'}</span>
          </button>
          <button
            onClick={() => setActiveView('library')}
            title={isHu ? 'Kottatár' : 'Library'}
            aria-label={isHu ? 'Kottatár' : 'Library'}
            aria-current={activeView === 'library' ? 'page' : undefined}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'library'
                ? isLight
                  ? 'text-slate-900 border-b-2 border-sky-600 font-semibold'
                  : 'text-white border-b-2 border-sky-400 font-semibold'
                : isLight
                ? 'hover:text-slate-900'
                : 'hover:text-white'
            }`}
          >
            <BookOpen aria-hidden="true" />
            <span>{isHu ? 'Kottatár' : 'Library'}</span>
          </button>
          <button
            onClick={() => setActiveView('progress')}
            title={isHu ? 'Haladás' : 'Progress'}
            aria-label={isHu ? 'Haladás' : 'Progress'}
            aria-current={activeView === 'progress' ? 'page' : undefined}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'progress'
                ? isLight
                  ? 'text-slate-900 border-b-2 border-sky-600 font-semibold'
                  : 'text-white border-b-2 border-sky-400 font-semibold'
                : isLight
                ? 'hover:text-slate-900'
                : 'hover:text-white'
            }`}
          >
            <TrendingUp aria-hidden="true" />
            <span>{isHu ? 'Haladás' : 'Progress'}</span>
          </button>
          <button
            onClick={() => setActiveView('setup')}
            title={isHu ? 'Eszközök' : 'Devices'}
            aria-label={isHu ? 'Eszközök' : 'Devices'}
            aria-current={activeView === 'setup' ? 'page' : undefined}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'setup'
                ? isLight
                  ? 'text-slate-900 border-b-2 border-sky-600 font-semibold'
                  : 'text-white border-b-2 border-sky-400 font-semibold'
                : isLight
                ? 'hover:text-slate-900'
                : 'hover:text-white'
            }`}
          >
            <Bluetooth aria-hidden="true" />
            <span>{isHu ? 'Eszközök' : 'Devices'}</span>
          </button>
        </nav>

        {/* Zone 3: Language Switcher, Dark/Light Mode Toggle & Bluetooth MIDI Connection */}
        <div className="sidebar-preferences">
          {/* Language Switcher HU | EN */}
          <button
            onClick={() => setLang((l) => (l === 'hu' ? 'en' : 'hu'))}
            aria-label={isHu ? 'Switch to English' : 'Váltás magyar nyelvre'}
            className={`px-2.5 py-2 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              isLight
                ? 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
                : 'bg-[#111827] text-slate-200 border-slate-700 hover:bg-slate-800'
            }`}
            title={isHu ? 'Váltás angol nyelvre (Switch to English)' : 'Switch to Hungarian (Magyar nyelv)'}
          >
            <Globe className="w-3.5 h-3.5 text-sky-500" />
            <span>{lang === 'hu' ? 'HU' : 'EN'}</span>
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={() => setTheme((th) => (th === 'dark' ? 'light' : 'dark'))}
            aria-label={isLight ? t.themeDark : t.themeLight}
            className={`px-2.5 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              isLight
                ? 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
                : 'bg-[#111827] text-slate-200 border-slate-700 hover:bg-slate-800'
            }`}
            title={isLight ? t.themeDark : t.themeLight}
          >
            {isLight ? (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-700" />
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              </>
            )}
          </button>

          {/* Sidebar collapse / expand toggle */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-pressed={sidebarCollapsed}
            aria-label={
              sidebarCollapsed
                ? isHu ? 'Oldalsáv kinyitása' : 'Expand sidebar'
                : isHu ? 'Oldalsáv összecsukása' : 'Collapse sidebar'
            }
            title={
              sidebarCollapsed
                ? isHu ? 'Oldalsáv kinyitása' : 'Expand sidebar'
                : isHu ? 'Oldalsáv összecsukása' : 'Collapse sidebar'
            }
            className={`px-2.5 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              isLight
                ? 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
                : 'bg-[#111827] text-slate-200 border-slate-700 hover:bg-slate-800'
            }`}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-3.5 h-3.5 text-sky-500" />
            ) : (
              <PanelLeftClose className="w-3.5 h-3.5 text-sky-500" />
            )}
          </button>

          {/* Bluetooth MIDI Connection Button */}
          <button
            className="sidebar-connect"
            disabled={connectionInfo.status === 'connecting'}
            onClick={() => {
              if (connectionInfo.status === 'connected') {
                setActiveView('setup');
              } else {
                midiService.connectWebBluetooth().then((ok) => {
                  if (!ok) setActiveView('setup');
                });
              }
            }}
            title={t.connectMidiBtn}
          >
            <Bluetooth className="w-3.5 h-3.5" />
            <span>
              {connectionInfo.status === 'connected'
                ? `${t.connectedPrefix} ${connectionInfo.deviceName}`
                : isHu ? 'Zongora csatlakoztatása' : 'Connect piano'}
            </span>
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE CONTENT */}
      <main className="app-main flex flex-col">
        {activeView === 'studio' && (
          <div className="practice-workspace flex-1 flex flex-col w-full">
            {scoreImportError && (
              <div role="alert" className="flex items-center justify-between gap-3 px-6 py-3 text-xs text-red-600 bg-red-50">
                <span>{isHu ? 'Nem sikerült beolvasni a kottát' : 'Could not import score'}: {scoreImportError}</span>
                <button onClick={() => setScoreImportError(null)} aria-label={t.midiCancel} title={t.midiCancel} className="p-2 shrink-0 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
            )}
            {/* Studio Workspace Control Deck */}
            <div
              className={`control-deck border-b ${
                isLight
                  ? 'bg-white border-slate-200'
                  : 'bg-[#111827] border-slate-800'
              }`}
            >
              {/* Left: Active Piece Selector & Unboxed Metadata */}
              <div className="piece-heading">
                <div className="piece-selector">
                  <Music className="w-4 h-4 shrink-0" />
                  <SongPicker songs={allSongs} selectedSong={currentSong} lang={lang} onSelectSong={song => setSelectedSongId(song.id)} />
                </div>

                {/* Quick .MID Upload Button */}
                <input
                  ref={quickFileInputRef}
                  type="file"
                  accept={SCORE_FILE_ACCEPT}
                  onChange={handleQuickMidiUpload}
                  className="hidden"
                />
                <button
                  onClick={() => quickFileInputRef.current?.click()}
                  aria-label={t.uploadMid}
                  title={t.uploadMid}
                  className={`upload-button px-3 py-2 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    isLight
                      ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                      : 'bg-[#0B0F17] hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-sky-500" />
                </button>

                {/* Clean unboxed score metadata */}
                <div
                  className={`piece-metadata flex items-center gap-2 text-xs ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  <span
                    className={`font-medium ${
                      isLight ? 'text-amber-700' : 'text-amber-300'
                    }`}
                  >
                    {isHu ? `${currentSong.level}. szint` : `Level ${currentSong.level}`}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {isHu && currentSong.composerHu ? currentSong.composerHu : currentSong.composer}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{currentSong.keySignature}</span>
                  <span aria-hidden="true">·</span>
                  <span>{currentSong.timeSignature[0]}/{currentSong.timeSignature[1]}</span>
                </div>
              </div>

              {/* Center/Right: Playback Transport, Practice Mode, Hand & Tempo Controls */}
              <div className="transport-controls">
                {/* Transport Play / Pause & Reset */}
                <div className="flex items-center gap-1.5">
                  <button
                    aria-label={isPlaying ? t.pause : currentTime > 0.2 && currentTime < songEndTime - 0.05 ? t.resumePractice : t.startPractice}
                    title={isPlaying ? t.pause : t.startPractice}
                    onClick={() => {
                      if (!isPlaying && currentTimeRef.current >= songEndTime - 0.05) {
                        resetSession(currentSong);
                        setIsPlaying(true);
                      } else {
                        setIsPlaying((p) => !p);
                      }
                    }}
                    className="transport-play"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => resetSession(currentSong)}
                    className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                      isLight
                        ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                        : 'bg-[#0B0F17] hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                    title={t.restartTitle}
                    aria-label={t.restartTitle}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Practice Mode Segmented Control */}
                <div
                  role="group"
                  aria-label={isHu ? 'Lejátszási mód' : 'Playback mode'}
                  className={`practice-mode-control flex items-center p-0.5 rounded-lg border ${
                    isLight
                      ? 'bg-slate-100 border-slate-200'
                      : 'bg-[#0B0F17] border-slate-800'
                  }`}
                >
                  <button
                    aria-pressed={!isAutoDemo && practiceMode === 'wait-for-note'}
                    onClick={() => {
                      if (isAutoDemo) {
                        resetSession(currentSong);
                      }
                      setIsAutoDemo(false);
                      setPracticeMode('wait-for-note');
                    }}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      !isAutoDemo && practiceMode === 'wait-for-note'
                        ? isLight
                          ? 'bg-white text-sky-700 font-semibold shadow-xs'
                          : 'bg-slate-800 text-sky-300 font-semibold'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.modeWaitForNote}
                  </button>
                  <button
                    aria-pressed={!isAutoDemo && practiceMode === 'continuous'}
                    onClick={() => {
                      if (isAutoDemo) {
                        resetSession(currentSong);
                      }
                      setIsAutoDemo(false);
                      setPracticeMode('continuous');
                      // Automatically enable metronome when entering Continuous Tempo mode to aid rhythm
                      setIsMetronomeEnabled(true);
                    }}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      !isAutoDemo && practiceMode === 'continuous'
                        ? isLight
                          ? 'bg-white text-sky-700 font-semibold shadow-xs'
                          : 'bg-slate-800 text-sky-300 font-semibold'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.modeContinuous}
                  </button>
                  <button
                    aria-pressed={isAutoDemo}
                    onClick={() => {
                      const nextDemo = !isAutoDemo;
                      resetSession(currentSong, currentTimeRef.current >= songEndTime ? 0 : currentTimeRef.current);
                      setIsAutoDemo(nextDemo);
                      if (nextDemo) setIsPlaying(true);
                    }}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                      isAutoDemo
                        ? 'bg-sky-500 text-slate-950 font-semibold'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{t.listenDemo}</span>
                  </button>
                </div>

                {/* Hand Selector Segmented Control */}
                <div
                  role="group"
                  aria-label={isHu ? 'Kézválasztás' : 'Hand selection'}
                  className={`hand-mode-control flex items-center p-0.5 rounded-lg border ${
                    isLight
                      ? 'bg-slate-100 border-slate-200'
                      : 'bg-[#0B0F17] border-slate-800'
                  }`}
                >
                  {songHasRightNotes && songHasLeftNotes && (
                    <button
                      onClick={() => changeHandSelection('both')}
                      aria-pressed={handSelection === 'both'}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        handSelection === 'both'
                          ? isLight
                            ? 'bg-white text-slate-900 font-semibold shadow-xs'
                            : 'bg-slate-800 text-white font-semibold'
                          : isLight
                          ? 'text-slate-600 hover:text-slate-900'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {currentSong.handArrangement === 'alternating-hands'
                        ? t.handAlternating
                        : t.handBoth}
                    </button>
                  )}
                  {songHasRightNotes && (
                    <button
                      onClick={() => changeHandSelection('right')}
                      aria-pressed={handSelection === 'right'}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        handSelection === 'right'
                          ? isLight
                            ? 'bg-white text-sky-700 font-semibold shadow-xs'
                            : 'bg-slate-800 text-sky-300 font-semibold'
                          : isLight
                          ? 'text-slate-600 hover:text-slate-900'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.handRight}
                    </button>
                  )}
                  {songHasLeftNotes && (
                    <button
                      onClick={() => changeHandSelection('left')}
                      aria-pressed={handSelection === 'left'}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        handSelection === 'left'
                          ? isLight
                            ? 'bg-white text-sky-700 font-semibold shadow-xs'
                            : 'bg-slate-800 text-sky-300 font-semibold'
                          : isLight
                          ? 'text-slate-600 hover:text-slate-900'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.handLeft}
                    </button>
                  )}
                </div>

                <details className="practice-options options-menu">
                  <summary title={isHu ? 'Beállítások' : 'Settings'}>
                    <SlidersHorizontal aria-hidden="true" />
                    <span>{isHu ? 'Beállítások' : 'Settings'}</span>
                  </summary>
                  <div className="options-panel">
                    <div className="sound-engine-settings">
                      <label htmlFor="sound-engine">{isHu ? 'Zongorahang' : 'Piano sound'}</label>
                      <select id="sound-engine" value={soundEngine} onChange={event => {
                        const engine = event.target.value as SoundEngine;
                        setSoundEngine(engine);
                        void pianoSynth.setEngine(engine);
                      }}>
                        <option value="original">{isHu ? 'Eredeti szintetizátor' : 'Original synth'}</option>
                        <option value="sampled">{isHu ? 'Mintavételezett zongora (smplr)' : 'Sampled grand piano (smplr)'}</option>
                      </select>
                      {soundEngine === 'sampled' && (
                        <div role="status" aria-live="polite" className="sound-engine-status">
                          {audioStatus.state === 'loading' || audioStatus.state === 'idle'
                            ? isHu ? `Zongora betöltése… ${audioStatus.loaded}/${audioStatus.total || '?'}` : `Loading piano… ${audioStatus.loaded}/${audioStatus.total || '?'}`
                            : audioStatus.state === 'ready'
                            ? isHu ? 'Mintavételezett zongora kész' : 'Sampled piano ready'
                            : isHu ? 'A zongoraminták nem érhetők el. Az eredeti hang szól.' : 'Piano samples unavailable. Using original synth.'}
                          {audioStatus.state === 'loading' && audioStatus.total > 0 && <progress aria-label={isHu ? 'Zongoraminták betöltése' : 'Piano sample loading'} value={audioStatus.loaded} max={audioStatus.total} />}
                          {audioStatus.state === 'error' && <button type="button" onClick={() => { void pianoSynth.setEngine('sampled'); }} title={isHu ? 'Betöltés újra' : 'Retry piano loading'} aria-label={isHu ? 'Betöltés újra' : 'Retry piano loading'}><RotateCcw className="w-4 h-4" /></button>}
                        </div>
                      )}
                    </div>
                    <button
                      aria-pressed={!isMuted}
                      onClick={() => {
                        const nextMuted = !isMuted;
                        setIsMuted(nextMuted);
                        pianoSynth.setMuted(nextMuted);
                      }}
                      className={`settings-sound-toggle ${isMuted ? 'text-red-500' : ''}`}
                    >
                      {isMuted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
                      <span>{isMuted ? t.synthMuted : t.synthOn}</span>
                    </button>
                    <label className="summary-preference">
                      <input type="checkbox" checked={showSessionSummary} onChange={event => setShowSessionSummary(event.target.checked)} />
                      <span>{isHu ? 'Összegzés gyakorlás után' : 'Show summary after practice'}</span>
                    </label>
                  </div>
                </details>

                {/* Studio Display toggles (moved up next to Settings) */}
                <details className="display-options options-menu">
                  <summary title={isHu ? 'Megjelenítés' : 'Display'}>
                    <Eye aria-hidden="true" />
                    <span className="sr-only">{isHu ? 'Megjelenítés' : 'Display'}</span>
                  </summary>
                  <div className="options-panel">
                    <button
                      onClick={() => setShowGrandStaff((s) => !s)}
                      aria-pressed={showGrandStaff}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                        showGrandStaff
                          ? isLight
                            ? 'bg-white text-sky-700 border-slate-300 shadow-2xs'
                            : 'bg-slate-800 text-sky-300 border-slate-700'
                          : 'bg-transparent text-slate-400 border-transparent hover:text-sky-500'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      <span>{t.sheetMusicToggle}</span>
                    </button>

                    <button
                      onClick={() => setShowFallingNotes((f) => !f)}
                      aria-pressed={showFallingNotes}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                        showFallingNotes
                          ? isLight
                            ? 'bg-white text-sky-700 border-slate-300 shadow-2xs'
                            : 'bg-slate-800 text-sky-300 border-slate-700'
                          : 'bg-transparent text-slate-400 border-transparent hover:text-sky-500'
                      }`}
                    >
                      <Layers className="w-3 h-3" />
                      <span>{t.fallingNotesToggle}</span>
                    </button>

                    <button
                      onClick={() => setShowKeyShortcuts((k) => !k)}
                      aria-pressed={showKeyShortcuts}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                        showKeyShortcuts
                          ? isLight
                            ? 'bg-white text-sky-700 border-slate-300 shadow-2xs'
                            : 'bg-slate-800 text-sky-300 border-slate-700'
                          : 'bg-transparent text-slate-400 border-transparent hover:text-sky-500'
                      }`}
                    >
                      <Keyboard className="w-3 h-3" />
                      <span>{t.keyLabelsToggle}</span>
                    </button>
                  </div>
                </details>
                {/* Labeled Tempo Slider */}
                <div className="tempo-control">
                  <label
                    htmlFor="tempo-slider"
                    className="text-xs font-mono tabular-nums whitespace-nowrap shrink-0"
                  >
                    {t.tempoLabel}: {Math.round(tempoMultiplier * 100)}% (
                    {Math.round(currentSong.bpm * tempoMultiplier)} BPM)
                  </label>
                  <input
                    id="tempo-slider"
                    type="range"
                    min={0.5}
                    max={1.25}
                    step={0.05}
                    value={tempoMultiplier}
                    onChange={(e) => setTempoMultiplier(parseFloat(e.target.value))}
                    className="w-20 accent-sky-500 cursor-pointer"
                  />
                </div>

                {/* Finish & Grade Session Button (disabled during Auto-Demo) */}
                {!isAutoDemo && (
                  <button
                    onClick={() => finalizeSessionAndShowModal(sessionNotes, true)}
                    aria-label={t.finishAndGrade}
                    title={t.finishAndGrade}
                    className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Secondary Sub-Bar: Metronome (Audible Toggle + Visual Beat Indicator), Telemetry, Language & Theme */}
            <div
              className={`session-toolbar border-b text-xs ${
                isLight
                  ? 'bg-slate-100 border-slate-200'
                  : 'bg-[#0E1525] border-slate-800/80'
              }`}
            >
              {/* Left: Live Session Metrics + SYNCHRONIZED METRONOME MODULE */}
              <div className="flex items-center gap-4 flex-wrap">
                {/* Synchronized Metronome Audible Toggle + Visual Click Indicator */}
                <div
                  className={`flex items-center gap-2.5 px-2.5 py-1 rounded-lg border ${
                    isLight
                      ? 'bg-white border-slate-300'
                      : 'bg-[#0B0F17] border-slate-800'
                  }`}
                >
                  <button
                    aria-pressed={isMetronomeEnabled}
                    onClick={() => {
                      const nextState = !isMetronomeEnabled;
                      setIsMetronomeEnabled(nextState);
                      if (nextState) {
                        pianoSynth.playMetronomeClick(true);
                      }
                    }}
                    className={`metronome-toggle px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isMetronomeEnabled
                        ? 'bg-sky-500 text-slate-950'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Bell className="w-3 h-3" />
                    <span>{isMetronomeEnabled ? t.metronomeOn : t.metronomeOff}</span>
                  </button>
                </div>

                {/* Live Session Metrics (Tabular Numerals) */}
                <div className="flex items-center gap-3 font-mono tabular-nums">
                  <div>
                    <span className="text-slate-400">{t.accuracy}: </span>
                    <span className="font-bold text-emerald-500">{liveAccuracyPercent}%</span>
                  </div>
                  <span aria-hidden="true" className="text-slate-500">
                    ·
                  </span>
                  <div>
                    <span className="text-slate-400">{t.streak}: </span>
                    <span className="font-bold text-amber-500">{currentStreak}</span>
                  </div>
                  <span aria-hidden="true" className="text-slate-500">
                    ·
                  </span>
                  <div>
                    <span className="text-slate-400">{t.score}: </span>
                    <span className="font-bold text-sky-500">
                      {liveScore.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Middle: Sheet position scrubber (moved up from its own row) */}
              <div className="song-navigation">
                <span className="song-time font-mono">{currentTime.toFixed(1)}s</span>
                <label htmlFor="song-position" className="sr-only">{isHu ? 'Dal pozíciója' : 'Song position'}</label>
                <input id="song-position" type="range" min={0} max={songEndTime} step={0.01} value={Math.min(currentTime, songEndTime)} onChange={event => resetSession(currentSong, Number(event.target.value))} />
                <span className="song-time font-mono">{songEndTime.toFixed(1)}s</span>
                <select aria-label={isHu ? 'Ugrás ütemre' : 'Jump to measure'} value={activeMeasure} onChange={event => {
                  const position = measurePositions.find(entry => entry.measure === Number(event.target.value));
                  if (position) resetSession(currentSong, position.time);
                }}>
                  {measurePositions.map(position => <option key={position.measure} value={position.measure}>{isHu ? 'Ütem' : 'Bar'} {position.measure}</option>)}
                </select>
              </div>
            </div>

            {/* 1. Synchronized Grand Staff Sheet Music View */}
            {showGrandStaff && (
              <SheetMusicBar
                song={currentSong}
                notes={sessionNotes}
                currentTime={currentTime}
                handSelection={handSelection}
                lang={lang}
                theme={theme}
                expanded={!showFallingNotes}
                onSeek={(seconds, play = false) => {
                  resetSession(currentSong, seconds);
                  if (play && seconds < songEndTime) setIsPlaying(true);
                }}
              />
            )}

            {/* 2. Synchronized Falling Note Blocks Stage (Middle Panel — toggleable) */}
            {showFallingNotes ? (
              <FallingNotesCanvas
                song={currentSong}
                notes={sessionNotes}
                currentTime={currentTime}
                currentTimeRef={currentTimeRef}
                isPlaying={isPlaying}
                activeMidiKeys={displayedActiveMidiKeys}
                waitingTargetNotes={waitingTargetNotes}
                handSelection={handSelection}
                practiceMode={practiceMode}
                latestFeedback={latestFeedback}
                lang={lang}
                theme={theme}
              />
            ) : (
              /* Compact status strip when Falling Notes middle bar is hidden */
              <div
                className={`px-6 py-2.5 border-b flex items-center justify-between gap-4 text-xs ${
                  !showGrandStaff ? 'flex-1' : ''
                } ${
                  isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-700'
                    : 'bg-[#0E1525] border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sky-500 font-semibold">{t.rightHandLegend}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-500 font-semibold">{t.leftHandLegend}</span>
                  {practiceMode === 'wait-for-note' && waitingTargetNotes.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono font-semibold text-amber-600 dark:text-amber-300">
                        {t.actionRequired}{' '}
                        {waitingTargetNotes
                          .map(
                            (n) =>
                              `${midiToNoteName(n.midi)} (${
                                n.hand === 'right' ? t.rightHandShort : t.leftHandShort
                              }${n.finger ? ` · ${t.fingerShort} ${n.finger}` : ''})`
                          )
                          .join(' + ')}
                      </span>
                    </>
                  )}
                </div>

                {latestFeedback && (
                  <div className="font-mono text-xs font-semibold">
                    <span
                      className={
                        latestFeedback.grade === 'perfect'
                          ? 'text-emerald-500'
                          : latestFeedback.grade === 'wrong'
                          ? 'text-red-500'
                          : 'text-sky-500'
                      }
                    >
                      {latestFeedback.label}
                    </span>
                    {latestFeedback.sublabel && (
                      <span className="ml-2 text-slate-400">{latestFeedback.sublabel}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. Synchronized 49-Key Interactive Piano Keyboard */}
            <PianoKeyboard
              activeMidiKeys={displayedActiveMidiKeys}
              targetNotes={waitingTargetNotes}
              wrongMidiKey={wrongMidiKey}
              showKeyShortcuts={showKeyShortcuts}
              onKeyPress={(midi, vel) =>
                midiService.parseStandardMidiBytes([0x90, midi, vel || 96], 'Virtual')
              }
              onKeyRelease={(midi) =>
                midiService.parseStandardMidiBytes([0x80, midi, 0], 'Virtual')
              }
            />
          </div>
        )}

        {activeView === 'library' && (
          <SongLibraryView
            songs={allSongs}
            selectedSongId={currentSong.id}
            profile={profile}
            lang={lang}
            theme={theme}
            onSelectSongAndPractice={(song) => {
              setSelectedSongId(song.id);
              setActiveView('studio');
            }}
            onRequestNameUploadedSong={(song, isRename) => {
              openMidiTitleDialog(song, Boolean(isRename));
            }}
            onDeleteCustomSong={(songId) => {
              setCustomSongs((prev) => prev.filter((s) => s.id !== songId));
              if (selectedSongId === songId) {
                setSelectedSongId(INITIAL_SONGS[0].id);
              }
            }}
          />
        )}

        {activeView === 'progress' && (
          <ProgressDashboardView
            profile={{
              ...profile,
              levelTitle: getLevelTitle(profile.level, lang),
            }}
            songs={allSongs}
            lang={lang}
            theme={theme}
            onSelectSong={(song) => {
              setSelectedSongId(song.id);
              setActiveView('studio');
            }}
            onResetProgress={() => {
              setProfile(DEFAULT_PROFILE);
            }}
          />
        )}

        {activeView === 'setup' && (
          <SetupGuideView
            connectionInfo={connectionInfo}
            midiLogs={midiLogs}
            lang={lang}
            theme={theme}
            onConnectBle={() => midiService.connectWebBluetooth()}
            onConnectWebMidi={() => midiService.connectWebMidi()}
            onDisconnect={() => midiService.disconnect()}
            onTriggerTestChord={() => midiService.triggerDiagnosticBlePacket()}
            onTestMidiOutput={() => midiService.sendNoteWithDuration(60, 85, 0.7)}
            onClearLogs={() => setMidiLogs([])}
          />
        )}
      </main>

      {/* Post-Session Performance Report & Adaptive Difficulty Modal */}
      {completedSessionStats && (
        <SessionSummaryModal
          stats={completedSessionStats}
          song={currentSong}
          allSongs={allSongs}
          profile={profile}
          lang={lang}
          theme={theme}
          onClose={() => setCompletedSessionStats(null)}
          onReplayCurrent={() => {
            setCompletedSessionStats(null);
            resetSession(currentSong);
            setIsPlaying(true);
          }}
          onApplyRecommendation={(rec: AdaptiveRecommendation) => {
            setCompletedSessionStats(null);
            setPracticeMode(rec.recommendedMode);
            setHandSelection(rec.recommendedHand);
            setTempoMultiplier(rec.recommendedTempo);
            if (rec.recommendedMode === 'continuous') {
              setIsMetronomeEnabled(true);
            }
            if (rec.nextSongId) {
              setSelectedSongId(rec.nextSongId);
            } else {
              resetSession(currentSong);
              setIsPlaying(true);
            }
          }}
        />
      )}

      {/* Custom Title Modal for Uploaded MIDI Files (Triggered Immediately After File Picker) */}
      {pendingMidiConfig && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="midi-title-modal-heading"
        >
          <div
            className={`w-full max-w-md border rounded-2xl shadow-2xl overflow-hidden ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900'
                : 'bg-[#111827] border-slate-800 text-slate-100'
            }`}
          >
            <div
              className={`px-6 py-4 border-b flex items-center justify-between ${
                isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-[#0E1525]'
              }`}
            >
              <div>
                <h2 id="midi-title-modal-heading" className="text-base font-bold">
                  {t.midiModalTitle}
                </h2>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t.midiModalSubtitle}
                </p>
              </div>
              <button
                onClick={() => setPendingMidiConfig(null)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isLight ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
                }`}
                aria-label={t.midiCancel}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmMidiTitle(true);
              }}
              className="p-6 space-y-4"
            >
              {/* Detected MIDI Technical Summary */}
              <div
                className={`px-3.5 py-2.5 rounded-lg border text-xs font-mono tabular-nums flex items-center justify-between flex-wrap gap-2 ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-600'
                    : 'bg-[#0B0F17] border-slate-800 text-slate-400'
                }`}
              >
                <span>
                  {pendingMidiConfig.song.notes.length} {isHu ? 'hang' : 'notes'} ·{' '}
                  {pendingMidiConfig.song.bpm} BPM ·{' '}
                  {pendingMidiConfig.song.timeSignature[0]}/
                  {pendingMidiConfig.song.timeSignature[1]}
                </span>
                <span className="text-sky-500 font-sans font-medium">
                  {getHandArrangementLabel(pendingMidiConfig.song.handArrangement, lang)}
                </span>
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="custom-midi-title-input"
                  className="block text-xs font-semibold"
                >
                  {t.midiTitleLabel}
                </label>
                <input
                  id="custom-midi-title-input"
                  type="text"
                  autoFocus
                  required
                  value={customMidiTitle}
                  onChange={(e) => setCustomMidiTitle(e.target.value)}
                  placeholder={t.midiTitlePlaceholder}
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border focus:outline-none focus:border-sky-500 ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900'
                      : 'bg-[#0B0F17] border-slate-700 text-white'
                  }`}
                />
              </div>

              {/* Optional Composer / Subtitle Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="custom-midi-composer-input"
                  className="block text-xs font-medium text-slate-400"
                >
                  {t.midiComposerLabel}
                </label>
                <input
                  id="custom-midi-composer-input"
                  type="text"
                  value={customMidiComposer}
                  onChange={(e) => setCustomMidiComposer(e.target.value)}
                  placeholder={t.midiComposerPlaceholder}
                  className={`w-full px-3.5 py-2 text-xs rounded-lg border focus:outline-none focus:border-sky-500 ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900'
                      : 'bg-[#0B0F17] border-slate-700 text-white'
                  }`}
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPendingMidiConfig(null)}
                  className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  {t.midiCancel}
                </button>
                {!pendingMidiConfig.isRename && (
                  <button
                    type="button"
                    onClick={() => handleConfirmMidiTitle(false)}
                    className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      isLight
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                        : 'bg-[#0B0F17] hover:bg-slate-800 text-slate-200 border-slate-700'
                    }`}
                  >
                    {t.midiSaveOnly}
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {t.midiSaveAndPractice}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
