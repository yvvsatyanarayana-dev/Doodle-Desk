# Changelog

All notable changes to the Doodle Desk project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-10-17

### Added
- **Native Hand-Drawn Interactive Tables (`interactive_table`):**
  - Procedural hand-drawn vector border and divider paths matching native canvas shapes with organic roughness and line overshoots.
  - Proportional column and row scaling aligning HTML cells and SVG divider lines pixel-perfect.
  - Full keyboard navigation (`Tab`, `Shift+Tab`, `Enter`) with immediate in-cell editing and text selection.
  - Clean empty state without intrusive placeholder text; new tables start blank and uncluttered.
  - Floating quick-action pill positioned cleanly above the table with row/column operations and a dedicated `GripVertical` drag handle.
  - Right-click cell context menu for granular row and column insertions and deletions.
- **Executable JavaScript Scratchpad Cards (`code_runner`):**
  - Sandboxed offline JavaScript execution engine running directly on the canvas.
  - Captured console logs, return value inspection, and execution timing benchmarks.
  - Curated presets library and one-click "Stamp to Canvas" vector conversion.
- **Interactive Math & Function Graph Cards (`math_graph`):**
  - Real-time 2D curve plotting for algebraic, trigonometric, and exponential functions.
  - Dynamic parameter sliders (`a`, `b`, `c`) with instantaneous curve re-rendering.
  - Cursor coordinate tracking and one-click vector curve stamping.
- **Document Cards (`markdown` & `pdf`):**
  - Embedded Markdown cards with full GitHub Flavored Markdown (GFM) formatting.
  - Scalable offline multi-page PDF document cards.
- **Canvas Physics Playground:**
  - 2D gravity and collision simulation transforming static diagrams into dynamic interactive systems.
- **Isometric 3D Architecture View:**
  - Layered isometric 3D extrusion of 2D architecture diagrams and flowcharts.
- **Board Portals & Connected Flow Simulation:**
  - Visual portal cards providing instantaneous hyperlinks between separate boards and workspaces.
  - Animated flow simulation tracing connections and data pipelines across nodes.
- **Ambient Soundscapes Studio & Pomodoro Timer:**
  - Offline generative audio environments (rain, ambient forest, white noise) with a synchronized focus timer.

### Changed
- **Hardware-Accelerated Real-Time Embed Dragging:**
  - Removed canvas placeholder black box artifact on live canvas (`render.js`).
  - Added synchronous hardware-accelerated transforms for DOM overlays during dragging (`DoodleCanvas.jsx`), ensuring cards and selection bounding boxes move in perfect 1:1 lockstep.
- **Windows Setup Installer Documentation:**
  - Clarified Windows NSIS setup installer wizard, desktop shortcuts, file associations, and portable distribution options.

### Quality Assurance
- **Comprehensive Test Coverage:** Expanded unit and integration test suite to **197 passing tests across 39 test files**.
- **Production Build:** Verified zero-warning production renderer bundle compilation via Vite 6.

---

## [1.0.0] - 2026-10-06

### Added
- **Native Canvas Engine:** First-party vector graphics engine featuring hand-drawn strokes, shape recognition, precision geometry, and custom themes.
- **Offline Asset Bundling:** Completely offline and self-contained with zero CDN or cloud dependencies.
- **Advanced File Handling:**
  - Native file opening and saving for `.doodle` format.
  - Scene-embedded PNG and SVG export/import with embedded metadata.
  - Shape library management (`.doodlelib`).
  - Save, Save As, and Save a Copy with dirty state window indicators.
  - Native unsaved changes confirmation on close, quit, and new file actions.
  - Background auto-save snapshots and crash recovery restoration prompt.
- **OS Integrations:**
  - Native platform menus (macOS App Menu, Windows, Linux).
  - Platform keyboard shortcuts for all file, edit, and view operations.
  - File association registration for `.doodle` and `.doodlelib`.
  - Multi-window document management and single-instance lock.
  - Persistent recent file tracking across restarts, jump lists, and menus.
  - PDF export via Chromium `printToPDF` and native system printing.
  - Deep linking protocol handler (`doodle-desk://`).
- **Preferences System:**
  - System, Light, and Dark theme switching with OS synchronization.
  - Configurable auto-save modes and export defaults.
  - Hardware acceleration and spellcheck toggles.
- **Packaging:**
  - Windows NSIS installer and portable executable targets.
  - macOS DMG, ZIP, and hardened runtime configuration.
  - Linux AppImage, Debian (.deb), and RPM (.rpm) package targets.
- **Quality Assurance:**
  - Vitest unit tests for serialization, recents, and settings logic.
  - Playwright Electron smoke test suite.
