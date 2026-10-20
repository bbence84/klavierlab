import { expect, test } from '@playwright/test';
import { Song } from '../src/types/music';

const SCORE: Song = {
  id: 'notation-study', title: 'Notation Study', composer: 'Test', level: 2,
  bpm: 120, timeSignature: [4, 4], keySignature: 'C Major', category: 'Custom MIDI',
  handArrangement: 'two-hands', description: '', focusSkill: '', durationSeconds: 3.2,
  notes: [
    { id: 'c4', midi: 60, startTime: 1.2, duration: 0.5, hand: 'right', measure: 1, finger: 1 },
    { id: 'e4', midi: 64, startTime: 1.2, duration: 0.5, hand: 'right', measure: 1, finger: 3 },
    { id: 'fs4', midi: 66, startTime: 2.2, duration: 0.25, hand: 'right', measure: 1 },
    { id: 'g4', midi: 67, startTime: 2.45, duration: 0.25, hand: 'right', measure: 1 },
    { id: 'c3', midi: 48, startTime: 1.2, duration: 2, hand: 'left', measure: 1 },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await page.addInitScript(song => {
    localStorage.setItem('klavierlab_lang_v1', 'en');
    localStorage.setItem('klavierlab_custom_songs_v3', JSON.stringify([song]));
    localStorage.setItem('klavierlab_practice_preferences_v1', JSON.stringify({ selectedSongId: song.id }));
  }, SCORE);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
});

test('rhythm inference keeps articulated eighth notes simple and recognizes dots and triplets', async ({ page }) => {
  const values = await page.evaluate(async () => {
    const modulePath = '/src/utils/vexflowNotation.ts';
    const { inferRhythm, notationKey } = await import(modulePath);
    return { eighth: inferRhythm(0.46), dotted: inferRhythm(1.38), triplet: inferRhythm(1 / 3), double: inferRhythm(3.5), minor: notationKey('D Minor'), flat: notationKey('Bb Major') };
  });
  expect(values.eighth).toMatchObject({ duration: '8', dots: 0, triplet: false });
  expect(values.dotted).toMatchObject({ duration: 'q', dots: 1 });
  expect(values.triplet).toMatchObject({ duration: '8', triplet: true });
  expect(values.double).toMatchObject({ duration: 'h', dots: 2 });
  expect(values.minor).toBe('Dm');
  expect(values.flat).toBe('Bb');
});

test('VexFlow renders chords, rests, accidentals, fingering, and locally embedded fonts', async ({ page }, testInfo) => {
  const chord = page.locator('.notation-event[data-note-ids="c4 e4"]');
  await expect(chord).toBeVisible();
  await expect(chord.locator('.vf-notehead')).toHaveCount(2);
  await expect(page.locator('.notation-event[data-note-ids="fs4"]')).toContainText(String.fromCodePoint(0xe262));
  expect(await page.locator('.notation-event[data-rest="true"]').count()).toBeGreaterThan(0);
  await expect(chord.locator('text').filter({ hasText: /^[13]$/ })).toHaveCount(2);
  expect(await page.evaluate(() => document.fonts.check('40px Bravura'))).toBe(true);
  await expect(page.locator('.sheet-music svg')).toHaveAttribute('data-renderer', 'vexflow');
  await page.screenshot({ path: testInfo.outputPath('vexflow-notation.png'), fullPage: true });
});

test('playback scrolls and highlights existing engraving without recreating it every frame', async ({ page }) => {
  await expect(page.locator('.notation-event[data-note-ids="c4 e4"]')).toBeVisible();
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.getByRole('button', { name: 'Listen Demo', exact: true }).click();
  const chord = page.locator('.notation-event[data-note-ids="c4 e4"]');
  await chord.evaluate(group => group.setAttribute('data-probe', 'retained'));
  const before = await page.locator('.notation-timeline').getAttribute('transform');
  await page.clock.runFor(1300);
  await expect(chord).toHaveAttribute('data-probe', 'retained');
  await expect(chord).toHaveAttribute('data-active', 'true');
  expect(await page.locator('.notation-timeline').getAttribute('transform')).not.toBe(before);
});

test('all built-in scores render and seek without VexFlow runtime failures', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const songs: Song[] = await page.evaluate(async () => {
    const modulePath = '/src/data/songs.ts';
    return (await import(modulePath)).INITIAL_SONGS;
  });
  for (const song of songs) {
    await page.getByRole('button', { name: 'Choose piece', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search pieces', exact: true }).fill(song.title);
    await page.locator(`[data-picker-song="${song.id}"]`).click();
    await expect(page.locator('.sheet-music .vf-clef')).toHaveCount(2);
    await page.getByRole('slider', { name: 'Song position', exact: true }).fill(String(Math.min(5, song.durationSeconds / 2)));
    await expect(page.locator('.sheet-music .notation-event').first()).toBeVisible();
    expect(errors, song.title).toEqual([]);
  }
});