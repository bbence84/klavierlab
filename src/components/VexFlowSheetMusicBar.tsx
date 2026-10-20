import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HandSelection, Song, SongNote } from '../types/music';
import { Language, ThemeMode, UI_TEXT } from '../utils/i18n';
import { buildNotationEvents, NOTATION_HEADER, NOTATION_HEIGHT, renderVexFlow } from '../utils/vexflowNotation';

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

export function SheetMusicBar({ song, notes, currentTime, handSelection, lang, theme, expanded = false, onSeek }: SheetMusicBarProps) {
  const t = UI_TEXT[lang];
  const containerRef = useRef<HTMLDivElement | null>(null);
  const notationRef = useRef<SVGGElement | null>(null);
  const [width, setWidth] = useState(1000);
  const [fontsReady, setFontsReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const gestureRef = useRef<{ pointerId: number; clientX: number; originX: number; originTime: number; clickTime: number; previewTime: number; secondsPerUnit: number; inverse: DOMMatrix; moved: boolean } | null>(null);
  const windowBehind = Math.min(1.1, width / 780);
  const windowAhead = Math.max(2.2, Math.min(5.4, (width - NOTATION_HEADER) / 160));
  const secondsPerUnit = (windowBehind + windowAhead) / (width - NOTATION_HEADER);
  const playheadX = NOTATION_HEADER + windowBehind / secondsPerUnit;
  const secondsPerBar = 60 / song.bpm * song.timeSignature[0] * 4 / song.timeSignature[1];
  const windowOrigin = Math.floor(currentTime / secondsPerBar) * secondsPerBar - secondsPerBar;
  const endTime = notes.length ? Math.max(...notes.map(note => note.startTime + note.duration)) : song.durationSeconds;
  const notationEvents = useMemo(() => buildNotationEvents({ ...song, notes }), [song, notes]);

  useEffect(() => {
    let active = true;
    void Promise.all([document.fonts.load('40px Bravura'), document.fonts.load('12px Academico')]).then(() => { if (active) setFontsReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(320, entries[0].contentRect.width)));
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!notationRef.current || !fontsReady || !notes.length) return;
    renderVexFlow(notationRef.current, { song, events: notationEvents, width, origin: windowOrigin, secondsPerUnit,
      start: Math.max(0, windowOrigin), end: windowOrigin + secondsPerBar * 2 + windowAhead,
      handSelection, light: theme === 'light' });
  }, [song, notationEvents, notes.length, width, windowOrigin, secondsPerUnit, secondsPerBar, windowAhead, handSelection, theme, fontsReady]);

  useEffect(() => {
    const timeline = notationRef.current?.querySelector<SVGGElement>('.notation-timeline');
    timeline?.setAttribute('transform', `translate(${(windowOrigin - currentTime + windowBehind) / secondsPerUnit}, 0)`);
    notationRef.current?.querySelectorAll<SVGGElement>('.notation-event').forEach(group => {
      const active = group.dataset.rest !== 'true' && currentTime >= Number(group.dataset.time) && currentTime < Number(group.dataset.end);
      group.setAttribute('data-active', String(active));
    });
  }, [currentTime, windowOrigin, secondsPerUnit, windowBehind, notationEvents, width, theme, handSelection, fontsReady]);

  const clampTime = (seconds: number) => Math.max(0, Math.min(endTime, seconds));
  const beginSeek = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!onSeek || event.button !== 0 || !event.isPrimary || gestureRef.current) return;
    const transform = event.currentTarget.getScreenCTM();
    if (!transform) return;
    const inverse = transform.inverse();
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(inverse);
    if (point.x < NOTATION_HEADER || point.x > width || point.y < 0 || point.y > NOTATION_HEIGHT) return;
    let clickTime = currentTime - windowBehind + (point.x - NOTATION_HEADER) * secondsPerUnit;
    const target = event.target instanceof Element ? event.target.closest<SVGGElement>('.notation-event') : null;
    if (target?.dataset.rest === 'false') clickTime = Number(target.dataset.time);
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
    <div ref={containerRef} className={`sheet-music vexflow-sheet flex flex-col relative overflow-hidden border-b ${expanded ? 'sheet-expanded flex-1 min-h-[300px]' : ''} ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
      <div className="flex items-center justify-between px-4 py-1.5 border-b text-xs border-slate-500/20 text-slate-500">
        <div className="flex items-center gap-2">
          <span>{t.grandStaffTitle}</span><span aria-hidden="true">·</span><span>{song.keySignature}</span>
          <span aria-hidden="true">·</span><span>{song.timeSignature[0]}/{song.timeSignature[1]} {t.meterSuffix}</span>
        </div>
        <div className="flex gap-4"><span>{t.trebleLegend}</span><span>{t.bassLegend}</span></div>
      </div>
      <svg viewBox={`0 0 ${width} ${NOTATION_HEIGHT}`} data-content-start={NOTATION_HEADER} data-renderer="vexflow" className={`sheet-navigation-surface w-full block ${expanded ? 'flex-1 min-h-[280px]' : 'h-[280px]'}`}
        preserveAspectRatio="xMinYMid meet" aria-label={lang === 'hu' ? 'Kotta' : 'Sheet music staff'}
        style={onSeek ? { touchAction: 'pan-y', cursor: isDragging ? 'grabbing' : 'grab' } : undefined}
        onPointerDown={beginSeek} onPointerMove={moveSeek} onPointerUp={event => finishSeek(event)} onPointerCancel={event => finishSeek(event, true)} onLostPointerCapture={event => finishSeek(event, true)}>
        <rect width={width} height={NOTATION_HEIGHT} fill={theme === 'light' ? '#ffffff' : '#1b1c1f'} />
        <g ref={notationRef} />
        <line x1={playheadX} x2={playheadX} y1={35} y2={260} stroke={theme === 'light' ? '#228461' : '#87d9ba'} strokeWidth={2} strokeDasharray="3 3" />
      </svg>
    </div>
  );
}