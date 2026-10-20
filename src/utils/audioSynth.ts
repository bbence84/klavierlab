import { midiToFrequency } from './musicTheory';
import { SoundEngine } from '../types/music';
import type { Smplr } from 'smplr';

export interface PianoAudioStatus {
  engine: SoundEngine;
  state: 'idle' | 'loading' | 'ready' | 'error';
  loaded: number;
  total: number;
}

interface ActiveVoice {
  oscillators: OscillatorNode[];
  masterGain: GainNode;
  releaseTimer?: number;
}

class PianoSynthesizer {
  private ctx: AudioContext | null = null;
  private voices: Map<number, ActiveVoice> = new Map();
  private muted: boolean = false;
  private volume: number = 0.78;
  private engine: SoundEngine = 'original';
  private sampled: Smplr | null = null;
  private sampledLoad: Promise<void> | null = null;
  private sampledState: PianoAudioStatus['state'] = 'idle';
  private loaded = 0;
  private total = 0;
  private statusListeners = new Set<(status: PianoAudioStatus) => void>();

  public getStatus(): PianoAudioStatus {
    return { engine: this.engine, state: this.sampledState, loaded: this.loaded, total: this.total };
  }

  public onStatus(listener: (status: PianoAudioStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.getStatus());
    return () => { this.statusListeners.delete(listener); };
  }

  private publishStatus() {
    const status = this.getStatus();
    this.statusListeners.forEach(listener => listener(status));
  }

  public async setEngine(engine: SoundEngine): Promise<void> {
    if (this.engine !== engine) this.stopAll();
    this.engine = engine;
    this.publishStatus();
    if (engine !== 'sampled' || this.sampledState === 'ready') return;
    if (this.sampledLoad) return this.sampledLoad;
    const context = this.ensureContext();
    if (!context) {
      this.sampledState = 'error';
      this.publishStatus();
      return;
    }
    this.sampledState = 'loading';
    this.loaded = 0;
    this.total = 0;
    this.publishStatus();
    this.sampledLoad = (async () => {
      let timeout: number | undefined;
      try {
        const { SplendidGrandPiano, CacheStorage } = await import('smplr');
        const piano = SplendidGrandPiano(context, {
          storage: CacheStorage('klavierlab-piano-samples-v1'),
          notesToLoad: { notes: Array.from({ length: 49 }, (_, index) => 36 + index), velocityRange: [1, 127], fallback: 'nearest' },
          volume: this.volume * 127,
          decayTime: 0.25,
          onLoadProgress: ({ loaded, total }) => {
            if (this.sampledState !== 'loading') return;
            this.loaded = loaded;
            this.total = total;
            this.publishStatus();
          },
        });
        this.sampled = piano;
        await Promise.race([
          piano.ready,
          new Promise<never>((_resolve, reject) => {
            timeout = window.setTimeout(() => reject(new Error('Piano sample loading timed out')), 45000);
          }),
        ]);
        if (this.engine === 'sampled') this.stopAll();
        piano.output.volume = this.volume * 127;
        this.sampledState = 'ready';
      } catch {
        this.sampled?.dispose();
        this.sampled = null;
        this.sampledState = 'error';
      } finally {
        if (timeout !== undefined) window.clearTimeout(timeout);
        this.sampledLoad = null;
        this.publishStatus();
      }
    })();
    return this.sampledLoad;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) this.stopAll();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.sampled) this.sampled.output.volume = this.volume * 127;
  }

  public noteOn(midi: number, velocity: number = 96, autoDurationSec?: number) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Stop existing voice on same key for clean re-articulation
    this.noteOff(midi, true);

    if (this.engine === 'sampled' && this.sampledState === 'ready' && this.sampled) {
      this.sampled.start({ note: midi, velocity: Math.max(1, Math.min(127, Math.round(velocity))), duration: autoDurationSec && autoDurationSec > 0 ? autoDurationSec : undefined });
      return;
    }

    const now = ctx.currentTime;
    const freq = midiToFrequency(midi);
    const velNorm = Math.max(0.15, Math.min(1, velocity / 127));
    const peakGain = 0.24 * velNorm * this.volume;

    const masterGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    // Brighter filter cutoff for higher velocities and higher notes
    const baseCutoff = Math.min(12000, freq * (3.5 + velNorm * 5.5));
    filter.frequency.setValueAtTime(baseCutoff, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(400, freq * 1.8), now + 1.4);

    masterGain.connect(filter);
    filter.connect(ctx.destination);

    // Acoustic grand piano envelope: crisp attack, initial decay into warm sustain plateau
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(peakGain, now + 0.008);
    masterGain.gain.exponentialRampToValueAtTime(peakGain * 0.42, now + 0.28);
    masterGain.gain.exponentialRampToValueAtTime(0.0008, now + 3.2);

    // Multi-partial synthesis (Fundamental + 2nd + 3rd harmonics + subtle detuned unison string)
    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, now);
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.32 * velNorm, now);
    osc2.connect(gain2);
    gain2.connect(masterGain);

    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(freq * 3, now);
    const gain3 = ctx.createGain();
    gain3.gain.setValueAtTime(0.11 * velNorm, now);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc3.connect(gain3);
    gain3.connect(masterGain);

    // Subtle unison string detune for warmth
    const oscDetune = ctx.createOscillator();
    oscDetune.type = 'sine';
    oscDetune.frequency.setValueAtTime(freq, now);
    oscDetune.detune.setValueAtTime(1.6, now);
    const gainDetune = ctx.createGain();
    gainDetune.gain.setValueAtTime(0.45, now);
    oscDetune.connect(gainDetune);
    gainDetune.connect(masterGain);

    osc1.connect(masterGain);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    oscDetune.start(now);

    const voice: ActiveVoice = {
      oscillators: [osc1, osc2, osc3, oscDetune],
      masterGain,
    };

    if (autoDurationSec && autoDurationSec > 0) {
      voice.releaseTimer = window.setTimeout(() => {
        this.noteOff(midi);
      }, autoDurationSec * 1000);
    } else {
      // Safety cleanup after natural decay
      voice.releaseTimer = window.setTimeout(() => {
        this.noteOff(midi);
      }, 3300);
    }

    this.voices.set(midi, voice);
  }

  public noteOff(midi: number, immediate: boolean = false) {
    this.sampled?.stop(midi);
    const voice = this.voices.get(midi);
    if (!voice) return;
    if (voice.releaseTimer) {
      clearTimeout(voice.releaseTimer);
    }
    this.voices.delete(midi);

    const ctx = this.ctx;
    if (!ctx) return;

    const now = ctx.currentTime;
    const releaseDuration = immediate ? 0.025 : 0.18;
    try {
      voice.masterGain.gain.cancelScheduledValues(now);
      voice.masterGain.gain.setValueAtTime(Math.max(0.0001, voice.masterGain.gain.value), now);
      voice.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + releaseDuration);

      voice.oscillators.forEach((osc) => {
        try {
          osc.stop(now + releaseDuration + 0.01);
        } catch {
          // Ignore if already stopped
        }
      });
    } catch {
      // Ignore audio graph cleanup errors
    }
  }

  public playMetronomeClick(isDownbeat: boolean = false) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isDownbeat ? 1150 : 820, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.035);

    gain.gain.setValueAtTime(0.14 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.045);
  }

  public stopAll() {
    this.sampled?.stop();
    Array.from(this.voices.keys()).forEach((midi) => this.noteOff(midi, true));
  }
}

export const pianoSynth = new PianoSynthesizer();
