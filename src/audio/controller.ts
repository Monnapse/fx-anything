import { Engine } from './engine';
import type { Settings } from './settings';
import { renderTestLoop } from './testLoop';

export const TEST_INPUT = 'fxa:test-loop';

export interface DeviceLists {
  inputs: { id: string; label: string }[];
  outputs: { id: string; label: string }[];
}

import pitchShifterSource from './worklets/pitch-shifter.js?raw';

// Load the worklet from a blob so it never depends on how the host serves files.
let workletBlobUrl: string | null = null;
const workletUrl = () => (workletBlobUrl ||= URL.createObjectURL(new Blob([pitchShifterSource], { type: 'text/javascript' })));

/** Reject if a step hangs, so the UI never gets stuck waiting. */
function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${what} timed out`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

/** Owns the AudioContext, the input stream and the effect engine. */
export class AudioController {
  engine: Engine | null = null;
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private testSrc: AudioBufferSourceNode | null = null;
  private trackLatency = 0;

  get running() { return !!this.engine; }
  get sampleRate() { return this.ctx?.sampleRate ?? 0; }

  /** Round-trip latency estimate in ms. */
  get latencyMs() {
    const c = this.ctx;
    if (!c) return 0;
    return Math.round((c.baseLatency + (c.outputLatency || 0) + this.trackLatency) * 1000);
  }

  static supportsOutputSelect() {
    return typeof AudioContext !== 'undefined' && 'setSinkId' in AudioContext.prototype;
  }

  /** Device labels are hidden until the app has audio-input permission once. */
  async unlockLabels() {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach((t) => t.stop());
  }

  async listDevices(): Promise<DeviceLists> {
    const all = await navigator.mediaDevices.enumerateDevices();
    const clean = (kind: MediaDeviceKind) =>
      all
        .filter((d) => d.kind === kind && d.deviceId !== 'communications')
        .map((d) => ({ id: d.deviceId, label: d.label || (kind === 'audioinput' ? 'Input' : 'Output') }));
    return { inputs: clean('audioinput'), outputs: clean('audiooutput') };
  }

  async start(inputId: string, outputId: string, settings: Settings) {
    await this.stop();
    let sampleRate: number | undefined;
    if (inputId !== TEST_INPUT) {
      this.stream = await withTimeout(navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: inputId && inputId !== 'default' ? { exact: inputId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: { ideal: 2 },
          // @ts-expect-error Chromium-only constraint
          latency: { ideal: 0.01 },
        },
      }), 8000, 'Opening the input device');
      const st = this.stream.getAudioTracks()[0]?.getSettings() as MediaTrackSettings & { latency?: number };
      sampleRate = st?.sampleRate;
      this.trackLatency = st?.latency ?? 0;
    } else {
      this.trackLatency = 0;
    }

    const ctx = new AudioContext({ latencyHint: 'interactive', sampleRate });
    this.ctx = ctx;
    if (outputId && AudioController.supportsOutputSelect()) {
      await withTimeout((ctx as AudioContext & { setSinkId(id: string): Promise<void> }).setSinkId(outputId === 'default' ? '' : outputId), 5000, 'Opening the output device');
    }

    let src: AudioNode;
    if (this.stream) {
      src = ctx.createMediaStreamSource(this.stream);
    } else {
      const s = ctx.createBufferSource();
      s.buffer = await renderTestLoop(ctx.sampleRate);
      s.loop = true;
      s.start();
      this.testSrc = s;
      src = s;
    }
    this.engine = await withTimeout(Engine.create(ctx, src, workletUrl()), 5000, 'Loading the effects');
    this.engine.apply(settings);
    // Don't block on resume: it only settles after a user gesture, which the click that got us here provides.
    if (ctx.state !== 'running') void ctx.resume();
    this.stream?.getAudioTracks()[0]?.addEventListener('ended', () => { void this.stop(); this.onEnded?.(); });
  }

  onEnded?: () => void;

  apply(settings: Settings) { this.engine?.apply(settings); }

  async setOutput(outputId: string) {
    if (this.ctx && AudioController.supportsOutputSelect()) {
      await (this.ctx as AudioContext & { setSinkId(id: string): Promise<void> }).setSinkId(outputId === 'default' ? '' : outputId);
    }
  }

  async stop() {
    this.engine?.dispose();
    this.engine = null;
    try { this.testSrc?.stop(); } catch { /* already stopped */ }
    this.testSrc = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.ctx) await this.ctx.close().catch(() => {});
    this.ctx = null;
  }
}
