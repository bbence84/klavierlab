import React, { useEffect, useRef, useState } from 'react';
import { HandSelection, HitGrade, PracticeMode, Song, SongNote } from '../types/music';
import { Language, ThemeMode, UI_TEXT } from '../utils/i18n';
import {
  computeKeyboardGeometry,
  DEFAULT_MAX_MIDI,
  DEFAULT_MIN_MIDI,
  midiToNoteName,
} from '../utils/musicTheory';

export interface LiveFeedbackItem {
  id: string;
  grade: HitGrade;
  label: string;
  sublabel: string;
  timestamp: number;
}

interface FallingNotesCanvasProps {
  song: Song;
  notes: SongNote[];
  currentTime: number;
  /**
   * Live playback position ref updated every animation frame by the App loop.
   * When provided, the canvas drives its own rAF from this ref so it animates at the
   * display refresh rate WITHOUT forcing the whole App tree to re-render each frame.
   */
  currentTimeRef?: React.MutableRefObject<number>;
  isPlaying?: boolean;
  activeMidiKeys: Set<number>;
  waitingTargetNotes: SongNote[];
  handSelection: HandSelection;
  practiceMode: PracticeMode;
  latestFeedback: LiveFeedbackItem | null;
  lang: Language;
  theme: ThemeMode;
}

const FallingNotesCanvasComponent: React.FC<FallingNotesCanvasProps> = ({
  song,
  notes,
  currentTime,
  currentTimeRef,
  isPlaying = false,
  activeMidiKeys,
  waitingTargetNotes,
  handSelection,
  practiceMode,
  latestFeedback,
  lang,
  theme,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const lookaheadSeconds = 3.6;
  const t = UI_TEXT[lang];
  const isLight = theme === 'light';

  // Keep the latest draw inputs in a ref so the rAF loop can read them without
  // being re-created (and without re-subscribing) on every prop change.
  const drawRef = useRef<(time: number) => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setCanvasSize({ width, height });
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Build the draw function whenever any visual input (other than time) changes.
  useEffect(() => {
    const draw = (renderTime: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Background Studio Canvas
      ctx.fillStyle = '#17191C';
      ctx.fillRect(0, 0, width, height);

      const { keys, byMidi } = computeKeyboardGeometry(DEFAULT_MIN_MIDI, DEFAULT_MAX_MIDI);

      // 2. Vertical Key Lanes
      for (const k of keys) {
        const x = k.xNormalized * width;
        const w = k.widthNormalized * width;

        if (k.isBlack) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.13)';
          ctx.fillRect(x, 0, w, height);
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();

          if (k.midi % 12 === 0) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();

            ctx.fillStyle = 'rgba(161, 161, 170, 0.45)';
            ctx.font = '600 10px "JetBrains Mono", monospace';
            ctx.fillText(k.noteName, x + 4, 16);
          }
        }

        if (activeMidiKeys.has(k.midi)) {
          const beamGrad = ctx.createLinearGradient(0, height, 0, 0);
          beamGrad.addColorStop(0, 'rgba(112, 206, 170, 0.25)');
          beamGrad.addColorStop(1, 'rgba(112, 206, 170, 0.01)');
          ctx.fillStyle = beamGrad;
          ctx.fillRect(x, 0, w, height);
        }
      }

      // 3. Horizontal Beat & Measure Grid Lines (capped at end of final measure)
      const secPerBeat = 60 / song.bpm;
      const beatsPerMeasure = song.timeSignature[0];
      const totalMeasures = Math.max(1, ...notes.map((n) => n.measure || 1));
      const totalSongBeats = totalMeasures * beatsPerMeasure;
      const maxBeat = Math.min(
        totalSongBeats,
        Math.ceil((renderTime + lookaheadSeconds) / secPerBeat) + 2
      );
      const minBeat = Math.max(0, Math.floor((renderTime - 1.2) / secPerBeat));

      for (let b = minBeat; b <= maxBeat; b++) {
        const beatTime = 1.2 + b * secPerBeat;
        const timeUntilStrike = beatTime - renderTime;
        if (timeUntilStrike < 0 || timeUntilStrike > lookaheadSeconds) continue;

        const y = height - (timeUntilStrike / lookaheadSeconds) * height;
        const isMeasureStart = b % beatsPerMeasure === 0;
        const isFinalBar = b === totalSongBeats;

        ctx.strokeStyle = isMeasureStart ? 'rgba(161, 161, 170, 0.18)' : 'rgba(161, 161, 170, 0.07)';
        ctx.lineWidth = isFinalBar ? 2 : isMeasureStart ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        if (isMeasureStart && !isFinalBar) {
          const measureNum = Math.floor(b / beatsPerMeasure) + 1;
          ctx.fillStyle = 'rgba(161, 161, 170, 0.55)';
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.fillText(
            lang === 'hu' ? `${measureNum}. ÜTEM` : `MEASURE ${measureNum}`,
            10,
            y - 5
          );
        }
      }

      // 4. Strike Line at Bottom
      ctx.strokeStyle =
        waitingTargetNotes.length > 0 ? '#E7B76C' : '#70CEAA';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, height - 2);
      ctx.lineTo(width, height - 2);
      ctx.stroke();

      // 5. Render Falling Note Blocks
      for (const note of notes) {
        const noteEnd = note.startTime + note.duration;
        if (noteEnd < renderTime - 0.15 || note.startTime > renderTime + lookaheadSeconds) {
          continue;
        }

        const geom = byMidi.get(note.midi);
        if (!geom) continue;

        const x = geom.xNormalized * width + 2;
        const w = Math.max(4, geom.widthNormalized * width - 4);

        const timeUntilStart = note.startTime - renderTime;
        const timeUntilEnd = noteEnd - renderTime;

        const bottomY = Math.min(height, height - (timeUntilStart / lookaheadSeconds) * height);
        const topY = Math.max(-20, height - (timeUntilEnd / lookaheadSeconds) * height);
        const blockHeight = Math.max(22, bottomY - topY);

        const isTargetHand = handSelection === 'both' || handSelection === note.hand;
        const isWaitingTarget = waitingTargetNotes.some((wn) => wn.id === note.id);

        let fillPrimary = note.hand === 'right' ? '#529F82' : '#B48A4E';
        let borderStroke = note.hand === 'right' ? '#87D9BA' : '#E7B76C';

        if (!isTargetHand) {
          fillPrimary = 'rgba(113, 113, 122, 0.55)';
          borderStroke = 'rgba(148, 163, 184, 0.45)';
        } else if (note.status === 'hit') {
          fillPrimary = '#059669';
          borderStroke = '#6EE7B7';
        } else if (note.status === 'missed') {
          fillPrimary = '#DC2626';
          borderStroke = '#FCA5A5';
        } else if (isWaitingTarget) {
          fillPrimary = note.hand === 'right' ? '#70CEAA' : '#E7B76C';
          borderStroke = '#FFFFFF';
        }

        const radius = 5;
        ctx.beginPath();
        ctx.roundRect(x, topY, w, blockHeight, radius);
        ctx.fillStyle = fillPrimary;
        ctx.fill();

        ctx.lineWidth = isWaitingTarget ? 2.2 : 1.2;
        ctx.strokeStyle = borderStroke;
        ctx.stroke();

        if (blockHeight >= 20 && w >= 16) {
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 10px "JetBrains Mono", monospace';
          const noteText = midiToNoteName(note.midi);
          ctx.fillText(noteText, x + 3, bottomY - 6);

          if (blockHeight >= 36 && note.finger) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = '600 9px "Plus Jakarta Sans", sans-serif';
            const handCode = note.hand === 'right' ? 'R' : 'L';
            ctx.fillText(`${handCode}${note.finger}`, x + 3, bottomY - 18);
          }
        }
      }

      ctx.restore();
    };

    drawRef.current = draw;
    // When not actively playing (paused / seeking / static), draw once immediately so
    // prop changes (theme, notes, hand, active keys, scrub position) are reflected.
    if (!isPlaying) {
      draw(currentTimeRef?.current ?? currentTime);
    }
  }, [
    song,
    notes,
    currentTime,
    currentTimeRef,
    isPlaying,
    activeMidiKeys,
    waitingTargetNotes,
    handSelection,
    practiceMode,
    isLight,
    lang,
    canvasSize.width,
    canvasSize.height,
  ]);

  // While playing, run a dedicated animation loop that reads the live time ref and
  // redraws every frame. This keeps the falling notes perfectly smooth even though the
  // React currentTime state only updates ~15x/sec (which avoids re-rendering the whole App).
  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;
    const tick = () => {
      const time = currentTimeRef?.current ?? currentTime;
      drawRef.current(time);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, currentTimeRef, currentTime]);

  const getFeedbackBadgeStyle = (grade: HitGrade) => {
    switch (grade) {
      case 'perfect':
        return {
          bg: 'bg-emerald-950/95 border-emerald-500/60 text-emerald-200',
          symbol: t.fbPerfect,
        };
      case 'good':
        return {
          bg: 'bg-sky-950/95 border-sky-500/60 text-sky-200',
          symbol: t.fbGood,
        };
      case 'early':
        return {
          bg: 'bg-amber-950/95 border-amber-500/60 text-amber-200',
          symbol: t.fbEarly,
        };
      case 'late':
        return {
          bg: 'bg-amber-950/95 border-amber-500/60 text-amber-200',
          symbol: t.fbLate,
        };
      case 'wrong':
        return {
          bg: 'bg-red-950/95 border-red-500/70 text-red-100',
          symbol: t.fbWrong,
        };
      case 'miss':
      default:
        return {
          bg: 'bg-red-950/95 border-red-500/60 text-red-200',
          symbol: t.fbMiss,
        };
    }
  };

  return (
    <div
      className={`falling-stage relative w-full h-[270px] sm:h-[310px] overflow-hidden select-none ${
        isLight ? 'bg-slate-100' : 'bg-[#0B0F17]'
      }`}
    >
      <canvas ref={canvasRef} aria-label={lang === 'hu' ? 'Lefelé haladó hangjegyek' : 'Falling note timeline'} className="absolute inset-0 w-full h-full block" />

      {/* Hand Color Legend & Active Mode Overlay (Top Left) */}
      <div className="stage-legend">
        <span><i aria-hidden="true" />{lang === 'hu' ? 'Jobb kéz' : 'Right hand'}</span>
        <span><i aria-hidden="true" />{lang === 'hu' ? 'Bal kéz' : 'Left hand'}</span>
      </div>

      {/* Live Semantic Hit / Wrong-Note Feedback Banner (Top Right) */}
      {latestFeedback && (
        <div
          key={latestFeedback.id}
          className={`stage-feedback pointer-events-none absolute top-3 right-3 border px-3.5 py-2 rounded-lg transition-opacity duration-150 ${
            getFeedbackBadgeStyle(latestFeedback.grade).bg
          }`}
        >
          <div className="text-xs font-bold tracking-wide font-mono">
            {getFeedbackBadgeStyle(latestFeedback.grade).symbol} · {latestFeedback.label}
          </div>
          <div className="text-[11px] opacity-90 mt-0.5">{latestFeedback.sublabel}</div>
        </div>
      )}

      {/* Wait-for-Note Prompt Callout */}
      {waitingTargetNotes.length > 0 && (
        <div className="stage-prompt">
            <strong className="font-mono font-medium">
              {waitingTargetNotes
                .map(
                  (n) =>
                    `${midiToNoteName(n.midi)} (${
                      n.hand === 'right' ? t.rightHandShort : t.leftHandShort
                    }${n.finger ? `, ${t.fingerShort} ${n.finger}` : ''})`
                )
                .join(' + ')}
            </strong>
        </div>
      )}
    </div>
  );
};

// Memoized so that throttled App re-renders (and unrelated state changes) do not force a
// React re-render of this component. It animates via its own rAF loop reading currentTimeRef.
export const FallingNotesCanvas = React.memo(FallingNotesCanvasComponent);
