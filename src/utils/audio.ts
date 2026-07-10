/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Synthesized Sound Effects Engine using Web Audio API
// This is fully self-contained and avoids external asset loading issues.

let audioCtx: AudioContext | null = null;
let masterVolume = 0.5;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function setVolume(vol: number) {
  masterVolume = Math.max(0, Math.min(1, vol));
}

export function getVolume(): number {
  return masterVolume;
}

// 1. Hover Sound: Quick, high-pitched subtle chirp
export function playHoverSound() {
  const ctx = getAudioContext();
  if (!ctx || masterVolume === 0) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);

  gain.gain.setValueAtTime(0.04 * masterVolume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.08);
}

// 2. Select Sound: A warm, ascending gold chime
export function playSelectSound() {
  const ctx = getAudioContext();
  if (!ctx || masterVolume === 0) return;

  const now = ctx.currentTime;
  const playTone = (freq: number, start: number, duration: number, vol: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.2, start + duration);

    gain.gain.setValueAtTime(vol * masterVolume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + duration);
  };

  playTone(330, now, 0.15, 0.1); // E4
  playTone(440, now + 0.08, 0.2, 0.1); // A4
  playTone(554, now + 0.16, 0.25, 0.1); // C#5
  playTone(659, now + 0.24, 0.35, 0.12); // E5
}

// 3. Rebind Start Sound: Pulsing synth note
export function playRebindStartSound() {
  const ctx = getAudioContext();
  if (!ctx || masterVolume === 0) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.15);

  gain.gain.setValueAtTime(0.08 * masterVolume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

  // Simple lowpass filter to make it warmer
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(500, ctx.currentTime);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

// 4. Rebind Success Sound: High triumphant chime
export function playRebindSuccessSound() {
  const ctx = getAudioContext();
  if (!ctx || masterVolume === 0) return;

  const now = ctx.currentTime;
  const playTone = (freq: number, start: number, duration: number, vol: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(vol * masterVolume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + duration);
  };

  playTone(523.25, now, 0.1, 0.08); // C5
  playTone(659.25, now + 0.05, 0.1, 0.08); // E5
  playTone(783.99, now + 0.1, 0.15, 0.08); // G5
  playTone(1046.50, now + 0.15, 0.3, 0.1); // C6
}

// 5. Slash/Attack Sound: Sword swing noise
export function playAttackSound() {
  const ctx = getAudioContext();
  if (!ctx || masterVolume === 0) return;

  const bufferSize = ctx.sampleRate * 0.15; // 0.15 seconds
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // Fill buffer with white noise
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noiseNode = ctx.createBufferSource();
  noiseNode.buffer = buffer;

  // Filter to shape the noise into a "swoosh"
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.setValueAtTime(2, ctx.currentTime);
  filter.frequency.setValueAtTime(800, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2 * masterVolume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

  noiseNode.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noiseNode.start();
}

// 6. Dash Sound: Quick wind sweep
export function playDashSound() {
  const ctx = getAudioContext();
  if (!ctx || masterVolume === 0) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.12);

  gain.gain.setValueAtTime(0.12 * masterVolume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.12);
}

// 7. Ancient Obelisk Interact Sound: Mystical echo chime
export function playInteractSound() {
  const ctx = getAudioContext();
  if (!ctx || masterVolume === 0) return;

  const now = ctx.currentTime;
  const playTone = (freq: number, start: number, duration: number, vol: number, detune: number = 0) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    osc.detune.setValueAtTime(detune, start);

    gain.gain.setValueAtTime(vol * masterVolume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + duration);
  };

  playTone(220, now, 0.8, 0.08, -10); // A3
  playTone(440, now + 0.1, 0.7, 0.06, 10); // A4
  playTone(554.37, now + 0.2, 0.6, 0.06); // C#5
  playTone(659.25, now + 0.3, 0.5, 0.06); // E5
  playTone(880, now + 0.4, 0.4, 0.08); // A5
}

// 8. Error/Disabled Sound: Buzz
export function playErrorSound() {
  const ctx = getAudioContext();
  if (!ctx || masterVolume === 0) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(120, ctx.currentTime);
  osc.frequency.setValueAtTime(110, ctx.currentTime + 0.1);

  gain.gain.setValueAtTime(0.08 * masterVolume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(300, ctx.currentTime);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

// 9. Power Explosion Sound: Massive high-power gold energy burst
export function playPowerExplosionSound() {
  const ctx = getAudioContext();
  if (!ctx || masterVolume === 0) return;

  const now = ctx.currentTime;
  
  // High-pass filtered noise rumble
  const bufferSize = ctx.sampleRate * 0.4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1200, now);
  filter.frequency.exponentialRampToValueAtTime(100, now + 0.4);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.25 * masterVolume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);

  // High pitch cosmic synth swell
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const synthGain = ctx.createGain();

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(150, now);
  osc1.frequency.exponentialRampToValueAtTime(900, now + 0.35);

  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(150, now);
  osc2.frequency.exponentialRampToValueAtTime(450, now + 0.35);

  synthGain.gain.setValueAtTime(0.12 * masterVolume, now);
  synthGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc1.connect(synthGain);
  osc2.connect(synthGain);
  synthGain.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + 0.35);
  osc2.start(now);
  osc2.stop(now + 0.35);
}

// 10. Dance Melody: Rhythmic cute 8-bit chip tune bite
export function playDanceMusic() {
  const ctx = getAudioContext();
  if (!ctx || masterVolume === 0) return;

  const now = ctx.currentTime;
  const tempo = 0.12; // beat length

  const playNote = (freq: number, startOffset: number, type: 'square' | 'triangle' = 'triangle') => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now + startOffset);
    
    g.gain.setValueAtTime(0.06 * masterVolume, now + startOffset);
    g.gain.exponentialRampToValueAtTime(0.001, now + startOffset + tempo - 0.02);
    
    osc.connect(g);
    g.connect(ctx.destination);
    
    osc.start(now + startOffset);
    osc.stop(now + startOffset + tempo - 0.01);
  };

  // Upbeat major scale arpeggio
  playNote(261.63, 0);          // C4
  playNote(329.63, tempo);      // E4
  playNote(392.00, tempo * 2);  // G4
  playNote(523.25, tempo * 3, 'square'); // C5
  playNote(392.00, tempo * 4);  // G4
  playNote(523.25, tempo * 5, 'square'); // C5
}

// 11. Boss Spawn: Dramatic, dark sweeping synth
export function playBossSpawnSound() {
  const ctx = getAudioContext();
  if (!ctx || masterVolume === 0) return;

  const now = ctx.currentTime;
  
  // Low growl noise
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(80, now);
  osc1.frequency.linearRampToValueAtTime(40, now + 1.2);

  osc2.type = 'square';
  osc2.frequency.setValueAtTime(82, now);
  osc2.frequency.linearRampToValueAtTime(41, now + 1.2);

  gain.gain.setValueAtTime(0.25 * masterVolume, now);
  gain.gain.linearRampToValueAtTime(0.001, now + 1.2);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(300, now);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + 1.2);
  osc2.start(now);
  osc2.stop(now + 1.2);
}

// 12. Fireball Launch/Impact sound: Pitch sweep down with small explosion
export function playFireballSound() {
  const ctx = getAudioContext();
  if (!ctx || masterVolume === 0) return;

  const now = ctx.currentTime;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.3);

  gain.gain.setValueAtTime(0.12 * masterVolume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(400, now);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.3);
}


