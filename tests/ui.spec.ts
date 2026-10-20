import { expect, Page, test } from '@playwright/test';
import { Song } from '../src/types/music';
import packageInfo from '../package.json' with { type: 'json' };
import { APP_VERSION, RELEASES } from '../src/data/releases';

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
});

test('release history matches the app version and keeps retrospective milestones explicit', () => {
  expect(APP_VERSION).toBe(packageInfo.version);
  expect(RELEASES[0].version).toBe(APP_VERSION);
  expect(RELEASES[0].reconstructed).toBe(false);
  expect(new Set(RELEASES.map(release => release.version)).size).toBe(RELEASES.length);
  for (const [index, release] of RELEASES.entries()) {
    expect(release.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(release.title.en).not.toBe('');
    expect(release.title.hu).not.toBe('');
    expect(release.changes.length).toBeGreaterThan(0);
    if (index) expect(RELEASES[index - 1].version.localeCompare(release.version, undefined, { numeric: true })).toBeGreaterThan(0);
  }
});

test('theme and language choices survive reload in both directions', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to English', exact: true }).click();
  await page.getByRole('button', { name: 'Dark Mode', exact: true }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveClass('dark');
  await expect(page.locator('.sidebar-preferences > button').first()).toHaveText('EN');
  expect(await page.evaluate(() => ({ theme: localStorage.getItem('klavierlab_theme_v1'), lang: localStorage.getItem('klavierlab_lang_v1') }))).toEqual({ theme: 'dark', lang: 'en' });
  await page.getByRole('button', { name: 'Light Mode', exact: true }).click();
  await page.locator('.sidebar-preferences > button').first().click();
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass('dark');
  await expect(page.locator('.sidebar-preferences > button').first()).toHaveText('HU');
  expect(await page.evaluate(() => ({ theme: localStorage.getItem('klavierlab_theme_v1'), lang: localStorage.getItem('klavierlab_lang_v1') }))).toEqual({ theme: 'light', lang: 'hu' });
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`practice workspace at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      localStorage.setItem('klavierlab_lang_v1', 'en');
      localStorage.setItem('klavierlab_theme_v1', 'light');
    });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Start Practice', exact: true })).toBeVisible();
    const settings = page.locator('.practice-options');
    await expect(settings).not.toHaveAttribute('open');
    await expect(page.getByRole('group', { name: 'Playback mode', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Wait-for-Note', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuous Tempo', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Listen Demo', exact: true })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Hand selection', exact: true })).toBeVisible();
    await expect(page.locator('#tempo-slider')).toBeVisible();
    await page.locator('#tempo-slider').fill('0.75');
    await expect(page.locator('#tempo-slider')).toHaveValue('0.75');
    await expect(page.locator('label[for="tempo-slider"]')).toHaveText('Tempo: 75% (63 BPM)');
    await settings.locator('summary').click();
    await page.getByRole('button', { name: 'Continuous Tempo', exact: true }).click();
    await page.getByRole('button', { name: 'Wait-for-Note', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(settings).not.toHaveAttribute('open');
    await expect(page.locator('#tempo-slider')).toBeVisible();
    await page.getByRole('button', { name: 'Start Practice', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Restart piece', exact: true }).click();
    await page.keyboard.press('a');
    await expect(page.getByText('80', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    const pixels = await page.locator('canvas').evaluate(canvas => {
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Expected the piano note canvas');
      const context = canvas.getContext('2d')!;
      const image = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let greenPixels = 0;
      for (let offset = 0; offset < image.length; offset += 4) {
        if (image[offset + 1] > image[offset] * 1.3 && image[offset + 1] > 100) greenPixels++;
      }
      return { greenPixels, width: canvas.width, cssWidth: canvas.getBoundingClientRect().width, dpr: devicePixelRatio };
    });
    expect(pixels.greenPixels).toBeGreaterThan(20);
    expect(pixels.width).toBe(Math.floor(pixels.cssWidth * pixels.dpr));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('practice.png'), fullPage: true });
    const display = page.locator('.display-options');
    await display.locator('summary').click();
    await page.getByRole('button', { name: 'Sheet Music', exact: true }).click();
    await expect(page.locator('.sheet-music')).toHaveCount(0);
    await page.getByRole('button', { name: 'Sheet Music', exact: true }).click();
    await page.getByRole('button', { name: 'Falling Notes', exact: true }).click();
    await expect(page.getByRole('slider', { name: 'Song position', exact: true })).toBeVisible();
    await page.getByRole('combobox', { name: 'Jump to measure', exact: true }).selectOption('2');
    await expect(page.getByRole('slider', { name: 'Song position', exact: true })).not.toHaveValue('0');
    await page.getByRole('slider', { name: 'Song position', exact: true }).fill('0');
    const staffScale = await page.locator('.sheet-music svg').evaluate(element => {
      if (!(element instanceof SVGSVGElement)) throw new Error('Expected the sheet music SVG');
      const transform = element.getScreenCTM()!;
      return { horizontal: transform.a, vertical: transform.d };
    });
    expect(staffScale.horizontal).toBeCloseTo(staffScale.vertical, 5);
    expect(staffScale.horizontal).toBeGreaterThan(0.7);
    await page.screenshot({ path: testInfo.outputPath('sheet-only.png'), fullPage: true });
    await page.getByRole('button', { name: 'Falling Notes', exact: true }).click();
    await page.locator('.practice-options summary').click();
    await page.getByRole('button', { name: 'Piano Synth On', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Synth Muted', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Library', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Library', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('button', { name: 'Import score (.mid, .midi, .musicxml, .xml, .mxl)', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import Sample Bach .MID', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Download Sample .MID', exact: true })).toHaveCount(0);
    await page.getByRole('searchbox', { name: 'Search library' }).fill('Beethoven');
    await expect(page.locator('.library-song')).toHaveCount(3);
    await page.locator('.library-details summary').first().click();
    await expect(page.locator('.library-details[open]')).toHaveCount(1);
    await expect(page.locator('.library-details[open] p').first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('library.png'), fullPage: true });
    await page.getByRole('searchbox').fill('no-such-piece');
    await expect(page.getByText('No matching pieces.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Progress', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your progress', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Devices', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Connect via USB / Web MIDI', exact: true })).toBeVisible();
    const history = page.getByRole('region', { name: 'Version & changelog' });
    await expect(history).toContainText(`KlavierLab v${packageInfo.version}`);
    await expect(history.locator('details[open]')).toHaveCount(1);
    await expect(history).toContainText('first explicitly tracked version');
    await history.getByText('v0.4.1', { exact: true }).click();
    await expect(history).toContainText('Use export tempo metadata when XML has no tempo');
    await expect(history.getByText('Use export tempo metadata when XML has no tempo; explicit XML tempo markings still take priority.', { exact: true })).toBeVisible();
    await history.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('changelog.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Dark Mode', exact: true }).click();
    await expect(page.locator('html')).toHaveClass('dark');
    await page.getByRole('button', { name: 'Practice', exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath('practice-dark.png'), fullPage: true });
    await page.locator('.sidebar-preferences > button').first().click();
    await expect(page.getByRole('button', { name: 'Gyakorlás', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Eszközök', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Verzió és változásnapló' })).toContainText(`KlavierLab v${packageInfo.version}`);
    await expect(page.getByRole('region', { name: 'Verzió és változásnapló' })).toContainText('Verziókövetés és változásnapló');
    expect(errors).toEqual([]);
  });
}

const PRACTICE_SONG: Song = {
  id: 'practice-regression', title: 'Practice regression', composer: 'Test', level: 1,
  bpm: 120, timeSignature: [4, 4], keySignature: 'C Major', category: 'Custom MIDI',
  handArrangement: 'two-hands', description: '', focusSkill: '', durationSeconds: 1.8, isCustomMidi: true,
  notes: [
    { id: 'right-1', midi: 60, startTime: 1.2, duration: 0.2, hand: 'right', measure: 1 },
    { id: 'left-1', midi: 48, startTime: 1.2, duration: 0.2, hand: 'left', measure: 1 },
    { id: 'right-2', midi: 64, startTime: 1.6, duration: 0.2, hand: 'right', measure: 2 },
    { id: 'left-2', midi: 52, startTime: 1.6, duration: 0.2, hand: 'left', measure: 2 },
  ],
};

async function openShortPractice(page: Page, song = PRACTICE_SONG) {
  await page.addInitScript(song => {
    localStorage.setItem('klavierlab_lang_v1', 'en');
    localStorage.setItem('klavierlab_custom_songs_v3', JSON.stringify([song]));
  }, song);
  await page.goto('/');
  await page.getByRole('button', { name: 'Choose piece', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search pieces', exact: true }).fill(song.title);
  await page.locator(`[data-picker-song="${song.id}"]`).click();
  await page.clock.install();
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`song picker organizes and searches level/upload folders at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await openShortPractice(page);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const trigger = page.getByRole('button', { name: 'Choose piece', exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Choose a piece', exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.song-picker-folder-toggle[aria-expanded="true"]')).toHaveCount(1);
    await expect(dialog.locator('[data-song-folder="level-1"] > button')).toHaveAttribute('aria-expanded', 'false');
    const search = page.getByRole('searchbox', { name: 'Search pieces', exact: true });
    await expect(search).toBeFocused();
    const uploaded = dialog.locator('[data-song-folder="uploaded"]');
    await expect(uploaded.locator('[data-picker-song]')).toHaveCount(1);
    await expect(uploaded.getByRole('button', { name: PRACTICE_SONG.title, exact: true })).toHaveAttribute('aria-current', 'true');
    await page.screenshot({ path: testInfo.outputPath('song-picker-current-folder.png'), fullPage: true });
    await expect(dialog.locator('[data-song-folder="level-1"] [data-picker-song="practice-regression"]')).toHaveCount(0);
    await uploaded.getByRole('button', { name: /^Uploaded/ }).click();
    await expect(uploaded.getByRole('button', { name: PRACTICE_SONG.title, exact: true })).not.toBeVisible();
    await search.fill('practice regression');
    await expect(uploaded.getByRole('button', { name: PRACTICE_SONG.title, exact: true })).toBeVisible();
    await expect(dialog.locator('[data-song-folder]')).toHaveCount(1);
    await search.fill('not-a-matching-title');
    await expect(dialog.getByRole('status')).toHaveText('No matching pieces.');
    await search.fill('Beethoven');
    await expect(dialog.locator('[data-picker-song]')).toHaveCount(3);
    await page.screenshot({ path: testInfo.outputPath('song-picker.png'), fullPage: true });
    const selectedId = await dialog.locator('[data-picker-song]').first().getAttribute('data-picker-song');
    await search.press('ArrowDown');
    await expect(dialog.locator('[data-picker-song]').first()).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toHaveAttribute('data-song-id', selectedId!);
    await expect(trigger).toBeFocused();
    await trigger.click();
    const firstFolder = dialog.locator('[data-song-folder="level-1"]');
    await expect(dialog.locator('.song-picker-folder-toggle[aria-expanded="true"]')).toHaveCount(1);
    await expect(firstFolder.locator('.song-picker-folder-toggle')).toHaveAttribute('aria-expanded', 'true');
    await firstFolder.locator('.song-picker-folder-toggle').click();
    await search.press('ArrowDown');
    await expect(firstFolder.locator('[data-picker-song]').first()).not.toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await trigger.click();
    await expect(firstFolder.locator('.song-picker-folder-toggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(dialog.locator('.song-picker-folder-toggle[aria-expanded="true"]')).toHaveCount(1);
    await page.keyboard.press('Escape');
    expect(errors).toEqual([]);
  });
}

test('reload restores song, mode, hands, tempo, view toggles, mute, and metronome while paused', async ({ page }) => {
  await openShortPractice(page);
  await page.locator('.practice-options summary').click();
  await page.getByRole('button', { name: 'Continuous Tempo', exact: true }).click();
  await page.getByRole('button', { name: 'Left Hand', exact: true }).click();
  await page.locator('.practice-options summary').click();
  await page.getByRole('checkbox', { name: 'Show summary after practice', exact: true }).uncheck();
  await page.keyboard.press('Escape');
  await page.locator('#tempo-slider').fill('0.65');
  await page.getByRole('button', { name: 'Metronome On', exact: true }).click();
  await page.locator('.display-options summary').click();
  await page.getByRole('button', { name: 'Falling Notes', exact: true }).click();
  await page.getByRole('button', { name: 'Key Labels', exact: true }).click();
  await page.locator('.practice-options summary').click();
  await page.getByRole('button', { name: 'Piano Synth On', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your library', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose piece', exact: true })).toHaveAttribute('data-song-id', PRACTICE_SONG.id);
  await expect(page.locator('#tempo-slider')).toHaveValue('0.65');
  await expect(page.getByRole('button', { name: 'Start Practice', exact: true })).toBeVisible();
  await expect(page.locator('.sheet-music')).toBeVisible();
  await expect(page.locator('.falling-stage')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Metronome Off', exact: true })).toBeVisible();
  await page.locator('.display-options summary').click();
  await expect(page.getByRole('button', { name: 'Sheet Music', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Falling Notes', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Key Labels', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.locator('.practice-options summary').click();
  await expect(page.getByRole('button', { name: 'Synth Muted', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('.practice-options summary').click();
  await expect(page.getByRole('button', { name: 'Continuous Tempo', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Left Hand', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('checkbox', { name: 'Show summary after practice', exact: true })).not.toBeChecked();
  expect(await page.evaluate(async () => {
    const modulePath = '/src/utils/audioSynth.ts';
    return (await import(modulePath)).pianoSynth.isMuted();
  })).toBe(true);
});

test('demo mode is remembered after reload but never autoplays', async ({ page }) => {
  await openShortPractice(page);
  await page.locator('.practice-options summary').click();
  await page.getByRole('button', { name: 'Right Hand', exact: true }).click();
  await page.getByRole('button', { name: 'Listen Demo', exact: true }).click();
  await page.reload();
  await page.locator('.practice-options summary').click();
  await expect(page.getByRole('button', { name: 'Listen Demo', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Right Hand', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toHaveCount(0);
  await expect(page.getByRole('slider', { name: 'Song position', exact: true })).toHaveValue('0');
  await expect(page.getByRole('button', { name: 'Finish & Grade', exact: true })).toHaveCount(0);
});

test('invalid stored preferences fall back safely and single-hand songs reject unavailable hands', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('klavierlab_lang_v1', 'en');
    localStorage.setItem('klavierlab_practice_preferences_v1', JSON.stringify({ activeView: 'unknown', selectedSongId: 'deleted-song', handSelection: 'left', practiceMode: 'bad-mode', tempoMultiplier: 999, isAutoDemo: 'yes', showGrandStaff: false, showFallingNotes: 'false', isMuted: 'false' }));
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Choose piece', exact: true })).toHaveAttribute('data-song-id', 'boci-boci-tarka-rh');
  await expect(page.locator('#tempo-slider')).toHaveValue('1');
  await expect(page.locator('.sheet-music')).toHaveCount(0);
  await expect(page.locator('.falling-stage')).toBeVisible();
  await page.locator('.practice-options summary').click();
  await expect(page.getByRole('button', { name: 'Right Hand', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Wait-for-Note', exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (const value of ['{broken', 'null', '[]']) {
    const preferences = await page.evaluate(async saved => {
      localStorage.setItem('klavierlab_practice_preferences_v1', saved);
      const modulePath = '/src/utils/practicePreferences.ts';
      return (await import(modulePath)).readPracticePreferences();
    }, value);
    expect(preferences).toMatchObject({ activeView: 'studio', practiceMode: 'wait-for-note', tempoMultiplier: 1, showGrandStaff: true, showFallingNotes: true, isAutoDemo: false });
  }
});

test('automatic summaries can be disabled while repeat attempts save once each', async ({ page }) => {
  await openShortPractice(page);
  await page.locator('.practice-options summary').click();
  await page.getByRole('button', { name: 'Continuous Tempo', exact: true }).click();
  await page.locator('.practice-options summary').click();
  await page.getByRole('checkbox', { name: 'Show summary after practice', exact: true }).uncheck();
  await page.keyboard.press('Escape');
  const completed = () => page.evaluate(() => JSON.parse(localStorage.getItem('klavierlab_profile_v3') || '{}').sessionsCompleted);
  const initial = await completed();
  for (let attempt = 1; attempt <= 2; attempt++) {
    await page.locator('.transport-play').click();
    await page.clock.runFor(2300);
    await expect.poll(completed).toBe(initial + attempt);
    await expect(page.getByRole('button', { name: 'Done', exact: true })).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Finish & Grade', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeVisible();
  expect(await completed()).toBe(initial + 2);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.reload();
  await page.locator('.practice-options summary').click();
  await expect(page.getByRole('checkbox', { name: 'Show summary after practice', exact: true })).not.toBeChecked();
});

test('seeking pauses and resets the attempt, and skipped notes are not graded', async ({ page }) => {
  await openShortPractice(page);
  await page.keyboard.press('a');
  await expect(page.locator('.session-toolbar')).toContainText(/Score:\s*80/);
  const position = page.getByRole('slider', { name: 'Song position', exact: true });
  await position.fill('1.4');
  await expect(position).toHaveValue('1.4');
  await expect(page.locator('.session-toolbar')).toContainText(/Score:\s*0/);
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Jump to measure', exact: true }).selectOption('2');
  await expect(position).toHaveValue('1.6');
  await page.locator('.practice-options summary').click();
  await page.getByRole('button', { name: 'Continuous Tempo', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.locator('.transport-play').click();
  await page.clock.runFor(600);
  await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeVisible();
  const stats = await page.evaluate(() => JSON.parse(localStorage.getItem('klavierlab_profile_v3') || '{}').history[0]);
  expect(stats.totalTargetNotes).toBe(2);
  expect(stats.missedNotes).toBe(2);
  expect(stats.measureAccuracies).toEqual([{ measure: 2, accuracy: 0, total: 2 }]);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await position.fill('0');
  await page.locator('.practice-options summary').click();
  await page.getByRole('button', { name: 'Wait-for-Note', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('a');
  await expect(page.locator('.session-toolbar')).toContainText(/Score:\s*80/);
});

declare global {
  interface Window {
    demoTest: { browser: number[]; hardware: number[]; stops: number };
  }
}

async function captureDemoOutput(page: Page) {
  await page.evaluate(async () => {
    window.demoTest = { browser: [], hardware: [], stops: 0 };
    const synthPath = '/src/utils/audioSynth.ts';
    const midiPath = '/src/utils/midiService.ts';
    const { pianoSynth } = await import(synthPath);
    const { midiService } = await import(midiPath);
    pianoSynth.noteOn = (midi: number) => window.demoTest.browser.push(midi);
    pianoSynth.stopAll = () => { window.demoTest.stops++; };
    midiService.sendNoteWithDuration = (midi: number) => window.demoTest.hardware.push(midi);
  });
}

for (const theme of ['light', 'dark'] as const) {
  test(`active toolbar controls use the shared green accent in ${theme} theme`, async ({ page }, testInfo) => {
    await openShortPractice(page);
    await page.evaluate(selected => localStorage.setItem('klavierlab_theme_v1', selected), theme);
    await page.reload();
    await page.getByRole('button', { name: 'Left Hand', exact: true }).click();
    await page.getByRole('button', { name: 'Metronome Off', exact: true }).click();
    await page.getByRole('button', { name: 'Listen Demo', exact: true }).click();
    for (const name of ['Left Hand', 'Metronome On', 'Listen Demo']) {
      const colors = await page.getByRole('button', { name, exact: true }).evaluate(element => {
        const actual = getComputedStyle(element);
        const shell = getComputedStyle(element.closest('.app-shell')!);
        const toHex = (color: string) => `#${color.match(/\d+/g)!.slice(0, 3).map(value => Number(value).toString(16).padStart(2, '0')).join('')}`;
        return { actualText: toHex(actual.color), actualBackground: toHex(actual.backgroundColor), accent: shell.getPropertyValue('--accent').trim(), surface: shell.getPropertyValue('--selected-surface').trim() };
      });
      expect(colors.actualText).toBe(colors.accent);
      expect(colors.actualBackground).toBe(colors.surface);
    }
    await page.screenshot({ path: testInfo.outputPath(`active-controls-${theme}.png`), fullPage: true });
  });
}

test('clicking a sheet note seeks and starts playback at its actual SVG position', async ({ page }) => {
  await openShortPractice(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.locator('.practice-options summary').click();
  await page.getByRole('button', { name: 'Continuous Tempo', exact: true }).click();
  await page.keyboard.press('Escape');
  const note = page.locator('.sheet-music .notation-event[data-note-ids="right-2"] .vf-stavenote > rect').first();
  await note.click();
  await expect(page.getByRole('slider', { name: 'Song position', exact: true })).toHaveValue('1.6');
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
});

async function sheetPoint(page: Page, fraction: number) {
  return page.locator('.sheet-music svg').evaluate((element, ratio) => {
    if (!(element instanceof SVGSVGElement)) throw new Error('Expected sheet SVG');
    const start = Number(element.dataset.contentStart || 88);
    const point = new DOMPoint(start + (element.viewBox.baseVal.width - start) * ratio, element.viewBox.baseVal.height / 2).matrixTransform(element.getScreenCTM()!);
    return { x: point.x, y: point.y };
  }, fraction);
}

test('dragging the sheet repeatedly navigates a long song and resumes from release', async ({ page }) => {
  const song: Song = { ...PRACTICE_SONG, durationSeconds: 120,
    notes: Array.from({ length: 60 }, (_, index) => ({ id: `long-${index}`, midi: 60, startTime: 1.2 + index * 2, duration: 0.2, hand: 'right', measure: index + 1 })) };
  await openShortPractice(page, song);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.getByRole('slider', { name: 'Song position', exact: true }).fill('40');
  const start = await sheetPoint(page, 0.75);
  const end = await sheetPoint(page, 0.25);
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 5 });
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toHaveCount(0);
    await page.mouse.up();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  }
  const slider = page.getByRole('slider', { name: 'Song position', exact: true });
  const later = Number(await slider.inputValue());
  expect(later).toBeGreaterThan(45);
  await page.mouse.move(end.x, end.y);
  await page.mouse.down();
  await page.mouse.move(start.x, start.y, { steps: 5 });
  await page.mouse.up();
  expect(Number(await slider.inputValue())).toBeLessThan(later);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(-10000, start.y, { steps: 2 });
  await page.mouse.up();
  expect(Number(await slider.inputValue())).toBeCloseTo(119.4);
});

test('mobile sheet-only clicks use the rendered note position without stretching', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openShortPractice(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.locator('.display-options summary').click();
  await page.getByRole('button', { name: 'Falling Notes', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.locator('.sheet-music .notation-event[data-note-ids="right-2"] .vf-stavenote > rect').first().click();
  await expect(page.getByRole('slider', { name: 'Song position', exact: true })).toHaveValue('1.6');
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('sheet-seek-mobile.png'), fullPage: true });
});

test('touch seeking works and cancelled vertical gestures leave the attempt unchanged', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openShortPractice(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const point = await sheetPoint(page, 0.5);
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 11 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(page.getByRole('slider', { name: 'Song position', exact: true })).toHaveValue('0');
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 11 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(Number(await page.getByRole('slider', { name: 'Song position', exact: true }).inputValue())).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const [hand, expected] of [['Right Hand', [60, 64]], ['Left Hand', [48, 52]], ['Both Hands', [60, 48, 64, 52]]] as const) {
  test(`demo plays only ${hand.toLowerCase()} in browser and hardware`, async ({ page }) => {
    await openShortPractice(page);
    await captureDemoOutput(page);
    await page.locator('.practice-options summary').click();
    await page.getByRole('button', { name: hand, exact: true }).click();
    await page.getByRole('button', { name: 'Listen Demo', exact: true }).click();
    await page.clock.runFor(1300);
    const rightKey = page.getByRole('button', { name: 'Piano key C4', exact: true });
    const leftKey = page.getByRole('button', { name: 'Piano key C3', exact: true });
    if (hand === 'Right Hand') {
      await expect(rightKey).toHaveClass(/bg-sky-400/);
      await expect(leftKey).not.toHaveClass(/bg-sky-400/);
    } else if (hand === 'Left Hand') {
      await expect(leftKey).toHaveClass(/bg-sky-400/);
      await expect(rightKey).not.toHaveClass(/bg-sky-400/);
    }
    await page.clock.runFor(1000);
    const played = await page.evaluate(() => window.demoTest);
    expect(played.browser).toEqual(expected);
    expect(played.hardware).toEqual(expected);
  });
}

test('switching demo hands stops old voices without replaying past notes', async ({ page }) => {
  await openShortPractice(page);
  await captureDemoOutput(page);
  await page.locator('.practice-options summary').click();
  await page.getByRole('button', { name: 'Listen Demo', exact: true }).click();
  await page.clock.runFor(1300);
  const stops = await page.evaluate(() => { window.demoTest.browser = []; window.demoTest.hardware = []; return window.demoTest.stops; });
  await page.getByRole('button', { name: 'Left Hand', exact: true }).click();
  await page.clock.runFor(800);
  const played = await page.evaluate(() => window.demoTest);
  expect(played.stops).toBeGreaterThan(stops);
  expect(played.browser).toEqual([52]);
  expect(played.hardware).toEqual([52]);
});