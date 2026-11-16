import { useRef } from 'react';

interface Props { value: number; min: number; max: number; unity: number; label: string; onChange: (v: number) => void }

/** Vertical hardware-style fader. Drag, wheel or arrow keys; double-click returns to unity. */
export function Fader({ value, min, max, unity, label, onChange }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const clamp = (v: number) => Math.round(Math.min(max, Math.max(min, v)));
  const fromY = (y: number) => {
    const r = track.current!.getBoundingClientRect();
    return clamp(min + (1 - (y - r.top) / r.height) * (max - min));
  };
  return (
    <div className="fader">
      <div
        ref={track}
        className="fader-track"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onPointerDown={(e) => { (e.currentTarget as Element).setPointerCapture(e.pointerId); dragging.current = true; onChange(fromY(e.clientY)); }}
        onPointerMove={(e) => { if (dragging.current) onChange(fromY(e.clientY)); }}
        onPointerUp={() => { dragging.current = false; }}
        onDoubleClick={() => onChange(unity)}
        onWheel={(e) => onChange(clamp(value + (e.deltaY < 0 ? 5 : -5)))}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') { e.preventDefault(); onChange(clamp(value + 5)); }
          if (e.key === 'ArrowDown') { e.preventDefault(); onChange(clamp(value - 5)); }
        }}
        title={`${label} — double-click for 0 dB`}
      >
        <div className="fader-slot" />
        <div className="fader-unity" style={{ bottom: `${pct(unity)}%` }} />
        <div className="fader-cap" style={{ bottom: `${pct(value)}%` }} />
      </div>
      <span className="fader-label">{label}</span>
    </div>
  );
}
