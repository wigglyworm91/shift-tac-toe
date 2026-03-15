let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  console.log('[sound] AudioContext state:', ctx.state);
  return ctx;
}

/** col 0 → -0.5, col 1 → 0, col 2 → +0.5 */
function colToPan(col: number): number {
  return (col - 1) * 0.5;
}

/** Short percussive clack — bandpass-filtered noise burst */
export function playDropSound(col: number, delaySec = 0): void {
  console.log('[sound] playDropSound col:', col, 'delay:', delaySec);
  const ac = getCtx();
  const now = ac.currentTime + delaySec;
  const duration = 0.07;

  const bufSize = Math.ceil(ac.sampleRate * duration);
  const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const source = ac.createBufferSource();
  source.buffer = buf;

  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1100;
  filter.Q.value = 1.8;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.45, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  const panner = ac.createStereoPanner();
  panner.pan.value = colToPan(col);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(panner);
  panner.connect(ac.destination);

  source.start(now);
  source.stop(now + duration);
}

/** Ascending arpeggio — 4 notes rising */
export function playWinSound(): void {
  console.log('[sound] playWinSound');
  const ac = getCtx();
  const freqs = [523, 659, 784, 1047]; // C5 E5 G5 C6
  freqs.forEach((freq, i) => {
    const t = ac.currentTime + i * 0.12;
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.35);
  });
}

/** Descending minor — sad "wah wah" trombone slide */
export function playLoseSound(): void {
  console.log('[sound] playLoseSound');
  const ac = getCtx();
  // Two descending minor-interval pairs
  const pairs = [[392, 311], [330, 261]] as const;
  pairs.forEach(([startFreq, endFreq], i) => {
    const t = ac.currentTime + i * 0.3;
    const osc = ac.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.25);

    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.28);
  });
}

/** Online game start — quick two-note "ready?" ping */
export function playGameStartSound(): void {
  console.log('[sound] playGameStartSound');
  const ac = getCtx();
  [440, 660].forEach((freq, i) => {
    const t = ac.currentTime + i * 0.14;
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.22);
  });
}

/** Draw — two neutral tones */
export function playDrawSound(): void {
  console.log('[sound] playDrawSound');
  const ac = getCtx();
  [440, 440 * (5 / 4)].forEach((freq, i) => {
    const t = ac.currentTime + i * 0.18;
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}

/** Two-stage ka-chunk: filtered noise impact + descending sine resonance */
export function playShiftSound(direction: 'left' | 'right'): void {
  console.log('[sound] playShiftSound direction:', direction);
  const ac = getCtx();
  const now = ac.currentTime;
  const pan = direction === 'left' ? -0.4 : 0.4;

  // "ka" — sharp mid noise hit
  const kaDuration = 0.045;
  const kaBuf = ac.createBuffer(1, Math.ceil(ac.sampleRate * kaDuration), ac.sampleRate);
  const kaData = kaBuf.getChannelData(0);
  for (let i = 0; i < kaData.length; i++) kaData[i] = Math.random() * 2 - 1;

  const kaSource = ac.createBufferSource();
  kaSource.buffer = kaBuf;

  const kaFilter = ac.createBiquadFilter();
  kaFilter.type = 'bandpass';
  kaFilter.frequency.value = 500;
  kaFilter.Q.value = 1.0;

  const kaGain = ac.createGain();
  kaGain.gain.setValueAtTime(0.55, now);
  kaGain.gain.exponentialRampToValueAtTime(0.001, now + kaDuration);

  // "chunk" — low sine sweep that decays
  const chunkStart = now + 0.03;
  const chunkEnd = now + 0.2;

  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(160, chunkStart);
  osc.frequency.exponentialRampToValueAtTime(55, chunkEnd);

  const chunkGain = ac.createGain();
  chunkGain.gain.setValueAtTime(0.001, now);
  chunkGain.gain.setValueAtTime(0.35, chunkStart);
  chunkGain.gain.exponentialRampToValueAtTime(0.001, chunkEnd);

  const panner = ac.createStereoPanner();
  panner.pan.value = pan;

  kaSource.connect(kaFilter);
  kaFilter.connect(kaGain);
  kaGain.connect(panner);

  osc.connect(chunkGain);
  chunkGain.connect(panner);

  panner.connect(ac.destination);

  kaSource.start(now);
  kaSource.stop(now + kaDuration);
  osc.start(chunkStart);
  osc.stop(chunkEnd);
}
