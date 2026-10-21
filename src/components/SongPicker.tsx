import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Folder, FolderOpen, Music2, Search, X } from 'lucide-react';
import { Song } from '../types/music';
import { getHandArrangementLabel, getLevelTitle, Language } from '../utils/i18n';

interface SongPickerProps {
  songs: Song[];
  selectedSong: Song;
  lang: Language;
  onSelectSong: (song: Song) => void;
}

export function SongPicker({ songs, selectedSong, lang, onSelectSong }: SongPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const pickerId = useId();
  const isHu = lang === 'hu';
  const displayTitle = (song: Song) => isHu && song.titleHu ? song.titleHu : song.title;
  const displayComposer = (song: Song) => isHu && song.composerHu ? song.composerHu : song.composer;
  const uploaded = (song: Song) => Boolean(song.isCustomMidi || song.importFormat === 'musicxml');
  const isChordSong = (song: Song) => song.category === 'Chords';
  const searchText = query.trim().toLocaleLowerCase();
  const matches = (song: Song) => [song.title, song.titleHu, song.composer, song.composerHu, `Level ${song.level}`, `${song.level}. szint`]
    .some(value => value?.toLocaleLowerCase().includes(searchText));
  const groups = [
    ...[1, 2, 3, 4, 5].map(level => ({ id: `level-${level}`, name: getLevelTitle(level, lang), songs: songs.filter(song => !uploaded(song) && !isChordSong(song) && song.level === level) })),
    { id: 'chords', name: isHu ? 'Akkordok' : 'Chords', songs: songs.filter(song => !uploaded(song) && isChordSong(song)).sort((first, second) => first.level - second.level || displayTitle(first).localeCompare(displayTitle(second), lang)) },
    { id: 'uploaded', name: isHu ? 'Feltöltött kották' : 'Uploaded', songs: songs.filter(uploaded).sort((first, second) => first.level - second.level || displayTitle(first).localeCompare(displayTitle(second), lang)) },
  ];
  const matchingGroups = groups.map(group => ({ ...group, songs: group.songs.filter(matches) }));
  const resultCount = matchingGroups.reduce((total, group) => total + group.songs.length, 0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      searchRef.current?.focus();
    } else if (!open && dialog.open) dialog.close();
  }, [open]);

  const navigateSongs = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('[data-picker-song]') || []).filter(button => button.getClientRects().length > 0);
    if (!buttons.length) return;
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    const next = index < 0 ? event.key === 'ArrowDown' ? 0 : buttons.length - 1
      : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    event.preventDefault();
    buttons[next].focus();
  };

  return (
    <div className="song-picker">
      <button
        className="song-picker-trigger"
        aria-label={isHu ? 'Darabválasztó' : 'Choose piece'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={pickerId}
        data-song-id={selectedSong.id}
        title={displayTitle(selectedSong)}
        onClick={() => {
          const activeFolder = uploaded(selectedSong) ? 'uploaded' : isChordSong(selectedSong) ? 'chords' : `level-${selectedSong.level}`;
          setCollapsed(new Set(groups.filter(group => group.id !== activeFolder).map(group => group.id)));
          setQuery('');
          setOpen(true);
        }}
      >
        <span>{displayTitle(selectedSong)}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      <dialog
        ref={dialogRef}
        id={pickerId}
        className="song-picker-dialog"
        aria-labelledby={`${pickerId}-heading`}
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
        onKeyDown={event => { event.stopPropagation(); navigateSongs(event); }}
        onClick={event => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setOpen(false);
        }}
      >
        <div className="song-picker-header">
          <Music2 aria-hidden="true" />
          <h2 id={`${pickerId}-heading`}>{isHu ? 'Darabválasztó' : 'Choose a piece'}</h2>
          <button onClick={() => setOpen(false)} aria-label={isHu ? 'Bezárás' : 'Close song picker'} title={isHu ? 'Bezárás' : 'Close song picker'}><X aria-hidden="true" /></button>
        </div>
        <label className="song-picker-search">
          <Search aria-hidden="true" />
          <input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)} aria-label={isHu ? 'Darabok keresése' : 'Search pieces'} placeholder={isHu ? 'Cím, szerző vagy szint' : 'Title, composer or level'} />
        </label>
        <div className="song-picker-results">
          {resultCount === 0 && <p className="song-picker-empty" role="status">{isHu ? 'Nincs találat.' : 'No matching pieces.'}</p>}
          {matchingGroups.filter(group => !searchText || group.songs.length).map(group => {
            const expanded = Boolean(searchText) || !collapsed.has(group.id);
            const GroupIcon = expanded ? FolderOpen : Folder;
            return (
              <section key={group.id} className="song-picker-folder" data-song-folder={group.id}>
                <button className="song-picker-folder-toggle" disabled={Boolean(searchText)} aria-expanded={expanded} aria-controls={`${pickerId}-${group.id}`} onClick={() => {
                  setCollapsed(previous => {
                    const next = new Set(previous);
                    if (next.has(group.id)) next.delete(group.id);
                    else next.add(group.id);
                    return next;
                  });
                }}>
                  <GroupIcon aria-hidden="true" />
                  <span>{group.name}</span>
                  <span className="song-picker-count">{group.songs.length}</span>
                  <ChevronDown aria-hidden="true" className={expanded ? '' : '-rotate-90'} />
                </button>
                <ul id={`${pickerId}-${group.id}`} hidden={!expanded}>
                  {group.songs.length === 0 && !searchText && <li className="song-picker-empty">{isHu ? 'Még nincs kotta ebben a mappában.' : 'No pieces in this folder yet.'}</li>}
                  {group.songs.map(song => (
                    <li key={song.id}>
                      <button className="song-picker-song" data-picker-song={song.id} aria-label={displayTitle(song)} aria-current={song.id === selectedSong.id ? 'true' : undefined} onClick={() => {
                        setOpen(false);
                        onSelectSong(song);
                      }}>
                        <Music2 aria-hidden="true" />
                        <span className="song-picker-song-copy">
                          <span>{displayTitle(song)}</span>
                          <span>{displayComposer(song)}{displayComposer(song) ? ' · ' : ''}{song.bpm} BPM · {isHu ? `${song.level}. szint` : `Level ${song.level}`} · {getHandArrangementLabel(song.handArrangement, lang)}</span>
                        </span>
                        {song.id === selectedSong.id && <Check aria-hidden="true" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
        <div className="song-picker-footer">{resultCount} {isHu ? 'darab' : 'pieces'}</div>
      </dialog>
    </div>
  );
}