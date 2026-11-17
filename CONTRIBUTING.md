# Contributing to FX Anything

## Build from source

Needs [Node.js 20+](https://nodejs.org), [Rust](https://rustup.rs) and the Visual Studio C++ build tools.

```bash
npm install
npm run tauri dev      # run the app with hot reload
npm run tauri build    # installer in src-tauri/target/release/bundle/nsis
```

`npm run dev` runs just the UI in a browser, which is handy for working on the interface (use the **Test loop** input).

## How it works

- **Tauri 2** shell with the system WebView2, so the app stays small and starts fast.
- **React + Vite** UI in `src/`.
- **Web Audio API** for the effects (`src/audio/engine.ts`). Pitch shifting runs in an `AudioWorklet`; reverbs use generated impulse responses; 8D uses an HRTF panner driven by audio-rate oscillators.
- `AudioContext.setSinkId` picks the output device; input is captured with echo cancellation, noise suppression and auto-gain turned off.

## Website

The landing page lives in `site/` and deploys to GitHub Pages on every push to `main`.
Its live "Hear it" demo runs the app's real audio engine in the browser. After changing anything in `src/audio`, rebuild it:

```bash
npm run build:site
```

## Releasing (maintainers)

1. Bump the version in `package.json` and `src-tauri/tauri.conf.json`.
2. Push a version tag; GitHub Actions builds the installer and attaches it to a draft release:

   ```bash
   git tag v0.1.1
   git push origin v0.1.1
   ```

3. Publish the draft on the Releases page (or `gh release edit v0.1.1 --draft=false --latest`).
