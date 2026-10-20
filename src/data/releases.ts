import packageInfo from '../../package.json' with { type: 'json' };
import { Language } from '../utils/i18n';

export const APP_VERSION = packageInfo.version;

type LocalizedText = Record<Language, string>;
type ChangeKind = 'added' | 'fixed' | 'changed';

interface Release {
  version: string;
  date: string;
  reconstructed: boolean;
  title: LocalizedText;
  changes: { kind: ChangeKind; text: LocalizedText }[];
}

export const CHANGE_LABELS: Record<ChangeKind, LocalizedText> = {
  added: { en: 'Added', hu: 'Új' },
  fixed: { en: 'Fixed', hu: 'Javítva' },
  changed: { en: 'Changed', hu: 'Módosítva' },
};

export const RELEASES: Release[] = [
  {
    version: '0.12.2', date: '2026-10-20', reconstructed: false,
    title: { en: 'Smoother playback on tablets', hu: 'Gördülékenyebb lejátszás táblagépeken' },
    changes: [
      { kind: 'fixed', text: { en: 'Playback (Demo and practice modes) is much smoother and audio no longer lags on tablets and lower-powered devices. The falling-notes animation now runs independently of React, so the main thread is no longer overloaded and the sound stays in sync.', hu: 'A lejátszás (Demó és gyakorló módok) sokkal gördülékenyebb, és a hang már nem akadozik táblagépeken és gyengébb eszközökön. A lehulló hangjegyek animációja mostantól a Reacttől függetlenül fut, így a fő szál nem terhelődik túl, és a hang szinkronban marad.' } },
      { kind: 'changed', text: { en: 'The practice screen now updates React state about 15 times per second instead of on every frame, while the note animation keeps the full display refresh rate — cutting CPU work during playback by up to ~10× on high-refresh tablets.', hu: 'A gyakorló képernyő mostantól másodpercenként kb. 15-ször frissíti a React állapotot minden képkocka helyett, miközben a hangjegyanimáció a teljes képfrissítési frekvencián fut — ez a lejátszás alatti CPU-terhelést akár ~10-szeresére csökkenti a magas képfrissítésű táblagépeken.' } },
    ],
  },
  {
    version: '0.12.1', date: '2026-10-20', reconstructed: false,
    title: { en: 'Notation layout fixes', hu: 'Kotta elrendezési javítások' },
    changes: [
      { kind: 'fixed', text: { en: 'The piano keyboard is no longer pushed below the fold — the practice workspace now fits the viewport with the taller VexFlow staff.', hu: 'A zongorabillentyűzet már nem csúszik a képernyő alá — a gyakorlófelület a magasabb VexFlow kottával együtt is elfér a nézetben.' } },
      { kind: 'fixed', text: { en: 'High treble notes with long stems and fingering, and low bass notes, are no longer clipped at the top or bottom of the staff.', hu: 'A hosszú szárú, ujjrendes magas violinkulcsos hangok és a mély basszushangok már nem vágódnak le a kotta tetején vagy alján.' } },
      { kind: 'fixed', text: { en: 'Notes near the right edge now always have staff lines beneath them; the staff extends under every engraved note.', hu: 'A jobb szélhez közeli hangok alatt már mindig van vonalrendszer; a kotta minden lejegyzett hang alá kiterjed.' } },
      { kind: 'fixed', text: { en: 'The practice workspace now fits the viewport on tablets and short landscape screens (e.g. iPad, Android tablets) — the chrome and grand staff compact so the keyboard stays visible without scrolling.', hu: 'A gyakorlófelület mostantól táblagépeken és alacsony, fekvő képernyőkön is elfér a nézetben (pl. iPad, Android táblagépek) — a fejléc és a kotta összehúzódik, így a billentyűzet görgetés nélkül látható marad.' } },
    ],
  },
  {
    version: '0.12.0', date: '2026-10-20', reconstructed: false,
    title: { en: 'VexFlow notation & sampled piano by default', hu: 'VexFlow kotta és alapértelmezett mintavételezett zongora' },
    changes: [
      { kind: 'changed', text: { en: 'VexFlow engraves the scrolling grand staff, including chords, rests, accidentals, beams, and available fingering. Playback highlighting, seeking, and touch dragging remain supported.', hu: 'A gördülő zongorakottát a VexFlow rajzolja, akkordokkal, szünetekkel, módosítójelekkel, gerendákkal és elérhető ujjrenddel. A lejátszás kiemelése, a pozícióváltás és az érintéses húzás megmaradt.' } },
      { kind: 'changed', text: { en: 'Sampled grand piano is the default for new or unset preferences. Saved sound choices are preserved. Samples load in the background, are cached when supported, and fall back to the original synth while loading or after failure.', hu: 'Új vagy még nem beállított profilnál a mintavételezett zongora az alapértelmezett. A mentett hangválasztás megmarad. A minták a háttérben töltődnek, támogatott böngészőben gyorsítótárba kerülnek; betöltés és hiba esetén az eredeti szintetizátor szól.' } },
    ],
  },
  {
    version: '0.11.2', date: '2026-10-19', reconstructed: false,
    title: { en: 'Sound settings & focused song folders', hu: 'Hangbeállítások és rendezett dalmappák' },
    changes: [
      { kind: 'changed', text: { en: 'Browser sound on/mute joins the piano engine picker in Settings. Display now contains only visual options, in both languages.', hu: 'A zongorahang be/ki kapcsolója a hangválasztó mellé, a Beállításokba került. A Megjelenítés mindkét nyelven csak nézetbeállításokat tartalmaz.' } },
      { kind: 'changed', text: { en: 'Opening the song picker expands only the current piece\'s level or Uploaded folder. Search still reveals all matching folders.', hu: 'A darabválasztó megnyitásakor csak az aktuális darab szintmappája vagy a Feltöltött kották mappa nyílik ki. A keresés továbbra is minden találati mappát megmutat.' } },
    ],
  },
  {
    version: '0.11.1', date: '2026-10-19', reconstructed: false,
    title: { en: 'Piano picker in Settings', hu: 'Zongorahang a Beállításokban' },
    changes: [
      { kind: 'changed', text: { en: 'Moved Piano sound, loading progress, and retry into the sliders-icon Settings menu beside the hand controls, rather than the view menu.', hu: 'A zongorahang-választó, a betöltési állapot és az újrapróbálás a kézválasztó melletti, csúszka ikonos Beállítások menübe került a nézetmenü helyett.' } },
    ],
  },
  {
    version: '0.11.0', date: '2026-10-19', reconstructed: false,
    title: { en: 'Optional sampled grand piano', hu: 'Választható mintavételezett zongora' },
    changes: [
      { kind: 'added', text: { en: 'Piano sound selector in Display and audio: original synth or sampled grand piano powered by smplr. The choice is remembered.', hu: 'Zongorahang-választó a Megjelenítés és hang menüben: eredeti szintetizátor vagy smplr-alapú mintavételezett zongora. A választás megmarad.' } },
      { kind: 'added', text: { en: 'On-demand C2-C6 sample loading, progress, browser caching, retry, and original-synth fallback during loading or failure.', hu: 'Igény szerinti C2-C6 mintabetöltés, folyamatjelzés, böngészőgyorsítótár, újrapróbálás és eredeti hang betöltés vagy hiba esetén.' } },
      { kind: 'changed', text: { en: 'Both browser engines share mute, volume, note release, and stop-all controls. Hardware MIDI output remains independent.', hu: 'A böngészőhangok közös némítást, hangerőt, hangelengedést és leállítást használnak. A hardveres MIDI-kimenet független marad.' } },
    ],
  },
  {
    version: '0.10.1', date: '2026-10-19', reconstructed: false,
    title: { en: 'Consistent active control colors', hu: 'Egységes aktív vezérlőszínek' },
    changes: [
      { kind: 'fixed', text: { en: 'Demo, hand selection, and metronome controls use the shared green accent in both themes instead of orange selection states. Left-hand notes and timing warnings keep their distinct colors.', hu: 'A demó, kézválasztás és metronóm vezérlői mindkét témában közös zöld kiemelést használnak narancssárga állapotjelzés helyett. A bal kéz hangjai és az időzítési figyelmeztetések megőrzik eltérő színüket.' } },
    ],
  },
  {
    version: '0.10.0', date: '2026-10-19', reconstructed: false,
    title: { en: 'Visible mode controls & generic keyboard setup', hu: 'Látható módvezérlés és általános billentyűzet-beállítás' },
    changes: [
      { kind: 'changed', text: { en: 'Practice/demo and hand switchers are always visible in the responsive toolbar; summary preferences keep a compact menu.', hu: 'A gyakorló-/demómód és a kézválasztás mindig látható a reszponzív eszköztáron; az összegzés beállítása kompakt menüben marad.' } },
      { kind: 'changed', text: { en: 'Generic keyboard connection guidance and remembered-device matching, without model-specific shortcuts or external-app references.', hu: 'Általános billentyűzet-csatlakoztatási útmutató és mentett eszköz szerinti egyeztetés, modellspecifikus kivételek és külső alkalmazásra utalások nélkül.' } },
      { kind: 'fixed', text: { en: 'Verified light/dark theme and HU/EN language preferences survive reload in both directions.', hu: 'Ellenőrzött megőrzés újratöltés után: világos/sötét téma és HU/EN nyelv mindkét irányban.' } },
    ],
  },
  {
    version: '0.9.0', date: '2026-10-19', reconstructed: false,
    title: { en: 'Seven new MIDI pieces', hu: 'Hét új MIDI-darab' },
    changes: [
      { kind: 'added', text: { en: 'Six Hungarian melodies in Level 1: Bújj, bújj, zöld ág; Csiga-biga, gyere ki; Kis kece lányom; Süss fel, nap; Tavaszi szél; Télapó itt van.', hu: 'Hat magyar dallam az 1. szinten: Bújj, bújj, zöld ág; Csiga-biga, gyere ki; Kis kece lányom; Süss fel, nap; Tavaszi szél; Télapó itt van.' } },
      { kind: 'added', text: { en: 'Hans Zimmer: Interstellar Theme (Easy), a Level 3 two-hand arrangement. Built-in repertoire now contains 24 pieces.', hu: 'Hans Zimmer: Interstellar Theme (Easy), kétkezes feldolgozás a 3. szinten. A beépített kottatár már 24 darabot tartalmaz.' } },
      { kind: 'fixed', text: { en: 'Read explicit initial MIDI tempos and key signatures, ignore generic conductor-track titles, split CamelCase filenames, and count compound-meter measures correctly.', hu: 'Explicit kezdő MIDI-tempók és hangnemek olvasása, általános vezérlősáv-nevek kihagyása, CamelCase fájlnevek tagolása és összetett ütemek helyes számozása.' } },
    ],
  },
  {
    version: '0.8.1', date: '2026-10-19', reconstructed: false,
    title: { en: 'Simplified score upload', hu: 'Egyszerűbb kottafeltöltés' },
    changes: [
      { kind: 'changed', text: { en: 'Removed sample import/download buttons and listed supported file extensions on the score upload button.', hu: 'A mintafeltöltés és -letöltés gombjai eltűntek; a kottafeltöltés gomb mutatja a támogatott fájlkiterjesztéseket.' } },
    ],
  },
  {
    version: '0.8.0', date: '2026-10-19', reconstructed: false,
    title: { en: 'Organized song picker & clean import names', hu: 'Rendezett darabválasztó és tisztított importnevek' },
    changes: [
      { kind: 'added', text: { en: 'Searchable song picker with collapsible level folders, a separate Uploaded folder, composer details, and current-song marking.', hu: 'Kereshető darabválasztó összecsukható szintmappákkal, külön feltöltési mappával, szerzői adatokkal és az aktuális darab jelölésével.' } },
      { kind: 'added', text: { en: 'Arrow-key selection, focus restoration, Escape dismissal, and responsive mobile layout.', hu: 'Nyílbillentyűs választás, fókusz-visszaállítás, Escape bezárás és mobilbarát elrendezés.' } },
      { kind: 'fixed', text: { en: 'Filename-derived MIDI and MusicXML titles remove extensions, collapse whitespace/separators, and capitalize word initials. Embedded score titles remain unchanged.', hu: 'A fájlnévből képzett MIDI- és MusicXML-címekből eltűnik a kiterjesztés, rendeződnek a szóközök és elválasztók, a szókezdő betűk nagybetűsek lesznek. A beágyazott kottacímek változatlanok.' } },
    ],
  },
  {
    version: '0.7.1', date: '2026-10-19', reconstructed: false,
    title: { en: 'Remember practice & view settings', hu: 'Gyakorlási és nézetbeállítások megőrzése' },
    changes: [
      { kind: 'fixed', text: { en: 'Restore the last page, selected song, practice/demo mode, hand, tempo, display toggles, mute, and metronome after reload.', hu: 'Újratöltés után visszaáll az utolsó oldal, darab, gyakorló- vagy demómód, kéz, tempó, nézetkapcsolók, némítás és metronóm.' } },
      { kind: 'fixed', text: { en: 'Preserve the saved hand during startup and synchronize the restored mute setting with the audio engine.', hu: 'Indításkor megmarad a mentett kézválasztás, és a némítási beállítás az audiómotorban is érvényesül.' } },
      { kind: 'changed', text: { en: 'Reload starts a fresh paused attempt; invalid settings or missing songs safely fall back to defaults.', hu: 'Újratöltéskor új, szüneteltetett próba indul; hibás beállítás vagy hiányzó darab esetén biztonságos alapértékek érvényesülnek.' } },
    ],
  },
  {
    version: '0.7.0', date: '2026-10-19', reconstructed: false,
    title: { en: 'Direct sheet navigation', hu: 'Közvetlen kottanavigáció' },
    changes: [
      { kind: 'added', text: { en: 'Click the sheet to play from a position; clicks near notes snap to their onset.', hu: 'Kattintás a kottára a lejátszás indításához; hangjegy közelében annak kezdete lesz a kiválasztott pozíció.' } },
      { kind: 'added', text: { en: 'Drag horizontally to scrub through long songs and resume on release; slider and bar navigation remain available.', hu: 'Vízszintes húzás hosszú darabok bejárásához, elengedéskor folytatódó lejátszással; a csúszka és az ütemválasztó továbbra is elérhető.' } },
      { kind: 'fixed', text: { en: 'SVG coordinate mapping accounts for scale and sheet-only letterboxing; touch input supports horizontal scrubbing and vertical page scrolling.', hu: 'Az SVG-koordináták figyelembe veszik a méretezést és a kotta körüli üres teret; érintéssel vízszintesen kereshető a darab, függőlegesen görgethető az oldal.' } },
    ],
  },
  {
    version: '0.6.0', date: '2026-10-19', reconstructed: false,
    title: { en: 'Passage practice & playback controls', hu: 'Szakaszgyakorlás és lejátszásvezérlés' },
    changes: [
      { kind: 'fixed', text: { en: 'Sheet notation keeps its proportions and readable scale when falling notes are hidden or the window is resized.', hu: 'A kotta megtartja arányait és olvasható méretét a lehulló hangok elrejtésekor és ablakátméretezéskor.' } },
      { kind: 'added', text: { en: 'Song-position slider and measure jumps start a fresh paused attempt; skipped notes do not affect grading.', hu: 'Pozíciócsúszka és ütemre ugrás új, szüneteltetett próbához; az átugrott hangok nem számítanak bele az értékelésbe.' } },
      { kind: 'added', text: { en: 'Persistent option to hide automatic session summaries for repeated attempts; manual Finish & Grade remains available.', hu: 'Mentett beállítás az automatikus összegzés elrejtésére ismételt próbákhoz; a kézi befejezés és értékelés továbbra is elérhető.' } },
      { kind: 'fixed', text: { en: 'Demo audio, hardware MIDI, and key highlights follow the selected hand. Changing hands stops old voices without replaying earlier notes.', hu: 'A demó hangja, MIDI-kimenete és billentyűkiemelése követi a kiválasztott kezet. Kézváltáskor a korábbi hangok leállnak, az elmúlt hangok nem indulnak újra.' } },
    ],
  },
  {
    version: '0.5.0', date: '2026-10-16', reconstructed: false,
    title: { en: 'Version tracking & release history', hu: 'Verziókövetés és változásnapló' },
    changes: [
      { kind: 'added', text: { en: 'Current app version and bilingual changelog in Devices.', hu: 'Aktuális alkalmazásverzió és kétnyelvű változásnapló az Eszközök oldalon.' } },
      { kind: 'added', text: { en: 'Retrospective milestones for previously completed features and fixes.', hu: 'Korábbi funkciók és javítások utólag összeállított mérföldkövei.' } },
    ],
  },
  {
    version: '0.4.1', date: '2026-10-16', reconstructed: true,
    title: { en: 'Wrapped MusicXML downloads', hu: 'JSON-ba csomagolt MusicXML' },
    changes: [
      { kind: 'fixed', text: { en: 'Import downloads containing XML inside a JSON musicxml field.', hu: 'Importálhatók a JSON musicxml mezőjében XML-t tartalmazó letöltések.' } },
      { kind: 'fixed', text: { en: 'Use export tempo metadata when XML has no tempo; explicit XML tempo markings still take priority.', hu: 'XML-tempó hiányában az export tempóadata érvényesül; az XML saját tempójelzése továbbra is elsőbbséget élvez.' } },
      { kind: 'added', text: { en: 'Verified the Schumann Op. 15 No. 1 download at 72 BPM with 241 playable notes.', hu: 'Ellenőrzött Schumann Op. 15 No. 1 import: 72 BPM és 241 lejátszható hang.' } },
    ],
  },
  {
    version: '0.4.0', date: '2026-10-16', reconstructed: true,
    title: { en: 'Keyboard reconnection & MIDI output', hu: 'Billentyűzet-újracsatlakozás és MIDI kimenet' },
    changes: [
      { kind: 'fixed', text: { en: 'Reuse authorized keyboard MIDI ports before a fresh Bluetooth scan; open ports explicitly and clean up disconnects.', hu: 'Engedélyezett billentyűzet-MIDI portok használata új Bluetooth-keresés előtt; portok explicit megnyitása és leválasztási takarítás.' } },
      { kind: 'fixed', text: { en: 'Serialize BLE demo writes, respect supported write modes, and surface output failures.', hu: 'Sorosított BLE demókimenet, támogatott írási módok és látható kimeneti hibák.' } },
      { kind: 'added', text: { en: 'Piano output status and a hardware-only test note in Devices.', hu: 'Zongorakimenet állapota és csak a hangszerre küldött teszthang az Eszközök oldalon.' } },
      { kind: 'changed', text: { en: 'MIDI paths covered by browser mocks; physical keyboard behavior still requires macOS and Windows testing.', hu: 'MIDI útvonalak tesztelése böngészőszimulációval; a fizikai billentyűzet működését még macOS és Windows alatt is ellenőrizni kell.' } },
    ],
  },
  {
    version: '0.3.0', date: '2026-10-16', reconstructed: true,
    title: { en: 'MusicXML & visible tempo', hu: 'MusicXML és látható tempóvezérlés' },
    changes: [
      { kind: 'added', text: { en: 'Plain and compressed MusicXML import (.musicxml, .xml, .mxl), alongside existing MIDI uploads.', hu: 'Sima és tömörített MusicXML import (.musicxml, .xml, .mxl) a MIDI-feltöltések mellett.' } },
      { kind: 'added', text: { en: 'Chords, multiple voices, ties, staff-based hand assignment, fingerings, and tempo-map conversion.', hu: 'Akkordok, több szólam, átkötések, kottasor szerinti kézkiosztás, ujjrend és tempótérkép-konverzió.' } },
      { kind: 'changed', text: { en: 'Tempo slider, speed percentage, and effective BPM remain visible outside the settings menu.', hu: 'A tempócsúszka, a sebességszázalék és az aktuális BPM a beállítási menün kívül is látható.' } },
      { kind: 'fixed', text: { en: 'Invalid studio uploads show an error; score archives are checked against size limits.', hu: 'Hibás stúdiófeltöltéseknél látható hibaüzenet; méretkorlátokkal ellenőrzött kottaarchívumok.' } },
    ],
  },
  {
    version: '0.2.1', date: '2026-10-16', reconstructed: true,
    title: { en: 'Cloudflare Pages launch', hu: 'Cloudflare Pages indulás' },
    changes: [
      { kind: 'added', text: { en: 'First public deployment at klavierlab.pages.dev with HTTPS.', hu: 'Első nyilvános, HTTPS-alapú telepítés: klavierlab.pages.dev.' } },
      { kind: 'added', text: { en: 'Repeatable Pages deployment configuration and documented publishing commands.', hu: 'Ismételhető Pages-telepítési konfiguráció és dokumentált közzétételi parancsok.' } },
    ],
  },
  {
    version: '0.2.0', date: '2026-10-16', reconstructed: true,
    title: { en: 'Focused practice workspace', hu: 'Letisztult gyakorlófelület' },
    changes: [
      { kind: 'changed', text: { en: 'Compact navigation and transport controls, expandable settings, and a larger piano stage.', hu: 'Kompakt navigáció és lejátszásvezérlés, lenyitható beállítások és nagyobb zongorafelület.' } },
      { kind: 'added', text: { en: 'Searchable repertoire list, expandable score details, and desktop/mobile UI tests.', hu: 'Kereshető kottatár, lenyitható kottarészletek és asztali/mobil felülettesztek.' } },
      { kind: 'fixed', text: { en: 'Canvas resizing, mobile overflow, and settings-menu Escape/outside-click behavior.', hu: 'Vászon-átméretezés, mobilos túlcsordulás és a beállítási menük Escape/külső kattintás viselkedése.' } },
    ],
  },
  {
    version: '0.1.0', date: '2026-10-16', reconstructed: true,
    title: { en: 'Local development baseline', hu: 'Helyi fejlesztési alap' },
    changes: [
      { kind: 'fixed', text: { en: 'Resolved the Vite/esbuild dependency conflict and added a reproducible npm lockfile.', hu: 'Vite/esbuild függőségi ütközés javítása és reprodukálható npm-zárolófájl.' } },
      { kind: 'fixed', text: { en: 'Relative production asset URLs for the optional Electron launcher and ESM-compatible Vite configuration.', hu: 'Relatív build-erőforrások az opcionális Electron-indítóhoz és ESM-kompatibilis Vite-konfiguráció.' } },
      { kind: 'changed', text: { en: 'Verified the imported app locally: 17 scores, MIDI input/import, practice modes, grading, progress, HU/EN, and themes. No API key required.', hu: 'Az átvett alkalmazás helyi ellenőrzése: 17 kotta, MIDI-bemenet és import, gyakorlómódok, értékelés, haladás, HU/EN és témák. API-kulcs nem szükséges.' } },
    ],
  },
];