/**
 * proceduralAudio.js
 * 100% Offline, Pure Web Audio API ASMR drawing soundscape & haptic audio synthesizer.
 * Generates tactile audio in real-time matching user drawing speed, pressure, and snap-to-grid actions.
 */

let audioCtx = null;
let masterGain = null;
let isAudioEnabled = true;
let audioVolume = 0.45;
let currentPenNode = null;
let currentPenGain = null;
let lastMoveTime = 0;
let lastMovePoint = null;

// Initialize or resume AudioContext safely on first interaction
function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioCtx = new AudioContextClass();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(audioVolume, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Pre-create reusable friction noise buffers
let noiseBuffer = null;
function getNoiseBuffer(ctx) {
  if (noiseBuffer) return noiseBuffer;
  const bufferSize = ctx.sampleRate * 2; // 2 seconds loop
  noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    // Pink noise approximation
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    output[i] = (b0 + b1 + b2 + white * 0.5362) * 0.15;
  }
  return noiseBuffer;
}

export const proceduralAudio = {
  isEnabled() {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('doodle_asmr_audio');
      if (stored !== null) return stored === 'true';
    }
    return isAudioEnabled;
  },

  setEnabled(val) {
    isAudioEnabled = !!val;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('doodle_asmr_audio', String(isAudioEnabled));
    }
    if (!isAudioEnabled) {
      this.stopDrawingSound();
    }
  },

  getVolume() {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('doodle_asmr_volume');
      if (stored !== null) return Number(stored);
    }
    return audioVolume;
  },

  setVolume(vol) {
    audioVolume = Math.max(0, Math.min(1, vol));
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('doodle_asmr_volume', String(audioVolume));
    }
    if (masterGain && audioCtx) {
      masterGain.gain.setValueAtTime(audioVolume, audioCtx.currentTime);
    }
  },

  /**
   * Start stroke sound when user presses pointer down
   * @param {string} instrument 'pencil' | 'chalk' | 'marker' | 'pen'
   */
  startDrawingSound(instrument = 'pencil') {
    if (!this.isEnabled()) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    this.stopDrawingSound();

    try {
      const buffer = getNoiseBuffer(ctx);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      if (instrument === 'chalk') {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        filter.Q.setValueAtTime(1.8, ctx.currentTime);
      } else if (instrument === 'marker') {
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, ctx.currentTime);
        filter.Q.setValueAtTime(3.2, ctx.currentTime); // Subtle squeak resonance
      } else {
        // Pencil / fountain pen
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1800, ctx.currentTime);
        filter.Q.setValueAtTime(1.0, ctx.currentTime);
      }

      // Initial gain is near silent until pointer moves
      gain.gain.setValueAtTime(0.001, ctx.currentTime);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      source.start();

      currentPenNode = { source, filter, gain };
      currentPenGain = gain;
      lastMoveTime = performance.now();
      lastMovePoint = null;
    } catch {
      // Audio autoplay policy fallback
    }
  },

  /**
   * Modulate stroke sound volume and frequency based on pen speed
   * @param {number} x
   * @param {number} y
   */
  updateDrawingSpeed(x, y) {
    if (!this.isEnabled() || !currentPenGain || !audioCtx) return;

    const now = performance.now();
    const dt = Math.max(1, now - lastMoveTime);
    lastMoveTime = now;

    let dist = 1;
    if (lastMovePoint) {
      dist = Math.hypot(x - lastMovePoint[0], y - lastMovePoint[1]);
    }
    lastMovePoint = [x, y];

    const speed = Math.min(dist / dt, 3.5); // px / ms
    const targetGain = Math.min(0.7, 0.08 + speed * 0.25);

    try {
      const t = audioCtx.currentTime;
      currentPenGain.gain.cancelScheduledValues(t);
      currentPenGain.gain.setTargetAtTime(targetGain, t, 0.04);
    } catch {}
  },

  /**
   * Stop stroke sound when pointer releases
   */
  stopDrawingSound() {
    if (!currentPenNode || !audioCtx) return;
    try {
      const { source, gain } = currentPenNode;
      const t = audioCtx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setTargetAtTime(0.0001, t, 0.03);
      setTimeout(() => {
        try {
          source.stop();
          source.disconnect();
        } catch {}
      }, 50);
    } catch {}
    currentPenNode = null;
    currentPenGain = null;
    lastMovePoint = null;
  },

  /**
   * Tactile "Snick" click sound played when shapes snap to grid or align
   */
  playSnapClick() {
    if (!this.isEnabled()) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(350, t + 0.028);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(t);
      osc.stop(t + 0.035);
    } catch {}
  },
};
