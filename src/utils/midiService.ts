import { MidiConnectionInfo, MidiPacketLog } from '../types/music';
import { midiToNoteName } from './musicTheory';

// Standard Bluetooth Low Energy MIDI UUIDs
export const BLE_MIDI_SERVICE_UUID = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
export const BLE_MIDI_CHARACTERISTIC_UUID = '7772e5db-3868-4112-a1a9-f2669d106bf3';

export type MidiNoteCallback = (
  type: 'noteon' | 'noteoff',
  midi: number,
  velocity: number,
  source: 'BLE-MIDI' | 'WebMIDI' | 'Virtual'
) => void;

export type MidiLogCallback = (log: MidiPacketLog) => void;
export type MidiStatusCallback = (info: MidiConnectionInfo) => void;

// Minimal Web Bluetooth TypeScript declarations for browsers supporting navigator.bluetooth
interface BluetoothGATTCharacteristic {
  properties?: { write?: boolean; writeWithoutResponse?: boolean };
  startNotifications(): Promise<BluetoothGATTCharacteristic>;
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
  writeValueWithoutResponse?(value: BufferSource): Promise<void>;
  writeValueWithResponse?(value: BufferSource): Promise<void>;
  writeValue?(value: BufferSource): Promise<void>;
  value?: DataView;
}
interface BluetoothGATTService {
  getCharacteristic(uuid: string): Promise<BluetoothGATTCharacteristic>;
}
interface BluetoothGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothGATTServer>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<BluetoothGATTService>;
}
interface BluetoothDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: BluetoothGATTServer;
}

interface WebMidiOutputPort {
  id?: string;
  name?: string;
  state?: string;
  connection?: string;
  open?(): Promise<unknown>;
  close?(): Promise<unknown>;
  send(data: number[] | Uint8Array, timestamp?: number): void;
}

interface WebMidiInputPort {
  name?: string;
  state?: string;
  connection?: string;
  open?(): Promise<unknown>;
  close?(): Promise<unknown>;
  onmidimessage: ((event: { data: Uint8Array }) => void) | null;
}

interface WebMidiAccess {
  inputs: Map<string, WebMidiInputPort>;
  outputs: Map<string, WebMidiOutputPort>;
  onstatechange: (() => void) | null;
}

class MidiHardwareService {
  private noteListeners: Set<MidiNoteCallback> = new Set();
  private logListeners: Set<MidiLogCallback> = new Set();
  private statusListeners: Set<MidiStatusCallback> = new Set();
  private bleDevice: BluetoothDevice | null = null;
  private bleDisconnectListener: (() => void) | null = null;
  private bleNoteListener: ((event: Event) => void) | null = null;
  private bleCharacteristic: BluetoothGATTCharacteristic | null = null;
  private bleWriteQueue: Promise<void> = Promise.resolve();
  private bleWriteGeneration = 0;
  private midiAccess: WebMidiAccess | null = null;
  private boundMidiInputs: WebMidiInputPort[] = [];
  private midiBindingGeneration = 0;
  private midiOutputs: WebMidiOutputPort[] = [];
  private activeOutputTimers: Set<number> = new Set();
  private activeOutputNotes: Set<number> = new Set();
  private connectionInfo: MidiConnectionInfo = {
    status: 'disconnected',
    transport: 'none',
    deviceName: null,
    errorMessage: null,
    webBluetoothSupported: typeof navigator !== 'undefined' && 'bluetooth' in navigator,
    webMidiSupported: typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      const handleUnload = () => {
        this.disconnect();
      };
      window.addEventListener('beforeunload', handleUnload);
      window.addEventListener('pagehide', handleUnload);
    }
  }

  public getConnectionInfo(): MidiConnectionInfo {
    return {
      ...this.connectionInfo,
      outputAvailable: this.midiOutputs.length > 0 || Boolean(this.bleCharacteristic && this.bleDevice?.gatt?.connected && this.bleCanWrite(this.bleCharacteristic)),
      outputName: this.midiOutputs.length > 0
        ? this.midiOutputs.map(output => output.name || 'MIDI output').join(', ')
        : this.bleCharacteristic && this.bleDevice?.gatt?.connected && this.bleCanWrite(this.bleCharacteristic) ? 'BLE MIDI' : null,
      webBluetoothSupported: typeof navigator !== 'undefined' && 'bluetooth' in navigator,
      webMidiSupported: typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator,
    };
  }

  public onNote(cb: MidiNoteCallback): () => void {
    this.noteListeners.add(cb);
    return () => this.noteListeners.delete(cb);
  }

  public onLog(cb: MidiLogCallback): () => void {
    this.logListeners.add(cb);
    return () => this.logListeners.delete(cb);
  }

  public onStatusChange(cb: MidiStatusCallback): () => void {
    this.statusListeners.add(cb);
    cb(this.getConnectionInfo());
    return () => this.statusListeners.delete(cb);
  }

  private updateStatus(partial: Partial<MidiConnectionInfo>) {
    this.connectionInfo = {
      ...this.getConnectionInfo(),
      ...partial,
    };
    const snapshot = this.getConnectionInfo();
    this.statusListeners.forEach((cb) => cb(snapshot));
  }

  private emitNote(
    type: 'noteon' | 'noteoff',
    midi: number,
    velocity: number,
    source: 'BLE-MIDI' | 'WebMIDI' | 'Virtual',
    rawBytes: number[]
  ) {
    this.noteListeners.forEach((cb) => cb(type, midi, velocity, source));

    const hexString = rawBytes
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');

    const now = new Date();
    const timeStr = `${now.toTimeString().split(' ')[0]}.${String(now.getMilliseconds()).padStart(3, '0')}`;

    const logEntry: MidiPacketLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: timeStr,
      source,
      rawHex: hexString,
      type: type === 'noteon' ? 'Note On' : 'Note Off',
      midi,
      noteName: midiToNoteName(midi),
      velocity,
    };
    this.logListeners.forEach((cb) => cb(logEntry));
  }

  /**
   * Sends a raw 3-byte MIDI message (e.g., [0x90, midi, vel] or [0x80, midi, 0])
   * to any connected USB/Web MIDI Output port AND/OR BLE MIDI characteristic.
   */
  public sendMidiMessage(bytes: [number, number, number]) {
    // 1. Send to all connected Web MIDI (USB / OS Bluetooth) output ports
    if (this.midiOutputs.length > 0) {
      let delivered = false;
      let failure: unknown;
      for (const output of this.midiOutputs) {
        try {
          output.send(bytes);
          delivered = true;
        } catch (error: unknown) {
          failure = error;
        }
      }
      if (delivered) {
        if (this.connectionInfo.outputErrorMessage) this.updateStatus({ outputErrorMessage: null });
        return;
      }
      this.updateStatus({ outputErrorMessage: `MIDI output failed: ${failure instanceof Error ? failure.message : String(failure)}` });
    }

    // 2. Send to connected BLE MIDI characteristic if available
    if (this.bleCharacteristic && this.bleDevice?.gatt?.connected) {
      const nowMs = Date.now() & 0x1fff; // 13-bit BLE MIDI timestamp
      const headerByte = 0x80 | ((nowMs >> 7) & 0x3f);
      const timestampByte = 0x80 | (nowMs & 0x7f);
      const packet = new Uint8Array([headerByte, timestampByte, bytes[0], bytes[1], bytes[2]]);
      const characteristic = this.bleCharacteristic;
      const device = this.bleDevice;
      const generation = this.bleWriteGeneration;
      this.bleWriteQueue = this.bleWriteQueue.then(async () => {
        if (generation !== this.bleWriteGeneration || this.bleCharacteristic !== characteristic || !device?.gatt?.connected) return;
        const writers: ((value: BufferSource) => Promise<void>)[] = [];
        if (characteristic.properties?.writeWithoutResponse !== false && characteristic.writeValueWithoutResponse) {
          writers.push(value => characteristic.writeValueWithoutResponse!(value));
        }
        if (characteristic.properties?.write !== false) {
          if (characteristic.writeValueWithResponse) writers.push(value => characteristic.writeValueWithResponse!(value));
          else if (characteristic.writeValue) writers.push(value => characteristic.writeValue!(value));
        }
        let failure: unknown = new Error('The BLE MIDI characteristic does not support writing.');
        for (const write of writers) {
          try {
            await write(packet);
            if (this.connectionInfo.outputErrorMessage && this.bleCharacteristic === characteristic) this.updateStatus({ outputErrorMessage: null });
            return;
          } catch (error: unknown) {
            failure = error;
          }
        }
        if (this.bleCharacteristic === characteristic) this.updateStatus({ outputErrorMessage: `MIDI output failed: ${failure instanceof Error ? failure.message : String(failure)}` });
      }).catch((error: unknown) => {
        this.updateStatus({ outputErrorMessage: `MIDI output failed: ${error instanceof Error ? error.message : String(error)}` });
      });
    }
  }

  /**
   * Plays a note on the connected hardware MIDI keyboard (USB or Bluetooth) for a given duration.
   * Used during Demo Mode and automatic single-hand accompaniment so the piano's own speakers sound.
   */
  public sendNoteWithDuration(midi: number, velocity: number = 85, durationSeconds: number = 0.4) {
    const clampedMidi = Math.max(0, Math.min(127, Math.round(midi)));
    const clampedVel = Math.max(1, Math.min(127, Math.round(velocity)));

    this.activeOutputNotes.add(clampedMidi);
    this.sendMidiMessage([0x90, clampedMidi, clampedVel]);

    const timeoutMs = Math.max(40, Math.round(durationSeconds * 1000));
    const timerId = window.setTimeout(() => {
      this.activeOutputTimers.delete(timerId);
      this.activeOutputNotes.delete(clampedMidi);
      this.sendMidiMessage([0x80, clampedMidi, 0]);
    }, timeoutMs);

    this.activeOutputTimers.add(timerId);
  }

  /**
   * Immediately silences any active hardware MIDI output notes (e.g. when pausing or resetting).
   */
  public stopAllOutputNotes() {
    this.bleWriteGeneration++;
    this.activeOutputTimers.forEach((id) => window.clearTimeout(id));
    this.activeOutputTimers.clear();

    this.activeOutputNotes.forEach((midi) => {
      this.sendMidiMessage([0x80, midi, 0]);
    });
    this.activeOutputNotes.clear();

    // Standard MIDI CC 123: All Notes Off on Channel 1
    this.sendMidiMessage([0xb0, 123, 0]);
  }

  /**
   * Establishes GATT connection and subscribes to BLE MIDI notifications for a given BluetoothDevice.
   */
  private async bindBleDevice(device: BluetoothDevice): Promise<boolean> {
    this.releaseBleDevice();
    this.bleDevice = device;
    this.bleDisconnectListener = () => {
      if (this.bleDevice !== device) return;
      this.stopAllOutputNotes();
      this.releaseBleDevice();
      this.updateStatus({
        status: 'disconnected',
        transport: 'none',
        deviceName: null,
        errorMessage: 'Bluetooth MIDI keyboard disconnected.',
      });
    };
    device.addEventListener('gattserverdisconnected', this.bleDisconnectListener);

    if (!device.gatt) {
      throw new Error('Selected Bluetooth device does not expose a GATT server.');
    }

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(BLE_MIDI_SERVICE_UUID);
    const characteristic = await service.getCharacteristic(BLE_MIDI_CHARACTERISTIC_UUID);
    this.bleCharacteristic = characteristic;

    await characteristic.startNotifications();
    this.bleNoteListener = (event: Event) => {
      if (this.bleDevice !== device || this.bleCharacteristic !== characteristic) return;
      const target = event.target as unknown as BluetoothGATTCharacteristic;
      if (target && target.value) {
        this.parseBleMidiPacket(target.value);
      }
    };
    characteristic.addEventListener('characteristicvaluechanged', this.bleNoteListener);
    this.releaseWebMidiPorts();

    this.updateStatus({
      status: 'connected',
      transport: 'web-bluetooth',
      deviceName: device.name || 'Bluetooth LE MIDI Keyboard',
      errorMessage: null,
      outputErrorMessage: null,
    });
    this.rememberDevice(device.name);
    return true;
  }

  private bleCanWrite(characteristic: BluetoothGATTCharacteristic): boolean {
    return Boolean((characteristic.properties?.writeWithoutResponse !== false && characteristic.writeValueWithoutResponse)
      || (characteristic.properties?.write !== false && (characteristic.writeValueWithResponse || characteristic.writeValue)));
  }

  private releaseBleDevice() {
    const device = this.bleDevice;
    const characteristic = this.bleCharacteristic;
    this.bleDevice = null;
    this.bleCharacteristic = null;
    this.bleWriteGeneration++;
    if (device && this.bleDisconnectListener) device.removeEventListener('gattserverdisconnected', this.bleDisconnectListener);
    if (characteristic && this.bleNoteListener) characteristic.removeEventListener('characteristicvaluechanged', this.bleNoteListener);
    this.bleDisconnectListener = null;
    this.bleNoteListener = null;
    if (device?.gatt?.connected) device.gatt.disconnect();
  }

  private rememberDevice(name?: string) {
    if (!name) return;
    try { localStorage.setItem('klavierlab_midi_device_v1', name); } catch {}
  }

  private async tryPairedMidi(allowPermissionPrompt: boolean): Promise<boolean> {
    const nav = navigator as unknown as { requestMIDIAccess?: (options: { sysex: boolean }) => Promise<WebMidiAccess> };
    if (!nav.requestMIDIAccess) return false;
    try {
      if (!allowPermissionPrompt) {
        const permission = await navigator.permissions.query({ name: 'midi', sysex: false } as unknown as PermissionDescriptor);
        if (permission.state !== 'granted') return false;
      }
      return await this.bindWebMidiAccess(await nav.requestMIDIAccess({ sysex: false }), true);
    } catch {
      return false;
    }
  }

  /**
   * Connects directly to any Bluetooth LE MIDI keyboard
   * using the standard Web Bluetooth GATT API.
  * Reuses authorized OS MIDI ports or BLE devices before requesting a new BLE device.
   */
  public async connectWebBluetooth(): Promise<boolean> {
    if (this.connectionInfo.status === 'connected') return true;
    const nav = navigator as unknown as {
      bluetooth?: {
        getDevices?: () => Promise<BluetoothDevice[]>;
        requestDevice(options: unknown): Promise<BluetoothDevice>;
      };
    };

    if (await this.tryPairedMidi(false)) return true;
    if (!nav.bluetooth) {
      this.updateStatus({
        status: 'error',
        errorMessage:
          'Web Bluetooth API is not enabled in this browser. Use Chrome, Edge, or the Electron Desktop app, or connect via Web MIDI.',
      });
      return false;
    }

    try {
      this.updateStatus({ status: 'connecting', errorMessage: null });

      // 1. Try reconnecting to an already-authorized BLE device first (via getDevices)
      // because on macOS/Windows, an OS-bonded BLE MIDI keyboard stops advertising after the 1st session!
      let attemptedReconnect = false;
      if (typeof nav.bluetooth.getDevices === 'function') {
        try {
          const permittedDevices = await nav.bluetooth.getDevices();
          for (const existingDevice of permittedDevices) {
            if (existingDevice.gatt) {
              attemptedReconnect = true;
              try {
                const ok = await this.bindBleDevice(existingDevice);
                if (ok) return true;
              } catch {
                this.releaseBleDevice();
              }
            }
          }
        } catch {
          // Ignore if getDevices() is disabled by browser flags
        }
      }

      if (attemptedReconnect && await this.tryPairedMidi(true)) return true;

      // 2. Request device from BLE scanner
      const device = await nav.bluetooth.requestDevice({
        filters: [{ services: [BLE_MIDI_SERVICE_UUID] }],
        optionalServices: [BLE_MIDI_SERVICE_UUID],
      });

      return await this.bindBleDevice(device);
    } catch (err: unknown) {
      this.releaseBleDevice();
      const msg = err instanceof Error ? err.message : String(err);
      const isCancelled = msg.toLowerCase().includes('cancelled') || msg.toLowerCase().includes('canceled') || msg.toLowerCase().includes('user');
      const isPermissionsPolicy = msg.toLowerCase().includes('permissions policy') || msg.toLowerCase().includes('disallowed');

      // 3. If the user closed the empty BLE scanner because macOS/Windows already holds the connection,
      // check if the keyboard is already available via Web MIDI (OS-level MIDI port) and connect automatically!
      if (await this.tryPairedMidi(true)) return true;

      let friendlyError = msg;
      if (isCancelled) {
        friendlyError = 'Bluetooth selection was cancelled. If macOS already owns the keyboard connection, connect it in Audio MIDI Setup > MIDI Studio > Bluetooth, then use USB / Web MIDI here. Forgetting the device is not normally required.';
      } else if (isPermissionsPolicy) {
        friendlyError =
          'Browser iframe blocked direct Bluetooth scan. Open the app in a standalone tab/Electron window or use Web MIDI API after OS pairing.';
      }

      this.updateStatus({
        status: 'disconnected',
        errorMessage: friendlyError,
      });
      return false;
    }
  }

  /**
   * Connects via standard Web MIDI API (supports USB MIDI cables and OS-paired Bluetooth MIDI on macOS Audio MIDI Setup & Windows).
   */
  public async connectWebMidi(): Promise<boolean> {
    const nav = navigator as unknown as {
      requestMIDIAccess?: (options?: { sysex?: boolean }) => Promise<WebMidiAccess>;
    };

    if (!nav.requestMIDIAccess) {
      this.updateStatus({
        status: 'error',
        errorMessage: 'Web MIDI API is not available in this browser.',
      });
      return false;
    }

    try {
      this.updateStatus({ status: 'connecting', errorMessage: null });
      const midiAccess = await nav.requestMIDIAccess({ sysex: false });

      return await this.bindWebMidiAccess(midiAccess, false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.updateStatus({
        status: 'error',
        errorMessage: `Web MIDI access could not be initialized: ${msg}`,
      });
      return false;
    }
  }

  private releaseWebMidiPorts() {
    this.midiBindingGeneration++;
    if (this.midiAccess) this.midiAccess.onstatechange = null;
    this.midiAccess = null;
    for (const input of this.boundMidiInputs) {
      input.onmidimessage = null;
      void input.close?.().catch(() => {});
    }
    for (const output of this.midiOutputs) void output.close?.().catch(() => {});
    this.boundMidiInputs = [];
    this.midiOutputs = [];
  }

  private async bindWebMidiAccess(access: WebMidiAccess, pianoOnly: boolean): Promise<boolean> {
    let savedName = '';
    try { savedName = localStorage.getItem('klavierlab_midi_device_v1') || ''; } catch {}
    const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchesPiano = (name?: string) => Boolean(name && savedName && normalize(name) === normalize(savedName));
    const inputs = Array.from(access.inputs.values()).filter(port => port.state !== 'disconnected' && (!pianoOnly || matchesPiano(port.name)));
    const outputs = Array.from(access.outputs.values()).filter(port => port.state !== 'disconnected' && (!pianoOnly || matchesPiano(port.name)));
    if (pianoOnly && !inputs.length && !outputs.length && this.midiAccess !== access) return false;
    if (this.midiAccess !== access) this.releaseWebMidiPorts();
    const generation = ++this.midiBindingGeneration;
    this.midiAccess = access;
    access.onstatechange = null;
    const openedInputs: WebMidiInputPort[] = [];
    const openedOutputs: WebMidiOutputPort[] = [];
    let outputError: string | null = null;
    for (const input of inputs) {
      try {
        await input.open?.();
        if (generation !== this.midiBindingGeneration) return false;
        openedInputs.push(input);
      } catch {}
    }
    for (const output of outputs) {
      try {
        await output.open?.();
        if (generation !== this.midiBindingGeneration) return false;
        openedOutputs.push(output);
      } catch (error: unknown) {
        outputError = `Could not open MIDI output: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
    if (generation !== this.midiBindingGeneration) return false;
    for (const input of this.boundMidiInputs) {
      input.onmidimessage = null;
      if (!openedInputs.includes(input)) void input.close?.().catch(() => {});
    }
    for (const output of this.midiOutputs) {
      if (!openedOutputs.includes(output)) void output.close?.().catch(() => {});
    }
    this.boundMidiInputs = openedInputs;
    this.midiOutputs = openedOutputs;
    for (const input of openedInputs) {
      input.onmidimessage = event => this.parseStandardMidiBytes(Array.from(event.data), 'WebMIDI');
    }
    access.onstatechange = () => { void this.bindWebMidiAccess(access, pianoOnly); };
    const connected = openedInputs.length > 0 || openedOutputs.length > 0;
    if (connected) {
      this.releaseBleDevice();
    }
    const deviceName = openedInputs[0]?.name || openedOutputs[0]?.name || 'MIDI device';
    if (connected) this.rememberDevice(deviceName);
    if (!connected && this.bleDevice?.gatt?.connected) {
      this.updateStatus({ errorMessage: 'No OS MIDI ports were found. The existing direct Bluetooth connection is still active.' });
      return false;
    }
    this.updateStatus({
      status: connected ? 'connected' : 'disconnected',
      transport: connected ? 'web-midi' : 'none',
      deviceName: connected ? deviceName : null,
      errorMessage: connected ? null : 'No accessible MIDI ports. On macOS, connect your keyboard in Audio MIDI Setup > MIDI Studio > Bluetooth; on Windows, try USB MIDI or direct BLE MIDI.',
      outputErrorMessage: outputError,
    });
    return connected;
  }

  public disconnect() {
    this.stopAllOutputNotes();
    this.releaseBleDevice();
    this.releaseWebMidiPorts();
    this.updateStatus({
      status: 'disconnected',
      transport: 'none',
      deviceName: null,
      errorMessage: null,
      outputErrorMessage: null,
    });
  }

  /**
   * Official BLE MIDI 1.0 packet parser (MMA Specification).
   * Handles header byte, timestamp bytes, status bytes, and running status across chord events.
   */
  public parseBleMidiPacket(dataView: DataView) {
    const bytes: number[] = [];
    for (let i = 0; i < dataView.byteLength; i++) {
      bytes.push(dataView.getUint8(i));
    }
    if (bytes.length < 3) return;

    let idx = 1; // Skip BLE Header byte (byte 0: 0b10xxxxxx)
    let runningStatus = 0;

    while (idx < bytes.length) {
      // Optional Timestamp byte before status or running-status data
      if ((bytes[idx] & 0x80) !== 0) {
        // Check if next byte is a MIDI status byte
        if (idx + 1 < bytes.length && (bytes[idx + 1] & 0x80) !== 0) {
          idx++; // Skip timestamp byte
          runningStatus = bytes[idx];
          idx++;
        } else {
          // System Real-Time or end byte
          idx++;
          continue;
        }
      }

      const command = runningStatus & 0xf0;
      if (command === 0x90 || command === 0x80) {
        if (idx + 1 < bytes.length) {
          const note = bytes[idx] & 0x7f;
          const velocity = bytes[idx + 1] & 0x7f;
          idx += 2;

          if (command === 0x90 && velocity > 0) {
            this.emitNote('noteon', note, velocity, 'BLE-MIDI', [
              bytes[0],
              0x80,
              runningStatus,
              note,
              velocity,
            ]);
          } else {
            this.emitNote('noteoff', note, velocity, 'BLE-MIDI', [
              bytes[0],
              0x80,
              runningStatus,
              note,
              velocity,
            ]);
          }
        } else {
          break;
        }
      } else if (command === 0xb0 || command === 0xe0 || command === 0xa0) {
        // 2-data-byte MIDI messages (Control Change, Pitch Bend, Poly Aftertouch)
        idx += 2;
      } else if (command === 0xc0 || command === 0xd0) {
        // 1-data-byte MIDI messages (Program Change, Channel Pressure)
        idx += 1;
      } else {
        idx++;
      }
    }
  }

  public parseStandardMidiBytes(
    bytes: number[],
    source: 'BLE-MIDI' | 'WebMIDI' | 'Virtual' = 'WebMIDI'
  ) {
    if (bytes.length < 3) return;
    const status = bytes[0];
    const command = status & 0xf0;
    const note = bytes[1] & 0x7f;
    const velocity = bytes[2] & 0x7f;

    if (command === 0x90 && velocity > 0) {
      this.emitNote('noteon', note, velocity, source, bytes.slice(0, 3));
    } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
      this.emitNote('noteoff', note, velocity, source, bytes.slice(0, 3));
    }
  }

  /**
   * Simulates a standard BLE MIDI packet burst (C Major triad C4-E4-G4)
   * through the actual BLE MIDI binary parser for hardware pipeline diagnostics.
   */
  public triggerDiagnosticBlePacket() {
    const chordNotes = [60, 64, 67]; // C4, E4, G4
    chordNotes.forEach((midi, index) => {
      setTimeout(() => {
        const packet = new Uint8Array([0x80, 0x80, 0x90, midi, 98]);
        this.parseBleMidiPacket(new DataView(packet.buffer));
        setTimeout(() => {
          const offPacket = new Uint8Array([0x80, 0x80, 0x80, midi, 0]);
          this.parseBleMidiPacket(new DataView(offPacket.buffer));
        }, 480);
      }, index * 110);
    });
  }
}

export const midiService = new MidiHardwareService();
