import { expect, Page, test } from '@playwright/test';

declare global {
  interface Window {
    midiTest: {
      writes: { mode: string; bytes: number[] }[];
      activeWrites: number;
      maxConcurrentWrites: number;
      pickerCalls: number;
    };
    midiOsTest: {
      writes: number[][];
      inputOpens: number;
      outputOpens: number;
      closes: number;
      pickerCalls: number;
      inputNotes: number[];
      emit: () => void;
      setConnected: (connected: boolean) => void;
      hasStateListener: () => boolean;
    };
  }
}

async function mockOsMidi(page: Page, options: { permission?: string; hasInput?: boolean; hasOutput?: boolean; bleBusy?: boolean; name?: string; rejectOutput?: boolean } = {}) {
  await page.addInitScript(settings => {
    localStorage.setItem('klavierlab_midi_device_v1', settings.name || 'Example Digital Piano');
    window.midiOsTest = {
      writes: [], inputOpens: 0, outputOpens: 0, closes: 0, pickerCalls: 0, inputNotes: [],
      emit: () => {}, setConnected: () => {}, hasStateListener: () => false,
    };
    const input = {
      name: settings.name || 'Example Digital Piano', state: 'connected', onmidimessage: null as ((event: { data: Uint8Array }) => void) | null,
      open: async () => { window.midiOsTest.inputOpens++; },
      close: async () => { window.midiOsTest.closes++; },
    };
    const output = {
      name: settings.name || 'Example Digital Piano', state: 'connected',
      open: async () => {
        window.midiOsTest.outputOpens++;
        if (settings.rejectOutput) throw new Error('Output is in use by another application');
      },
      close: async () => { window.midiOsTest.closes++; },
      send: (bytes: number[]) => { window.midiOsTest.writes.push(Array.from(bytes)); },
    };
    const access = {
      inputs: new Map(settings.hasInput === false ? [] : [['input', input]]),
      outputs: new Map(settings.hasOutput === false ? [] : [['output', output]]),
      onstatechange: null as (() => void) | null,
    };
    window.midiOsTest.emit = () => input.onmidimessage?.({ data: new Uint8Array([0x90, 60, 95]) });
    window.midiOsTest.hasStateListener = () => Boolean(access.onstatechange);
    window.midiOsTest.setConnected = connected => {
      input.state = output.state = connected ? 'connected' : 'disconnected';
      access.onstatechange?.();
    };
    Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: async () => {
      if (settings.permission === 'denied') throw new DOMException('MIDI access denied', 'NotAllowedError');
      return access;
    } });
    const originalQuery = navigator.permissions.query.bind(navigator.permissions);
    Object.defineProperty(navigator.permissions, 'query', { configurable: true, value: (descriptor: PermissionDescriptor) =>
      descriptor.name === ('midi' as PermissionName) ? Promise.resolve({ state: settings.permission || 'granted' }) : originalQuery(descriptor) });
    const busyDevice = Object.assign(new EventTarget(), { id: 'keyboard-1', name: 'Example Digital Piano', gatt: {
      connected: false,
      connect: async () => { throw new Error('Device is held by the OS'); },
    } });
    Object.defineProperty(navigator, 'bluetooth', { configurable: true, value: {
      getDevices: async () => settings.bleBusy ? [busyDevice] : [],
      requestDevice: async () => { window.midiOsTest.pickerCalls++; throw new Error('User cancelled the device picker'); },
    } });
  }, options);
  await page.goto('/');
}

async function connectBluetooth(page: Page) {
  return page.evaluate(async () => {
    const modulePath = '/src/utils/midiService.ts';
    const { midiService } = await import(modulePath);
    const connected = await midiService.connectWebBluetooth();
    return { connected, info: midiService.getConnectionInfo() };
  });
}

test('remembered OS-connected keyboard reconnects after reload without opening the BLE picker', async ({ page }) => {
  await mockOsMidi(page);
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await page.reload();
    const result = await connectBluetooth(page);
    expect(result.connected).toBe(true);
    expect(result.info).toMatchObject({ transport: 'web-midi', outputAvailable: true, outputName: 'Example Digital Piano' });
    expect(await page.evaluate(() => window.midiOsTest.pickerCalls)).toBe(0);
    expect(await page.evaluate(() => window.midiOsTest.outputOpens)).toBe(1);
  }
});

test('failed BLE reconnection falls back to OS ports before another device scan', async ({ page }) => {
  await mockOsMidi(page, { permission: 'prompt', bleBusy: true });
  expect((await connectBluetooth(page)).info.transport).toBe('web-midi');
  expect(await page.evaluate(() => window.midiOsTest.pickerCalls)).toBe(0);
});

test('Web MIDI opens output, sends note-on/off, and detaches input and hotplug on disconnect', async ({ page }) => {
  await mockOsMidi(page);
  await connectBluetooth(page);
  await page.evaluate(async () => {
    const modulePath = '/src/utils/midiService.ts';
    const { midiService } = await import(modulePath);
    midiService.onNote((_type: string, midi: number) => window.midiOsTest.inputNotes.push(midi));
    window.midiOsTest.emit();
    midiService.sendNoteWithDuration(60, 90, 0.04);
  });
  await expect.poll(() => page.evaluate(() => window.midiOsTest.writes)).toEqual([[0x90, 60, 90], [0x80, 60, 0]]);
  await page.evaluate(async () => {
    const modulePath = '/src/utils/midiService.ts';
    const { midiService } = await import(modulePath);
    midiService.disconnect();
    window.midiOsTest.emit();
    window.midiOsTest.setConnected(false);
  });
  const result = await page.evaluate(() => ({ notes: window.midiOsTest.inputNotes, closes: window.midiOsTest.closes, listener: window.midiOsTest.hasStateListener() }));
  expect(result).toEqual({ notes: [60], closes: 2, listener: false });
});

test('empty Web MIDI access is not reported connected; input-only access does not claim output', async ({ page }) => {
  await mockOsMidi(page, { hasInput: false, hasOutput: false });
  expect((await connectBluetooth(page)).connected).toBe(false);
  await page.evaluate(async () => {
    const modulePath = '/src/utils/midiService.ts';
    const { midiService } = await import(modulePath);
    const connected = await midiService.connectWebMidi();
    if (connected) throw new Error('Empty MIDI access was incorrectly reported connected');
  });
});

test('input-only keyboard connection remains usable but reports output unavailable', async ({ page }) => {
  await mockOsMidi(page, { hasOutput: false });
  expect((await connectBluetooth(page)).info).toMatchObject({ status: 'connected', outputAvailable: false, outputName: null });
  await page.evaluate(() => localStorage.setItem('klavierlab_lang_v1', 'en'));
  await page.reload();
  await connectBluetooth(page);
  await page.getByRole('button', { name: 'Devices', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Test piano output', exact: true })).toBeDisabled();
});

test('hotplug disconnect/reconnect updates actual port availability', async ({ page }) => {
  await mockOsMidi(page);
  await connectBluetooth(page);
  await page.evaluate(() => window.midiOsTest.setConnected(false));
  await expect.poll(() => page.evaluate(async () => {
    const modulePath = '/src/utils/midiService.ts';
    return (await import(modulePath)).midiService.getConnectionInfo().status;
  })).toBe('disconnected');
  await page.evaluate(() => window.midiOsTest.setConnected(true));
  await expect.poll(() => page.evaluate(async () => {
    const modulePath = '/src/utils/midiService.ts';
    return (await import(modulePath)).midiService.getConnectionInfo().outputAvailable;
  })).toBe(true);
});

test('denied OS MIDI permission does not produce a false successful connection', async ({ page }) => {
  await mockOsMidi(page, { permission: 'denied' });
  expect((await connectBluetooth(page)).connected).toBe(false);
});

test('failed output open is exposed while input remains connected', async ({ page }) => {
  await mockOsMidi(page, { rejectOutput: true });
  const result = await connectBluetooth(page);
  expect(result.connected).toBe(true);
  expect(result.info.outputAvailable).toBe(false);
  expect(result.info.outputErrorMessage).toContain('Output is in use');
});

test('Devices test note uses the opened hardware output on desktop and mobile', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockOsMidi(page);
  await connectBluetooth(page);
  await page.evaluate(() => localStorage.setItem('klavierlab_lang_v1', 'en'));
  await page.reload();
  await connectBluetooth(page);
  await page.getByRole('button', { name: 'Devices', exact: true }).click();
  await expect(page.locator('.midi-device-info')).toContainText('Example Digital Piano');
  await page.getByRole('button', { name: 'Test piano output', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.midiOsTest.writes.some(bytes => bytes[0] === 0x90 && bytes[1] === 60))).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('devices-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('devices-mobile.png'), fullPage: true });
});

async function mockBle(page: Page, options: { withoutResponse?: boolean; rejectWithoutResponse?: boolean; rejectAll?: boolean } = {}) {
  await page.addInitScript(settings => {
    window.midiTest = { writes: [], activeWrites: 0, maxConcurrentWrites: 0, pickerCalls: 0 };
    const write = async (mode: string, value: BufferSource) => {
      window.midiTest.activeWrites++;
      window.midiTest.maxConcurrentWrites = Math.max(window.midiTest.maxConcurrentWrites, window.midiTest.activeWrites);
      await new Promise<void>(resolve => queueMicrotask(resolve));
      window.midiTest.activeWrites--;
      if (settings.rejectAll || (settings.rejectWithoutResponse && mode === 'without')) throw new Error('GATT write rejected');
      window.midiTest.writes.push({ mode, bytes: Array.from(new Uint8Array(value as ArrayBuffer)) });
    };
    const characteristic = new EventTarget();
    Object.assign(characteristic, {
      properties: { write: true, writeWithoutResponse: settings.withoutResponse ?? true },
      startNotifications: async () => characteristic,
      writeValueWithoutResponse: (value: BufferSource) => write('without', value),
      writeValueWithResponse: (value: BufferSource) => write('with', value),
    });
    const device = new EventTarget();
    const server = {
      connected: false,
      connect: async () => { server.connected = true; return server; },
      disconnect: () => { server.connected = false; device.dispatchEvent(new Event('gattserverdisconnected')); },
      getPrimaryService: async () => ({ getCharacteristic: async () => characteristic }),
    };
    Object.assign(device, { id: 'keyboard-1', name: 'Example Digital Piano', gatt: server });
    Object.defineProperty(navigator, 'bluetooth', { configurable: true, value: {
      getDevices: async () => [device],
      requestDevice: async () => { window.midiTest.pickerCalls++; return device; },
    } });
  }, options);
  await page.goto('/');
  await page.evaluate(async () => {
    const modulePath = '/src/utils/midiService.ts';
    const { midiService } = await import(modulePath);
    await midiService.connectWebBluetooth();
  });
}

test('BLE MIDI output uses the advertised write mode and serializes chord packets', async ({ page }) => {
  await mockBle(page, { withoutResponse: false });
  await page.evaluate(async () => {
    const modulePath = '/src/utils/midiService.ts';
    const { midiService } = await import(modulePath);
    for (const midi of [60, 64, 67]) midiService.sendMidiMessage([0x90, midi, 90]);
  });
  await expect.poll(() => page.evaluate(() => window.midiTest.writes.length)).toBe(3);
  const result = await page.evaluate(() => window.midiTest);
  expect(result.maxConcurrentWrites).toBe(1);
  expect(result.writes.map(write => write.mode)).toEqual(['with', 'with', 'with']);
  expect(result.writes.map(write => write.bytes.slice(2))).toEqual([[0x90, 60, 90], [0x90, 64, 90], [0x90, 67, 90]]);
});

test('BLE MIDI output falls back when without-response writes fail', async ({ page }) => {
  await mockBle(page, { rejectWithoutResponse: true });
  await page.evaluate(async () => {
    const modulePath = '/src/utils/midiService.ts';
    const { midiService } = await import(modulePath);
    midiService.sendMidiMessage([0x90, 60, 90]);
  });
  await expect.poll(() => page.evaluate(() => window.midiTest.writes.map(write => write.mode))).toEqual(['with']);
});

test('BLE MIDI output failures are surfaced instead of silently discarded', async ({ page }) => {
  await mockBle(page, { rejectAll: true });
  await page.evaluate(async () => {
    const modulePath = '/src/utils/midiService.ts';
    const { midiService } = await import(modulePath);
    midiService.sendMidiMessage([0x90, 60, 90]);
  });
  await expect.poll(() => page.evaluate(async () => {
    const modulePath = '/src/utils/midiService.ts';
    const { midiService } = await import(modulePath);
    return midiService.getConnectionInfo().outputErrorMessage;
  })).toContain('GATT write rejected');
});

test('demo playback sends notes through a Windows-style response-only BLE characteristic', async ({ page }) => {
  await mockBle(page, { withoutResponse: false });
  await page.evaluate(() => localStorage.setItem('klavierlab_lang_v1', 'en'));
  await page.reload();
  await connectBluetooth(page);
  await page.locator('.practice-options summary').click();
  await page.getByRole('button', { name: 'Demo', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.midiTest.writes.some(write => write.mode === 'with' && write.bytes[2] === 0x90 && write.bytes[3] === 60))).toBe(true);
});