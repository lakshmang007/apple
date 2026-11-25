/** Tiny synthesized sound effects (no audio files needed). */

let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function noise(ac: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  return src;
}

/** Soft camera "swoosh" for panel transitions. */
export function whoosh(strength = 0.5) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const src = noise(ac);
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(300, t);
  filter.frequency.exponentialRampToValueAtTime(2200, t + 0.25);
  filter.frequency.exponentialRampToValueAtTime(600, t + 0.5);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.12 * strength + 0.02, t + 0.18);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(t);
  src.stop(t + 0.6);
}

/** Heavy hit for action panels / SFX words. */
export function impact() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.exponentialRampToValueAtTime(38, t + 0.45);
  const og = ac.createGain();
  og.gain.setValueAtTime(0.5, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  osc.connect(og).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.5);

  const n = noise(ac);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.35, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  n.connect(lp).connect(ng).connect(ac.destination);
  n.start(t);
  n.stop(t + 0.3);
}

/** Paper-like page turn. */
export function pageTurn() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const src = noise(ac);
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(1800, t);
  hp.frequency.linearRampToValueAtTime(4000, t + 0.3);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.09, t + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  src.connect(hp).connect(g).connect(ac.destination);
  src.start(t);
  src.stop(t + 0.4);
}
