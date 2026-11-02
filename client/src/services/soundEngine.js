/**
 * Theme 2: Event-Driven Architecture (EDA)
 * Web Audio API Sound Engine
 * Synthesizes real-time polyphonic audio waveforms (sine/square/triangle oscillators + gain envelopes)
 * completely offline without external audio assets. Driven by EventBus signals.
 */

import { eventBus } from './eventBus.js';

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('spongebob_muted') === 'true';
    this.masterGain = null;
    this.initialized = false;

    // Listen to EventBus for audio commands
    eventBus.on('audio:play', ({ sound, param }) => {
      this.play(sound, param);
    });
  }

  init() {
    if (this.initialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.4, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('spongebob_muted', String(this.muted));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.4, this.ctx.currentTime);
    }
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  play(soundName, param = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    switch (soundName) {
      case 'bubble':
      case 'pop':
        this.synthBubble();
        break;
      case 'numpad':
      case 'click':
        this.synthNumpadClick();
        break;
      case 'correct':
        this.synthCorrectChime(param);
        break;
      case 'wrong':
        this.synthWrongBuzzer();
        break;
      case 'combo':
        this.synthComboChime(param);
        break;
      case 'countdown_tick':
        this.synthCountdown(false);
        break;
      case 'countdown_go':
        this.synthCountdown(true);
        break;
      case 'fanfare':
        this.synthVictoryFanfare();
        break;
      case 'giggle':
        this.synthSpongeGiggle();
        break;
      default:
        this.synthBubble();
    }
  }

  /** Playful Bikini Bottom Bubble Pop */
  synthBubble() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.08);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  /** Tactile spatula numpad clack */
  synthNumpadClick() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.04);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  /** Correct solve polyphonic major chord */
  synthCorrectChime(streak = 1) {
    const t = this.ctx.currentTime;
    const baseFreq = 523.25; // C5
    const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2]; // C - E - G - C6

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * (1 + Math.min(streak - 1, 4) * 0.05), t + idx * 0.05);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.setValueAtTime(0.2, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.05 + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.4);
    });
  }

  /** Combo chime scaling dynamically */
  synthComboChime(comboLevel = 1) {
    const t = this.ctx.currentTime;
    const freq = 440 * Math.pow(1.12, Math.min(comboLevel, 12));
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.18);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  /** Dissonant fail buzzer */
  synthWrongBuzzer() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.35);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.38);
  }

  /** Countdown arcade tone */
  synthCountdown(isGo = false) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isGo ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isGo ? 880 : 440, t);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isGo ? 0.45 : 0.2));

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + (isGo ? 0.5 : 0.25));
  }

  /** SpongeBob signature giggle / flute-like trill */
  synthSpongeGiggle() {
    const t = this.ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + i * 0.07;
      const freq = (i % 2 === 0 ? 880 : 1100);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.2, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.06);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.07);
    }
  }

  /** Victory fanfare arpeggio */
  synthVictoryFanfare() {
    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + i * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.25, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.55);
    });
  }
}

export const soundEngine = new SoundEngine();

