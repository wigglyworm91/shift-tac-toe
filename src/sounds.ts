let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** col 0 → -0.5, col 1 → 0, col 2 → +0.5 */
function colToPan(col: number): number {
  return (col - 1) * 0.5;
}

/** Short percussive clack — bandpass-filtered noise burst */
export function playDropSound(col: number): void {
  const ac = getCtx();
  const now = ac.currentTime;
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

/** Two-stage ka-chunk: filtered noise impact + descending sine resonance */
export function playShiftSound(direction: 'left' | 'right'): void {
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
