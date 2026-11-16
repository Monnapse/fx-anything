// Real-time pitch shifter (two crossfaded delay taps, Hann windows).
// Changes pitch without changing tempo, so it works on live input.
class PitchShifter extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'ratio', defaultValue: 1, minValue: 0.25, maxValue: 4, automationRate: 'k-rate' }];
  }

  constructor() {
    super();
    this.size = 1 << 15;
    this.mask = this.size - 1;
    this.buf = [new Float32Array(this.size), new Float32Array(this.size)];
    this.w = 0;
    this.win = Math.round(sampleRate * 0.05);
    this.phase = 0;
  }

  read(b, pos) {
    const p = pos - Math.floor(pos / this.size) * this.size;
    const i = Math.floor(p);
    const f = p - i;
    return b[i & this.mask] * (1 - f) + b[(i + 1) & this.mask] * f;
  }

  process(inputs, outputs, params) {
    const inp = inputs[0] || [];
    const out = outputs[0];
    const r = params.ratio[0];
    const W = this.win;
    const half = W / 2;
    const frames = out[0].length;
    let w = this.w;
    let phase = this.phase;
    for (let i = 0; i < frames; i++) {
      const l = inp[0] ? inp[0][i] : 0;
      this.buf[0][w] = l;
      this.buf[1][w] = inp[1] ? inp[1][i] : l;
      const d1 = phase;
      const d2 = phase + half >= W ? phase + half - W : phase + half;
      const s1 = Math.sin((Math.PI * d1) / W);
      const s2 = Math.sin((Math.PI * d2) / W);
      const g1 = s1 * s1;
      const g2 = s2 * s2;
      for (let c = 0; c < out.length; c++) {
        const b = this.buf[c > 0 ? 1 : 0];
        out[c][i] = g1 * this.read(b, w - d1 - 1) + g2 * this.read(b, w - d2 - 1);
      }
      w = (w + 1) & this.mask;
      phase += 1 - r;
      if (phase < 0) phase += W;
      else if (phase >= W) phase -= W;
    }
    this.w = w;
    this.phase = phase;
    return true;
  }
}

registerProcessor('pitch-shifter', PitchShifter);
