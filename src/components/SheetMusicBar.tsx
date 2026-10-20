import React, { useEffect, useRef, useState } from 'react';
import { HandSelection, Song, SongNote } from '../types/music';
import { Language, ThemeMode, UI_TEXT } from '../utils/i18n';
import { midiToDiatonicStepFromC4, midiToNoteName } from '../utils/musicTheory';

interface SheetMusicBarProps {
  song: Song;
  notes: SongNote[];
  currentTime: number;
  handSelection: HandSelection;
  lang: Language;
  theme: ThemeMode;
  expanded?: boolean;
  onSeek?: (seconds: number, play?: boolean) => void;
}

export const SheetMusicBar: React.FC<SheetMusicBarProps> = ({
  song,
  notes,
  currentTime,
  handSelection,
  lang,
  theme,
  expanded = false,
  onSeek,
}) => {
  const t = UI_TEXT[lang];
  const isLight = theme === 'light';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(1000);
  const gestureRef = useRef<{
    pointerId: number;
    clientX: number;
    originX: number;
    originTime: number;
    clickTime: number;
    previewTime: number;
    secondsPerUnit: number;
    inverse: DOMMatrix;
    moved: boolean;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(entries => setContainerWidth(entries[0].contentRect.width));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const svgWidth = Math.max(320, containerWidth);
  const windowBehind = Math.min(1.1, svgWidth / 780);
  const windowAhead = Math.max(2.2, Math.min(5.4, (svgWidth - 88) / 160));
  const totalWindowSec = windowBehind + windowAhead;
  const playheadXPercent = (windowBehind / totalWindowSec) * 100;

  const svgHeight = 136;
  const clefZoneWidth = 88;
  const usableWidth = svgWidth - clefZoneWidth;
  const playheadX = clefZoneWidth + (windowBehind / totalWindowSec) * usableWidth;

  const middleCY = 70;
  const stepPixels = 4.2;

  const stepToY = (diatonicStep: number, hand: 'right' | 'left'): number => {
    const handOffset = hand === 'right' ? -8 : 10;
    return middleCY + handOffset - diatonicStep * stepPixels;
  };

  const trebleLineSteps = [2, 4, 6, 8, 10]; // E4, G4, B4, D5, F5
  const bassLineSteps = [-10, -8, -6, -4, -2]; // G2, B2, D3, F3, A3

  const secPerBeat = 60 / song.bpm;
  const secPerMeasure = secPerBeat * song.timeSignature[0];
  const totalMeasures = Math.max(1, ...notes.map((n) => n.measure || 1));
  const measureBars: { time: number; measureNum: number; x: number; isFinalBar?: boolean }[] = [];
  const maxTime = currentTime + windowAhead;

  for (let m = 0; m <= totalMeasures; m++) {
    const time = 1.2 + m * secPerMeasure;
    if (time > maxTime) break;
    if (time >= currentTime - windowBehind) {
      const x = clefZoneWidth + ((time - (currentTime - windowBehind)) / totalWindowSec) * usableWidth;
      measureBars.push({
        time,
        measureNum: m + 1,
        x,
        isFinalBar: m === totalMeasures,
      });
    }
  }

  const visibleNotes = notes.filter(
    (n) =>
      n.startTime + n.duration >= currentTime - windowBehind &&
      n.startTime <= currentTime + windowAhead
  );

  const bgFill = isLight ? '#FFFFFF' : '#1B1C1F';
  const clefBoxFill = isLight ? '#FAFAFA' : '#222326';
  const staffLineColor = isLight ? '#A1A1AA' : '#52525B';
  const barLineColor = isLight ? '#D4D4D8' : '#3F3F46';
  const endTime = notes.length ? Math.max(...notes.map(note => note.startTime + note.duration)) : song.durationSeconds;
  const clampTime = (seconds: number) => Math.max(0, Math.min(endTime, seconds));

  const beginSeek = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!onSeek || event.button !== 0 || !event.isPrimary || gestureRef.current) return;
    const transform = event.currentTarget.getScreenCTM();
    if (!transform) return;
    const inverse = transform.inverse();
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(inverse);
    if (point.x < clefZoneWidth || point.x > svgWidth || point.y < 0 || point.y > svgHeight) return;
    const secondsPerUnit = totalWindowSec / usableWidth;
    let clickTime = currentTime - windowBehind + (point.x - clefZoneWidth) * secondsPerUnit;
    const nearbyNote = visibleNotes.reduce<SongNote | undefined>((closest, note) =>
      Math.abs(note.startTime - clickTime) < Math.abs((closest?.startTime ?? Infinity) - clickTime) ? note : closest, undefined);
    if (nearbyNote && Math.abs(nearbyNote.startTime - clickTime) / secondsPerUnit < 8) clickTime = nearbyNote.startTime;
    gestureRef.current = { pointerId: event.pointerId, clientX: event.clientX, originX: point.x, originTime: currentTime, clickTime: clampTime(clickTime), previewTime: currentTime, secondsPerUnit, inverse, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveSeek = (event: React.PointerEvent<SVGSVGElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (Math.abs(event.clientX - gesture.clientX) > 5) gesture.moved = true;
    if (!gesture.moved) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(gesture.inverse);
    gesture.previewTime = clampTime(gesture.originTime - (point.x - gesture.originX) * gesture.secondsPerUnit);
    setIsDragging(true);
    onSeek?.(gesture.previewTime, false);
  };

  const finishSeek = (event: React.PointerEvent<SVGSVGElement>, cancelled = false) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (cancelled && !gesture.moved) return;
    onSeek?.(cancelled ? gesture.previewTime : gesture.moved ? gesture.previewTime : gesture.clickTime, !cancelled);
  };

  return (
    <div
      ref={containerRef}
      className={`sheet-music relative w-full border-b select-none overflow-hidden flex flex-col ${
        expanded ? 'flex-1 min-h-[240px]' : ''
      } ${
        isLight
          ? 'bg-slate-50 border-slate-200'
          : 'bg-[#0E1525] border-slate-800/90'
      }`}
    >
      <div
        className={`flex items-center justify-between px-4 py-1.5 border-b text-xs ${
          isLight
            ? 'border-slate-200 text-slate-600'
            : 'border-slate-800/60 text-slate-400'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`font-medium ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
            {t.grandStaffTitle}
          </span>
          <span aria-hidden="true">·</span>
          <span>{song.keySignature}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            {song.timeSignature[0]}/{song.timeSignature[1]} {t.meterSuffix}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className={isLight ? 'text-sky-700 font-semibold' : 'text-sky-400 font-medium'}>
            {t.trebleLegend}
          </span>
          <span aria-hidden="true" className={isLight ? 'text-slate-300' : 'text-slate-600'}>
            ·
          </span>
          <span className={isLight ? 'text-amber-700 font-semibold' : 'text-amber-400 font-medium'}>
            {t.bassLegend}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className={`sheet-navigation-surface w-full block ${expanded ? 'flex-1 min-h-[210px]' : 'h-[126px]'}`}
        style={onSeek ? { touchAction: 'pan-y', cursor: isDragging ? 'grabbing' : 'grab' } : undefined}
        preserveAspectRatio="xMinYMid meet"
        aria-label={lang === 'hu' ? 'Kotta' : 'Sheet music staff'}
        onPointerDown={beginSeek}
        onPointerMove={moveSeek}
        onPointerUp={event => finishSeek(event)}
        onPointerCancel={event => finishSeek(event, true)}
        onLostPointerCapture={event => finishSeek(event, true)}
      >
        <rect x={0} y={0} width={svgWidth} height={svgHeight} fill={bgFill} />

        {/* Treble Staff 5 horizontal lines */}
        {trebleLineSteps.map((step) => {
          const y = stepToY(step, 'right');
          return (
            <line
              key={`treble-${step}`}
              x1={16}
              y1={y}
              x2={svgWidth}
              y2={y}
              stroke={staffLineColor}
              strokeWidth={1}
            />
          );
        })}

        {/* Bass Staff 5 horizontal lines */}
        {bassLineSteps.map((step) => {
          const y = stepToY(step, 'left');
          return (
            <line
              key={`bass-${step}`}
              x1={16}
              y1={y}
              x2={svgWidth}
              y2={y}
              stroke={staffLineColor}
              strokeWidth={1}
            />
          );
        })}

        {/* Measure Bar Lines & Final Double Barline */}
        {measureBars.map((mb) => (
          <g key={`bar-${mb.measureNum}`}>
            <line
              x1={mb.x}
              y1={stepToY(10, 'right')}
              x2={mb.x}
              y2={stepToY(-10, 'left')}
              stroke={mb.isFinalBar ? staffLineColor : barLineColor}
              strokeWidth={mb.isFinalBar ? 1.5 : 1.2}
            />
            {mb.isFinalBar ? (
              <line
                x1={mb.x + 4}
                y1={stepToY(10, 'right')}
                x2={mb.x + 4}
                y2={stepToY(-10, 'left')}
                stroke={staffLineColor}
                strokeWidth={3}
              />
            ) : (
              <text
                x={mb.x + 4}
                y={stepToY(10, 'right') - 4}
                fill="#64748B"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
              >
                M{mb.measureNum}
              </text>
            )}
          </g>
        ))}

        {/* Playhead Vertical Sync Line */}
        <line
          x1={playheadX}
          y1={8}
          x2={playheadX}
          y2={svgHeight - 8}
          stroke={isLight ? '#228461' : '#87D9BA'}
          strokeWidth={2}
          strokeDasharray="3 2"
        />
        <polygon
          points={`${playheadX - 5},6 ${playheadX + 5},6 ${playheadX},13`}
          fill={isLight ? '#228461' : '#87D9BA'}
        />

        {/* Note Heads, Stems, Ledger Lines & Finger Numbers */}
        {visibleNotes.map((note) => {
          const x =
            clefZoneWidth +
            ((note.startTime - (currentTime - windowBehind)) / totalWindowSec) * usableWidth;
          const { diatonicStep, isSharp } = midiToDiatonicStepFromC4(note.midi);
          const y = stepToY(diatonicStep, note.hand);

          const isTargetHand =
            handSelection === 'both' || handSelection === note.hand;
          const isHit = note.status === 'hit';
          const isMissed = note.status === 'missed';
          const isActiveNow =
            currentTime >= note.startTime - 0.08 &&
            currentTime <= note.startTime + note.duration;

          let fill =
            note.hand === 'right'
              ? isLight
                ? '#228461'
                : '#87D9BA'
              : isLight
              ? '#D97706'
              : '#F59E0B';
          if (!isTargetHand) fill = '#64748B';
          if (isHit) fill = '#059669';
          if (isMissed) fill = '#DC2626';

          const needsLedgerLine =
            diatonicStep === 0 || diatonicStep >= 12 || diatonicStep <= -12;

          return (
            <g key={note.id} opacity={isTargetHand ? 1 : 0.45}>
              <rect
                x={x}
                y={y - 2}
                width={Math.max(8, (note.duration / totalWindowSec) * usableWidth * 0.85)}
                height={4}
                rx={2}
                fill={fill}
                fillOpacity={0.28}
              />

              {needsLedgerLine && (
                <line
                  x1={x - 9}
                  y1={y}
                  x2={x + 9}
                  y2={y}
                  stroke={isLight ? '#475569' : '#94A3B8'}
                  strokeWidth={1.4}
                />
              )}

              <line
                x1={note.hand === 'right' ? x + 4.5 : x - 4.5}
                y1={y}
                x2={note.hand === 'right' ? x + 4.5 : x - 4.5}
                y2={note.hand === 'right' ? y - 20 : y + 20}
                stroke={fill}
                strokeWidth={1.6}
              />

              {isSharp && (
                <text
                  x={x - 14}
                  y={y + 3.5}
                  fill={fill}
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="Plus Jakarta Sans, sans-serif"
                >
                  ♯
                </text>
              )}

              <ellipse
                cx={x}
                cy={y}
                rx={5.5}
                ry={4.1}
                transform={`rotate(-18 ${x} ${y})`}
                fill={fill}
                stroke={isActiveNow ? (isLight ? '#0F172A' : '#FFFFFF') : 'none'}
                strokeWidth={isActiveNow ? 1.8 : 0}
              />

              <text
                x={x - 6}
                y={note.hand === 'right' ? y - 24 : y + 30}
                fill={
                  isActiveNow
                    ? isLight
                      ? '#0F172A'
                      : '#F8FAFC'
                    : isLight
                    ? '#475569'
                    : '#94A3B8'
                }
                fontSize="9.5"
                fontWeight="600"
                fontFamily="JetBrains Mono, monospace"
              >
                {midiToNoteName(note.midi)}
                {note.finger ? `(${note.finger})` : ''}
              </text>
            </g>
          );
        })}

        {/* Left Fixed Clef Header Box */}
        <rect x={0} y={0} width={clefZoneWidth} height={svgHeight} fill={clefBoxFill} />
        <line
          x1={clefZoneWidth}
          y1={10}
          x2={clefZoneWidth}
          y2={svgHeight - 10}
          stroke={staffLineColor}
          strokeWidth={1.5}
        />

        {/* Treble & Bass Clef Symbols */}
        <text
          x={18}
          y={stepToY(4, 'right') + 10}
          fill={isLight ? '#228461' : '#87D9BA'}
          fontSize="34"
          fontFamily="serif"
        >
          𝄞
        </text>
        <text
          x={18}
          y={stepToY(-4, 'left') + 10}
          fill={isLight ? '#D97706' : '#F59E0B'}
          fontSize="27"
          fontFamily="serif"
        >
          𝄢
        </text>

        <text
          x={56}
          y={stepToY(7, 'right') + 3}
          fill={isLight ? '#334155' : '#CBD5E1'}
          fontSize="13"
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
        >
          {song.timeSignature[0]}
        </text>
        <text
          x={56}
          y={stepToY(3, 'right') + 4}
          fill={isLight ? '#334155' : '#CBD5E1'}
          fontSize="13"
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
        >
          {song.timeSignature[1]}
        </text>

        <text
          x={56}
          y={stepToY(-3, 'left') + 3}
          fill={isLight ? '#334155' : '#CBD5E1'}
          fontSize="13"
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
        >
          {song.timeSignature[0]}
        </text>
        <text
          x={56}
          y={stepToY(-7, 'left') + 4}
          fill={isLight ? '#334155' : '#CBD5E1'}
          fontSize="13"
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
        >
          {song.timeSignature[1]}
        </text>
      </svg>

      <div
        className={`pointer-events-none absolute bottom-0 text-[10px] font-mono px-1.5 py-0.5 border rounded-t ${
          isLight
            ? 'text-sky-700 bg-white/95 border-sky-500/40'
            : 'text-sky-400 bg-[#0B0F17]/90 border-sky-500/30'
        }`}
        style={{ left: `calc(${playheadXPercent}% + 42px)` }}
      >
        {t.nowMarker}
      </div>
    </div>
  );
};
