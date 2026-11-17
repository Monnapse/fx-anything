import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import logoUrl from './assets/logo.svg';
import { AudioController, TEST_INPUT, type DeviceLists } from './audio/controller';
import { applyPreset, DEFAULTS, normalize, PRESETS, type ModuleId, type Settings } from './audio/settings';
import { Fader } from './ui/Fader';
import { Knob } from './ui/Knob';
import { MODULES, MODULE_COLOR, type ModuleDef } from './ui/modules';
import { Meter, Spectrum } from './ui/Visuals';
import { WindowControls } from './ui/WindowControls';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
const load = <T,>(k: string, f: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : f; } catch { return f; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

const CABLE_OUT = /cable output/i;
const CABLE_IN = /cable input/i;

function Logo() {
  return <img className="logo" src={logoUrl} alt="" draggable={false} />;
}

function Stepper({ value, opts, onChange, disabled }: { value: string; opts: [string, string][]; onChange: (v: string) => void; disabled?: boolean }) {
  const i = Math.max(0, opts.findIndex(([v]) => v === value));
  const go = (d: number) => onChange(opts[(i + d + opts.length) % opts.length][0]);
  return (
    <div className={`stepper ${disabled ? 'off' : ''}`}>
      <button type="button" onClick={() => go(-1)} aria-label="Previous">‹</button>
      <span className="mono">{opts[i][1]}</span>
      <button type="button" onClick={() => go(1)} aria-label="Next">›</button>
    </div>
  );
}

function ModuleStrip({ def, s, set }: { def: ModuleDef; s: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const on = !!s.on;
  return (
    <article className={`mod ${on ? 'on' : ''}`} style={{ ['--c' as string]: def.color }}>
      <button type="button" className="mod-head" onClick={() => set('on', !on)} aria-pressed={on} title={def.hint}>
        <i className="led" />
        <span className="mod-name">{def.name}</span>
      </button>
      <div className="mod-body">
        {def.controls.map((c) =>
          c.t === 'knob' ? (
            <Knob key={c.k} value={s[c.k] as number} min={c.min} max={c.max} step={c.step} def={c.def} label={c.label}
              color={def.color} bipolar={c.bipolar} fmt={c.fmt} disabled={!on} onChange={(v) => set(c.k, v)} />
          ) : (
            <Stepper key={c.k} value={s[c.k] as string} opts={c.opts} disabled={!on} onChange={(v) => set(c.k, v)} />
          ),
        )}
      </div>
    </article>
  );
}

export default function App() {
  const ctl = useMemo(() => new AudioController(), []);
  if (import.meta.env.DEV) (window as unknown as { __fx: AudioController }).__fx = ctl;
  const [settings, setSettings] = useState<Settings>(() => normalize(load('fxa.settings', DEFAULTS)));
  const [devices, setDevices] = useState<DeviceLists>({ inputs: [], outputs: [] });
  const [inputId, setInputId] = useState<string>(() => load('fxa.input', ''));
  const [outputId, setOutputId] = useState<string>(() => load('fxa.output', 'default'));
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const [scene, setScene] = useState<string | null>(null);
  const [stats, setStats] = useState({ sr: 0, lat: 0 });
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // ---- devices ----
  const refreshDevices = useCallback(async () => {
    try {
      let d = await ctl.listDevices();
      if (d.inputs.length && d.inputs.every((x) => !x.label || x.label === 'Input')) {
        await ctl.unlockLabels().catch(() => {});
        d = await ctl.listDevices();
      }
      setDevices(d);
      setInputId((cur) => {
        if (cur && (cur === TEST_INPUT || d.inputs.some((x) => x.id === cur))) return cur;
        return d.inputs.find((x) => CABLE_OUT.test(x.label))?.id ?? TEST_INPUT;
      });
      setOutputId((cur) => (d.outputs.some((x) => x.id === cur) ? cur : 'default'));
    } catch (e) {
      setError(`Can't list audio devices: ${(e as Error).message}`);
    }
  }, [ctl]);

  useEffect(() => {
    void refreshDevices();
    navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
  }, [refreshDevices]);

  useEffect(() => save('fxa.input', inputId), [inputId]);
  useEffect(() => save('fxa.output', outputId), [outputId]);

  // ---- settings → engine ----
  useEffect(() => {
    ctl.apply(settings);
    const t = setTimeout(() => save('fxa.settings', settings), 250);
    return () => clearTimeout(t);
  }, [settings, ctl]);

  const update = useCallback((mod: keyof Settings, key: string | null, value: unknown) => {
    setScene(null);
    setSettings((s) => {
      const next = { ...s } as Record<string, unknown>;
      next[mod] = key === null ? value : { ...(s[mod] as object), [key]: value };
      return next as unknown as Settings;
    });
  }, []);

  const pickScene = useCallback((id: string | null) => {
    setSettings((s) => applyPreset(id, s));
    setScene(id);
  }, []);

  // ---- engine on/off ----
  const start = useCallback(async (inId = inputId, outId = outputId) => {
    setBusy(true);
    setError(null);
    try {
      await ctl.start(inId, outId, settingsRef.current);
      setRunning(true);
      setStats({ sr: ctl.sampleRate, lat: ctl.latencyMs });
    } catch (e) {
      await ctl.stop();
      setRunning(false);
      setError(`Couldn't start audio: ${(e as Error).message || e}`);
    } finally {
      setBusy(false);
    }
  }, [ctl, inputId, outputId]);

  const stop = useCallback(async () => {
    await ctl.stop();
    setRunning(false);
  }, [ctl]);

  useEffect(() => { ctl.onEnded = () => setRunning(false); }, [ctl]);
  useEffect(() => () => { void ctl.stop(); }, [ctl]);

  const changeInput = (id: string) => { setInputId(id); if (running) void start(id, outputId); };
  const changeOutput = async (id: string) => {
    setOutputId(id);
    if (running) await ctl.setOutput(id).catch((e) => setError(`Output switch failed: ${e.message}`));
  };

  // ---- keyboard ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'SELECT' || tag === 'INPUT' || e.ctrlKey || e.metaKey || e.altKey) return;
      const p = PRESETS.find((x) => x.key === e.key);
      if (p) return pickScene(p.id);
      if (e.key === '0') return pickScene(null);
      if (e.key.toLowerCase() === 'b') return update('bypass', null, !settingsRef.current.bypass);
      if (e.code === 'Space' && (e.target === document.body)) { e.preventDefault(); if (running) void stop(); else void start(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pickScene, update, running, start, stop]);

  // ---- derived ----
  const inLabel = devices.inputs.find((d) => d.id === inputId)?.label ?? '';
  const outLabel = devices.outputs.find((d) => d.id === outputId)?.label ?? '';
  const hasCable = devices.inputs.some((d) => CABLE_OUT.test(d.label));
  const feedbackRisk = CABLE_IN.test(outLabel) && CABLE_OUT.test(inLabel);
  const activeColors = MODULES.filter((m) => (settings[m.id] as { on: boolean }).on && !(m.id === 'filter' && settings.filter.value === 0)).map((m) => m.color);
  const specColors = activeColors.length ? activeColors.slice(0, 4) : ['#4ade80', '#f5a524'];
  const getEngine = useCallback(() => ctl.engine, [ctl]);
  const volDb = settings.master.volume <= 0 ? '-∞' : (20 * Math.log10(settings.master.volume / 100)).toFixed(1);

  const openSoundSettings = async () => {
    if (!isTauri) return;
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl('ms-settings:apps-volume');
  };

  return (
    <div className="app">
      <header className={`topbar ${isTauri ? 'frameless' : ''}`} data-tauri-drag-region>
        <div className="brand" data-tauri-drag-region><Logo /><span className="brand-name" data-tauri-drag-region>FX <b>ANYTHING</b></span></div>

        <div className="routing" data-tauri-drag-region>
          <label className="route">
            <span className="route-k">IN</span>
            <select value={inputId} onChange={(e) => changeInput(e.target.value)} aria-label="Input device">
              {devices.inputs.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              <option value={TEST_INPUT}>Test loop (built-in)</option>
            </select>
          </label>
          <svg className="route-arrow" viewBox="0 0 24 12" aria-hidden="true"><path d="M1 6h20m-5-4 5 4-5 4" /></svg>
          <label className="route">
            <span className="route-k">OUT</span>
            <select value={outputId} onChange={(e) => void changeOutput(e.target.value)} aria-label="Output device" disabled={!AudioController.supportsOutputSelect()}>
              {devices.outputs.length === 0 && <option value="default">System default</option>}
              {devices.outputs.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </label>
        </div>

        <div className="readouts mono" data-tauri-drag-region>
          <span><em>SR</em>{running ? `${(stats.sr / 1000).toFixed(1)}k` : '—'}</span>
          <span><em>LAT</em>{running ? `${stats.lat}ms` : '—'}</span>
        </div>

        <button type="button" className={`hw-btn ${settings.bypass ? 'lit-amber' : ''}`} onClick={() => update('bypass', null, !settings.bypass)} aria-pressed={settings.bypass} title="Bypass all effects (B)">
          <i className="led" />BYPASS
        </button>
        <button type="button" className="hw-btn icon" onClick={() => setHelp(true)} aria-label="Setup guide" title="Setup guide">?</button>
        <button type="button" className={`engage ${running ? 'live' : ''}`} onClick={() => (running ? stop() : start())} disabled={busy} aria-pressed={running} title="Start / stop (Space)">
          <i className="led" />{busy ? '…' : running ? 'LIVE' : 'ENGAGE'}
        </button>
        {isTauri && <WindowControls />}
      </header>

      {(error || feedbackRisk || (!hasCable && devices.inputs.length > 0)) && (
        <div className={`banner ${error || feedbackRisk ? 'bad' : ''}`}>
          {error ?? (feedbackRisk
            ? 'Output is set to CABLE Input — you won’t hear anything and it can feed back. Pick your speakers or headphones as OUT.'
            : 'VB-CABLE not detected. You can try effects with the Test loop, or install VB-CABLE to route apps like Spotify.')}
          <button type="button" onClick={() => (error ? setError(null) : setHelp(true))}>{error ? 'Dismiss' : 'Setup guide'}</button>
        </div>
      )}

      <section className="deck">
        <div className="panel scenes">
          <div className="panel-head"><span>SCENES</span><button type="button" className="txt-btn" onClick={() => pickScene(null)} title="Reset all (0)">RESET</button></div>
          <div className="pads">
            {PRESETS.map((p) => {
              const firstMod = Object.keys(p.patch).find((k) => k in MODULE_COLOR) as ModuleId;
              return (
                <button type="button" key={p.id} className={`pad ${scene === p.id ? 'hit' : ''}`} style={{ ['--c' as string]: MODULE_COLOR[firstMod] }} onClick={() => pickScene(p.id)}>
                  <span className="pad-key mono">{p.key}</span>
                  <span className="pad-name">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="panel screen">
          <div className="panel-head">
            <span>SPECTRUM</span>
            <span className="mono dim">{running ? (settings.bypass ? 'BYPASSED' : `${inputId === TEST_INPUT ? 'TEST LOOP' : inLabel.replace(/\s*\(.*\)$/, '')}`) : 'STANDBY'}</span>
          </div>
          <div className="screen-glass">
            <Spectrum getEngine={getEngine} colors={specColors} />
            {!running && (
              <div className="screen-overlay">
                <p>Route an app to <b>CABLE Input</b>, choose <b>CABLE Output</b> as IN, then</p>
                <button type="button" className="engage small" onClick={() => start()} disabled={busy}><i className="led" />ENGAGE</button>
              </div>
            )}
          </div>
        </div>

        <div className="panel master">
          <div className="panel-head"><span>MASTER</span><span className="mono dim">{volDb} dB</span></div>
          <div className="master-body">
            <Meter getEngine={getEngine} which="in" label="IN" />
            <Meter getEngine={getEngine} which="out" label="OUT" />
            <Fader value={settings.master.volume} min={0} max={300} unity={100} label="VOL" onChange={(v) => update('master', 'volume', v)} />
          </div>
        </div>
      </section>

      <section className="rack" aria-label="Effects">
        {MODULES.map((m) => (
          <ModuleStrip key={m.id} def={m} s={settings[m.id] as unknown as Record<string, unknown>} set={(k, v) => update(m.id, k, v)} />
        ))}
      </section>

      <footer className="statusbar mono">
        <span>1–8 scenes · 0 reset · B bypass · Space engage</span>
        <span>drag knobs · shift = fine · double-click = reset</span>
      </footer>

      {help && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Setup guide" onClick={() => setHelp(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="panel-head"><span>SETUP · ROUTE ANY APP</span><button type="button" className="txt-btn" onClick={() => setHelp(false)}>CLOSE</button></div>
            <ol className="steps">
              <li><b>Install VB-CABLE</b> (free) from vb-audio.com if you haven’t. {hasCable ? <span className="ok">✓ detected</span> : <span className="warn">not detected</span>}</li>
              <li><b>Send the app to the cable.</b> In Windows Settings → Sound → Volume mixer, set the app’s (e.g. Spotify) output to <b>CABLE Input</b>.
                {isTauri && <button type="button" className="txt-btn inline" onClick={() => void openSoundSettings()}>OPEN VOLUME MIXER</button>}</li>
              <li><b>In FX Anything</b>, set IN to <b>CABLE Output</b> and OUT to your headphones or speakers.</li>
              <li>Press <b>ENGAGE</b>. Everything that app plays now runs through the rack.</li>
            </ol>
            <p className="dim">Tip: set an app back to “Default” in the volume mixer to hear it normally again. Avoid choosing CABLE Input as OUT.</p>
          </div>
        </div>
      )}
    </div>
  );
}
