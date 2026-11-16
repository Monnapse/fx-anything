export type Venue = 'club' | 'theater' | 'arena' | 'stadium' | 'festival';
export type MuffleMode = 'room' | 'underwater' | 'radio' | 'phone';

export interface Settings {
  bypass: boolean;
  master: { volume: number };
  filter: { on: boolean; value: number; res: number };
  pitch: { on: boolean; semitones: number };
  concert: { on: boolean; venue: Venue; distance: number };
  eightD: { on: boolean; speed: number; intensity: number };
  reverb: { on: boolean; size: number; mix: number };
  echo: { on: boolean; time: number; feedback: number; mix: number };
  eq: { on: boolean; bass: number; mid: number; treble: number };
  muffle: { on: boolean; mode: MuffleMode; amount: number };
  lofi: { on: boolean; warmth: number; wobble: number };
  widen: { on: boolean; width: number };
  karaoke: { on: boolean; strength: number };
}

export type ModuleId = Exclude<keyof Settings, 'bypass' | 'master'>;

export const DEFAULTS: Settings = {
  bypass: false,
  master: { volume: 100 },
  filter: { on: true, value: 0, res: 30 },
  pitch: { on: false, semitones: 0 },
  concert: { on: false, venue: 'arena', distance: 50 },
  eightD: { on: false, speed: 8, intensity: 100 },
  reverb: { on: false, size: 45, mix: 35 },
  echo: { on: false, time: 320, feedback: 35, mix: 30 },
  eq: { on: false, bass: 0, mid: 0, treble: 0 },
  muffle: { on: false, mode: 'room', amount: 60 },
  lofi: { on: false, warmth: 50, wobble: 40 },
  widen: { on: false, width: 180 },
  karaoke: { on: false, strength: 100 },
};

type Patch = { [K in keyof Settings]?: Partial<Settings[K]> };

export interface Preset { id: string; label: string; key: string; patch: Patch }

export const PRESETS: Preset[] = [
  { id: 'concert', label: 'Live Concert', key: '1', patch: { concert: { on: true, venue: 'arena', distance: 55 }, eq: { on: true, bass: 3 } } },
  { id: 'eightD', label: '8D Audio', key: '2', patch: { eightD: { on: true, speed: 8, intensity: 100 }, reverb: { on: true, size: 40, mix: 28 } } },
  { id: 'slowed', label: 'Slowed + Reverb', key: '3', patch: { pitch: { on: true, semitones: -3 }, reverb: { on: true, size: 72, mix: 45 }, eq: { on: true, bass: 4, treble: -2 } } },
  { id: 'nightcore', label: 'Nightcore', key: '4', patch: { pitch: { on: true, semitones: 4 }, eq: { on: true, bass: 2, treble: 3 } } },
  { id: 'nextroom', label: 'Next Room', key: '5', patch: { muffle: { on: true, mode: 'room', amount: 65 }, reverb: { on: true, size: 25, mix: 25 } } },
  { id: 'lofi', label: 'Lo-fi Tape', key: '6', patch: { lofi: { on: true, warmth: 55, wobble: 45 }, pitch: { on: true, semitones: -1 }, reverb: { on: true, size: 30, mix: 20 } } },
  { id: 'karaoke', label: 'Karaoke', key: '7', patch: { karaoke: { on: true, strength: 100 }, reverb: { on: true, size: 35, mix: 20 } } },
  { id: 'bass', label: 'Bass Boost', key: '8', patch: { eq: { on: true, bass: 12, mid: -2, treble: 2 } } },
];

export const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

export function normalize(raw: unknown): Settings {
  const out = clone(DEFAULTS) as unknown as Record<string, unknown>;
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (!(k in out)) continue;
      const base = out[k];
      if (base && typeof base === 'object' && v && typeof v === 'object') out[k] = { ...base, ...(v as object) };
      else if (typeof v === typeof base) out[k] = v;
    }
  }
  return out as unknown as Settings;
}

export function applyPreset(id: string | null, current: Settings): Settings {
  const s = clone(DEFAULTS);
  const p = PRESETS.find((x) => x.id === id);
  if (p) {
    for (const [k, v] of Object.entries(p.patch)) {
      const key = k as keyof Settings;
      (s as unknown as Record<string, unknown>)[key] = { ...(s[key] as object), ...(v as object) };
    }
  }
  s.master = { ...current.master };
  return s;
}
