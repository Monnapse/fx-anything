import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  def: number;
  label: string;
  color: string;
  bipolar?: boolean;
  disabled?: boolean;
  fmt: (v: number) => string;
  onChange: (v: number) => void;
}

const START = -135;
const SWEEP = 270;

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  if (Math.abs(a1 - a0) < 0.01) return '';
  const [x0, y0] = polar(cx, cy, r, Math.min(a0, a1));
  const [x1, y1] = polar(cx, cy, r, Math.max(a0, a1));
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

/** Rotary knob: drag up/down (Shift = fine), wheel, arrow keys, double-click to reset. */
export function Knob({ value, min, max, step = 1, def, label, color, bipolar, disabled, fmt, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; v: number } | null>(null);
  const [active, setActive] = useState(false);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };

  const clamp = (v: number) => {
    const s = Math.round((Math.min(max, Math.max(min, v)) - min) / step) * step + min;
    return Number(s.toFixed(4));
  };
  const norm = (value - min) / (max - min);
  const ang = START + norm * SWEEP;
  const zeroAng = bipolar ? START + ((0 - min) / (max - min)) * SWEEP : START;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { value: v, onChange: cb } = latest.current;
      const unit = Math.max(step, (max - min) / 100);
      cb(clamp(v + (e.deltaY < 0 ? 1 : -1) * unit * (e.shiftKey ? 0.25 : 1)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max, step]);

  const [px, py] = polar(28, 28, 15, ang);
  return (
    <div
      ref={ref}
      className={`knob ${active ? 'active' : ''} ${disabled ? 'off' : ''}`}
      style={{ ['--c' as string]: color }}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={fmt(value)}
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture(e.pointerId);
        drag.current = { y: e.clientY, v: value };
        setActive(true);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const range = max - min;
        const dy = drag.current.y - e.clientY;
        onChange(clamp(drag.current.v + (dy / (e.shiftKey ? 900 : 180)) * range));
      }}
      onPointerUp={() => { drag.current = null; setActive(false); }}
      onPointerCancel={() => { drag.current = null; setActive(false); }}
      onDoubleClick={() => onChange(def)}
      onKeyDown={(e) => {
        const unit = Math.max(step, (max - min) / 100);
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); onChange(clamp(value + unit)); }
        if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); onChange(clamp(value - unit)); }
        if (e.key === 'Home') onChange(min);
        if (e.key === 'End') onChange(max);
        if (e.key === 'Delete' || e.key === 'Backspace') onChange(def);
      }}
      title={`${label}: ${fmt(value)} — drag, scroll or double-click to reset`}
    >
      <svg viewBox="0 0 56 56" aria-hidden="true">
        {Array.from({ length: 11 }, (_, i) => {
          const a = START + (i / 10) * SWEEP;
          const [x0, y0] = polar(28, 28, 25, a);
          const [x1, y1] = polar(28, 28, 27.5, a);
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} className="tick" />;
        })}
        <path d={arc(28, 28, 21.5, START, START + SWEEP)} className="track" />
        <path d={arc(28, 28, 21.5, zeroAng, ang)} className="value" />
        <circle cx="28" cy="28" r="16.5" className="cap" />
        <line x1="28" y1="28" x2={px} y2={py} className="pointer" />
      </svg>
      <span className="knob-label">{label}</span>
      <span className="knob-val">{fmt(value)}</span>
    </div>
  );
}
