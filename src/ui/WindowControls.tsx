import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

/** Minimise / maximise / close for the frameless desktop window. */
export function WindowControls() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const win = getCurrentWindow();
    let unlisten: (() => void) | undefined;
    const sync = () => {
      win.isMaximized().then((m) => { setMaximized(m); document.documentElement.classList.toggle('maximized', m); }).catch(() => {});
    };
    sync();
    win.onResized(sync).then((u) => { unlisten = u; }).catch(() => {});
    return () => unlisten?.();
  }, []);

  const win = () => getCurrentWindow();
  return (
    <div className="winctl" role="group" aria-label="Window">
      <button type="button" className="winbtn" onClick={() => void win().minimize()} aria-label="Minimize" title="Minimize">
        <svg viewBox="0 0 12 12"><path d="M2 6.5h8" /></svg>
      </button>
      <button type="button" className="winbtn" onClick={() => void win().toggleMaximize()} aria-label={maximized ? 'Restore' : 'Maximize'} title={maximized ? 'Restore' : 'Maximize'}>
        {maximized
          ? <svg viewBox="0 0 12 12"><path d="M3.5 4.5h4v4h-4z" /><path d="M5 3h4v4" /></svg>
          : <svg viewBox="0 0 12 12"><rect x="2.5" y="2.5" width="7" height="7" rx="1" /></svg>}
      </button>
      <button type="button" className="winbtn close" onClick={() => void win().close()} aria-label="Close" title="Close">
        <svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3L3 9" /></svg>
      </button>
    </div>
  );
}
