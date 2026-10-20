import { expect, Page, test } from '@playwright/test';

declare global {
  interface Window {
    audioProbe: { sources: number; oscillators: number; stops: number; context: AudioContext | null; analyser: AnalyserNode | null };
  }
}

function sampleWave(): Buffer {
  const rate = 22050;
  const frames = rate;
  const result = Buffer.alloc(44 + frames * 2);
  result.write('RIFF', 0);
  result.writeUInt32LE(result.length - 8, 4);
  result.write('WAVEfmt ', 8);
  result.writeUInt32LE(16, 16);
  result.writeUInt16LE(1, 20);
  result.writeUInt16LE(1, 22);
  result.writeUInt32LE(rate, 24);
  result.writeUInt32LE(rate * 2, 28);
  result.writeUInt16LE(2, 32);
  result.writeUInt16LE(16, 34);
  result.write('data', 36);
  result.writeUInt32LE(frames * 2, 40);
  for (let frame = 0; frame < frames; frame++) result.writeInt16LE(Math.round(Math.sin(frame * 2 * Math.PI * 440 / rate) * 12000), 44 + frame * 2);
  return result;
}

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('klavierlab_lang_v1', 'en');
    window.audioProbe = { sources: 0, oscillators: 0, stops: 0, context: null, analyser: null };
    const createSource = AudioContext.prototype.createBufferSource;
    const createOscillator = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createBufferSource = function () {
      const source = createSource.call(this);
      window.audioProbe.sources++;
      window.audioProbe.context = this;
      if (!window.audioProbe.analyser) {
        const analyser = this.createAnalyser();
        const silent = this.createGain();
        silent.gain.value = 0;
        analyser.connect(silent);
        silent.connect(this.destination);
        window.audioProbe.analyser = analyser;
      }
      source.connect(window.audioProbe.analyser);
      const stop = source.stop.bind(source);
      source.stop = (when?: number) => { window.audioProbe.stops++; stop(when); };
      return source;
    };
    AudioContext.prototype.createOscillator = function () {
      window.audioProbe.oscillators++;
      return createOscillator.call(this);
    };
  });
});

async function chooseSampled(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('.practice-options summary').click();
  await expect(page.getByLabel('Piano sound', { exact: true })).toHaveValue('sampled');
}

async function playNote(page: Page, duration?: number) {
  await page.evaluate(async seconds => {
    const modulePath = '/src/utils/audioSynth.ts';
    const { pianoSynth } = await import(modulePath);
    pianoSynth.noteOn(60, 100, seconds);
  }, duration);
}

test('Hungarian piano sound and mute controls are in Settings, not Display', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('.sidebar-preferences > button').first().click();
  await page.locator('.display-options summary').click();
  await expect(page.locator('.display-options').getByLabel('Zongorahang', { exact: true })).toHaveCount(0);
  await expect(page.locator('.display-options').getByRole('button', { name: 'Zongorahang Be', exact: true })).toHaveCount(0);
  await page.locator('.practice-options summary').click();
  await expect(page.getByLabel('Zongorahang', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Zongorahang Be', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Némítva', exact: true })).toBeVisible();
});

test('sampled piano produces audio, releases notes, mutes, and switches back to the original synth', async ({ page }) => {
  const wave = sampleWave();
  let requests = 0;
  await page.route('https://smpldsnds.github.io/**', async route => {
    requests++;
    await route.fulfill({ status: 200, contentType: 'audio/wav', body: wave });
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await chooseSampled(page);
  await expect(page.getByRole('status')).toContainText('Sampled piano ready', { timeout: 15000 });
  expect(requests).toBeGreaterThan(0);
  await playNote(page);
  await expect.poll(() => page.evaluate(() => {
    const analyser = window.audioProbe.analyser;
    if (!analyser) return 0;
    const signal = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(signal);
    return Math.max(...signal.map(Math.abs));
  })).toBeGreaterThan(0.001);
  const initial = await page.evaluate(() => ({ sources: window.audioProbe.sources, oscillators: window.audioProbe.oscillators, stops: window.audioProbe.stops }));
  expect(initial.sources).toBeGreaterThan(0);
  expect(initial.oscillators).toBe(0);
  await page.evaluate(async () => {
    const modulePath = '/src/utils/audioSynth.ts';
    (await import(modulePath)).pianoSynth.noteOff(60);
  });
  await expect.poll(() => page.evaluate(() => window.audioProbe.stops)).toBeGreaterThan(initial.stops);
  await playNote(page, 0.1);
  const beforeMute = await page.evaluate(() => window.audioProbe.sources);
  await page.getByRole('button', { name: 'Piano Synth On', exact: true }).click();
  await playNote(page);
  expect(await page.evaluate(() => window.audioProbe.sources)).toBe(beforeMute);
  await page.getByRole('button', { name: 'Synth Muted', exact: true }).click();
  await page.getByLabel('Piano sound', { exact: true }).selectOption('original');
  await playNote(page, 0.1);
  expect(await page.evaluate(() => window.audioProbe.oscillators)).toBeGreaterThan(0);
  const beforeReselect = requests;
  await page.getByLabel('Piano sound', { exact: true }).selectOption('sampled');
  await expect(page.getByRole('status')).toContainText('Sampled piano ready');
  expect(requests).toBe(beforeReselect);
  const beforeReload = requests;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.practice-options summary').click();
  await expect(page.getByLabel('Piano sound', { exact: true })).toHaveValue('sampled');
  await expect(page.getByRole('status')).toContainText('Sampled piano ready', { timeout: 15000 });
  expect(requests).toBe(beforeReload);
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a saved original engine choice plays without downloading piano samples', async ({ page }) => {
  let requests = 0;
  await page.route('https://smpldsnds.github.io/**', route => { requests++; return route.abort(); });
  await page.addInitScript(() => localStorage.setItem('klavierlab_practice_preferences_v1', JSON.stringify({ soundEngine: 'original' })));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('a');
  expect(await page.evaluate(() => window.audioProbe.oscillators)).toBeGreaterThan(0);
  expect(requests).toBe(0);
  await page.locator('.practice-options summary').click();
  await expect(page.getByLabel('Piano sound', { exact: true })).toHaveValue('original');
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`sound settings fit at ${viewport.width}px`, async ({ page }, testInfo) => {
    const wave = sampleWave();
    await page.setViewportSize(viewport);
    await page.route('https://smpldsnds.github.io/**', route => route.fulfill({ status: 200, contentType: 'audio/wav', body: wave }));
    await chooseSampled(page);
    await expect(page.locator('.display-options #sound-engine')).toHaveCount(0);
    await expect(page.locator('.practice-options #sound-engine')).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Sampled piano ready', { timeout: 15000 });
    await page.screenshot({ path: testInfo.outputPath('sound-settings.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.getByLabel('Piano sound', { exact: true })).not.toBeVisible();
  });
}

test('sample failures expose fallback and can be retried without breaking the original synth', async ({ page }) => {
  let failing = true;
  const wave = sampleWave();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://smpldsnds.github.io/**', route => failing ? route.abort() : route.fulfill({ status: 200, contentType: 'audio/wav', body: wave }));
  await chooseSampled(page);
  await expect(page.getByRole('status')).toContainText('Piano samples unavailable', { timeout: 15000 });
  await playNote(page, 0.1);
  expect(await page.evaluate(() => window.audioProbe.oscillators)).toBeGreaterThan(0);
  failing = false;
  await page.getByRole('button', { name: 'Retry piano loading', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Sampled piano ready', { timeout: 15000 });
  await playNote(page, 0.1);
  expect(await page.evaluate(() => window.audioProbe.sources)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('switching back during sample loading never plays released notes later', async ({ page }) => {
  let release: (() => void) | undefined;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const wave = sampleWave();
  await page.route('https://smpldsnds.github.io/**', async route => {
    await gate;
    await route.fulfill({ status: 200, contentType: 'audio/wav', body: wave });
  });
  await chooseSampled(page);
  await expect(page.getByRole('status')).toContainText('Loading piano');
  await playNote(page, 0.05);
  await page.getByLabel('Piano sound', { exact: true }).selectOption('original');
  await page.evaluate(async () => {
    const modulePath = '/src/utils/audioSynth.ts';
    const { pianoSynth } = await import(modulePath);
    const stopAll = pianoSynth.stopAll.bind(pianoSynth);
    pianoSynth.stopAll = () => { window.audioProbe.stops++; stopAll(); };
  });
  release!();
  await expect.poll(() => page.evaluate(async () => {
    const modulePath = '/src/utils/audioSynth.ts';
    return (await import(modulePath)).pianoSynth.getStatus().state;
  })).toBe('ready');
  expect(await page.evaluate(() => window.audioProbe.sources)).toBe(0);
  expect(await page.evaluate(() => window.audioProbe.stops)).toBe(0);
  await expect(page.getByLabel('Piano sound', { exact: true })).toHaveValue('original');
});