/**
 * ambientAudioEngine.js
 * 100% Offline, Pure Web Audio API procedural soundscape synthesizer.
 * Generates natural ambient sound environments (Rain, Ocean Waves, Coffee Shop, Brown Noise)
 * without requiring any external audio files, downloads, or network connections.
 */

let audioCtx = null;
let currentTrack = null;
let masterGain = null;
let activeNodes = [];
let volumeLevel = 0.5;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Generate a 5-second buffer of white noise
function createWhiteNoiseBuffer(ctx) {
  const bufferSize = ctx.sampleRate * 5;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// Generate a 5-second buffer of brown noise (deep, warm, bass-rich)
function createBrownNoiseBuffer(ctx) {
  const bufferSize = ctx.sampleRate * 5;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = data[i];
    data[i] *= 3.5; // Gain compensation
  }
  return buffer;
}

// Stop and clean up all active audio nodes
function stopAllNodes() {
  for (const node of activeNodes) {
    try {
      if (node.stop) node.stop();
      if (node.disconnect) node.disconnect();
    } catch {
      // Ignore cleanup error
    }
  }
  activeNodes = [];
}

/**
 * Procedural Rain Generator
 */
function startRain(ctx, out) {
  const noiseBuffer = createWhiteNoiseBuffer(ctx);
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  // Filter 1: Lowpass for rain rumble
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(850, ctx.currentTime);

  // Filter 2: Highpass to eliminate harsh DC
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.setValueAtTime(250, ctx.currentTime);

  const rainGain = ctx.createGain();
  rainGain.gain.setValueAtTime(0.7, ctx.currentTime);

  noiseSource.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(rainGain);
  rainGain.connect(out);
  noiseSource.start();

  activeNodes.push(noiseSource, highpass, lowpass, rainGain);

  // Periodic droplet pings
  let dropletTimer = setInterval(() => {
    if (currentTrack !== 'rain') {
      clearInterval(dropletTimer);
      return;
    }
    try {
      const osc = ctx.createOscillator();
      const dropGain = ctx.createGain();
      const freq = 1200 + Math.random() * 1400;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, ctx.currentTime + 0.08);

      dropGain.gain.setValueAtTime(0.04, ctx.currentTime);
      dropGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);

      osc.connect(dropGain);
      dropGain.connect(out);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Ignore droplet error
    }
  }, 220);
}

/**
 * Procedural Ocean Waves Generator
 */
function startOcean(ctx, out) {
  const noiseBuffer = createBrownNoiseBuffer(ctx);
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  // Sweeping bandpass filter to simulate wave surges
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(350, ctx.currentTime);

  // Slow LFO for wave surges (0.09 Hz)
  const lfo = ctx.createOscillator();
  lfo.frequency.setValueAtTime(0.09, ctx.currentTime);
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(280, ctx.currentTime);

  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  const waveGain = ctx.createGain();
  waveGain.gain.setValueAtTime(0.65, ctx.currentTime);

  noiseSource.connect(filter);
  filter.connect(waveGain);
  waveGain.connect(out);

  noiseSource.start();
  lfo.start();

  activeNodes.push(noiseSource, lfo, lfoGain, filter, waveGain);
}

/**
 * Procedural Cozy Coffee Shop Generator
 */
function startCoffee(ctx, out) {
  const noiseBuffer = createBrownNoiseBuffer(ctx);
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(500, ctx.currentTime);
  bandpass.Q.setValueAtTime(0.8, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.55, ctx.currentTime);

  noiseSource.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(out);
  noiseSource.start();

  activeNodes.push(noiseSource, bandpass, gain);

  // Occasional warm cup clink / ambient tap
  let clinkTimer = setInterval(() => {
    if (currentTrack !== 'coffee') {
      clearInterval(clinkTimer);
      return;
    }
    try {
      const osc = ctx.createOscillator();
      const clinkGain = ctx.createGain();
      const freq = 1800 + Math.random() * 800;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      clinkGain.gain.setValueAtTime(0.02, ctx.currentTime);
      clinkGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);

      osc.connect(clinkGain);
      clinkGain.connect(out);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch {
      // Ignore clink error
    }
  }, 1800 + Math.random() * 2000);
}

/**
 * Procedural Brown Noise & Vinyl Crinkle Generator
 */
function startBrownNoise(ctx, out) {
  const noiseBuffer = createBrownNoiseBuffer(ctx);
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(500, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.65, ctx.currentTime);

  noiseSource.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(out);
  noiseSource.start();

  activeNodes.push(noiseSource, lowpass, gain);
}

/**
 * Play a soothing completion chime (for Pomodoro session complete)
 */
export function playChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 - E5 - G5 - C6 arpeggio

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 1.3);
    });
  } catch {
    // Ignore chime error
  }
}

/**
 * Ambient Audio Controller API
 */
export const ambientAudio = {
  getTrack() {
    return currentTrack;
  },

  isPlaying() {
    return Boolean(currentTrack);
  },

  getVolume() {
    return volumeLevel;
  },

  setVolume(vol) {
    volumeLevel = Math.max(0, Math.min(1, vol));
    if (masterGain && audioCtx) {
      masterGain.gain.setValueAtTime(volumeLevel, audioCtx.currentTime);
    }
  },

  play(trackId) {
    if (currentTrack === trackId) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    stopAllNodes();

    if (!masterGain) {
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volumeLevel, ctx.currentTime);
      masterGain.connect(ctx.destination);
    }

    currentTrack = trackId;

    switch (trackId) {
      case 'rain':
        startRain(ctx, masterGain);
        break;
      case 'ocean':
        startOcean(ctx, masterGain);
        break;
      case 'coffee':
        startCoffee(ctx, masterGain);
        break;
      case 'brown':
        startBrownNoise(ctx, masterGain);
        break;
      default:
        currentTrack = null;
        break;
    }
  },

  stop() {
    stopAllNodes();
    currentTrack = null;
  },

  toggle(trackId) {
    if (currentTrack === trackId) {
      this.stop();
    } else {
      this.play(trackId);
    }
  },
};
