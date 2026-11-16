// A short synthesized loop so you can hear the effects without any routing set up.
export async function renderTestLoop(sampleRate: number): Promise<AudioBuffer> {
  const bpm = 118, beat = 60 / bpm, bars = 8, len = bars * 4 * beat;
  const oc = new OfflineAudioContext(2, Math.ceil(len * sampleRate), sampleRate);
  const out = oc.createGain();
  out.gain.value = 0.5;
  out.connect(oc.destination);
  const noise = oc.createBuffer(1, sampleRate, sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  const kick = (t: number) => {
    const o = oc.createOscillator(), g = oc.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.15);
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + 0.4);
  };
  const hit = (t: number, f: number, d: number, v: number, pan = 0) => {
    const s = oc.createBufferSource(), b = oc.createBiquadFilter(), g = oc.createGain(), p = oc.createStereoPanner();
    s.buffer = noise; b.type = 'bandpass'; b.frequency.value = f; b.Q.value = 0.8; p.pan.value = pan;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    s.connect(b).connect(g).connect(p).connect(out);
    s.start(t); s.stop(t + d + 0.05);
  };
  const tone = (t: number, f: number, d: number, type: OscillatorType, v: number, pan = 0, lp = 2000) => {
    const o = oc.createOscillator(), g = oc.createGain(), fl = oc.createBiquadFilter(), p = oc.createStereoPanner();
    o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = lp; p.pan.value = pan;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.02);
    g.gain.setValueAtTime(v, t + d * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(fl).connect(g).connect(p).connect(out);
    o.start(t); o.stop(t + d + 0.05);
  };
  const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
  const prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  const melody = [76, 74, 72, 74, 76, 76, 76, 0, 74, 74, 74, 0, 76, 79, 79, 0];
  for (let bar = 0; bar < bars; bar++) {
    const t0 = bar * 4 * beat, ch = prog[bar % 4];
    for (let b = 0; b < 4; b++) {
      const t = t0 + b * beat;
      kick(t);
      if (b % 2 === 1) hit(t, 1800, 0.18, 0.7);
      hit(t + beat / 2, 9000, 0.05, 0.25, 0.3);
      hit(t, 9000, 0.04, 0.15, -0.3);
      tone(t, hz(ch[0] - 24), beat * 0.9, 'sawtooth', 0.35, 0, 400);
    }
    ch.forEach((n) => {
      tone(t0, hz(n) * 1.003, 4 * beat, 'sawtooth', 0.05, -0.8, 1600);
      tone(t0, hz(n) * 0.997, 4 * beat, 'sawtooth', 0.05, 0.8, 1600);
    });
    if (bar >= 2) for (let k = 0; k < 8; k++) {
      const m = melody[(bar * 8 + k) % 16];
      if (m) tone(t0 + (k * beat) / 2, hz(m), beat / 2, 'square', 0.09, 0, 2500);
    }
  }
  return oc.startRendering();
}
