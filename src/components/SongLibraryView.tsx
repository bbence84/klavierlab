import React, { useRef, useState } from 'react';
import { PlayerProfile, Song } from '../types/music';
import { getHandArrangementLabel, Language, ThemeMode } from '../utils/i18n';
import { parseScoreFile, SCORE_FILE_ACCEPT } from '../utils/scoreFileParser';
import { Pencil, Play, Search, Trash2, Upload } from 'lucide-react';

interface SongLibraryViewProps {
  songs: Song[];
  selectedSongId: string;
  profile: PlayerProfile;
  lang: Language;
  theme: ThemeMode;
  onSelectSongAndPractice: (song: Song) => void;
  onRequestNameUploadedSong: (song: Song, isExistingRename?: boolean) => void;
  onDeleteCustomSong: (songId: string) => void;
}

type LibraryFilter =
  | 'all'
  | 'single-hand'
  | 'alternating'
  | 'level-1'
  | 'level-2-3'
  | 'level-4-5'
  | 'custom';

export const SongLibraryView: React.FC<SongLibraryViewProps> = ({
  songs,
  selectedSongId,
  profile,
  lang,
  theme,
  onSelectSongAndPractice,
  onRequestNameUploadedSong,
  onDeleteCustomSong,
}) => {
  const [activeFilter, setActiveFilter] = useState<LibraryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isHu = lang === 'hu';
  const isLight = theme === 'light';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedSong = await parseScoreFile(file);
      setUploadStatus(null);
      onRequestNameUploadedSong(parsedSong, false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadStatus({
        type: 'error',
        message: isHu
          ? `Nem sikerült beolvasni a kottát: ${msg}`
          : `Could not import score: ${msg}`,
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const safeSongs = Array.isArray(songs) ? songs : [];

  const filteredSongs = safeSongs.filter((song) => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (query && ![song.title, song.titleHu, song.composer, song.composerHu].some(value => value?.toLocaleLowerCase().includes(query))) return false;
    const arrangement = song.handArrangement || 'two-hands';
    switch (activeFilter) {
      case 'single-hand':
        return arrangement === 'right-only' || arrangement === 'left-only';
      case 'alternating':
        return arrangement === 'alternating-hands';
      case 'level-1':
        return song.level === 1;
      case 'level-2-3':
        return song.level === 2 || song.level === 3;
      case 'level-4-5':
        return song.level >= 4;
      case 'custom':
        return Boolean(song.isCustomMidi || song.importFormat === 'musicxml');
      case 'all':
      default:
        return true;
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header & Custom MIDI Upload Bar */}
      <div
        className={`flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b pb-6 ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}
      >
        <div className="space-y-1.5">
          <h1
            className={`text-2xl sm:text-3xl font-bold tracking-tight ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            {isHu ? 'Kottatár' : 'Your library'}
          </h1>
        </div>

        {/* Score Upload */}
        <div className="flex items-center gap-3 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept={SCORE_FILE_ACCEPT}
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            title="MIDI / MusicXML (.mid, .midi, .musicxml, .xml, .mxl)"
            className="max-w-full min-w-0 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 whitespace-normal text-left cursor-pointer"
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span>{isHu ? 'Kotta feltöltése' : 'Import score'} <span className="font-normal">(.mid, .midi, .musicxml, .xml, .mxl)</span></span>
          </button>
        </div>
      </div>

      {/* Upload Status Banner */}
      {uploadStatus && (
        <div
          role="alert"
          className={`px-4 py-3 rounded-lg border text-xs flex items-center justify-between ${
            uploadStatus.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-100'
              : 'bg-red-950/80 border-red-500/50 text-red-100'
          }`}
        >
          <span>
            <strong className="font-semibold font-mono mr-2">
              {uploadStatus.type === 'success' ? '● MIDI:' : '✕ ERROR:'}
            </strong>
            {uploadStatus.message}
          </span>
          <button
            onClick={() => setUploadStatus(null)}
            className="text-xs underline ml-4 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isHu ? 'Bezárás' : 'Dismiss'}
          </button>
        </div>
      )}

      {/* Interactive Filter Segmented Controls */}
      <div className="library-heading">
        <label className="library-search">
          <Search aria-hidden="true" />
          <input type="search" aria-label={isHu ? 'Keresés a kottatárban' : 'Search library'} placeholder={isHu ? 'Cím vagy szerző keresése' : 'Search title or composer'} value={searchQuery} onChange={event => setSearchQuery(event.target.value)} />
        </label>
      </div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div
          className={`library-filters flex items-center gap-1 p-1 border rounded-lg overflow-x-auto ${
            isLight
              ? 'bg-slate-100 border-slate-200'
              : 'bg-[#111827] border-slate-800'
          }`}
        >
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isHu ? `Összes darab (${safeSongs.length})` : `All Repertoire (${safeSongs.length})`}
          </button>
          <button
            onClick={() => setActiveFilter('single-hand')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeFilter === 'single-hand'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isHu ? 'Csak egy kéz' : 'One Hand Only'}
          </button>
          <button
            onClick={() => setActiveFilter('alternating')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeFilter === 'alternating'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isHu ? 'Váltott kéz (egyszerre egy)' : 'Alternating Hands'}
          </button>
          <button
            onClick={() => setActiveFilter('level-1')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeFilter === 'level-1'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isHu ? '1. Szint · Kezdő' : 'Level 1 · Beginner'}
          </button>
          <button
            onClick={() => setActiveFilter('level-2-3')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeFilter === 'level-2-3'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isHu ? '2–3. Szint · Kétkezes' : 'Level 2–3 · Two-Hand'}
          </button>
          <button
            onClick={() => setActiveFilter('level-4-5')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeFilter === 'level-4-5'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isHu ? '4–5. Szint · Haladó' : 'Level 4–5 · Advanced'}
          </button>
          <button
            onClick={() => setActiveFilter('custom')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeFilter === 'custom'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isHu ? 'Feltöltött kották' : 'Uploaded scores'}
          </button>
        </div>

        <div
          className={`text-xs font-mono tabular-nums ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          {isHu
            ? `${filteredSongs.length} / ${safeSongs.length} kotta megjelenítve`
            : `Showing ${filteredSongs.length} of ${safeSongs.length} scores`}
        </div>
      </div>

      {/* Song Grid (Clean Unboxed Metadata with Middot Separators) */}
      {filteredSongs.length === 0 && <p className="library-empty">{isHu ? 'Nincs találat.' : 'No matching pieces.'}</p>}
      <div className="library-list">
        {filteredSongs.map((song) => {
          const isCurrent = song.id === selectedSongId;
          const bestAcc = profile?.bestAccuracyBySong?.[song.id];
          const songNotes = Array.isArray(song.notes) ? song.notes : [];
          const rightCount = songNotes.filter((n) => n.hand === 'right').length;
          const leftCount = songNotes.filter((n) => n.hand === 'left').length;
          const arrangement = song.handArrangement || 'two-hands';
          const timeSigNum = song.timeSignature?.[0] ?? 4;
          const timeSigDen = song.timeSignature?.[1] ?? 4;

          const displayTitle = isHu && song.titleHu ? song.titleHu : song.title;
          const displayComposer = isHu && song.composerHu ? song.composerHu : song.composer;
          const displayDesc = isHu && song.descriptionHu ? song.descriptionHu : song.description;
          const displaySkill = isHu && song.focusSkillHu ? song.focusSkillHu : song.focusSkill;

          return (
            <div
              key={song.id}
              className={`library-song border rounded-xl p-6 flex flex-col justify-between transition-colors ${
                isLight
                  ? isCurrent
                    ? 'bg-white border-sky-500 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                  : isCurrent
                  ? 'bg-[#111827] border-sky-500/80'
                  : 'bg-[#111827] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                {/* Quiet 1-line unboxed metadata kicker */}
                <div
                  className={`flex items-center justify-between gap-2 text-xs ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`font-semibold ${
                        isLight ? 'text-sky-700' : 'text-sky-400'
                      }`}
                    >
                      {isHu ? `${song.level}. Szint` : `Level ${song.level}`}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`font-medium ${
                        isLight ? 'text-amber-700' : 'text-amber-300'
                      }`}
                    >
                      {getHandArrangementLabel(arrangement, lang)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{displayComposer}</span>
                  </div>

                  {bestAcc !== undefined && (
                    <span
                      className={`font-mono tabular-nums font-semibold ${
                        isLight ? 'text-emerald-700' : 'text-emerald-400'
                      }`}
                    >
                      {isHu ? `Legjobb: ${bestAcc}%` : `Best: ${bestAcc}%`}
                    </span>
                  )}
                </div>

                {/* Primary Song Title */}
                <h2
                  className={`text-lg font-bold leading-snug ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  {displayTitle}
                </h2>

                <details className="library-details">
                  <summary>{isHu ? 'Részletek' : 'Details'}</summary>
                  <div>
                    <p>{displayDesc}</p>
                    <p>{song.bpm} BPM · {timeSigNum}/{timeSigDen} · {song.keySignature} · {songNotes.length} {isHu ? 'hang' : 'notes'}</p>
                    <p>{displaySkill}</p>
                  </div>
                </details>
              </div>

              <div
                className={`mt-6 pt-4 border-t space-y-4 ${
                  isLight ? 'border-slate-200' : 'border-slate-800/80'
                }`}
              >
                {/* Technical Score Metadata with Middot Separators */}
                <div
                  className={`flex items-center justify-between text-xs font-mono tabular-nums flex-wrap gap-2 ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{song.bpm} BPM</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {timeSigNum}/{timeSigDen}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{song.keySignature}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {rightCount > 0 && leftCount > 0
                        ? `JK ${rightCount} / BK ${leftCount}`
                        : rightCount > 0
                        ? `${rightCount} ${isHu ? 'hang' : 'notes'}`
                        : `${leftCount} ${isHu ? 'hang' : 'notes'}`}
                    </span>
                  </div>
                  <span className={`font-sans ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    {displaySkill}
                  </span>
                </div>

                {/* Action Row */}
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => onSelectSongAndPractice(song)}
                    aria-label={`${isHu ? 'Gyakorlás' : 'Practice'}: ${displayTitle}`}
                    title={isHu ? 'Gyakorlás' : 'Practice'}
                    className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span className="sr-only">
                      {isCurrent
                        ? isHu
                          ? 'Folytatás a Gyakorló Stúdióban'
                          : 'Resume in Practice Studio'
                        : isHu
                        ? 'Megnyitás a Gyakorló Stúdióban'
                        : 'Open in Practice Studio'}
                    </span>
                  </button>

                  {(song.isCustomMidi || song.importFormat === 'musicxml') && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onRequestNameUploadedSong(song, true)}
                        aria-label={isHu ? 'Átnevezés' : 'Rename'}
                        title={isHu ? 'Átnevezés' : 'Rename'}
                        className={`px-3 py-2 text-xs rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                          isLight
                            ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
                        }`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteCustomSong(song.id)}
                        aria-label={isHu ? 'Törlés' : 'Remove'}
                        title={isHu ? 'Törlés' : 'Remove'}
                        className="px-3 py-2 text-xs text-red-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
