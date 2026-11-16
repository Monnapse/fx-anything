<p align="center"><img src="app-icon.svg" width="88" alt=""></p>

<h1 align="center">FX Anything</h1>

<p align="center"><b>Live effects on anything your PC plays.</b><br>
Concert venues, 8D audio, slowed + reverb, nightcore, a DJ filter and more. All in real time.</p>

<p align="center"><a href="../../releases/latest"><b>⬇ Download for Windows</b></a></p>

![FX Anything](site/screenshot.png)

## What it does

FX Anything is a small desktop effects rack (a 2 MB download, built with Tauri). Route any app's sound into it, Spotify, YouTube in a browser, a game, anything, and twist knobs to reshape it live.

| Module | What it does |
| --- | --- |
| **DJ Filter** | One knob: sweep left for low-pass, right for high-pass, with resonance |
| **Pitch** | ±12 semitones without changing speed (the slowed / nightcore sound) |
| **Concert** | Club, theater, arena, stadium or festival, with distance from the stage |
| **8D** | The sound orbits your head (headphones) |
| **Reverb / Echo** | Room to infinite space; tempo-free delay |
| **EQ / Width** | Bass, mids, treble; stereo widener |
| **Muffle** | Next room, underwater, radio, phone |
| **Lo-fi** | Warm, wobbly tape |
| **Karaoke** | Removes centred vocals |

Eight **scene pads** (keys 1–8) load one-tap remixes. **B** bypasses everything so you can compare. A limiter on the output keeps it from clipping.

## Install

1. Download `FX Anything_x.y.z_x64-setup.exe` from [Releases](../../releases/latest) and run it.
   The installer isn't code-signed yet, so Windows SmartScreen may warn. Click **More info → Run anyway**.
2. Install the free [VB-CABLE](https://vb-audio.com/Cable/) virtual audio driver.
3. Open **Settings → System → Sound → Volume mixer** and set the app you want to remix (e.g. Spotify) to output to **CABLE Input**.
4. In FX Anything set **IN = CABLE Output** and **OUT = your headphones/speakers**, then press **ENGAGE**.

To go back to normal, set the app back to **Default** in the volume mixer.

> No VB-CABLE yet? Pick **Test loop (built-in)** as the input to try the effects.

## Build from source

Needs [Node.js 20+](https://nodejs.org), [Rust](https://rustup.rs) and the Visual Studio C++ build tools.

```bash
npm install
npm run tauri dev      # run the app with hot reload
npm run tauri build    # installer in src-tauri/target/release/bundle/nsis
```

`npm run dev` runs just the UI in a browser, which is handy for working on the interface (use the Test loop input).

## How it works

- **Tauri 2** shell with the system WebView2, so the app stays small and starts fast.
- **React + Vite** UI.
- **Web Audio API** for the effects. Pitch shifting runs in an `AudioWorklet`; reverbs use generated impulse responses; 8D uses an HRTF panner driven by audio-rate oscillators.
- `AudioContext.setSinkId` picks the output device; input is captured with echo cancellation, noise suppression and auto-gain turned off.

## Releasing

Push a version tag and GitHub Actions builds the installer and attaches it to a draft release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The landing page in `site/` deploys to GitHub Pages on every push to `main` (enable Pages → "GitHub Actions" in the repo settings once).

## License

[MIT](LICENSE)
