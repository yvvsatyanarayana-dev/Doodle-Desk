import { exportToSvg } from './export.js';
import { getCommonBounds } from '../math/geometry.js';
import { getScenarioWalkthroughScenes } from '../scenarioWalkthrough.js';

/**
 * Generates a self-contained, zero-dependency interactive HTML web player document.
 * Viewers can pan, zoom, toggle dark/light theme, and step through slide frames.
 */
export async function generateInteractiveHtml(elements = [], appState = {}, files = {}, options = {}) {
  const activeElements = elements.filter((el) => !el.isDeleted);
  const docTitle = appState.name || 'Doodle Diagram';
  const theme = appState.theme || 'dark';
  const isWalkthrough = options.mode === 'walkthrough';

  // Extract frames as presentation slides
  const frameElements = activeElements
    .filter((el) => el.type === 'frame' && !el.isHidden)
    .sort((a, b) => {
      if (Math.abs(a.y - b.y) > 100) return a.y - b.y;
      return a.x - b.x;
    });

  const framesData = isWalkthrough
    ? getScenarioWalkthroughScenes(activeElements)
    : frameElements.map((f, i) => ({
    id: f.id,
    name: f.name || `Slide ${i + 1}`,
    x: f.x,
    y: f.y,
    width: f.width,
    height: f.height,
    }));

  // Generate SVG vector markup
  const rawSvg = await exportToSvg(activeElements, appState, files, {
    exportBackground: false,
    exportPadding: 48,
    adaptiveInk: true,
  });

  const bounds = getCommonBounds(activeElements) || { x: 0, y: 0, width: 1200, height: 800 };

  const html = `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
  <title>${escapeHtml(docTitle)} — Interactive Player</title>
  <style>
    :root {
      --bg: #111113;
      --card-bg: rgba(20, 20, 24, 0.88);
      --card-border: rgba(255, 255, 255, 0.1);
      --text: #f4f4f5;
      --text-muted: #a1a1aa;
      --accent: #333333;
      --grid-dot: rgba(255, 255, 255, 0.08);
      --shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
    }

    [data-theme="light"] {
      --bg: #f8fafc;
      --card-bg: rgba(255, 255, 255, 0.92);
      --card-border: rgba(0, 0, 0, 0.09);
      --text: #0f172a;
      --text-muted: #64748b;
      --accent: #111111;
      --grid-dot: rgba(0, 0, 0, 0.07);
      --shadow: 0 12px 32px rgba(0, 0, 0, 0.09);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      user-select: none;
      -webkit-user-select: none;
    }

    body, html {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: var(--bg);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: var(--text);
      transition: background-color 0.2s ease, color 0.2s ease;
    }

    #canvas-container {
      position: absolute;
      inset: 0;
      cursor: grab;
      touch-action: none;
      background-image: radial-gradient(circle, var(--grid-dot) 1px, transparent 1px);
      background-size: 24px 24px;
    }

    #canvas-container.panning {
      cursor: grabbing;
    }

    #svg-stage {
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: 0 0;
      will-change: transform;
      pointer-events: none;
    }

    #svg-stage svg {
      display: block;
      overflow: visible;
    }

    [data-theme="light"] #svg-stage [data-theme-stroke="light"] {
      stroke: #1e1e1e !important;
    }

    [data-theme="dark"] #svg-stage [data-theme-stroke="dark"] {
      stroke: #f4f4f5 !important;
    }

    [data-theme="light"] #svg-stage [data-theme-text="light"] {
      fill: #1e1e1e !important;
    }

    [data-theme="dark"] #svg-stage [data-theme-text="dark"] {
      fill: #f4f4f5 !important;
    }

    /* Floating Bottom Dock */
    .player-dock {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 6px 12px;
      box-shadow: var(--shadow);
      z-index: 100;
      transition: all 0.2s ease;
    }

    .dock-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
      padding: 0 6px;
      white-space: nowrap;
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dock-divider {
      width: 1px;
      height: 18px;
      background: var(--card-border);
      margin: 0 4px;
    }

    .dock-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.15s ease;
    }

    .dock-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text);
    }

    [data-theme="light"] .dock-btn:hover:not(:disabled) {
      background: rgba(0, 0, 0, 0.06);
    }

    .dock-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .zoom-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      padding: 0 4px;
      min-width: 42px;
      text-align: center;
      cursor: pointer;
    }

    .zoom-label:hover {
      color: var(--text);
    }

    /* Presentation Slide Controls */
    .slide-counter {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text);
      padding: 0 6px;
      white-space: nowrap;
    }

    .slide-counter-total {
      font-size: 11px;
      color: var(--text-muted);
      font-weight: 400;
    }

    /* Keyboard Hint Modal */
    .hint-chip {
      position: fixed;
      top: 16px;
      right: 16px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 4px 10px;
      font-size: 11px;
      color: var(--text-muted);
      backdrop-filter: blur(12px);
      box-shadow: var(--shadow);
      z-index: 90;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .hint-chip kbd {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      padding: 1px 4px;
      font-size: 10px;
      font-weight: 600;
      color: var(--text);
    }

    [data-theme="light"] .hint-chip kbd {
      background: rgba(0, 0, 0, 0.07);
    }

    ${isWalkthrough ? `
    .scenario-story-card {
      position: fixed;
      top: 16px;
      left: 16px;
      z-index: 95;
      width: min(360px, calc(100vw - 32px));
      max-height: calc(100vh - 100px);
      overflow: auto;
      padding: 17px;
      border: 1px solid var(--card-border);
      border-radius: 14px;
      background: var(--card-bg);
      box-shadow: var(--shadow);
      backdrop-filter: blur(16px);
    }

    .scenario-story-eyebrow {
      color: var(--text-muted);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .1em;
      text-transform: uppercase;
    }

    .scenario-story-card h1 {
      margin: 7px 0 0;
      font-size: 20px;
      line-height: 1.3;
    }

    .scenario-story-description {
      margin: 8px 0 0;
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.55;
      white-space: pre-wrap;
    }

    .scenario-story-choices {
      display: grid;
      gap: 7px;
      margin-top: 15px;
    }

    .scenario-story-choice {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      width: 100%;
      padding: 10px 11px;
      border: 1px solid var(--card-border);
      border-radius: 9px;
      background: transparent;
      color: var(--text);
      font: inherit;
      font-size: 12px;
      text-align: left;
      cursor: pointer;
    }

    .scenario-story-choice:hover:not(:disabled) {
      background: rgba(127, 127, 127, .12);
    }

    .scenario-story-choice:disabled {
      cursor: default;
      opacity: .65;
    }

    .scenario-story-controls {
      display: flex;
      align-items: center;
      gap: 7px;
      margin-top: 13px;
      padding-top: 11px;
      border-top: 1px solid var(--card-border);
    }

    .scenario-story-controls button {
      padding: 7px 9px;
      border: 1px solid var(--card-border);
      border-radius: 7px;
      background: transparent;
      color: var(--text);
      font: inherit;
      font-size: 11px;
      cursor: pointer;
    }

    .scenario-story-controls button:disabled {
      cursor: not-allowed;
      opacity: .4;
    }

    .scenario-story-progress {
      margin-left: auto;
      color: var(--text-muted);
      font-size: 10px;
    }
    ` : ''}
  </style>
</head>
<body>
  <div id="canvas-container">
    <div id="svg-stage">
      ${rawSvg}
    </div>
  </div>

  <div class="hint-chip">
    <span>Pan: Drag | Zoom: Scroll | ${isWalkthrough ? 'Walkthrough:' : 'Slides:'}</span>
    <kbd>←</kbd><kbd>→</kbd>
  </div>

  ${isWalkthrough ? `
  <aside class="scenario-story-card" aria-label="Scenario walkthrough">
    <div id="scenario-eyebrow" class="scenario-story-eyebrow"></div>
    <h1 id="scenario-title"></h1>
    <p id="scenario-description" class="scenario-story-description"></p>
    <div id="scenario-choices" class="scenario-story-choices"></div>
    <div class="scenario-story-controls">
      <button id="scenario-back" type="button">Back</button>
      <button id="scenario-restart" type="button">Restart</button>
      <span id="scenario-progress" class="scenario-story-progress"></span>
    </div>
  </aside>
  ` : ''}

  <div class="player-dock">
    <div class="dock-title">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
      <span>${escapeHtml(docTitle)}</span>
    </div>

    ${framesData.length > 0 && !isWalkthrough ? `
    <div class="dock-divider"></div>

    <button id="btn-prev" class="dock-btn" title="Previous Slide (Left Arrow)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
    </button>

    <div class="slide-counter">
      <span id="slide-current">1</span>
      <span class="slide-counter-total">/ ${framesData.length}</span>
    </div>

    <button id="btn-next" class="dock-btn" title="Next Slide (Right Arrow)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
    ` : ''}

    <div class="dock-divider"></div>

    <button id="btn-zoom-out" class="dock-btn" title="Zoom Out (-)">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
    </button>

    <div id="btn-zoom-fit" class="zoom-label" title="Reset View (0)">100%</div>

    <button id="btn-zoom-in" class="dock-btn" title="Zoom In (+)">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
    </button>

    <div class="dock-divider"></div>

    <button id="btn-theme" class="dock-btn" title="Toggle Theme (T)">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
    </button>

    <button id="btn-fullscreen" class="dock-btn" title="Toggle Fullscreen (F)">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
    </button>
  </div>

  <script>
    (function () {
      const container = document.getElementById('canvas-container');
      const stage = document.getElementById('svg-stage');
      const zoomFitBtn = document.getElementById('btn-zoom-fit');
      const zoomInBtn = document.getElementById('btn-zoom-in');
      const zoomOutBtn = document.getElementById('btn-zoom-out');
      const themeBtn = document.getElementById('btn-theme');
      const fullscreenBtn = document.getElementById('btn-fullscreen');
      const prevBtn = document.getElementById('btn-prev');
      const nextBtn = document.getElementById('btn-next');
      const slideCurrentLabel = document.getElementById('slide-current');

      const bounds = ${JSON.stringify(bounds)};
      const frames = ${safeJsonForScript(framesData)};
      const scenarioMode = ${JSON.stringify(isWalkthrough)};
      const scenarioHistory = [];

      let currentSlide = 0;
      let scale = 1;
      let panX = 0;
      let panY = 0;

      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let startPanX = 0;
      let startPanY = 0;

      function updateTransform() {
        stage.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + scale + ')';
        zoomFitBtn.textContent = Math.round(scale * 100) + '%';
      }

      function fitToScreen(padding = 64) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const scaleX = (vw - padding * 2) / bounds.width;
        const scaleY = (vh - padding * 2) / bounds.height;
        scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.1), 3);
        panX = (vw - bounds.width * scale) / 2;
        panY = (vh - bounds.height * scale) / 2;
        updateTransform();
      }

      function zoomToPoint(newScale, clientX, clientY) {
        newScale = Math.min(Math.max(newScale, 0.05), 10);
        const ratio = newScale / scale;
        panX = clientX - (clientX - panX) * ratio;
        panY = clientY - (clientY - panY) * ratio;
        scale = newScale;
        updateTransform();
      }

      function renderScenario() {
        if (!scenarioMode) return;
        const frame = frames[currentSlide];
        const eyebrow = document.getElementById('scenario-eyebrow');
        const title = document.getElementById('scenario-title');
        const description = document.getElementById('scenario-description');
        const choices = document.getElementById('scenario-choices');
        const progress = document.getElementById('scenario-progress');
        const back = document.getElementById('scenario-back');
        if (!frame || !eyebrow || !title || !description || !choices || !progress || !back) return;

        eyebrow.textContent = 'Scene ' + (currentSlide + 1) + ' · ' + scenarioHistory.length + ' visited';
        title.textContent = frame.name;
        description.textContent = frame.description || 'Explore this scene, then choose a connected path to continue.';
        choices.replaceChildren();
        (frame.choices || []).forEach((choice) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'scenario-story-choice';
          button.textContent = choice.label + '  →  ' + choice.targetFrameName;
          button.addEventListener('click', () => {
            const destination = frames.findIndex((item) => item.id === choice.targetFrameId);
            if (destination >= 0) goToSlide(destination);
          });
          choices.appendChild(button);
        });
        if (!(frame.choices || []).length) {
          const complete = document.createElement('button');
          complete.type = 'button';
          complete.className = 'scenario-story-choice';
          complete.textContent = 'End of this path · Restart to play again';
          complete.disabled = true;
          choices.appendChild(complete);
        }
        progress.textContent = scenarioHistory.length + ' scene' + (scenarioHistory.length === 1 ? '' : 's');
        back.disabled = scenarioHistory.length < 2;
      }

      function goToSlide(index, recordHistory = true) {
        if (!frames || frames.length === 0) return;
        currentSlide = Math.max(0, Math.min(index, frames.length - 1));
        const frame = frames[currentSlide];
        if (!frame) return;
        if (scenarioMode && recordHistory && scenarioHistory[scenarioHistory.length - 1] !== currentSlide) {
          scenarioHistory.push(currentSlide);
        }

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const padding = 80;
        const scaleX = (vw - padding * 2) / frame.width;
        const scaleY = (vh - padding * 2) / frame.height;
        scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.1), 3);
        panX = (vw - frame.width * scale) / 2 - frame.x * scale;
        panY = (vh - frame.height * scale) / 2 - frame.y * scale;

        stage.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
        updateTransform();
        setTimeout(() => { stage.style.transition = ''; }, 450);

        if (slideCurrentLabel) slideCurrentLabel.textContent = currentSlide + 1;
        if (prevBtn) prevBtn.disabled = currentSlide === 0;
        if (nextBtn) nextBtn.disabled = currentSlide >= frames.length - 1;
        renderScenario();
      }

      // Initial fit
      fitToScreen();
      if (frames.length > 0) goToSlide(0);

      // Mouse drag to pan
      container.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startPanX = panX;
        startPanY = panY;
        container.classList.add('panning');
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panX = startPanX + (e.clientX - startX);
        panY = startPanY + (e.clientY - startY);
        updateTransform();
      });

      window.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        container.classList.remove('panning');
      });

      // Wheel / Pinch Zoom
      container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.ctrlKey || e.metaKey ? 0.05 : 0.002;
        const delta = -e.deltaY * zoomFactor;
        const targetScale = scale * (1 + delta);
        zoomToPoint(targetScale, e.clientX, e.clientY);
      }, { passive: false });

      // Button handlers
      zoomInBtn.addEventListener('click', () => {
        zoomToPoint(scale * 1.25, window.innerWidth / 2, window.innerHeight / 2);
      });

      zoomOutBtn.addEventListener('click', () => {
        zoomToPoint(scale / 1.25, window.innerWidth / 2, window.innerHeight / 2);
      });

      zoomFitBtn.addEventListener('click', () => fitToScreen());

      themeBtn.addEventListener('click', () => {
        const root = document.documentElement;
        const currentTheme = root.getAttribute('data-theme');
        root.setAttribute('data-theme', currentTheme === 'dark' ? 'light' : 'dark');
      });

      fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });

      if (prevBtn) prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
      if (nextBtn) nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));
      if (scenarioMode) {
        document.getElementById('scenario-back').addEventListener('click', () => {
          if (scenarioHistory.length < 2) return;
          scenarioHistory.pop();
          goToSlide(scenarioHistory[scenarioHistory.length - 1], false);
        });
        document.getElementById('scenario-restart').addEventListener('click', () => {
          scenarioHistory.length = 0;
          goToSlide(0);
        });
      }

      // Keyboard shortcuts
      window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          if (frames.length > 0 && (!scenarioMode || (frames[currentSlide].choices || []).length === 1)) {
            const nextFrameId = scenarioMode ? frames[currentSlide].choices[0].targetFrameId : null;
            const nextIndex = scenarioMode ? frames.findIndex((frame) => frame.id === nextFrameId) : currentSlide + 1;
            if (nextIndex >= 0) goToSlide(nextIndex);
          }
        } else if (e.key === 'ArrowLeft') {
          if (scenarioMode) {
            if (scenarioHistory.length > 1) {
              scenarioHistory.pop();
              goToSlide(scenarioHistory[scenarioHistory.length - 1], false);
            }
          } else if (frames.length > 0) goToSlide(currentSlide - 1);
        } else if (e.key === '+' || e.key === '=') {
          zoomToPoint(scale * 1.25, window.innerWidth / 2, window.innerHeight / 2);
        } else if (e.key === '-' || e.key === '_') {
          zoomToPoint(scale / 1.25, window.innerWidth / 2, window.innerHeight / 2);
        } else if (e.key === '0') {
          fitToScreen();
        } else if (e.key.toLowerCase() === 't') {
          themeBtn.click();
        } else if (e.key.toLowerCase() === 'f') {
          fullscreenBtn.click();
        }
      });

      window.addEventListener('resize', () => {
        fitToScreen();
      });
    })();
  </script>
</body>
</html>`;

  return html;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeJsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
