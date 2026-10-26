/**
 * Particle Cursor Trails & Presenter Spotlight Physics Engine
 * Renders high-performance interactive presenter trails with:
 * - Beam: Precision laser dot with fading crimson line
 * - Fireflies: Luminous spark particles with velocity & gravity physics
 * - Ribbon: Fluid calligraphic glowing ink stream
 * - Spotlight: Magnetic spring physics snapping glowing halo to nearby canvas elements
 */

export const TRAIL_MODES = {
  BEAM: 'beam',
  FIREFLIES: 'fireflies',
  RIBBON: 'ribbon',
  SPOTLIGHT: 'spotlight',
};

export class ParticleTrailEngine {
  constructor() {
    this.particles = [];
    this.points = [];
    this.mode = TRAIL_MODES.BEAM;
    this.spotlightTarget = null;
    this.spotlightCurrent = null; // { x, y, width, height, alpha }
  }

  setMode(mode) {
    if (Object.values(TRAIL_MODES).includes(mode)) {
      this.mode = mode;
      this.particles = [];
      this.points = [];
    }
  }

  cycleMode() {
    const modes = [
      TRAIL_MODES.BEAM,
      TRAIL_MODES.FIREFLIES,
      TRAIL_MODES.RIBBON,
      TRAIL_MODES.SPOTLIGHT,
    ];
    const currentIndex = modes.indexOf(this.mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.setMode(modes[nextIndex]);
    return this.mode;
  }

  addPoint(x, y, isDrawing = false) {
    const now = performance.now();
    this.points.push({ x, y, time: now, isDrawing });

    if (this.mode === TRAIL_MODES.FIREFLIES) {
      const spawnCount = isDrawing ? 4 : 2;
      for (let i = 0; i < spawnCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 2.5;
        this.particles.push({
          x: x + (Math.random() - 0.5) * 8,
          y: y + (Math.random() - 0.5) * 8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.3, // Slight upward buoyant drift
          size: 2 + Math.random() * 3.5,
          color: Math.random() > 0.4 ? '#38bdf8' : '#a855f7', // Cyan and Purple sparks
          alpha: 1,
          life: 0,
          maxLife: 320 + Math.random() * 260, // ms
        });
      }
    }
  }

  updateMagneticSpotlight(cursorX, cursorY, elements = [], { zoom = 1, scrollX = 0, scrollY = 0 } = {}) {
    if (this.mode !== TRAIL_MODES.SPOTLIGHT || !elements || elements.length === 0) {
      this.spotlightTarget = null;
      return;
    }

    // Convert cursor screen coordinates to canvas scene coordinates
    const sceneX = -scrollX + cursorX / zoom;
    const sceneY = -scrollY + cursorY / zoom;

    let closest = null;
    let minDistance = Infinity;

    for (const el of elements) {
      if (el.isDeleted || el.isHidden || el.type === 'frame') continue;
      const elX = el.x ?? 0;
      const elY = el.y ?? 0;
      const elW = el.width ?? 100;
      const elH = el.height ?? 60;

      // Distance to element center
      const centerX = elX + elW / 2;
      const centerY = elY + elH / 2;
      const dx = sceneX - centerX;
      const dy = sceneY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Magnetic attraction radius (within 160 scene px)
      const radius = Math.max(elW, elH) / 2 + 120;
      if (dist < radius && dist < minDistance) {
        minDistance = dist;
        closest = {
          screenX: (elX + scrollX) * zoom,
          screenY: (elY + scrollY) * zoom,
          screenWidth: elW * zoom,
          screenHeight: elH * zoom,
        };
      }
    }

    this.spotlightTarget = closest;
  }

  render(ctx, width, height, now = performance.now()) {
    ctx.clearRect(0, 0, width, height);

    // ── 1. Render Beam Mode ─────────────────────────────
    if (this.mode === TRAIL_MODES.BEAM) {
      const MAX_AGE = 350;
      this.points = this.points.filter((p) => now - p.time < MAX_AGE);
      const pts = this.points;

      if (pts.length > 1) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 1; i < pts.length; i++) {
          const p1 = pts[i - 1];
          const p2 = pts[i];
          const progress = 1 - (now - p2.time) / MAX_AGE;
          if (progress <= 0) continue;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(244, 63, 94, ${progress * 0.95})`;
          ctx.lineWidth = Math.max(progress * 3.5, 1.5);
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 6;
          ctx.stroke();
        }
      }
    }

    // ── 2. Render Fireflies Mode ─────────────────────────
    else if (this.mode === TRAIL_MODES.FIREFLIES) {
      this.particles = this.particles.filter((p) => p.life < p.maxLife);

      for (const p of this.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02; // Soft gravity
        p.life += 16;
        const progress = Math.max(0, 1 - p.life / p.maxLife);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * progress, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = progress * 0.9;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ── 3. Render Fluid Ribbon Mode ───────────────────────
    else if (this.mode === TRAIL_MODES.RIBBON) {
      const MAX_AGE = 450;
      this.points = this.points.filter((p) => now - p.time < MAX_AGE);
      const pts = this.points;

      if (pts.length > 2) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 2; i < pts.length; i++) {
          const p0 = pts[i - 2];
          const p1 = pts[i - 1];
          const p2 = pts[i];
          const progress = 1 - (now - p2.time) / MAX_AGE;
          if (progress <= 0) continue;

          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          // Quadratic bezier smoothing
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);

          ctx.strokeStyle = `rgba(16, 185, 129, ${progress * 0.9})`; // Neon Emerald
          ctx.lineWidth = Math.max(progress * 6, 2);
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 10;
          ctx.stroke();
        }
      }
    }

    // ── 4. Render Magnetic Spotlight Physics Mode ─────────
    if (this.mode === TRAIL_MODES.SPOTLIGHT && this.spotlightTarget) {
      const target = this.spotlightTarget;
      if (!this.spotlightCurrent) {
        this.spotlightCurrent = { ...target, alpha: 0 };
      }

      // Smooth spring interpolation (0.18 factor)
      this.spotlightCurrent.screenX += (target.screenX - this.spotlightCurrent.screenX) * 0.22;
      this.spotlightCurrent.screenY += (target.screenY - this.spotlightCurrent.screenY) * 0.22;
      this.spotlightCurrent.screenWidth += (target.screenWidth - this.spotlightCurrent.screenWidth) * 0.22;
      this.spotlightCurrent.screenHeight += (target.screenHeight - this.spotlightCurrent.screenHeight) * 0.22;
      this.spotlightCurrent.alpha += (1 - this.spotlightCurrent.alpha) * 0.15;

      const pad = 12;
      const x = this.spotlightCurrent.screenX - pad;
      const y = this.spotlightCurrent.screenY - pad;
      const w = this.spotlightCurrent.screenWidth + pad * 2;
      const h = this.spotlightCurrent.screenHeight + pad * 2;

      // Pulsing magnetic spotlight halo
      ctx.save();
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, w, h, 14) : ctx.rect(x, y, w, h);
      ctx.strokeStyle = `rgba(99, 102, 241, ${this.spotlightCurrent.alpha * 0.9})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#818cf8';
      ctx.shadowBlur = 16;
      ctx.stroke();

      // Outer focus glow ring
      ctx.strokeStyle = `rgba(129, 140, 248, ${this.spotlightCurrent.alpha * 0.4})`;
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.restore();
    } else if (this.spotlightCurrent) {
      this.spotlightCurrent.alpha *= 0.8;
      if (this.spotlightCurrent.alpha < 0.05) this.spotlightCurrent = null;
    }
  }
}
