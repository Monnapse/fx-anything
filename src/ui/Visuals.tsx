import { useEffect, useRef } from 'react';
import type { Engine, MeterReading } from '../audio/engine';

type GetEngine = () => Engine | null;

function useCanvas(draw: (g: CanvasRenderingContext2D, w: number, h: number, t: number) => void) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useEffect(() => {
    const c = ref.current!;
    const g = c.getContext('2d')!;
    let w = 0, h = 0, raf = 0;
    const resize = () => {
      const r = c.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      w = r.width; h = r.height;
      c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.max(1, Math.round(h * dpr));
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || !w) return;
      drawRef.current(g, w, h, t);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return ref;
}

const toDb = (x: number) => (x > 1e-5 ? 20 * Math.log10(x) : -90);
const FLOOR = -54;
const dbToY = (db: number) => Math.min(1, Math.max(0, (db - FLOOR) / -FLOOR));

/** Stereo LED-segment meter with peak hold. */
export function Meter({ getEngine, which, label }: { getEngine: GetEngine; which: 'in' | 'out'; label: string }) {
  const state = useRef({ lvl: [0, 0], hold: [0, 0], holdT: [0, 0], peakDb: -90 });
  const readout = useRef<HTMLSpanElement>(null);
  const ref = useCanvas((g, w, h, t) => {
    const e = getEngine();
    const st = state.current;
    let m: MeterReading = { peak: [0, 0], rms: [0, 0] };
    if (e) m = which === 'in' ? e.inMeter.read() : e.outMeter.read();
    g.clearRect(0, 0, w, h);
    const segs = 30, gap = 2, segH = (h - gap * (segs - 1)) / segs, colW = (w - 4) / 2;
    let maxDb = -90;
    for (let ch = 0; ch < 2; ch++) {
      const target = dbToY(toDb(m.peak[ch]));
      st.lvl[ch] = target > st.lvl[ch] ? target : st.lvl[ch] - 0.018;
      if (st.lvl[ch] < 0) st.lvl[ch] = 0;
      if (st.lvl[ch] >= st.hold[ch]) { st.hold[ch] = st.lvl[ch]; st.holdT[ch] = t; }
      else if (t - st.holdT[ch] > 1200) st.hold[ch] = Math.max(0, st.hold[ch] - 0.01);
      maxDb = Math.max(maxDb, toDb(m.peak[ch]));
      const x = ch * (colW + 4);
      const lit = Math.round(st.lvl[ch] * segs);
      const holdSeg = Math.min(segs - 1, Math.round(st.hold[ch] * segs) - 1);
      for (let i = 0; i < segs; i++) {
        const y = h - (i + 1) * segH - i * gap;
        const frac = (i + 1) / segs;
        const db = FLOOR + frac * -FLOOR;
        const col = db > -3 ? '#ef4444' : db > -12 ? '#f5a524' : '#4ade80';
        const on = i < lit || i === holdSeg;
        g.fillStyle = on ? col : '#26282a';
        g.globalAlpha = on ? 1 : 1;
        g.fillRect(x, y, colW, segH);
      }
    }
    st.peakDb = maxDb;
    if (readout.current) readout.current.textContent = maxDb <= -89 ? '-∞' : maxDb.toFixed(1);
  });
  return (
    <div className="meter">
      <canvas ref={ref} />
      <div className="meter-foot"><span>{label}</span><span ref={readout} className="mono">-∞</span></div>
    </div>
  );
}

/** Log-frequency spectrum analyser with peak caps and a frequency grid. */
export function Spectrum({ getEngine, colors }: { getEngine: GetEngine; colors: string[] }) {
  const state = useRef({ bars: [] as number[], caps: [] as number[] });
  const colorsRef = useRef(colors);
  colorsRef.current = colors;
  const ref = useCanvas((g, w, h, t) => {
    const e = getEngine();
    const st = state.current;
    const raw = e ? e.spectrum() : null;
    const n = raw ? raw.length : 48;
    if (st.bars.length !== n) { st.bars = new Array(n).fill(0); st.caps = new Array(n).fill(0); }
    g.clearRect(0, 0, w, h);

    // grid
    const padB = 18, plotH = h - padB - 8;
    g.strokeStyle = 'rgba(255,255,255,0.05)';
    g.lineWidth = 1;
    for (let i = 1; i < 4; i++) { const y = 8 + (plotH * i) / 4; g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(w, y + 0.5); g.stroke(); }
    const lo = 30, hi = 18000;
    g.fillStyle = 'rgba(255,255,255,0.32)';
    g.font = '10px "JetBrains Mono", monospace';
    g.textAlign = 'center';
    for (const [f, l] of [[50, '50'], [100, '100'], [250, '250'], [500, '500'], [1000, '1k'], [2500, '2.5k'], [5000, '5k'], [10000, '10k']] as const) {
      const x = (Math.log(f / lo) / Math.log(hi / lo)) * w;
      g.fillRect(Math.round(x), 8, 1, plotH);
      g.fillText(l, x, h - 5);
    }

    const gap = 2, bw = (w - gap * (n - 1)) / n;
    const grad = g.createLinearGradient(0, 8 + plotH, 0, 8);
    const cols = colorsRef.current;
    cols.forEach((c, i) => grad.addColorStop(cols.length === 1 ? 0 : i / (cols.length - 1), c));
    for (let i = 0; i < n; i++) {
      const target = raw ? raw[i] / 255 : 0.04 + 0.02 * Math.sin(t / 900 + i * 0.35);
      st.bars[i] += (target - st.bars[i]) * (target > st.bars[i] ? 0.6 : 0.16);
      if (st.bars[i] > st.caps[i]) st.caps[i] = st.bars[i]; else st.caps[i] = Math.max(0, st.caps[i] - 0.006);
      const bh = Math.max(1, st.bars[i] * plotH);
      const x = i * (bw + gap);
      g.fillStyle = grad;
      g.globalAlpha = raw ? 0.9 : 0.25;
      g.fillRect(x, 8 + plotH - bh, bw, bh);
      g.globalAlpha = raw ? 1 : 0.3;
      g.fillStyle = '#f2f2f2';
      g.fillRect(x, 8 + plotH - st.caps[i] * plotH - 2, bw, 1.5);
    }
    g.globalAlpha = 1;
  });
  return <canvas ref={ref} className="spectrum" />;
}
