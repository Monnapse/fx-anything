import type { ModuleId } from '../audio/settings';

export interface KnobDef {
  t: 'knob';
  k: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  def: number;
  bipolar?: boolean;
  fmt: (v: number) => string;
}
export interface StepDef { t: 'step'; k: string; opts: [string, string][] }
export type Control = KnobDef | StepDef;

export interface ModuleDef { id: ModuleId; name: string; color: string; hint: string; controls: Control[] }

const pct = (v: number) => `${Math.round(v)}%`;
const db = (v: number) => `${v > 0 ? '+' : ''}${v}dB`;

export const MODULES: ModuleDef[] = [
  { id: 'filter', name: 'Filter', color: '#f5a524', hint: 'Left = low-pass, right = high-pass', controls: [
    { t: 'knob', k: 'value', label: 'Cutoff', min: -100, max: 100, def: 0, bipolar: true, fmt: (v) => (v < -2 ? `LP ${-v}` : v > 2 ? `HP ${v}` : 'OPEN') },
    { t: 'knob', k: 'res', label: 'Reso', min: 0, max: 100, def: 30, fmt: pct },
  ] },
  { id: 'pitch', name: 'Pitch', color: '#c084fc', hint: 'Shift pitch without changing speed', controls: [
    { t: 'knob', k: 'semitones', label: 'Semis', min: -12, max: 12, def: 0, bipolar: true, fmt: (v) => `${v > 0 ? '+' : ''}${v} st` },
  ] },
  { id: 'concert', name: 'Concert', color: '#f472b6', hint: 'Hear it from inside a venue', controls: [
    { t: 'step', k: 'venue', opts: [['club', 'Club'], ['theater', 'Theater'], ['arena', 'Arena'], ['stadium', 'Stadium'], ['festival', 'Festival']] },
    { t: 'knob', k: 'distance', label: 'Distance', min: 0, max: 100, def: 50, fmt: (v) => (v < 34 ? 'Front' : v < 67 ? 'Mid' : 'Back') },
  ] },
  { id: 'eightD', name: '8D', color: '#22d3ee', hint: 'Sound orbits your head — use headphones', controls: [
    { t: 'knob', k: 'speed', label: 'Orbit', min: 2, max: 20, step: 0.5, def: 8, fmt: (v) => `${v}s` },
    { t: 'knob', k: 'intensity', label: 'Depth', min: 0, max: 100, def: 100, fmt: pct },
  ] },
  { id: 'reverb', name: 'Reverb', color: '#a78bfa', hint: 'Room, hall or endless space', controls: [
    { t: 'knob', k: 'size', label: 'Space', min: 0, max: 100, def: 45, fmt: (v) => (v < 25 ? 'Room' : v < 55 ? 'Hall' : v < 80 ? 'Church' : 'Infinite') },
    { t: 'knob', k: 'mix', label: 'Mix', min: 0, max: 100, def: 35, fmt: pct },
  ] },
  { id: 'echo', name: 'Echo', color: '#60a5fa', hint: 'Repeating delay', controls: [
    { t: 'knob', k: 'time', label: 'Time', min: 60, max: 1000, step: 10, def: 320, fmt: (v) => `${v}ms` },
    { t: 'knob', k: 'feedback', label: 'Repeats', min: 0, max: 100, def: 35, fmt: pct },
    { t: 'knob', k: 'mix', label: 'Mix', min: 0, max: 100, def: 30, fmt: pct },
  ] },
  { id: 'eq', name: 'EQ', color: '#facc15', hint: 'Bass, mids and treble', controls: [
    { t: 'knob', k: 'bass', label: 'Low', min: -12, max: 15, def: 0, bipolar: true, fmt: db },
    { t: 'knob', k: 'mid', label: 'Mid', min: -12, max: 12, def: 0, bipolar: true, fmt: db },
    { t: 'knob', k: 'treble', label: 'High', min: -12, max: 12, def: 0, bipolar: true, fmt: db },
  ] },
  { id: 'muffle', name: 'Muffle', color: '#fb923c', hint: 'Next room, underwater, radio, phone', controls: [
    { t: 'step', k: 'mode', opts: [['room', 'Next room'], ['underwater', 'Underwater'], ['radio', 'Radio'], ['phone', 'Phone']] },
    { t: 'knob', k: 'amount', label: 'Amount', min: 0, max: 100, def: 60, fmt: pct },
  ] },
  { id: 'lofi', name: 'Lo-fi', color: '#e7b07a', hint: 'Warm, wobbly tape', controls: [
    { t: 'knob', k: 'warmth', label: 'Warmth', min: 0, max: 100, def: 50, fmt: pct },
    { t: 'knob', k: 'wobble', label: 'Wobble', min: 0, max: 100, def: 40, fmt: pct },
  ] },
  { id: 'widen', name: 'Width', color: '#34d399', hint: 'Stereo widener', controls: [
    { t: 'knob', k: 'width', label: 'Width', min: 0, max: 300, step: 5, def: 180, fmt: pct },
  ] },
  { id: 'karaoke', name: 'Karaoke', color: '#f87171', hint: 'Removes centred vocals', controls: [
    { t: 'knob', k: 'strength', label: 'Amount', min: 0, max: 100, def: 100, fmt: pct },
  ] },
];

export const MODULE_COLOR: Record<string, string> = Object.fromEntries(MODULES.map((m) => [m.id, m.color]));
