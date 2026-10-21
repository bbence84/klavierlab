import { expect, Page, test } from '@playwright/test';
import { strToU8, zipSync } from 'fflate';
import { Song } from '../src/types/music';
import { titleFromFileName } from '../src/utils/scoreMetadata';
import { parseMidiFileBuffer } from '../src/utils/midiFileParser';

const SCORE = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>XML Piano Study</work-title></work>
  <identification><creator type="composer">Test Composer</creator></identification>
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><key><fifths>1</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>
      <direction><sound tempo="60"/></direction>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><staff>1</staff><notations><technical><fingering>1</fingering></technical></notations></note>
      <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><staff>1</staff><notations><technical><fingering>3</fingering></technical></notations></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>12</duration><tie type="start"/><voice>1</voice><staff>1</staff></note>
      <backup><duration>16</duration></backup>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>16</duration><voice>2</voice><staff>2</staff></note>
    </measure>
    <measure number="2">
      <attributes><divisions>8</divisions></attributes>
      <direction><sound tempo="120"/></direction>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>8</duration><tie type="stop"/><voice>1</voice><staff>1</staff></note>
      <note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>8</duration><voice>1</voice><staff>1</staff></note>
      <note><rest/><duration>16</duration><voice>1</voice><staff>1</staff></note>
      <backup><duration>32</duration></backup>
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>32</duration><voice>2</voice><staff>2</staff></note>
    </measure>
  </part>
</score-partwise>`;

async function parseScore(page: Page, xml: string): Promise<Song> {
  return page.evaluate(async source => {
    const modulePath = '/src/utils/musicXmlParser.ts';
    const { parseMusicXml } = await import(modulePath);
    return parseMusicXml(source, 'study.musicxml');
  }, xml);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('filename titles normalize separators, whitespace, extensions, and word initials', () => {
  expect(titleFromFileName('CsigaBigaGyereKi.midi')).toBe('Csiga Biga Gyere Ki');
  expect(titleFromFileName('  von-fremden__laendern\t und\n menschen-op-15-no-1.musicxml')).toBe('Von Fremden Laendern Und Menschen Op 15 No 1');
  expect(titleFromFileName('fur%20elise___piano.MID')).toBe('Fur Elise Piano');
  expect(titleFromFileName('  \u00e9tude\u00a0  op_10__No_3.mxl')).toBe('\u00c9tude Op 10 No 3');
  expect(titleFromFileName('___---.xml')).toBe('Imported score');
  expect(titleFromFileName('Prelude_BWV_846.musicxml')).toBe('Prelude BWV 846');
});

test('MIDI uses explicit initial tempo, skips generic track names, and counts 6/8 bars in beats', () => {
  const events = [0, 0xff, 3, 13, ...new TextEncoder().encode('control track'),
    0, 0xff, 1, 8, ...new TextEncoder().encode('GNU Lily'),
    0, 0xff, 0x51, 3, 0x09, 0x27, 0xc0,
    0, 0xff, 0x58, 4, 6, 3, 24, 8,
    0, 0xff, 0x59, 2, 0xff, 1,
    0, 0x90, 60, 96, 0x8b, 0x20, 0x80, 60, 0,
    0, 0x90, 62, 96, 0x83, 0x60, 0x80, 62, 0, 0, 0xff, 0x2f, 0];
  const buffer = new Uint8Array([77, 84, 104, 100, 0, 0, 0, 6, 0, 0, 0, 1, 1, 224,
    77, 84, 114, 107, 0, 0, 0, events.length, ...events]);
  const song = parseMidiFileBuffer(buffer.buffer, 'CsigaBigaGyereKi.midi');
  expect(song.title).toBe('Csiga Biga Gyere Ki');
  expect(song.bpm).toBe(100);
  expect(song.keySignature).toBe('D Minor');
  expect(song.notes.map(note => note.measure)).toEqual([1, 2]);
  expect(song.notes[1].startTime).toBeCloseTo(2.8);
});

test('all seven supplied MIDI scores are built in with accurate metadata and stable identities', async ({ page }) => {
  const songs: Song[] = await page.evaluate(async () => {
    const modulePath = '/src/data/songs.ts';
    return (await import(modulePath)).INITIAL_SONGS;
  });
  expect(songs).toHaveLength(27);
  const expected: [string, number, number][] = [
    ['repertoire-bujj-bujj-zold-ag', 45, 100], ['repertoire-csiga-biga-gyere-ki', 25, 100],
    ['repertoire-kis-kece-lanyom', 44, 84], ['repertoire-suss-fel-nap', 17, 96],
    ['repertoire-tavaszi-szel', 33, 110], ['repertoire-telapo-itt-van', 32, 76],
    ['repertoire-interstellar-easy', 290, 90],
  ];
  for (const [id, count, bpm] of expected) {
    const song = songs.find(entry => entry.id === id)!;
    expect(song).toBeDefined();
    expect(song.isCustomMidi).toBe(false);
    expect(song.notes).toHaveLength(count);
    expect(song.bpm).toBe(bpm);
    expect(song.notes[0].startTime).toBe(1.2);
    expect(song.notes.every(note => note.finger === undefined)).toBe(true);
    expect(new Set(song.notes.map(note => note.id)).size).toBe(count);
  }
  expect(songs.find(song => song.id === 'repertoire-interstellar-easy')).toMatchObject({ timeSignature: [6, 8], level: 3, handArrangement: 'two-hands', composer: 'Hans Zimmer' });
  expect(songs.filter(song => song.id.startsWith('repertoire-') && song.id !== 'repertoire-interstellar-easy').every(song => song.level === 1 && song.handArrangement === 'right-only')).toBe(true);
});

test('supplied scores appear in level folders, stay out of Uploaded, and play in demo mode', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('klavierlab_lang_v1', 'en'));
  await page.reload();
  await page.getByRole('button', { name: 'Choose piece', exact: true }).click();
  const picker = page.getByRole('dialog', { name: 'Choose a piece', exact: true });
  await expect(picker.locator('[data-song-folder="uploaded"] [data-picker-song]')).toHaveCount(0);
  const beginner = picker.locator('[data-song-folder="level-1"]');
  for (const title of ['Bújj, bújj, zöld ág', 'Csiga-biga, gyere ki', 'Kis kece lányom', 'Süss fel, nap', 'Tavaszi szél', 'Télapó itt van']) {
    await expect(beginner.getByRole('button', { name: title, exact: true })).toBeVisible();
  }
  await picker.locator('[data-song-folder="level-3"] > button').click();
  await expect(picker.locator('[data-song-folder="level-3"]').getByRole('button', { name: 'Interstellar Theme (Easy)', exact: true })).toBeVisible();
  await beginner.getByRole('button', { name: 'Tavaszi szél', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose piece', exact: true })).toContainText('Tavaszi szél');
  await expect(page.locator('label[for="tempo-slider"]')).toHaveText('Tempo: 100% (110 BPM)');
  await page.locator('.practice-options summary').click();
  await page.getByRole('button', { name: 'Demo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
});

test('MIDI and MusicXML use filename titles only when embedded titles are missing', async ({ page }) => {
  const bytes = new Uint8Array([77, 84, 104, 100, 0, 0, 0, 6, 0, 0, 0, 1, 1, 224, 77, 84, 114, 107, 0, 0, 0, 13, 0, 0x90, 60, 96, 0x83, 0x60, 0x80, 60, 0, 0, 0xff, 0x2f, 0]);
  expect(parseMidiFileBuffer(bytes.buffer, '  my__first-song.MID').title).toBe('My First Song');
  const song = await page.evaluate(async source => {
    const modulePath = '/src/utils/musicXmlParser.ts';
    const { parseMusicXml } = await import(modulePath);
    return parseMusicXml(source, '  my__first-song.musicxml');
  }, SCORE.replace('<work-title>XML Piano Study</work-title>', '<work-title> </work-title>'));
  expect(song.title).toBe('My First Song');
  expect((await parseScore(page, SCORE)).title).toBe('XML Piano Study');
});

test('MusicXML preserves timing, voices, staff assignments, ties, and metadata', async ({ page }) => {
  const song = await parseScore(page, SCORE);
  expect(song).toMatchObject({ title: 'XML Piano Study', composer: 'Test Composer', bpm: 60, timeSignature: [4, 4], keySignature: 'G Major', handArrangement: 'two-hands', importFormat: 'musicxml' });
  expect(song.notes).toHaveLength(6);
  expect(song.notes.find(note => note.midi === 60)).toMatchObject({ startTime: 1.2, duration: 1, hand: 'right', finger: 1 });
  expect(song.notes.find(note => note.midi === 64)).toMatchObject({ startTime: 1.2, hand: 'right', finger: 3 });
  expect(song.notes.find(note => note.midi === 48)).toMatchObject({ startTime: 1.2, duration: 4, hand: 'left' });
  expect(song.notes.find(note => note.midi === 62)).toMatchObject({ startTime: 2.2, duration: 3.5, measure: 1 });
  expect(song.notes.find(note => note.midi === 66)).toMatchObject({ startTime: 5.7, duration: 0.5, measure: 2 });
  expect(song.durationSeconds).toBeCloseTo(7.2);
  const crossStaff = await parseScore(page, SCORE.replace('<voice>1</voice><staff>1</staff><notations><technical><fingering>3', '<voice>1</voice><staff>2</staff><notations><technical><fingering>3'));
  expect(crossStaff.notes.find(note => note.midi === 64)).toMatchObject({ startTime: 1.2, hand: 'left' });
});

test('compressed MXL follows the container rootfile instead of guessing an XML entry', async ({ page }) => {
  const bytes = zipSync({
    'META-INF/container.xml': strToU8('<container><rootfiles><rootfile full-path="scores/piano.musicxml" media-type="application/vnd.recordare.musicxml+xml"/></rootfiles></container>'),
    'unrelated.xml': strToU8('<unrelated/>'),
    'scores/piano.musicxml': strToU8(SCORE),
  });
  const song = await page.evaluate(async input => {
    const modulePath = '/src/utils/musicXmlParser.ts';
    const { parseMusicXmlFileBuffer } = await import(modulePath);
    return parseMusicXmlFileBuffer(new Uint8Array(input).buffer, 'piano.mxl');
  }, Array.from(bytes));
  expect(song.title).toBe('XML Piano Study');
  expect(song.notes).toHaveLength(6);
});

test('supports timewise scores, pickups, dotted metronome beats, and transposition', async ({ page }) => {
  const xml = `<score-timewise><measure number="0" implicit="yes"><part id="P1"><attributes><divisions>1</divisions><time><beats>3</beats><beat-type>4</beat-type></time><transpose><chromatic>-2</chromatic></transpose></attributes><direction><direction-type><metronome><beat-unit>quarter</beat-unit><beat-unit-dot/><per-minute>60</per-minute></metronome></direction-type></direction><note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration></note></part></measure><measure number="1"><part id="P1"><forward><duration>1</duration></forward><note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration></note></part></measure></score-timewise>`;
  const song = await parseScore(page, xml);
  expect(song.bpm).toBe(90);
  expect(song.notes[0].midi).toBe(60);
  expect(song.notes[1].midi).toBe(62);
  expect(song.notes[1].startTime).toBeCloseTo(1.2 + 2 * 60 / 90);
});

test('rejects malformed, empty, unsafe, and unsupported score input', async ({ page }) => {
  for (const xml of ['<score-partwise>', '<html/>', '<score-partwise/>', '<!DOCTYPE score-partwise [<!ENTITY value "test">]><score-partwise/>', SCORE.replace('<alter>1</alter>', '<alter>0.5</alter>'), SCORE.replace('<divisions>4</divisions>', '<divisions>0</divisions>'), SCORE.replace('<octave>2</octave>', '<octave>0</octave>')]) {
    await expect(parseScore(page, xml)).rejects.toThrow();
  }
});

test('JSON-wrapped MusicXML uses export tempo when the score has no explicit tempo', async ({ page }) => {
  const withoutTempo = SCORE.replace('<direction><sound tempo="60"/></direction>', '').replace('<direction><sound tempo="120"/></direction>', '');
  for (const metadata of [{ tempo_bpm: '72' }, { meta: { tempo_bpm: 72 } }]) {
    const song = await parseScore(page, JSON.stringify({ musicxml: withoutTempo, ...metadata }));
    expect(song.bpm).toBe(72);
    expect(song.notes).toHaveLength(6);
    expect(song.notes.find(note => note.midi === 60)?.duration).toBeCloseTo(60 / 72);
    expect(song.durationSeconds).toBeCloseTo(1.2 + 8 * 60 / 72);
  }
  const explicitTempo = await parseScore(page, JSON.stringify({ musicxml: SCORE, tempo_bpm: '72' }));
  expect(explicitTempo.bpm).toBe(60);
  expect(explicitTempo.durationSeconds).toBeCloseTo(7.2);
});

test('JSON score exports reject malformed wrappers, invalid tempo, and unsafe embedded XML', async ({ page }) => {
  for (const source of ['{', '[]', '{}', JSON.stringify({ musicxml: 42 }), JSON.stringify({ musicxml: '' }), JSON.stringify({ musicxml: SCORE, tempo_bpm: 0 }), JSON.stringify({ musicxml: SCORE, tempo_bpm: {} }), JSON.stringify({ musicxml: '<score-partwise>' }), JSON.stringify({ musicxml: '<!DOCTYPE score-partwise [<!ENTITY secret "value">]><score-partwise/>' })]) {
    await expect(parseScore(page, source)).rejects.toThrow();
  }
});

test('a JSON-wrapped .musicxml download imports through the existing file input', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('klavierlab_lang_v1', 'en'));
  await page.reload();
  const musicxml = SCORE.replace('<direction><sound tempo="60"/></direction>', '').replace('<direction><sound tempo="120"/></direction>', '');
  const download = JSON.stringify({ filename: 'shelf:122', musicxml, tempo_bpm: '72', meta: { composer: 'Test Composer' } });
  await page.locator('main input[type="file"]').setInputFiles({ name: 'wrapped.musicxml', mimeType: 'application/json', buffer: Buffer.from(download) });
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('72 BPM');
  await page.getByRole('button', { name: 'Save & Open in Studio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose piece', exact: true })).toContainText('XML Piano Study');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('klavierlab_custom_songs_v3') || '[]'));
  expect(saved[0].bpm).toBe(72);
  expect(saved[0].notes).toHaveLength(6);
});

test('library imports, persists, renames, and deletes a MusicXML score', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('klavierlab_lang_v1', 'en'));
  await page.reload();
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await page.locator('main input[type="file"]').setInputFiles({ name: 'study.musicxml', mimeType: 'application/vnd.recordare.musicxml+xml', buffer: Buffer.from(SCORE) });
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Piece Title')).toHaveValue('XML Piano Study');
  await page.getByRole('button', { name: 'Save & Open in Studio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose piece', exact: true })).toContainText('XML Piano Study');
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'Uploaded scores', exact: true }).click();
  await expect(page.locator('.library-song')).toHaveCount(1);
  await page.reload();
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'Uploaded scores', exact: true }).click();
  await page.getByRole('button', { name: 'Rename', exact: true }).click();
  await page.getByLabel('Piece Title').fill('Renamed XML study');
  await page.getByRole('button', { name: 'Save & Open in Studio', exact: true }).click();
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'Uploaded scores', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Renamed XML study', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.locator('.library-song')).toHaveCount(0);
});

test('studio imports compressed MusicXML and shows invalid-file errors', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('klavierlab_lang_v1', 'en'));
  await page.reload();
  const input = page.locator('main input[type="file"]');
  await input.setInputFiles({ name: 'invalid.xml', mimeType: 'application/xml', buffer: Buffer.from('<not-a-score/>') });
  await expect(page.getByRole('alert')).toContainText('Could not import score');
  const archive = zipSync({
    'META-INF/container.xml': strToU8('<container><rootfiles><rootfile full-path="piano.xml"/></rootfiles></container>'),
    'piano.xml': strToU8(SCORE),
  });
  await input.setInputFiles({ name: 'piano.mxl', mimeType: 'application/vnd.recordare.musicxml', buffer: Buffer.from(archive) });
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save & Open in Studio', exact: true }).click();
  await page.locator('.practice-options summary').click();
  await page.getByRole('button', { name: 'Demo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
});

test('archive validation rejects missing containers, missing scores, and oversized expansion', async ({ page }) => {
  const archives = [
    zipSync({ 'score.xml': strToU8(SCORE) }),
    zipSync({ 'META-INF/container.xml': strToU8('<container><rootfiles><rootfile full-path="missing.xml"/></rootfiles></container>') }),
    zipSync({ 'score.xml': new Uint8Array(21 * 1024 * 1024) }),
  ];
  for (const archive of archives) {
    const result = page.evaluate(async input => {
      const modulePath = '/src/utils/musicXmlParser.ts';
      const { parseMusicXmlFileBuffer } = await import(modulePath);
      return parseMusicXmlFileBuffer(new Uint8Array(input).buffer, 'invalid.mxl');
    }, Array.from(archive));
    await expect(result).rejects.toThrow();
  }
});

test('existing MIDI files still import through the shared upload dispatcher', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('klavierlab_lang_v1', 'en'));
  await page.reload();
  const bytes = await page.evaluate(async () => {
    const modulePath = '/src/utils/midiFileParser.ts';
    const { createSampleBachMidiBuffer } = await import(modulePath);
    return Array.from(new Uint8Array(createSampleBachMidiBuffer().buffer));
  });
  await page.locator('main input[type="file"]').setInputFiles({ name: 'sample.mid', mimeType: 'audio/midi', buffer: Buffer.from(bytes) });
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Save & Open in Studio', exact: true }).click();
  const songs = await page.evaluate(() => JSON.parse(localStorage.getItem('klavierlab_custom_songs_v3') || '[]'));
  expect(songs).toHaveLength(1);
  expect(songs[0].isCustomMidi).toBe(true);
  expect(songs[0].notes).toHaveLength(29);
});