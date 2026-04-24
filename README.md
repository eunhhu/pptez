<div align="center">

# PPTEZ

**A keyframe-based presentation editor — build slide decks like Figma, play them like PowerPoint.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/runtime-Bun-F9F1E1?logo=bun&logoColor=black)](https://bun.sh/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## Overview

PPTEZ is a single-user presentation authoring + playback tool. You drop frames, text, and images onto a 1920 × 1080 canvas, move the playhead on a step-based timeline, and every property change at that step becomes a keyframe. Framer Motion then tweens between keyframes at playback time — so a deck behaves less like a stack of slides and more like a short animation.

A slim Vite dev-server plugin persists every edit to a local SQLite database (`.omc/presentation.db`) and exports a static `public/scene.json` at build time, so the production bundle plays back without any server.

## Features

- **Figma-like editor** — layers panel with nesting, drag/marquee selection, 8-handle resize, grouping, z-order, hotkeys for everything.
- **Step-based timeline** — one column per step, per-element keyframes, per-keyframe duration / easing overrides.
- **Keyframe animation** — Framer Motion handles interpolation; supports numeric tweens, spring physics, named easing presets, and custom `cubic-bezier`.
- **Per-frame auto layout** — frames can be `row`/`column` flexboxes with stagger and child motion presets.
- **Text splitting** — break a text node into characters, words, or lines and animate them independently.
- **Element types** — `frame` (container), `text` (with font weight / alignment / split), `image` (asset or URL), `group` (logical only).
- **SQLite persistence** — schema auto-created on first run; bun:sqlite, zero-dep.
- **Ship as a static site** — `bun run build` freezes the current DB contents to `public/scene.json` and produces a normal Vite bundle.
- **Asset pipeline** — upload PNG/JPG/WebP/GIF/SVG via drag-and-drop; files land in `public/assets/` and get a content-hash filename.
- **Play mode** — keyboard-driven playback (`←/→`, `Space`, `Home/End`, `F` for fullscreen) with a progress bar and step counter.

## Requirements

- [Bun](https://bun.sh/) 1.3 or newer (used for both the package manager and `bun:sqlite`)
- A modern Chromium / Firefox / Safari

## Getting started

```bash
git clone https://github.com/eunhhu/pptez.git
cd pptez
bun install
bun run dev
```

Open http://localhost:5173/. Press **E** on the keyboard to toggle the editor.

### Common commands

| Command | What it does |
|---|---|
| `bun run dev` | Vite dev server with the edit API mounted at `/api/*`. |
| `bun run build` | Runs `tsc -b`, exports `public/scene.json` from the DB, and builds the static bundle into `dist/`. |
| `bun run preview` | Serves `dist/` locally for smoke-testing the production build. |
| `bun run lint` | ESLint over the whole tree. |
| `bun run typecheck` | `tsc --build --force` — type check without emitting. |

## Editor hotkeys

Play mode (outside the editor):

| Key | Action |
|---|---|
| `→` / `↓` / `Space` / `PageDown` | Next step |
| `←` / `↑` / `PageUp` | Previous step |
| `Home` / `End` | Jump to first / last step |
| `F` | Toggle fullscreen |
| `E` | Enter editor |

Edit mode:

| Key | Action |
|---|---|
| `→` / `←` / `Home` / `End` | Timeline navigation |
| `R` / `T` / `I` | Insert a `frame` / `text` / `image` element |
| `Ctrl+D` | Duplicate selection |
| `Ctrl+G` / `Ctrl+Shift+G` | Group / ungroup selection (groups become frames) |
| `Ctrl+]` / `Ctrl+[` | Move forward / backward in z |
| `Ctrl+Shift+]` / `Ctrl+Shift+[` | Bring to front / send to back |
| `Ctrl+A` | Select all top-level elements |
| `Ctrl+Shift+C` / `Ctrl+Shift+V` | Copy / paste a keyframe at the current step |
| `Backspace` / `Delete` | Delete selected elements |
| `Escape` | Clear selection |
| `E` | Exit editor |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                Browser (React + Framer Motion)              │
│                                                             │
│   ┌─────────────┐       ┌────────────┐     ┌────────────┐   │
│   │  EditorRoot │◀─────▶│ scene/store│◀───▶│    Stage   │   │
│   │ (LeftPanel, │       │  (in-mem)  │     │  (player)  │   │
│   │ RightPanel, │       └─────┬──────┘     └────────────┘   │
│   │ CanvasArea, │             │                             │
│   │ Timeline)   │             │ fetch / mutate              │
│   └─────────────┘             ▼                             │
│                         scene/api.ts                        │
└───────────────────────────────│─────────────────────────────┘
                                │  /api/*
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                  Vite dev plugin (server/api.ts)            │
│  GET /api/scene, POST/DELETE /api/elements, /api/keyframes, │
│  /api/meta, /api/assets                                     │
└───────────────────────────────│─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│           SQLite (.omc/presentation.db via bun:sqlite)      │
│   meta, elements, keyframes, assets                         │
└─────────────────────────────────────────────────────────────┘
```

At `bun run build`, the plugin's `buildStart` hook dumps the full scene to `public/scene.json`; the built bundle then reads it via a plain `fetch('/scene.json')` and the `/api/*` routes are never hit. Production is therefore entirely static.

## Project layout

```
pptez/
├─ server/
│  ├─ api.ts          # Vite plugin mounting /api/* in dev + scene.json export
│  └─ db.ts           # bun:sqlite schema + upserts
├─ src/
│  ├─ scene/          # data model (types, store, interpolate, easing, tree, Stage)
│  ├─ editor/         # editor UI (EditorRoot, panels, canvas, overlays, timeline)
│  ├─ App.tsx         # play ↔ edit router
│  ├─ main.tsx        # entry point
│  └─ index.css       # Tailwind + custom styles
├─ public/
│  ├─ scene.json      # exported at build time
│  └─ assets/         # uploaded images
├─ index.html
├─ vite.config.ts
└─ tsconfig.*.json
```

## Known rough edges

- A few `react-hooks/exhaustive-deps` / React Compiler warnings remain in `LeftPanel.tsx`, `SelectionOverlay.tsx`, and `Stage.tsx`. They are intentional (optional-chained dependencies that are stable in practice) but `bun run lint` currently reports them as errors; tightening is tracked as follow-up work.
- The `/api/*` routes are only served by the Vite dev plugin. If you need a standalone edit server (e.g. LAN access from a second machine), you'll have to extract `server/api.ts` into its own Bun HTTP listener.

## License

PPTEZ is released under the [MIT License](LICENSE).
