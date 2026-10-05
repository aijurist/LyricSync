# 🎵 LyricSync

Generate **word-level synced lyrics** from any song, entirely in your browser. LyricSync runs OpenAI's Whisper locally with [Transformers.js](https://huggingface.co/docs/transformers.js), on your GPU via **WebGPU** or on your CPU via WebAssembly. There's no server, and your audio never leaves your device.

![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![Transformers.js](https://img.shields.io/badge/Transformers.js-4-yellow)
![On-device](https://img.shields.io/badge/runs-100%25%20on--device-brightgreen)

## ✨ Features

- **On-device transcription.** Whisper (tiny/base/small) runs in a Web Worker on WebGPU, falling back to WASM. Models download once and are cached, so it works offline after that.
- **Three ways to sync:**
  - **Generate:** Whisper transcribes the song from scratch.
  - **Sync my lyrics with AI (most accurate):** paste the real lyrics and Whisper only supplies the timing. Your words are matched to what the AI heard by spelling *and sound* (phonetic keys), so misheard words like "grand" for "ground" still land correctly, and words it missed entirely are interpolated.
  - **Quick sync (no AI):** a pure signal-processing aligner. It finds sung-syllable onsets with a vocal-band spectral-flux detector, estimates syllables in your lyrics, and fits one to the other with dynamic programming. It needs no download and takes a couple of seconds, but the timing is rougher.
- **Accuracy helpers:** Whisper Large v3 Turbo on WebGPU, vocal-band audio cleanup (high-pass, presence boost, normalisation), and removal of common Whisper hallucinations ("Thanks for watching…") and runaway repeats.
- **Word-level timing.** Each word is highlighted as it's sung, and you can click any word or line to jump to it.
- **Smart line splitting.** Words are grouped into lyric lines using pauses, punctuation and length limits, and `[Music]`/`♪` noise is dropped.
- **Waveform player** with speed control, volume, A-B looping and smooth (per-frame) highlighting.
- **Editor**:
  - Fix text and times inline, and set a time from the current playback position with one click.
  - Insert or delete lines.
  - Shift all timings with a global offset (±0.1 s).
  - Full **undo/redo**.
- **Autosave.** Edits are kept in your browser, keyed to the audio file, so reopening the same file restores them.
- **Import** existing `.lrc`, `.srt`, `.vtt` or `.json` lyrics to re-time or fix them.
- **Export** to LRC, **Enhanced LRC** (word-level karaoke), SRT, WebVTT, plain text or JSON, or copy LRC to the clipboard.
- **Keyboard shortcuts** for everything (press `?` in the app).
- Drag-and-drop anywhere, a dark/light theme, and a responsive layout down to phone size.

## 🚀 Getting started

Requires **Node.js 18+**.

```bash
npm install
npm run dev        # http://localhost:5173
```

Open the app and drop in a song, or click **Try the sample**. The first transcription downloads the chosen model from the Hugging Face Hub (~60–400 MB depending on size). Later runs load it from the browser cache.

| Script               | What it does                       |
| -------------------- | ---------------------------------- |
| `npm run dev`        | Start the dev server               |
| `npm run build`      | Type-check and build to `dist/`    |
| `npm run preview`    | Serve the production build         |
| `npm test`           | Run unit tests (Vitest)            |
| `npm run lint`       | Lint with ESLint                   |

### Deploying

The build is a fully static site with relative asset paths. Upload `dist/` to any static host (GitHub Pages, Netlify, Vercel, S3, or a plain folder on a web server).

**Vercel:** import the repo at [vercel.com/new](https://vercel.com/new). `vercel.json` already sets the build, the output directory, and long-term caching for hashed assets, so there's nothing to configure.

## 🧠 How it works

```
audio file ──► decode + resample to 16 kHz mono (Web Audio, main thread)
           ──► Web Worker: Whisper via Transformers.js / ONNX Runtime (WebGPU or WASM)
                 30 s windows with 5 s overlap, return_timestamps: 'word'
           ──► segment words into lyric lines (pauses, punctuation, length)
           ──► play, edit, export, all in the browser
```

| Model | Download  | Notes                              |
| ----- | --------- | ---------------------------------- |
| Tiny  | ~60 MB    | Fastest; fine for clear vocals     |
| Base  | ~120 MB   | Default; good balance              |
| Small | ~400 MB   | Good; best choice without a GPU    |
| Large v3 Turbo | ~1 GB | Most accurate by far; needs WebGPU (default when available) |

The models are the `onnx-community/whisper-*_timestamped` exports, which include the cross-attention outputs needed for word timing. If a model can't provide word timing, LyricSync falls back to segment timestamps and estimates word positions.

**Browser support:** WebGPU acceleration works in recent Chrome and Edge, and in Safari 26+. Other browsers use the WASM backend, which is slower but works everywhere.

**Tips for accuracy:** Whisper is trained on speech, so sung vocals over a full mix are hard for any model. For correct words, paste the real lyrics and use **Sync my lyrics with AI**. Otherwise, pick the song's language instead of auto-detect and use Large v3 Turbo.

## ⌨️ Shortcuts

| Key                 | Action                     |
| ------------------- | -------------------------- |
| `Space`             | Play / pause               |
| `←` / `→`           | Seek 5 s                   |
| `Shift` + `←` / `→` | Previous / next line       |
| `↑` / `↓`           | Volume                     |
| `M`                 | Mute                       |
| `E`                 | Toggle edit mode           |
| `F`                 | Toggle auto-scroll         |
| `[` / `]`           | Shift all lyrics ±0.1 s    |
| `Ctrl/⌘ + Z`        | Undo (`+ Shift` to redo)   |

## 🏗️ Project structure

```
src/
├── App.tsx                    # Layout, state wiring, shortcuts, drag & drop
├── workers/
│   ├── transcriber.worker.ts  # Whisper inference (Transformers.js)
│   ├── quicksync.worker.ts    # Model-free sync off the main thread
│   └── protocol.ts            # Worker message types
├── hooks/
│   ├── useTranscriber.ts      # Drives the worker, progress, cancel
│   ├── useAudioPlayer.ts      # Playback state, rAF time sampling, A-B loop
│   ├── useHistory.ts          # Undo / redo
│   └── useTheme.ts, useWebGPU.ts
├── lib/
│   ├── audio.ts               # Decode + resample to 16 kHz mono
│   ├── segment.ts             # Words → lyric lines, hallucination cleanup
│   ├── align.ts, phonetic.ts  # Align pasted lyrics to AI timing (spelling + sound)
│   ├── quicksync.ts, syllables.ts  # Model-free onset detection + DP alignment
│   ├── lyrics.ts              # Active line lookup, edits, offset shifting
│   ├── formats.ts             # LRC / SRT / VTT / TXT / JSON import & export
│   ├── models.ts, languages.ts, storage.ts, time.ts
│   └── __tests__/             # Vitest unit tests
└── components/own/            # Upload panel, player, waveform, lyrics, toolbar…
```

## 📄 License

MIT
