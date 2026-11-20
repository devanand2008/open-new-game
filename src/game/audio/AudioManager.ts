import type { GameSettings } from '../save/SaveManager';

/**
 * 100% procedural Web Audio API sound engine for PROJECT: COASTLINE.
 * Provides engine RPM synth, tire drift hiss, footsteps, jump, collision thuds,
 * mission chimes, police siren warble, and subtle coastal ocean/wind ambience.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;

  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;

  private ambientNoiseGain: GainNode | null = null;
  private rainNoiseGain: GainNode | null = null;

  private initialized = false;
  private muted = false;
  private masterVolume = 0.7;
  private sfxVolume = 0.8;
  private ambientVolume = 0.55;
  private sirenPhase = 0;

  public unlock(): void {
    if (this.initialized) {
      if (this.ctx?.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx = new AudioCtx();
      this.ctx = ctx;

      this.masterGain = ctx.createGain();
      this.sfxGain = ctx.createGain();
      this.ambientGain = ctx.createGain();

      this.sfxGain.connect(this.masterGain);
      this.ambientGain.connect(this.masterGain);
      this.masterGain.connect(ctx.destination);

      // Continuous vehicle engine oscillator pair
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 260;

      this.engineGain = ctx.createGain();
      this.engineGain.gain.value = 0;

      this.engineOsc = ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;

      this.engineSubOsc = ctx.createOscillator();
      this.engineSubOsc.type = 'triangle';
      this.engineSubOsc.frequency.value = 28;

      this.engineOsc.connect(engineFilter);
      this.engineSubOsc.connect(engineFilter);
      engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.sfxGain);
      this.engineOsc.start();
      this.engineSubOsc.start();

      // Police siren synth
      this.sirenGain = ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc = ctx.createOscillator();
      this.sirenOsc.type = 'sine';
      this.sirenOsc.frequency.value = 660;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.sfxGain);
      this.sirenOsc.start();

      // Filtered coastal breeze / surf ambience
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 1.8;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 340;

      this.ambientNoiseGain = ctx.createGain();
      this.ambientNoiseGain.gain.value = 0.08;

      noise.connect(filter);
      filter.connect(this.ambientNoiseGain);
      this.ambientNoiseGain.connect(this.ambientGain);
      noise.start();

      // Filtered rain patter loop (high-passed white noise hiss)
      const rainBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const rOut = rainBuf.getChannelData(0);
      for (let i = 0; i < rOut.length; i++) {
        rOut[i] = (Math.random() * 2 - 1) * 0.65;
      }
      const rainSrc = ctx.createBufferSource();
      rainSrc.buffer = rainBuf;
      rainSrc.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'bandpass';
      rainFilter.frequency.value = 1850;
      rainFilter.Q.value = 0.7;

      this.rainNoiseGain = ctx.createGain();
      this.rainNoiseGain.gain.value = 0;

      rainSrc.connect(rainFilter);
      rainFilter.connect(this.rainNoiseGain);
      this.rainNoiseGain.connect(this.ambientGain);
      rainSrc.start();

      this.initialized = true;
      this.applyVolumes();
    } catch {
      // Headless or restricted audio contexts fail silently
    }
  }

  public applySettings(settings: GameSettings): void {
    this.muted = settings.muted;
    this.masterVolume = settings.masterVolume;
    this.sfxVolume = settings.sfxVolume;
    this.ambientVolume = settings.ambientVolume;
    this.applyVolumes();
  }

  public setPaused(paused: boolean): void {
    if (!this.ctx || !this.masterGain) return;
    const target = paused || this.muted ? 0 : this.masterVolume;
    this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.04);
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.sfxGain || !this.ambientGain) return;
    const t = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.masterVolume, t, 0.04);
    this.sfxGain.gain.setTargetAtTime(this.sfxVolume, t, 0.04);
    this.ambientGain.gain.setTargetAtTime(this.ambientVolume, t, 0.04);
  }

  public updateContinuous(
    inVehicle: boolean,
    speedMs: number,
    wantedLevel: number,
    nearBeach: boolean,
    dt: number,
    rainIntensity = 0
  ): void {
    if (!this.initialized || !this.ctx || this.muted) return;
    const t = this.ctx.currentTime;

    if (this.engineGain && this.engineOsc && this.engineSubOsc) {
      if (inVehicle) {
        const speedNorm = Math.min(1, Math.abs(speedMs) / 36);
        const rpmFreq = 48 + speedNorm * 145;
        this.engineOsc.frequency.setTargetAtTime(rpmFreq, t, 0.05);
        this.engineSubOsc.frequency.setTargetAtTime(rpmFreq * 0.5, t, 0.05);
        this.engineGain.gain.setTargetAtTime(0.08 + speedNorm * 0.09, t, 0.08);
      } else {
        this.engineGain.gain.setTargetAtTime(0, t, 0.08);
      }
    }

    if (this.sirenGain && this.sirenOsc) {
      if (wantedLevel > 0) {
        this.sirenPhase += dt * 4.2;
        const freq = 640 + Math.sin(this.sirenPhase) * 190;
        this.sirenOsc.frequency.setTargetAtTime(freq, t, 0.03);
        this.sirenGain.gain.setTargetAtTime(0.035, t, 0.1);
      } else {
        this.sirenGain.gain.setTargetAtTime(0, t, 0.1);
      }
    }

    if (this.ambientNoiseGain) {
      this.ambientNoiseGain.gain.setTargetAtTime(nearBeach ? 0.14 : 0.06, t, 0.25);
    }

    if (this.rainNoiseGain) {
      this.rainNoiseGain.gain.setTargetAtTime(rainIntensity * 0.14, t, 0.25);
    }
  }

  public playFootstep(): void {
    this.playTone(90 + Math.random() * 25, 0.045, 'triangle', 0.05);
  }

  public playJump(): void {
    this.playSweep(180, 360, 0.12, 'sine', 0.09);
  }

  public playCarDoor(): void {
    this.playSweep(150, 62, 0.11, 'triangle', 0.14);
  }

  public playImpact(strength = 1): void {
    const vol = Math.min(0.24, 0.08 + strength * 0.09);
    this.playSweep(120, 38, 0.18, 'sawtooth', vol);
  }

  public playChime(): void {
    this.playTone(587.3, 0.12, 'sine', 0.11);
    setTimeout(() => this.playTone(880, 0.18, 'sine', 0.11), 90);
  }

  public playMissionComplete(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.24, 'triangle', 0.12), idx * 100);
    });
  }

  public playClick(): void {
    this.playTone(720, 0.04, 'sine', 0.06);
  }

  private playTone(freq: number, dur: number, type: OscillatorType, volume: number): void {
    if (!this.initialized || !this.ctx || !this.sfxGain || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private playSweep(startF: number, endF: number, dur: number, type: OscillatorType, volume: number): void {
    if (!this.initialized || !this.ctx || !this.sfxGain || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startF, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endF), t + dur);
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  public dispose(): void {
    try {
      this.engineOsc?.stop();
      this.engineSubOsc?.stop();
      this.sirenOsc?.stop();
      void this.ctx?.close();
    } catch {
      // ignore
    }
    this.initialized = false;
  }
}

export const audioManager = new AudioManager();
