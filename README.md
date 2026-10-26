<div align="center">

# PPTEZ

**A keyframe-based presentation editor — build decks like a design tool, play them like slides.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/runtime-Bun-F9F1E1?logo=bun&logoColor=black)](https://bun.sh/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

PPTEZ is a single-user presentation authoring and playback tool for people who want slide decks that behave like short animations: elements live on a 1920 × 1080 canvas, every property change at a timeline step becomes a keyframe, and Framer Motion tweens between keyframes during playback.

**Status:** Prototype — editor, timeline, SQLite persistence, and static export work; `bun run lint` still reports a few React-hooks warnings as errors, and the edit API only exists inside the Vite dev server.

## Features

- Layer-based editor: nested frames, drag and marquee selection, 8-handle resize, grouping, z-order, hotkeys for every action
- Step-based timeline with per-element keyframes and per-keyframe duration / easing overrides
- Keyframe animation via Framer Motion: numeric tweens, springs, named easing presets, custom `cubic-bezier`
- Per-frame auto layout (`row` / `column` flexbox) with stagger and child motion presets
- Text splitting into characters, words, or lines for independent animation
- Element types: `frame`, `text`, `image` (uploaded asset or URL), `group`
- Edits persist to a local SQLite database through `bun:sqlite`; schema is created on first run
- `bun run build` freezes the database to `public/scene.json`, so the production bundle is fully static
- Asset upload (PNG/JPG/WebP/GIF/SVG) by drag-and-drop into `public/assets/` with content-hash filenames
- Keyboard-driven play mode with progress bar, step counter, and fullscreen

## How it works

- `src/scene/` is the data model: `types.ts`, the in-memory `store.ts`, `interpolate.ts` + `easing.ts` for tweening, `tree.ts` for hierarchy, and `Stage.tsx`, the player that renders a step.
- `src/editor/` is the editing UI (`EditorRoot`, `LeftPanel`, `RightPanel`, `CanvasArea`, `SelectionOverlay`, `Timeline`, `Topbar`, `AssetsPanel`); `src/App.tsx` switches between play and edit mode.
- `src/scene/api.ts` talks to `/api/*`, which `server/api.ts` mounts as a Vite plugin in dev: `GET /api/scene`, `POST`/`DELETE /api/elements`, `/api/keyframes`, `/api/meta`, `/api/assets`.
- `server/db.ts` owns the SQLite file at `.omc/presentation.db` (tables `meta`, `elements`, `keyframes`, `assets`).
- On `buildStart` the plugin exports the whole scene to `public/scene.json`; the built app fetches that file and never calls the API.

## Tech stack

- Runtime/Language: Bun 1.3+, TypeScript 6
- Framework: React 19 (React Compiler via Babel), Framer Motion 12, Tailwind CSS 4
- Build: Vite 8 with `@vitejs/plugin-react` and `@rolldown/plugin-babel`
- Storage: SQLite via `bun:sqlite` (dev only), static JSON in production
- Tooling: ESLint 9 + typescript-eslint, GitHub Actions CI (`bun install`, `tsc -b --force`, `bun run build`)

## Getting started

### Requirements

- [Bun](https://bun.sh/) 1.3 or newer (package manager and `bun:sqlite`)
- A current Chromium, Firefox, or Safari

### Install

```bash
git clone https://github.com/eunhhu/pptez.git
cd pptez
bun install
```

### Run

```bash
bun run dev         # Vite dev server on http://localhost:5173 with /api/* mounted
bun run build       # tsc -b, export public/scene.json, build dist/
bun run preview     # serve dist/ locally
bun run lint        # eslint .
bun run typecheck   # tsc -b --force
```

Open the dev server and press **E** to toggle the editor. The dev server binds to all interfaces (`host: true`) so other devices on the LAN can open it.

### Hotkeys

Play mode:

| Key | Action |
|---|---|
| `→` / `↓` / `Space` / `PageDown` | Next step |
| `←` / `↑` / `PageUp` | Previous step |
| `Home` / `End` | First / last step |
| `F` | Toggle fullscreen |
| `E` | Enter editor |

Edit mode:

| Key | Action |
|---|---|
| `→` / `←` / `Home` / `End` | Timeline navigation |
| `R` / `T` / `I` | Insert `frame` / `text` / `image` |
| `Ctrl+D` | Duplicate selection |
| `Ctrl+G` / `Ctrl+Shift+G` | Group / ungroup (groups become frames) |
| `Ctrl+]` / `Ctrl+[` | Move forward / backward in z |
| `Ctrl+Shift+]` / `Ctrl+Shift+[` | Bring to front / send to back |
| `Ctrl+A` | Select all top-level elements |
| `Ctrl+Shift+C` / `Ctrl+Shift+V` | Copy / paste keyframe at the current step |
| `Backspace` / `Delete` | Delete selection |
| `Escape` | Clear selection |
| `E` | Exit editor |

## Project structure

```text
server/
  api.ts          Vite plugin: /api/* routes in dev, scene.json export on build
  db.ts           bun:sqlite schema, upserts, legacy DB migration
src/
  scene/          data model, store, interpolation, easing, tree, Stage player
  editor/         editor UI components
  App.tsx         play <-> edit switch
  main.tsx        entry point
  index.css       Tailwind + custom styles
public/
  scene.json      exported scene used by the static build
  assets/         uploaded images (created on first upload)
.github/workflows/ci.yml   typecheck + build on push/PR
```

## Configuration

No environment variables are read. Paths are fixed: the database lives at `.omc/presentation.db` (an older `.omc/pptez.db` is picked up if present) and uploads go to `public/assets/`.

## Known rough edges

- `react-hooks/exhaustive-deps` / React Compiler findings remain in `LeftPanel.tsx`, `SelectionOverlay.tsx`, and `Stage.tsx`, so `bun run lint` currently fails.
- There is no standalone edit server; to edit from another machine you must run the Vite dev server.
- Other branches (`sw`, `p2`, `only-code`) hold earlier single-file timeline experiments and a specific talk deck, not the editor.

## License

[MIT](LICENSE).
