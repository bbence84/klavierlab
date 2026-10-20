# KlavierLab

A local-first MIDI piano practice app built with React 19, TypeScript, Vite 8,
and Tailwind CSS 4. It includes 24 built-in scores, MIDI and MusicXML file import,
wait-for-note and continuous practice, demo playback, sheet music, falling
notes, session grading, and Hungarian/English interfaces.

## Run Locally

Use Node.js 22.12+ (Node 24 LTS recommended) and npm. Setup was verified with
Node 24.21.0 and npm 11.19.0 on macOS.

```sh
npm ci
npm run dev -- --host=127.0.0.1
```

Open http://127.0.0.1:3000. If the port is occupied, use the URL Vite prints.
The loopback override keeps the development server on this machine; the
default `npm run dev` also exposes it to the local network.

No Gemini API key, environment file, backend, or database is required.
Google Fonts are fetched remotely; the app uses fallback fonts when offline.

### Experimental Notation Branch

`main` preserves the v0.11.2 baseline (`bd44f91`), including the original
custom SVG renderer. `feature/vexflow-notation` replaces the sheet with
[VexFlow 5](https://github.com/vexflow/vexflow) engraving. This experiment is
local only: no GitHub remote is configured and it has not been deployed.
The app version remains 0.11.2 until a release is prepared.

The renderer supplies treble/bass clefs, key and time signatures, noteheads,
chords, ledger lines, rests, contextual accidentals, dots, beams, triplets, and
available finger numbers. Bravura and Academico fonts are embedded in the
bundle; notation does not need a font CDN. Existing practice audio, grading,
hand selection, seeking, and touch dragging remain connected to the same state.
The SVG timeline scrolls between engraving updates instead of rebuilding every
animation frame. License notices ship in
[public/vexflow-notices.txt](public/vexflow-notices.txt).

This is not lossless MusicXML engraving. Rhythms, spelling, rests, and beam
groups are inferred from timed notes using the initial tempo and meter.
Independent voices, ties across bars, original enharmonic spellings, dynamics,
and layout are not reconstructed. Dense passages can crowd in the deliberately
time-proportional scrolling view, especially on mobile.

Run `npm run test:ui -- tests/notation.spec.ts` for focused engraving checks,
including all 24 built-in pieces. After committing or stashing local work,
`git switch main` and `git switch feature/vexflow-notation` compare the versions;
run `npm ci` after switching because their dependencies differ.

```sh
npm run lint     # TypeScript check (not an ESLint ruleset)
npm run build    # Production output in dist/
npm run preview -- --host=127.0.0.1
```

## Cloudflare Pages

Production: https://klavierlab.pages.dev/

The project is deployed directly to Cloudflare Pages using the `main` production
branch and the `dist` output configured in [wrangler.jsonc](wrangler.jsonc).
To publish an update:

```sh
npm run lint
npm run test:ui
npm run build
npx --yes wrangler@4.151.0 pages deploy dist --project-name=klavierlab --branch=main --commit-dirty=true
```

If authentication expires, authorize locally in your browser:

```sh
npx --yes wrangler@4.151.0 login --scopes account:read user:read pages:write
```

Keep account access enabled when approving. Do not put tokens in source files.
OAuth credentials are managed locally by Wrangler. Git-triggered automatic
deployments and a custom domain are not configured. Browser data on localhost
does not transfer to the public site's separate localStorage origin.

## Development

### UI Checks

```sh
npx playwright install chromium
npm run test:ui
```

Playwright starts an isolated Vite server on port 3100 and checks desktop/mobile
practice controls, scoring, canvas rendering, library search, navigation, and
theme/language switching. Screenshots are written under ignored `test-results/`.

### Interface

The workspace uses compact navigation, a song/transport header, visible mode
and hand switchers, expandable display settings, and an edge-to-edge piano stage. The library is
a searchable list with expandable score details. Light mode is the default for
new profiles; saved theme/language preferences are preserved. The interface is
an original implementation.

### Practice Controls

Choose a piece from the practice header to open a searchable song picker.
Built-in songs are grouped in collapsible Level 1-5 folders; imported MIDI and
MusicXML scores live in a separate Uploaded folder and show their level.
Each time the picker opens, only the current song's folder is expanded; all
others start collapsed. Search temporarily expands every matching folder.
Search matches title, composer, or level across folders. Results show composer,
tempo, and hand arrangement; the current piece is marked. Arrow Up/Down moves
between visible pieces, Enter selects, and Escape closes the picker.

The song-position slider and Bar menu stay visible in both sheet and falling-note
views, including on mobile. Scrubbing or selecting a bar pauses playback, silences
audio/MIDI, and starts a fresh attempt at that position with reset counters.
Earlier notes are skipped rather than marked missed. Press Play to continue;
Restart piece returns to the beginning. Seeking backward makes those notes
available for practice again.

The sheet itself also supports navigation. Click a point in the notation to
seek and start playback there; clicks near a note snap to its start. Drag the
sheet left to reach later music or right to go back, repeating drags as needed
for long songs. Dragging pauses and resets the attempt while previewing the new
position; releasing resumes playback. Times are bounded by the song limits.
Clicks on the fixed clef strip or outside the rendered SVG content are ignored.
SVG coordinate transforms keep hit testing correct after resizing and in expanded
sheet-only view. Horizontal touch drags scrub; vertical gestures can still scroll
the page. The slider and Bar menu remain the keyboard-accessible alternatives.

Page reload restores the last workspace page and song, practice/demo mode, hand,
tempo, sheet/falling-note/key-label toggles, synth mute, and metronome from
`klavierlab_practice_preferences_v1`. Demo is restored as a mode, not automatic
playback: every reload starts a fresh paused attempt at the beginning. Removed
songs and unavailable hands fall back safely. Invalid preference values are
ignored individually. Saved settings are scoped to the browser/site origin;
private browsing or clearing site data can remove them.

Theme and language are also persisted, using the existing `klavierlab_theme_v1`
and `klavierlab_lang_v1` keys. Reload restores both without duplicating these
values in the practice-preferences object. Practice/demo mode and hand selection
stay visible directly in the toolbar on desktop and mobile.

In Settings (the sliders icon), disable Show summary after practice to save completed
attempts without interrupting replay with a modal. This preference is remembered
in `klavierlab_show_summary_v1`. Finish & Grade still opens results on demand,
without saving the same attempt twice.

Demo mode plays only the selected hand(s), including hardware MIDI and keyboard
highlights. During normal single-hand practice, the other hand remains automatic
accompaniment. Sheet-only view preserves notation proportions and adjusts the
visible time window to the available width instead of stretching the staff.

### Score Import

The built-in repertoire includes seven supplied MIDI arrangements: Bújj, bújj,
zöld ág; Csiga-biga, gyere ki; Kis kece lányom; Süss fel, nap; Tavaszi szél;
Télapó itt van (Level 1, right hand), and Hans Zimmer's Interstellar Theme
(Easy) (Level 3, two hands). These appear in level folders, not Uploaded.
Original files are retained in [src/data/midi](src/data/midi); Vite embeds them
and [src/data/bundledMidiSongs.ts](src/data/bundledMidiSongs.ts) parses them into
stable built-in songs. Titles and levels are curated; MIDI does not supply
verified fingering, so these pieces have no invented finger numbers. Existing
song IDs and user-uploaded copies are left unchanged.

Use Import score in the library or the upload icon in the practice header.
Accepted formats: MIDI (`.mid`, `.midi`), MusicXML (`.musicxml`, `.xml`), and
compressed MusicXML (`.mxl`). Name the score, then save it to the library or
open it for practice. Imports stay in browser storage and support rename/delete.

When a score has no embedded title, its filename supplies a readable name:
extensions are removed, underscores/hyphens become spaces, repeated whitespace
is collapsed, and word initials are capitalized. For example,
`fur_elise--piano.musicxml` becomes `Fur Elise Piano`. URL-encoded spaces and
Unicode letters are handled; existing capitals such as BWV are preserved.
Embedded MIDI/MusicXML titles take priority, and the import dialog remains
editable. Existing saved titles are not renamed automatically.

Some downloads with a `.musicxml` or `.xml` extension contain a JSON object
with the actual XML in a `musicxml` string. These wrappers are also accepted.
Their `tempo_bpm` (or `meta.tempo_bpm`) supplies the initial tempo when the XML
does not specify one; explicit XML tempo markings take precedence.

MusicXML import supports partwise and timewise scores, pitched notes, rests,
chords (including cross-staff chords), multiple voices/parts, divisions,
ties, pickups marked `implicit`, tempo changes, metronome markings, chromatic
transposition, title/composer, and explicit 1-5 fingerings. Hand selection uses
staff numbers for grand-staff piano parts, otherwise clefs or a middle-C split.

This is a playable-score conversion, not a lossless notation editor. It reads
the written measure order once: repeats, endings, da capo/dal segno, grace notes,
ornaments, cue notes, percussion, pedal, and expressive dynamics are not played.
The simplified staff, beat grid, and metronome use the initial time signature
and tempo, even though imported note timing follows tempo changes. Key changes
and original engraving are not preserved. Microtonal pitches, mixed-denominator
compound time signatures, and notes outside C2-C6 are rejected with an error.

Files are limited to 10 MB, expanded archives to 20 MB / 1,000 entries, and
MusicXML scores to 10,000 notes. Compressed files resolve the score through
`META-INF/container.xml`; malformed XML, missing score entries, and custom XML
entity declarations are rejected. XML parsing and ZIP extraction happen locally;
the uploaded score is not sent to a server.

### Versioning

Devices includes the running app version and an expandable HU/EN changelog.
The displayed version comes from [package.json](package.json); release entries
live in [src/data/releases.ts](src/data/releases.ts). Version 0.5.0 is the first
explicitly tracked release. Earlier numbers are retrospective development
milestones assigned from verified session work, not historical Git tags or
claims that those exact versions were published. Their dates reflect local
development on 2026-10-16; physical MIDI claims remain explicitly unverified.

For a new release, update the package version and add a matching first entry to
`RELEASES` with localized changes and the actual release date. Preserve existing
entries. Run `npm install --package-lock-only` to sync lockfile metadata, then
run the tests and build. UI tests check that the current entry matches the app.
Version changes do not change storage keys or erase player progress.

### Piano Input

- Chrome or Edge on localhost is recommended for Web MIDI / Web Bluetooth.
   Support and permission requirements depend on the browser and platform.
- Use MIDI Setup to connect USB/OS MIDI or a compatible BLE MIDI device.
   A Bluetooth audio connection alone is not a MIDI connection.
- Hardware is optional: click piano keys or use the computer keyboard.
   `A S D F G H J K` maps to C4 through C5; Space toggles playback.
- Audio starts after user interaction. Hardware output and audible quality
   still need testing with a real piano.

### Piano Sound

Open Settings (the sliders icon beside the hand controls), then choose Piano sound:

The browser sound on/mute toggle is in the same Settings menu. Display (the eye
icon) contains only sheet music, falling notes, and key-label options.

- Original synth: the existing oscillator-based piano, the default, with no
   sample downloads.
- Sampled grand piano (smplr): recorded piano samples with velocity layers,
   loaded only after selecting this option. The selection is saved with practice
   preferences, but restoring it never starts playback automatically.

The sampler uses [smplr](https://github.com/danigb/smplr) (MIT) and its
SplendidGrandPiano instrument. The [upstream sample project](https://github.com/sfzinstruments/SplendidGrandPiano)
describes its samples as public domain, originally released by AKAI; the browser
sample distribution is maintained by [smpldsnds](https://github.com/smpldsnds).
This integration uses the library's sample mapping, not the full SFZ feature set.

Samples for the studio's C2-C6 range are fetched from
`https://smpldsnds.github.io/sfzinstruments-splendid-grand-piano/samples/`.
This is an external download, not an upload of your MIDI/score. Initial loading
requires internet access and uses more memory than the original synth. Supported
browsers cache sample responses under `klavierlab-piano-samples-v1`; site storage
can be cleared or evicted, so caching is not an offline availability guarantee.

While loading or after an error, notes use the original synth. The menu shows
progress/readiness and offers Retry after failure. Loading times out after 45
seconds once sample initialization starts. Switching engines stops old voices;
notes released during loading are never replayed later. Mute and reset/seek
silence either engine. The metronome remains synthesized. Hardware MIDI playback
uses the physical instrument's sound engine and is unaffected by this selector.

### Keyboard Reconnection And Demo Output

The connection action first tries the previously remembered keyboard name
exposed by the OS when the browser already has MIDI permission. It then tries
previously authorized BLE devices before opening a new Bluetooth picker. If a
known BLE reconnection fails, OS MIDI is attempted before another scan.

On macOS, if Bluetooth settings show the keyboard connected but the browser cannot see
it in the BLE picker, use Audio MIDI Setup > Window > Show MIDI Studio >
Configure Bluetooth, connect your keyboard there, then choose USB / Web MIDI in
Devices and allow MIDI access. This reuses the OS connection rather than
requiring another advertising/pairing cycle. Use the same site origin as before:
localhost and the deployed Pages site have separate Chrome permissions.

The app cannot unpair devices, control the OS Bluetooth connection, guarantee
a keyboard will advertise, or make an unavailable native MIDI port appear. If the
OS does not expose a usable port, disconnect its MIDI connection, close other
piano/DAW apps, or use USB MIDI. Forgetting/re-pairing should not be the first
step. Cleanup on page close is best-effort; browsers cannot guarantee delivery
of final MIDI messages while a process or tab exits.

In Devices, Piano MIDI output lists the actual route. Test piano output sends a
C4 note only to the hardware, not the browser synth; the simulated BLE chord
button tests incoming parsing and does not test physical playback. An input-only
connection is valid for scoring but cannot play demo notes on the piano.
Writable BLE capability is not proof that the piano has received or sounded it.

BLE output serializes GATT operations, checks advertised write properties, and
tries response writes if no-response writes fail. Native MIDI ports are opened
explicitly, disconnected ports are ignored, and output open/write errors appear
in Devices. If Windows receives key presses but Test piano output stays silent,
check this status/error, close other MIDI apps, and try USB / Web MIDI. Muting
the app synth does not mute hardware MIDI output. The app does not install a
Windows Bluetooth MIDI driver or send Bluetooth audio to the piano.

These paths are covered with browser mocks in [tests/midi.spec.ts](tests/midi.spec.ts).
Physical keyboard reconnection and sound still require validation on macOS and Windows.

### Optional Electron Launcher

[electron-main.cjs](electron-main.cjs) wraps the production build and enables
MIDI/Bluetooth permissions. Electron is not included in the default dependency
set. To try the existing desktop launcher:

```sh
npm install --no-save --package-lock=false electron
npm run electron
```

For desktop development, run Vite in one terminal and in another run:

```sh
ELECTRON_START_URL=http://127.0.0.1:3000 npx --no-install electron electron-main.cjs
```

The Vite build uses relative asset URLs so Electron can load `dist/index.html`.
The native window and physical MIDI connections have not been validated.
The existing `package:mac` / `package:win` scripts are scaffolding: they require
electron-builder plus packaging, permissions, and signing configuration before
they should be treated as supported release workflows.

## Code Map

| Area | Ownership / Extension Point |
| --- | --- |
| [src/main.tsx](src/main.tsx) | Mounts React and imports the global stylesheet. |
| [src/App.tsx](src/App.tsx) | Owns view selection, song/settings state, input grading, animation clock, metronome, accompaniment/demo playback, import dialogs, and profile persistence. Start here for changes to practice behavior. |
| [src/types/music.ts](src/types/music.ts) | Shared contracts: `Song`, `SongNote`, `SessionStats`, `PlayerProfile`, MIDI status/logs, recommendations. |
| [src/data/songs.ts](src/data/songs.ts) | Built-in curriculum and level labels. Add lessons as `Song` data. |
| [src/utils/midiService.ts](src/utils/midiService.ts) | Singleton event service for BLE, Web MIDI, virtual note input, packet logs, connection state, and hardware output. |
| [src/utils/audioSynth.ts](src/utils/audioSynth.ts) | Original oscillator synth and lazy cached smplr piano, loading/fallback status, note release, mute/volume, and metronome clicks. |
| [src/utils/midiFileParser.ts](src/utils/midiFileParser.ts) | Handwritten Standard MIDI File parser, tempo-to-seconds conversion, hand inference, and downloadable sample generator. |
| [src/utils/scoreFileParser.ts](src/utils/scoreFileParser.ts) | Shared upload dispatcher and accepted extensions; lazily loads MusicXML support. |
| [src/utils/musicXmlParser.ts](src/utils/musicXmlParser.ts) | Browser XML parsing, bounded MXL extraction with fflate, and score-to-timed-note conversion. |
| [src/utils/musicTheory.ts](src/utils/musicTheory.ts) | Keyboard geometry, note names/frequencies, staff positions, and computer-key mappings. |
| [src/utils/i18n.ts](src/utils/i18n.ts) | Shared HU/EN strings and labels; some view-specific strings also live in components. |
| [src/components/FallingNotesCanvas.tsx](src/components/FallingNotesCanvas.tsx) | Canvas note timeline and live feedback rendering. |
| [src/components/VexFlowSheetMusicBar.tsx](src/components/VexFlowSheetMusicBar.tsx) | Responsive VexFlow sheet, playback highlighting, scrolling, and pointer/touch seeking. |
| [src/utils/vexflowNotation.ts](src/utils/vexflowNotation.ts) | Timed-note rhythm inference and VexFlow SVG engraving with embedded fonts. |
| [src/components/PianoKeyboard.tsx](src/components/PianoKeyboard.tsx) | Interactive keyboard and active/target key display. |
| [src/components/SongLibraryView.tsx](src/components/SongLibraryView.tsx) | Repertoire filters, file import with supported formats shown, rename/delete entry points. |
| [src/components/SessionSummaryModal.tsx](src/components/SessionSummaryModal.tsx) | Session results and rule-based `computeAdaptiveRecommendation`; this is not an AI service. |
| [src/components/ProgressDashboardView.tsx](src/components/ProgressDashboardView.tsx) | Profile history, mastery, levels, and demo-statistics reset. |
| [src/components/SetupGuideView.tsx](src/components/SetupGuideView.tsx) | Connection controls, instructions, MIDI packet inspector, and simulated BLE input. |

### Practice Data Flow

1. BLE, Web MIDI, and virtual keyboard messages enter `midiService`.
2. `App` subscribes to note events, plays synthesized audio, matches pending
    notes for the selected hand, and records grades, streaks, and score.
3. A `requestAnimationFrame` loop advances song time using the tempo multiplier.
    Wait-for-note freezes at the next pending target; continuous mode marks
   overdue notes missed. Demo plays the selected hands; during practice the
   unselected hand plays automatically as accompaniment.
4. Staff, falling notes, and keyboard render the same session state.
5. Session completion computes weighted accuracy and XP, saves history, and
    presents a rule-based next-practice recommendation. Demo does not award XP.

### Persistence And Current Limits

- Data stays in browser `localStorage`, scoped to the origin. Changing host or
   port creates a separate profile; there is no account, sync, or backup.
- Keys: `klavierlab_profile_v3`, `klavierlab_custom_songs_v3`,
   `klavierlab_lang_v1`, and `klavierlab_theme_v1`. Profile history keeps 25 sessions.
- New profiles contain seeded demonstration progress, not an empty record.
   The day streak is currently a profile field rather than a maintained calendar.
- Stored JSON is not schema-validated; quota/storage failures are silently ignored.
- MIDI imports retain at most 600 notes, fold pitches into C2-C6, clamp durations
   to 0.18-4 seconds, and infer hands/fingers. Imported fingering is heuristic.
   SMPTE timing is approximated, and BPM/measure metadata does not fully model
   tempo/time-signature changes. Explicit initial tempo/key signatures are read,
   and measure numbering accounts for the time-signature denominator. The staff
   and metronome still use the initial tempo rather than a changing tempo map.
- Practice logic and UI are concentrated in `App`; isolate the clock/grading
   behind tests before substantial timing or scoring changes.
- Automated UI regression coverage is in [tests/ui.spec.ts](tests/ui.spec.ts).
   Available gates are the TypeScript check, production build, and `npm run test:ui`.
- MusicXML parser and upload coverage is in [tests/musicxml.spec.ts](tests/musicxml.spec.ts),
  including metadata, timing, chords, voices, ties, compressed archives, invalid
  inputs, persistence, rename/delete, demo playback, and existing MIDI uploads.

## Verified Locally

Dependency installation, TypeScript checking, production build, and relative
production asset resolution pass. Browser smoke tests covered all four views,
virtual-key scoring, session summary/history persistence, sample MIDI import,
import persistence after reload, and demo start/pause. Test-created profile
and song changes were restored afterward. Physical MIDI, native Electron,
release packaging, and audible output remain unverified.
