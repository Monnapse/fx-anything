// FX Anything audio engine — Web Audio effect chain for live input.
// input → karaoke → pitch → eq → muffle → lofi → widen → 8D → echo → reverb → concert → DJ filter → master
import type { Settings } from './settings';

const TC = 0.035;

const VENUES = {
  club: { decay: 1.3, pre: 0.01, slapTime: 0.07, slap: 0.06, bass: 6, rev: 0.75 },
  theater: { decay: 2.3, pre: 0.02, slapTime: 0.12, slap: 0.05, bass: 3, rev: 1.0 },
  arena: { decay: 3.4, pre: 0.035, slapTime: 0.19, slap: 0.15, bass: 6, rev: 1.0 },
  stadium: { decay: 5.0, pre: 0.06, slapTime: 0.33, slap: 0.24, bass: 7, rev: 1.05 },
  festival: { decay: 1.7, pre: 0.02, slapTime: 0.42, slap: 0.22, bass: 8, rev: 0.6 },
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const logMap = (lo: number, hi: number, x: number) => lo * Math.pow(hi / lo, x);

/** Synthetic room impulse: early reflections + darkening exponential tail, energy-normalised. */
function impulseResponse(ctx: BaseAudioContext, decay: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.max(1, Math.floor(decay * sr));
  const buf = ctx.createBuffer(2, len, sr);
  let energy = 0;
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let y = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp((-6.9 * t) / decay);
      const bright = 0.06 + 0.8 * Math.exp((-4 * t) / decay);
      y += bright * (Math.random() * 2 - 1 - y);
      d[i] = y * env * Math.min(1, t / 0.008);
    }
    for (let k = 0; k < 10; k++) {
      const t = rand(0.004, Math.min(0.08, decay * 0.25));
      const idx = Math.floor(t * sr);
      if (idx < len) d[idx] += (Math.random() < 0.5 ? -1 : 1) * rand(0.15, 0.45) * Math.exp((-6.9 * t) / decay);
    }
    for (let i = 0; i < len; i++) energy += d[i] * d[i];
  }
  const g = 1 / Math.sqrt(energy / 2 || 1);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] *= g;
  }
  return buf;
}

function driveCurve(k: number): Float32Array<ArrayBuffer> | null {
  if (!k) return null;
  const n = 2048;
  const curve = new Float32Array(n);
  const norm = Math.tanh(k);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / norm;
  }
  return curve;
}

interface Mod {
  input: GainNode;
  output: GainNode;
  dry: GainNode;
  wet: GainNode;
  mix: (v: number) => void;
}

export interface MeterReading { peak: [number, number]; rms: [number, number] }

class StereoMeter {
  private l: AnalyserNode;
  private r: AnalyserNode;
  private buf: Float32Array<ArrayBuffer>;
  constructor(ctx: AudioContext, node: AudioNode) {
    const sp = ctx.createChannelSplitter(2);
    this.l = ctx.createAnalyser();
    this.r = ctx.createAnalyser();
    this.l.fftSize = this.r.fftSize = 1024;
    node.connect(sp);
    sp.connect(this.l, 0);
    sp.connect(this.r, 1);
    this.buf = new Float32Array(1024);
  }
  read(): MeterReading {
    const one = (a: AnalyserNode) => {
      a.getFloatTimeDomainData(this.buf);
      let pk = 0;
      let sum = 0;
      for (let i = 0; i < this.buf.length; i++) {
        const x = this.buf[i];
        sum += x * x;
        const ax = x < 0 ? -x : x;
        if (ax > pk) pk = ax;
      }
      return [pk, Math.sqrt(sum / this.buf.length)] as const;
    };
    const [pl, rl] = one(this.l);
    const [pr, rr] = one(this.r);
    return { peak: [pl, pr], rms: [rl, rr] };
  }
}

export class Engine {
  readonly ctx: AudioContext;
  private source: AudioNode;
  private s: Settings | null = null;
  private oscs: OscillatorNode[] = [];
  private ir: Record<string, AudioBuffer> = {};

  private karaoke!: Mod;
  private pitch!: Mod & { node: AudioWorkletNode };
  private eq!: { input: BiquadFilterNode; output: BiquadFilterNode; low: BiquadFilterNode; mid: BiquadFilterNode; high: BiquadFilterNode };
  private muffle!: Mod & { hp: BiquadFilterNode; lp: BiquadFilterNode; shaper: WaveShaperNode; makeup: GainNode; lfoAmt: GainNode; mode: string | null };
  private lofi!: Mod & { w1g: GainNode; w2g: GainNode; lp: BiquadFilterNode };
  private widen!: Mod & { width: GainNode };
  private eightD!: Mod & { sx: OscillatorNode; cz: OscillatorNode };
  private echo!: Mod & { delay: DelayNode; fb: GainNode; out: GainNode };
  private reverb!: Mod & { direct: GainNode; conv: ConvolverNode; out: GainNode; size: number | null; timer: number };
  private concert!: Mod & { low: BiquadFilterNode; high: BiquadFilterNode; direct: GainNode; pre: DelayNode; conv: ConvolverNode; revOut: GainNode; slap: DelayNode; slapG: GainNode; venue: string | null };
  private djf!: { input: BiquadFilterNode; output: BiquadFilterNode; hp: BiquadFilterNode; lp: BiquadFilterNode };
  private master!: { input: GainNode; chain: GainNode; bypass: GainNode; volume: GainNode; output: GainNode; analyser: AnalyserNode };

  readonly inMeter: StereoMeter;
  readonly outMeter: StereoMeter;
  private freq: Uint8Array<ArrayBuffer>;
  private edges: number[];

  static async create(ctx: AudioContext, source: AudioNode, workletUrl: string) {
    await ctx.audioWorklet.addModule(workletUrl);
    return new Engine(ctx, source);
  }

  private constructor(ctx: AudioContext, source: AudioNode) {
    this.ctx = ctx;
    this.source = source;
    this.karaoke = this.buildKaraoke();
    this.pitch = this.buildPitch();
    this.eq = this.buildEQ();
    this.muffle = this.buildMuffle();
    this.lofi = this.buildLofi();
    this.widen = this.buildWiden();
    this.eightD = this.build8D();
    this.echo = this.buildEcho();
    this.reverb = this.buildReverb();
    this.concert = this.buildConcert();
    this.djf = this.buildDJFilter();
    this.master = this.buildMaster();

    const chain: { input: AudioNode; output: AudioNode }[] = [
      this.karaoke, this.pitch, this.eq, this.muffle, this.lofi, this.widen,
      this.eightD, this.echo, this.reverb, this.concert, this.djf,
    ];
    source.connect(chain[0].input);
    for (let i = 0; i < chain.length - 1; i++) chain[i].output.connect(chain[i + 1].input);
    chain[chain.length - 1].output.connect(this.master.chain);
    source.connect(this.master.bypass);

    this.inMeter = new StereoMeter(ctx, source);
    this.outMeter = new StereoMeter(ctx, this.master.output);
    this.freq = new Uint8Array(this.master.analyser.frequencyBinCount);
    this.edges = this.makeBands(48);
  }

  // ---------- helpers ----------
  private gain(v = 1) { const g = this.ctx.createGain(); g.gain.value = v; return g; }
  private biq(type: BiquadFilterType, freq: number, q?: number | null, gainDb?: number | null) {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    if (q != null) f.Q.value = q;
    if (gainDb != null) f.gain.value = gainDb;
    return f;
  }
  private mono() { const g = this.gain(1); g.channelCount = 1; g.channelCountMode = 'explicit'; g.channelInterpretation = 'speakers'; return g; }
  private stereo() { const g = this.gain(1); g.channelCount = 2; g.channelCountMode = 'explicit'; g.channelInterpretation = 'speakers'; return g; }
  private set(param: AudioParam, v: number, tc = TC) {
    const t = this.ctx.currentTime;
    param.cancelScheduledValues(t);
    param.setTargetAtTime(v, t, tc);
  }
  private osc(freq: number) {
    const o = this.ctx.createOscillator();
    o.frequency.value = freq;
    o.start();
    this.oscs.push(o);
    return o;
  }
  private mod(): Mod {
    const m = { input: this.gain(1), output: this.gain(1), dry: this.gain(1), wet: this.gain(0) } as Mod;
    m.input.connect(m.dry);
    m.dry.connect(m.output);
    m.wet.connect(m.output);
    m.mix = (v: number) => { this.set(m.dry.gain, 1 - v); this.set(m.wet.gain, v); };
    return m;
  }
  private irFor(decay: number) {
    const key = decay.toFixed(2);
    return (this.ir[key] ||= impulseResponse(this.ctx, decay));
  }

  // ---------- modules ----------
  private buildKaraoke() {
    const c = this.ctx, m = this.mod();
    const st = this.stereo(), sp = c.createChannelSplitter(2);
    m.input.connect(st); st.connect(sp);
    const side = this.mono(), inv = this.gain(-1);
    sp.connect(side, 0); sp.connect(inv, 1); inv.connect(side);
    const hp = this.biq('highpass', 140, 0.7), boost = this.gain(1.3);
    side.connect(hp); hp.connect(boost); boost.connect(m.wet);
    const lp = this.biq('lowpass', 140, 0.7);
    m.input.connect(lp); lp.connect(m.wet);
    return m;
  }

  private buildPitch() {
    const m = this.mod();
    const node = new AudioWorkletNode(this.ctx, 'pitch-shifter', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] });
    m.input.connect(node); node.connect(m.wet);
    return Object.assign(m, { node });
  }

  private buildEQ() {
    const low = this.biq('lowshelf', 110, null, 0), mid = this.biq('peaking', 1000, 0.8, 0), high = this.biq('highshelf', 7000, null, 0);
    low.connect(mid); mid.connect(high);
    return { input: low, output: high, low, mid, high };
  }

  private buildMuffle() {
    const m = this.mod();
    const hp = this.biq('highpass', 20, 0), lp = this.biq('lowpass', 800, 0);
    const shaper = this.ctx.createWaveShaper(); shaper.oversample = '2x';
    const makeup = this.gain(1.5);
    m.input.connect(hp); hp.connect(lp); lp.connect(shaper); shaper.connect(makeup); makeup.connect(m.wet);
    const lfo = this.osc(0.22), lfoAmt = this.gain(0);
    lfo.connect(lfoAmt); lfoAmt.connect(lp.frequency);
    return Object.assign(m, { hp, lp, shaper, makeup, lfoAmt, mode: null as string | null });
  }

  private buildLofi() {
    const m = this.mod();
    const delay = this.ctx.createDelay(0.1); delay.delayTime.value = 0.015;
    const w1 = this.osc(0.55), w1g = this.gain(0), w2 = this.osc(0.13), w2g = this.gain(0);
    w1.connect(w1g); w1g.connect(delay.delayTime); w2.connect(w2g); w2g.connect(delay.delayTime);
    const lp = this.biq('lowpass', 3800, 0), warm = this.biq('lowshelf', 180, null, 3);
    const sat = this.ctx.createWaveShaper(); sat.curve = driveCurve(1.4); sat.oversample = '2x';
    m.input.connect(delay); delay.connect(lp); lp.connect(warm); warm.connect(sat); sat.connect(m.wet);
    return Object.assign(m, { w1g, w2g, lp });
  }

  private buildWiden() {
    const c = this.ctx, m = this.mod();
    const st = this.stereo(), sp = c.createChannelSplitter(2), mer = c.createChannelMerger(2);
    m.input.connect(st); st.connect(sp);
    const mid = this.mono(), side = this.mono();
    const mL = this.gain(0.5), mR = this.gain(0.5), sL = this.gain(0.5), sR = this.gain(-0.5);
    sp.connect(mL, 0); sp.connect(mR, 1); sp.connect(sL, 0); sp.connect(sR, 1);
    mL.connect(mid); mR.connect(mid); sL.connect(side); sR.connect(side);
    const width = this.gain(1.8), inv = this.gain(-1);
    side.connect(width); width.connect(inv);
    mid.connect(mer, 0, 0); mid.connect(mer, 0, 1); width.connect(mer, 0, 0); inv.connect(mer, 0, 1);
    mer.connect(m.wet);
    return Object.assign(m, { width });
  }

  private build8D() {
    const c = this.ctx, m = this.mod();
    const p = c.createPanner();
    p.panningModel = 'HRTF'; p.distanceModel = 'linear'; p.refDistance = 1; p.maxDistance = 10000; p.rolloffFactor = 0;
    p.positionX.value = 0; p.positionY.value = 0; p.positionZ.value = 0;
    const t0 = c.currentTime + 0.05;
    const sx = c.createOscillator(), cz = c.createOscillator();
    cz.setPeriodicWave(c.createPeriodicWave(new Float32Array([0, 1]), new Float32Array([0, 0]), { disableNormalization: true }));
    sx.frequency.value = cz.frequency.value = 1 / 8;
    const gx = this.gain(2), gz = this.gain(2);
    sx.connect(gx); gx.connect(p.positionX); cz.connect(gz); gz.connect(p.positionZ);
    sx.start(t0); cz.start(t0); this.oscs.push(sx, cz);
    const makeup = this.gain(1.15);
    m.input.connect(p); p.connect(makeup); makeup.connect(m.wet);
    return Object.assign(m, { sx, cz });
  }

  private buildEcho() {
    const m = this.mod();
    const direct = this.gain(1), delay = this.ctx.createDelay(2), fb = this.gain(0.35), tone = this.biq('lowpass', 3200, 0), out = this.gain(0.3);
    m.input.connect(direct); direct.connect(m.wet);
    m.input.connect(delay); delay.connect(tone); tone.connect(fb); fb.connect(delay); tone.connect(out); out.connect(m.wet);
    return Object.assign(m, { delay, fb, out });
  }

  private buildReverb() {
    const m = this.mod();
    const direct = this.gain(1), pre = this.ctx.createDelay(0.2), conv = this.ctx.createConvolver(), tone = this.biq('lowpass', 7000, 0), out = this.gain(0.4);
    conv.normalize = false; pre.delayTime.value = 0.018;
    m.input.connect(direct); direct.connect(m.wet);
    m.input.connect(pre); pre.connect(conv); conv.connect(tone); tone.connect(out); out.connect(m.wet);
    return Object.assign(m, { direct, conv, out, size: null as number | null, timer: 0 });
  }

  private buildConcert() {
    const c = this.ctx, m = this.mod();
    const low = this.biq('lowshelf', 90, null, 6), high = this.biq('highshelf', 3500, null, -4);
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -22; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.2;
    m.input.connect(low); low.connect(high); high.connect(comp);
    const direct = this.gain(0.7); comp.connect(direct); direct.connect(m.wet);
    const pre = c.createDelay(0.5), conv = c.createConvolver(), revTone = this.biq('lowpass', 6500, 0), revOut = this.gain(0.7);
    conv.normalize = false;
    comp.connect(pre); pre.connect(conv); conv.connect(revTone); revTone.connect(revOut); revOut.connect(m.wet);
    const slap = c.createDelay(1), slapTone = this.biq('lowpass', 2200, 0), slapG = this.gain(0.1);
    comp.connect(slap); slap.connect(slapTone); slapTone.connect(slapG); slapG.connect(m.wet); slapG.connect(conv);
    return Object.assign(m, { low, high, direct, pre, conv, revOut, slap, slapG, venue: null as string | null });
  }

  /** DJ-style filter: centre = open, left = low-pass sweep, right = high-pass sweep. */
  private buildDJFilter() {
    const hp = this.biq('highpass', 10, 0), lp = this.biq('lowpass', 22000, 0);
    hp.connect(lp);
    return { input: hp, output: lp, hp, lp };
  }

  private buildMaster() {
    const c = this.ctx;
    const input = this.gain(1), chain = this.gain(1), bypass = this.gain(0), volume = this.gain(1);
    const lim = c.createDynamicsCompressor(), output = this.gain(0.92), analyser = c.createAnalyser();
    lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.15;
    analyser.fftSize = 4096; analyser.smoothingTimeConstant = 0.8;
    chain.connect(input); bypass.connect(input);
    input.connect(volume); volume.connect(lim); lim.connect(output); output.connect(analyser); output.connect(c.destination);
    return { input, chain, bypass, volume, output, analyser };
  }

  // ---------- apply ----------
  apply(s: Settings) {
    this.s = s;
    const set = this.set.bind(this);

    this.karaoke.mix(s.karaoke.on ? s.karaoke.strength / 100 : 0);

    this.pitch.node.parameters.get('ratio')!.value = Math.pow(2, s.pitch.semitones / 12);
    this.pitch.mix(s.pitch.on && s.pitch.semitones !== 0 ? 1 : 0);

    set(this.eq.low.gain, s.eq.on ? s.eq.bass : 0);
    set(this.eq.mid.gain, s.eq.on ? s.eq.mid : 0);
    set(this.eq.high.gain, s.eq.on ? s.eq.treble : 0);

    {
      const f = this.muffle, a = s.muffle.amount / 100;
      let hp = 20, lp: number, q = 0, drive = 0, makeup = 1.5, wob = 0;
      switch (s.muffle.mode) {
        case 'underwater': lp = logMap(1200, 220, a); q = 9; makeup = 1.4; wob = lp * 0.35; break;
        case 'radio': hp = 450; lp = logMap(5000, 1800, a); q = 3; drive = 2.5; makeup = 1.6; break;
        case 'phone': hp = 380; lp = logMap(3600, 2000, a); q = 2; drive = 1.6; makeup = 2; break;
        default: lp = logMap(1800, 140, a); makeup = 1.2 + a * 0.8;
      }
      set(f.hp.frequency, hp); set(f.lp.frequency, lp); set(f.lp.Q, q); set(f.makeup.gain, makeup); set(f.lfoAmt.gain, wob);
      if (f.mode !== s.muffle.mode) { f.mode = s.muffle.mode; f.shaper.curve = driveCurve(drive); }
      f.mix(s.muffle.on ? 1 : 0);
    }

    {
      const l = this.lofi, w = s.lofi.wobble / 100;
      set(l.w1g.gain, w * 0.0032); set(l.w2g.gain, w * 0.0022);
      set(l.lp.frequency, 7000 * Math.pow(1400 / 7000, s.lofi.warmth / 100));
      l.mix(s.lofi.on ? 1 : 0);
    }

    set(this.widen.width.gain, s.widen.width / 100);
    this.widen.mix(s.widen.on ? 1 : 0);

    {
      const f = 1 / Math.max(1, s.eightD.speed);
      set(this.eightD.sx.frequency, f, 0.3); set(this.eightD.cz.frequency, f, 0.3);
      this.eightD.mix(s.eightD.on ? s.eightD.intensity / 100 : 0);
    }

    set(this.echo.delay.delayTime, s.echo.time / 1000, 0.08);
    set(this.echo.fb.gain, (s.echo.feedback / 100) * 0.85);
    set(this.echo.out.gain, s.echo.mix / 100);
    this.echo.mix(s.echo.on ? 1 : 0);

    {
      const r = this.reverb, mix = s.reverb.mix / 100;
      if (r.size !== s.reverb.size) {
        const first = r.size === null;
        r.size = s.reverb.size;
        clearTimeout(r.timer);
        const build = () => { r.conv.buffer = this.irFor(0.6 + (s.reverb.size / 100) * 6.4); };
        if (first) build(); else r.timer = window.setTimeout(build, 140);
      }
      set(r.direct.gain, 1 - mix * 0.35);
      set(r.out.gain, mix * 1.1);
      r.mix(s.reverb.on ? 1 : 0);
    }

    {
      const k = this.concert, v = VENUES[s.concert.venue] || VENUES.arena, d = s.concert.distance / 100;
      if (k.venue !== s.concert.venue) {
        k.venue = s.concert.venue;
        k.conv.buffer = this.irFor(v.decay);
        set(k.pre.delayTime, v.pre, 0.05);
        set(k.slap.delayTime, v.slapTime, 0.05);
      }
      set(k.low.gain, v.bass);
      set(k.high.gain, -1.5 - 9 * d);
      set(k.direct.gain, 1 - 0.6 * d);
      set(k.revOut.gain, (0.22 + 0.9 * d) * v.rev);
      set(k.slapG.gain, v.slap * (0.3 + d));
      k.mix(s.concert.on ? 1 : 0);
    }

    {
      const v = s.filter.on ? s.filter.value / 100 : 0;
      const q = (s.filter.res / 100) * 14;
      if (v < -0.02) {
        set(this.djf.lp.frequency, logMap(20000, 90, -v), 0.02); set(this.djf.lp.Q, q);
        set(this.djf.hp.frequency, 10, 0.02); set(this.djf.hp.Q, 0);
      } else if (v > 0.02) {
        set(this.djf.hp.frequency, logMap(20, 9000, v), 0.02); set(this.djf.hp.Q, q);
        set(this.djf.lp.frequency, 22000, 0.02); set(this.djf.lp.Q, 0);
      } else {
        set(this.djf.lp.frequency, 22000, 0.02); set(this.djf.lp.Q, 0);
        set(this.djf.hp.frequency, 10, 0.02); set(this.djf.hp.Q, 0);
      }
    }

    set(this.master.chain.gain, s.bypass ? 0 : 1, 0.015);
    set(this.master.bypass.gain, s.bypass ? 1 : 0, 0.015);
    set(this.master.volume.gain, s.master.volume / 100);
  }

  get settings() { return this.s; }

  private makeBands(count: number) {
    const bins = this.master.analyser.frequencyBinCount, hz = this.ctx.sampleRate / 2 / bins;
    const lo = 30, hi = 18000, edges: number[] = [];
    for (let i = 0; i <= count; i++) edges.push(Math.max(1, Math.round((lo * Math.pow(hi / lo, i / count)) / hz)));
    for (let i = 1; i < edges.length; i++) if (edges[i] <= edges[i - 1]) edges[i] = edges[i - 1] + 1;
    return edges;
  }

  /** log-spaced bars, 0–255 */
  spectrum(): number[] {
    const d = this.freq, e = this.edges;
    this.master.analyser.getByteFrequencyData(d);
    const out = new Array(e.length - 1);
    for (let i = 0; i < out.length; i++) {
      let m = 0;
      for (let b = e[i]; b < e[i + 1] && b < d.length; b++) if (d[b] > m) m = d[b];
      out[i] = m;
    }
    return out;
  }

  dispose() {
    clearTimeout(this.reverb.timer);
    this.oscs.forEach((o) => { try { o.stop(); } catch { /* stopped */ } });
    try { this.source.disconnect(); } catch { /* ignore */ }
  }
}
