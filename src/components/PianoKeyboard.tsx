import React, { useMemo, useState } from 'react';
import { SongNote } from '../types/music';
import {
  computeKeyboardGeometry,
  DEFAULT_MAX_MIDI,
  DEFAULT_MIN_MIDI,
  MIDI_TO_HOME_KEY_LABEL,
} from '../utils/musicTheory';

interface PianoKeyboardProps {
  activeMidiKeys: Set<number>;
  targetNotes: SongNote[];
  wrongMidiKey: number | null;
  showKeyShortcuts: boolean;
  onKeyPress: (midi: number, velocity?: number) => void;
  onKeyRelease: (midi: number) => void;
}

export const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  activeMidiKeys,
  targetNotes,
  wrongMidiKey,
  showKeyShortcuts,
  onKeyPress,
  onKeyRelease,
}) => {
  const [isMouseDown, setIsMouseDown] = useState(false);

  const { keys } = useMemo(
    () => computeKeyboardGeometry(DEFAULT_MIN_MIDI, DEFAULT_MAX_MIDI),
    []
  );

  const targetByMidi = useMemo(() => {
    const map = new Map<number, SongNote>();
    for (const n of targetNotes) {
      map.set(n.midi, n);
    }
    return map;
  }, [targetNotes]);

  const whiteKeys = useMemo(() => keys.filter((k) => !k.isBlack), [keys]);
  const blackKeys = useMemo(() => keys.filter((k) => k.isBlack), [keys]);

  return (
    <div
      className="piano-keyboard relative w-full h-[142px] bg-[#090D14] border-t-2 border-slate-800 select-none overflow-hidden"
      onMouseLeave={() => setIsMouseDown(false)}
      onMouseUp={() => setIsMouseDown(false)}
    >
      {/* Top red felt acoustic piano trim strip */}
      <div className="w-full h-1.5 bg-red-950/90 border-b border-red-900/50" />

      <div className="relative w-full h-[136px]">
        {/* White Keys Layer */}
        {whiteKeys.map((key) => {
          const isPressed = activeMidiKeys.has(key.midi);
          const targetNote = targetByMidi.get(key.midi);
          const isWrong = wrongMidiKey === key.midi;
          const isMiddleC = key.midi === 60;
          const shortcut = MIDI_TO_HOME_KEY_LABEL[key.midi];

          let keyClasses =
            'bg-slate-100 hover:bg-white text-slate-800 border-r border-b border-slate-300';
          if (isWrong) {
            keyClasses = 'bg-red-500 text-white border-red-400';
          } else if (isPressed && targetNote) {
            keyClasses = 'bg-emerald-400 text-slate-950 border-emerald-300';
          } else if (isPressed) {
            keyClasses = 'bg-sky-400 text-slate-950 border-sky-300';
          } else if (targetNote) {
            keyClasses =
              targetNote.hand === 'right'
                ? 'bg-sky-200 text-slate-950 border-sky-400 ring-2 ring-inset ring-sky-500'
                : 'bg-amber-200 text-slate-950 border-amber-400 ring-2 ring-inset ring-amber-500';
          }

          return (
            <button
              key={key.midi}
              type="button"
              aria-label={`Piano key ${key.noteName}`}
              style={{
                left: `${key.xNormalized * 100}%`,
                width: `${key.widthNormalized * 100}%`,
              }}
              onMouseDown={() => {
                setIsMouseDown(true);
                onKeyPress(key.midi, 96);
              }}
              onMouseEnter={() => {
                if (isMouseDown) onKeyPress(key.midi, 90);
              }}
              onMouseUp={() => onKeyRelease(key.midi)}
              onMouseLeave={() => {
                if (isPressed) onKeyRelease(key.midi);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                onKeyPress(key.midi, 98);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                onKeyRelease(key.midi);
              }}
              className={`absolute top-0 h-full rounded-b-md flex flex-col items-center justify-end pb-2 transition-colors duration-75 focus:outline-none ${keyClasses}`}
            >
              {/* Target Finger Callout */}
              {targetNote && (
                <span
                  className={`mb-1 px-1 py-0.5 rounded text-[10px] font-mono font-bold leading-none ${
                    targetNote.hand === 'right'
                      ? 'bg-sky-700 text-white'
                      : 'bg-amber-700 text-white'
                  }`}
                >
                  {targetNote.hand === 'right' ? 'R' : 'L'}
                  {targetNote.finger || ''}
                </span>
              )}

              {/* Wrong key glyph */}
              {isWrong && (
                <span className="mb-1 text-xs font-mono font-bold text-white">✕</span>
              )}

              {/* Computer keyboard shortcut hint */}
              {showKeyShortcuts && shortcut && (
                <span className="text-[9px] font-mono text-slate-500 mb-0.5">
                  [{shortcut}]
                </span>
              )}

              {/* Note Label (Always show on C keys, Middle C, or active target) */}
              <span
                className={`text-[10px] font-mono leading-none ${
                  isMiddleC
                    ? 'font-bold text-sky-700 underline'
                    : key.midi % 12 === 0 || targetNote
                    ? 'font-semibold opacity-90'
                    : 'opacity-45'
                }`}
              >
                {key.noteName}
              </span>
            </button>
          );
        })}

        {/* Black Keys Layer */}
        {blackKeys.map((key) => {
          const isPressed = activeMidiKeys.has(key.midi);
          const targetNote = targetByMidi.get(key.midi);
          const isWrong = wrongMidiKey === key.midi;
          const shortcut = MIDI_TO_HOME_KEY_LABEL[key.midi];

          let blackClasses =
            'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-md';
          if (isWrong) {
            blackClasses = 'bg-red-600 text-white border-red-300';
          } else if (isPressed && targetNote) {
            blackClasses = 'bg-emerald-500 text-slate-950 border-emerald-200';
          } else if (isPressed) {
            blackClasses = 'bg-sky-500 text-slate-950 border-sky-200';
          } else if (targetNote) {
            blackClasses =
              targetNote.hand === 'right'
                ? 'bg-sky-500 text-slate-950 border-2 border-white'
                : 'bg-amber-500 text-slate-950 border-2 border-white';
          }

          return (
            <button
              key={key.midi}
              type="button"
              aria-label={`Piano key ${key.noteName}`}
              style={{
                left: `${key.xNormalized * 100}%`,
                width: `${key.widthNormalized * 100}%`,
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsMouseDown(true);
                onKeyPress(key.midi, 96);
              }}
              onMouseEnter={(e) => {
                e.stopPropagation();
                if (isMouseDown) onKeyPress(key.midi, 90);
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                onKeyRelease(key.midi);
              }}
              onMouseLeave={() => {
                if (isPressed) onKeyRelease(key.midi);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onKeyPress(key.midi, 98);
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onKeyRelease(key.midi);
              }}
              className={`absolute top-0 h-[62%] z-10 rounded-b-md flex flex-col items-center justify-end pb-1.5 transition-colors duration-75 focus:outline-none ${blackClasses}`}
            >
              {targetNote && (
                <span className="text-[9px] font-mono font-bold leading-none mb-0.5">
                  {targetNote.hand === 'right' ? 'R' : 'L'}
                  {targetNote.finger || ''}
                </span>
              )}
              {showKeyShortcuts && shortcut && (
                <span className="text-[8px] font-mono opacity-75">{shortcut}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
