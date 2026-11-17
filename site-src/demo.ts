// Live in-browser demo for the website: the same Engine the desktop app uses, running on a demo track.
import { Engine } from '../src/audio/engine';
import { applyPreset, clone, DEFAULTS, type Settings } from '../src/audio/settings';
import pitchShifterSource from '../src/audio/worklets/pitch-shifter.js?raw';

interface Scene { id: string; label: string; note: string }

const SCENES: Scene[] = [
  { id: 'original', label: 'Original', note: 'The track as-is' },
  { id: 'concert', label: 'Live Concert', note: 'Arena reverb, PA punch, distance' },
  { id: 'eightD', label: '8D Audio', note: 'Put headphones on' },
  { id: 'slowed', label: 'Slowed + Reverb', note: 'Pitch down, huge space' },
  { id: 'nightcore', label: 'Nightcore', note: 'Pitched up and bright' },
  { id: 'nextroom', label: 'Next Room', note: 'Party through the wall' },
  { id: 'lofi', label: 'Lo-fi Tape', note: 'Warm, wobbly, worn' },
  { id: 'bass', label: 'Bass Boost', note: 'Low end turned way up' },
];

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function mountDemo(root: HTMLElement) {
  const q = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;
  const playBtn = q<HTMLButtonElement>('[data-play]');
  const abBtn = q<HTMLButtonElement>('[data-ab]');
  const pads = q<HTMLDivElement>('[data-pads]');
  const filter = q<HTMLInputElement>('[data-filter]');
  const filterOut = q<HTMLOutputElement>('[data-filter-out]');
  const note = q<HTMLElement>('[data-note]');
  const time = q<HTMLElement>('[data-time]');
  const bar = q<HTMLElement>('[data-bar]');
  const canvas = q<HTMLCanvasElement>('[data-spectrum]');
  const meterL = q<HTMLElement>('[data-meter-l]');
  const meterR = q<HTMLElement>('[data-meter-r]');
  const trackUrl = root.dataset.track!;

  let ctx: AudioContext | null = null;
  let engine: Engine | null = null;
  let buffer: AudioBuffer | null = null;
  let src: AudioBufferSourceNode | null = null;
  let input: GainNode | null = null;
  let startedAt = 0;
  let offset = 0;
  let playing = false;
  let scene = 'concert';
  let settings: Settings = applyPreset('concert', clone(DEFAULTS));
  let holding = false;

  pads.innerHTML = SCENES.map((s, i) =>
    `<button type="button" class="pad${s.id === scene ? ' on' : ''}" data-scene="${s.id}" aria-pressed="${s.id === scene}">` +
    `<span class="pad-n">${String(i).padStart(2, '0')}</span><span class="pad-l">${s.label}</span></button>`).join('');
  note.textContent = SCENES.find((s) => s.id === scene)!.note;

  const current = (): Settings => {
    const s = clone(settings);
    s.filter = { ...s.filter, on: true, value: Number(filter.value) };
    s.bypass = holding || scene === 'original';
    return s;
  };
  const push = () => engine?.apply(current());

  async function ensureEngine() {
    if (engine) return;
    ctx = new AudioContext({ latencyHint: 'playback' });
    buffer = await fetch(trackUrl).then((r) => r.arrayBuffer()).then((b) => ctx!.decodeAudioData(b));
    input = ctx.createGain();
    input.gain.value = 0.85; // headroom for the effects
    const workletUrl = URL.createObjectURL(new Blob([pitchShifterSource], { type: 'text/javascript' }));
    engine = await Engine.create(ctx, input, workletUrl);
    push();
  }

  function startSource() {
    src = ctx!.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(input!);
    src.start(0, offset % buffer!.duration);
    startedAt = ctx!.currentTime - offset;
  }

  async function togglePlay() {
    playBtn.disabled = true;
    try {
      await ensureEngine();
      if (ctx!.state !== 'running') await ctx!.resume();
      if (playing) {
        offset = ctx!.currentTime - startedAt;
        src?.stop();
        src = null;
        playing = false;
      } else {
        startSource();
        playing = true;
      }
    } catch (e) {
      note.textContent = `Audio couldn't start: ${(e as Error).message}`;
    } finally {
      playBtn.disabled = false;
      root.classList.toggle('is-playing', playing);
      playBtn.setAttribute('aria-pressed', String(playing));
      playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    }
  }

  playBtn.addEventListener('click', togglePlay);

  pads.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-scene]');
    if (!b) return;
    scene = b.dataset.scene!;
    settings = scene === 'original' ? clone(DEFAULTS) : applyPreset(scene, clone(DEFAULTS));
    pads.querySelectorAll('.pad').forEach((p) => {
      const on = p === b;
      p.classList.toggle('on', on);
      p.setAttribute('aria-pressed', String(on));
    });
    note.textContent = SCENES.find((s) => s.id === scene)!.note;
    push();
    if (!playing) void togglePlay();
  });

  // Hold to hear the untouched track
  const hold = (on: boolean) => { holding = on; abBtn.classList.toggle('on', on); push(); };
  abBtn.addEventListener('pointerdown', (e) => { abBtn.setPointerCapture(e.pointerId); hold(true); });
  abBtn.addEventListener('pointerup', () => hold(false));
  abBtn.addEventListener('pointercancel', () => hold(false));
  abBtn.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hold(true); } });
  abBtn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') hold(false); });

  const showFilter = () => {
    const v = Number(filter.value);
    filterOut.textContent = v < -2 ? `LOW-PASS ${-v}` : v > 2 ? `HIGH-PASS ${v}` : 'OPEN';
    filter.style.setProperty('--p', `${(v + 100) / 2}%`);
  };
  filter.addEventListener('input', () => { showFilter(); push(); });
  filter.addEventListener('dblclick', () => { filter.value = '0'; showFilter(); push(); });
  showFilter();

  // visuals
  const g = canvas.getContext('2d')!;
  const bars: number[] = [];
  const fit = () => {
    const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  fit();
  new ResizeObserver(fit).observe(canvas);
  const peak = [0, 0];
  const frame = (t: number) => {
    requestAnimationFrame(frame);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w) return;
    const raw = engine && playing ? engine.spectrum() : null;
    const n = raw ? raw.length : 48;
    while (bars.length < n) bars.push(0);
    g.clearRect(0, 0, w, h);
    const gap = 3, bw = (w - gap * (n - 1)) / n;
    const grad = g.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, '#f08a12'); grad.addColorStop(0.6, '#ffb52e'); grad.addColorStop(1, '#ffe08a');
    g.fillStyle = grad;
    for (let i = 0; i < n; i++) {
      const target = raw ? raw[i] / 255 : 0.05 + 0.03 * Math.sin(t / 700 + i * 0.4);
      bars[i] += (target - bars[i]) * (target > bars[i] ? 0.55 : 0.15);
      const bh = Math.max(2, bars[i] * (h - 4));
      g.globalAlpha = raw ? 1 : 0.25;
      g.fillRect(i * (bw + gap), h - bh, bw, bh);
    }
    g.globalAlpha = 1;
    if (engine && playing) {
      const m = engine.outMeter.read();
      for (let c = 0; c < 2; c++) {
        const db = m.peak[c] > 1e-5 ? 20 * Math.log10(m.peak[c]) : -90;
        const v = Math.max(0, Math.min(1, (db + 48) / 48));
        peak[c] = v > peak[c] ? v : peak[c] - 0.02;
      }
    } else { peak[0] = Math.max(0, peak[0] - 0.02); peak[1] = Math.max(0, peak[1] - 0.02); }
    meterL.style.setProperty('--v', String(peak[0]));
    meterR.style.setProperty('--v', String(peak[1]));
    if (ctx && buffer) {
      const pos = playing ? (ctx.currentTime - startedAt) % buffer.duration : offset % buffer.duration;
      time.textContent = `${fmtTime(pos)} / ${fmtTime(buffer.duration)}`;
      bar.style.setProperty('--p', `${(pos / buffer.duration) * 100}%`);
    }
  };
  requestAnimationFrame(frame);
}

document.querySelectorAll<HTMLElement>('[data-demo]').forEach(mountDemo);
