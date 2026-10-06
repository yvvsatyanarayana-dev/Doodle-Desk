# Changelog

All notable changes to the Doodle Desk project will be documented in this file.

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
