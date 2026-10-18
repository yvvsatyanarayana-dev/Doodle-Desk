/**
 * Lightweight, 100% Offline 2D Physics & Gravity Engine for Doodle Desk
 * Enables gravity simulation, rigid-body collisions, mouse throwing/flinging,
 * and bounce dynamics for canvas shapes.
 */

export const GRAVITY_MODES = {
  earth: { label: 'Earth (1G)', y: 980 },
  moon: { label: 'Moon (0.2G)', y: 180 },
  zero: { label: 'Zero-G', y: 0 },
  inverted: { label: 'Inverted (-1G)', y: -980 },
};

export const BOUNCE_MODES = {
  soft: { label: 'Soft Clay', restitution: 0.2 },
  rubber: { label: 'Rubber', restitution: 0.65 },
  superball: { label: 'Superball', restitution: 0.92 },
};

export class CanvasPhysicsWorld {
  constructor(optionsOrElements = {}) {
    let options = {};
    let initialElements = null;

    if (Array.isArray(optionsOrElements)) {
      initialElements = optionsOrElements;
    } else if (typeof optionsOrElements === 'object' && optionsOrElements !== null) {
      options = optionsOrElements;
    }

    const {
      gravity = 980,
      restitution = 0.65,
      friction = 0.98,
      bounds = { x: -1000, y: -1000, width: 4000, height: 3000 },
    } = options;

    this.gravity = gravity;
    this.restitution = restitution;
    this.friction = friction;
    this.bounds = bounds;
    this.bodies = new Map();
    this.originalSnapshots = new Map();
    this.initialPoses = this.originalSnapshots;
    this.isRunning = false;
    this.lastTime = 0;
    this.animationFrameId = null;
    this.onUpdateCallback = null;

    // Define length on bodies map
    Object.defineProperty(this.bodies, 'length', {
      get: () => this.bodies.size,
      configurable: true,
    });

    if (initialElements) {
      this.initElements(initialElements);
    }
  }

  setGravityMode(mode, interactive = false) {
    if (GRAVITY_MODES[mode]) {
      this.gravity = GRAVITY_MODES[mode].y;
    }
    if (interactive || this.isRunning) {
      this.nudgeOnGravityChange();
    }
  }

  nudgeOnGravityChange() {
    for (const body of this.bodies.values()) {
      if (body.isStatic) continue;
      if (this.gravity === 0) {
        body.vy = -(Math.random() * 140 + 60);
        body.vx += (Math.random() - 0.5) * 140;
      } else if (this.gravity < 0) {
        body.vy = -(Math.random() * 220 + 160);
      } else if (this.gravity === 180) {
        if (Math.abs(body.vy) < 30) {
          body.vy = -(Math.random() * 240 + 120);
        }
      } else {
        if (body.vy < 0) {
          body.vy = Math.random() * 100 + 40;
        }
      }
    }
  }

  setBounceMode(mode, interactive = false) {
    const rest = BOUNCE_MODES[mode]?.restitution
      ?? (mode === 'super' ? 0.94 : mode === 'rubber' || mode === 'normal' ? 0.65 : 0.25);
    this.restitution = rest;
    for (const body of this.bodies.values()) {
      body.restitution = rest;
      if (interactive && rest >= 0.6 && Math.abs(body.vy) < 30) {
        body.vy = -(Math.random() * 280 + 140);
        body.vx += (Math.random() - 0.5) * 80;
      }
    }
  }

  applyShake(power = 650) {
    this.shake(power);
  }

  resetBodies() {
    const toDelete = [];
    for (const [id, body] of this.bodies.entries()) {
      const snap = this.originalSnapshots.get(id);
      if (snap) {
        body.x = snap.x;
        body.y = snap.y;
        body.vx = (Math.random() - 0.5) * 40;
        body.vy = 0;
      } else {
        toDelete.push(id);
      }
    }
    for (const id of toDelete) {
      this.bodies.delete(id);
    }
    for (const key of Object.keys(this.bodies)) {
      if (!isNaN(key)) delete this.bodies[key];
    }
    let idx = 0;
    for (const body of this.bodies.values()) {
      this.bodies[idx++] = body;
    }
  }

  resetToDesignLayout(elements = null) {
    const target = elements || Array.from(this.bodies.values()).map(b => b.element).filter(Boolean);
    const restored = this.getRestoredElements(target);
    this.resetBodies();
    return restored;
  }

  /**
   * Initialize physics world with current canvas elements.
   * Snapshots original design positions so they can be restored at any time.
   */
  initElements(elements, viewportBounds = null) {
    // Clean previous numeric indexes
    for (const key of Object.keys(this.bodies)) {
      if (!isNaN(key)) delete this.bodies[key];
    }
    this.bodies.clear();
    this.originalSnapshots.clear();

    const floorY = viewportBounds
      ? viewportBounds.y + viewportBounds.height + 400
      : 1600;

    let index = 0;
    for (const el of elements) {
      if (el.isDeleted || el.isHidden) continue;

      // Save design snapshot
      this.originalSnapshots.set(el.id, {
        x: el.x,
        y: el.y,
        angle: el.angle || 0,
      });

      const w = Math.max(30, Math.abs(el.width || 100));
      const h = Math.max(30, Math.abs(el.height || 80));
      const isCircle = el.type === 'ellipse';
      const radius = isCircle ? Math.max(w, h) / 2 : 0;

      const body = {
        id: el.id,
        x: el.x,
        y: el.y,
        width: w,
        height: h,
        isCircle,
        radius,
        vx: (Math.random() - 0.5) * 40,
        vy: 0,
        mass: Math.max(1, (w * h) / 1000),
        restitution: this.restitution,
        isStatic: el.locked || false,
        element: el,
      };

      this.bodies.set(el.id, body);
      this.bodies[index++] = body;
    }

    if (viewportBounds) {
      this.bounds = {
        x: viewportBounds.left ?? viewportBounds.x,
        y: viewportBounds.y,
        top: viewportBounds.top ?? viewportBounds.y,
        width: viewportBounds.width,
        height: viewportBounds.height,
        bottom: viewportBounds.bottom ?? (viewportBounds.y + viewportBounds.height),
        left: viewportBounds.left ?? viewportBounds.x,
        right: viewportBounds.right ?? (viewportBounds.x + viewportBounds.width),
      };
    }
  }

  addBody(element) {
    if (!element) return null;
    const w = Math.max(30, Math.abs(element.width || 60));
    const h = Math.max(30, Math.abs(element.height || 60));
    const isCircle = element.type === 'ellipse';
    const radius = isCircle ? Math.max(w, h) / 2 : 0;

    const body = {
      id: element.id,
      x: element.x,
      y: element.y,
      width: w,
      height: h,
      isCircle,
      radius,
      vx: (Math.random() - 0.5) * 160,
      vy: this.gravity >= 0 ? (Math.random() * 100 + 60) : -(Math.random() * 100 + 60),
      mass: Math.max(1, (w * h) / 1000),
      restitution: this.restitution,
      isStatic: false,
      element,
    };

    this.bodies.set(element.id, body);
    this.bodies[this.bodies.size - 1] = body;
    return body;
  }

  /**
   * Step physics simulation forward by dt seconds.
   */
  step(dt) {
    if (dt <= 0 || dt > 0.1) dt = 0.016; // Clamp to ~60fps step

    const ceilingY = this.bounds.top ?? this.bounds.y;
    const floorY = this.bounds.bottom ?? (this.bounds.y + this.bounds.height);
    const leftWall = this.bounds.left ?? this.bounds.x;
    const rightWall = this.bounds.right ?? (this.bounds.x + this.bounds.width);

    const bodyList = Array.from(this.bodies.values());

    // 1. Integrate gravity and velocity
    for (const body of bodyList) {
      if (body.isStatic) continue;

      body.vy += this.gravity * dt;
      body.vx *= Math.pow(this.friction, dt * 60);
      body.vy *= Math.pow(this.friction, dt * 60);

      body.x += body.vx * dt;
      body.y += body.vy * dt;

      // Floor collision
      const bottom = body.y + body.height;
      if (bottom >= floorY) {
        body.y = floorY - body.height;
        // Zero out velocity when settling at low speed (resting contact to prevent jitter)
        if (Math.abs(body.vy) < 25 && this.gravity >= 0) {
          body.vy = 0;
          body.vx *= 0.85; // floor friction
        } else {
          body.vy = -body.vy * body.restitution;
          body.vx *= 0.90;
        }
      }

      // Ceiling collision (inverted gravity & upward impulses)
      if (body.y <= ceilingY) {
        body.y = ceilingY;
        if (Math.abs(body.vy) < 25 && this.gravity <= 0) {
          body.vy = 0;
          body.vx *= 0.88;
        } else {
          body.vy = -body.vy * body.restitution;
          body.vx *= 0.92;
        }
      }

      // Wall collisions
      if (body.x <= leftWall) {
        body.x = leftWall;
        body.vx = -body.vx * body.restitution;
      } else if (body.x + body.width >= rightWall) {
        body.x = rightWall - body.width;
        body.vx = -body.vx * body.restitution;
      }
    }

    // 2. Resolve pairwise body collisions with 2 relaxation iterations
    for (let iter = 0; iter < 2; iter++) {
      for (let i = 0; i < bodyList.length; i++) {
        const b1 = bodyList[i];
        for (let j = i + 1; j < bodyList.length; j++) {
          const b2 = bodyList[j];
          if (b1.isStatic && b2.isStatic) continue;

          // A. Circle vs Circle Collision
          if (b1.isCircle && b2.isCircle) {
            const c1x = b1.x + b1.radius;
            const c1y = b1.y + b1.radius;
            const c2x = b2.x + b2.radius;
            const c2y = b2.y + b2.radius;
            const dx = c2x - c1x;
            const dy = c2y - c1y;
            const distSq = dx * dx + dy * dy;
            const minDist = b1.radius + b2.radius;

            if (distSq < minDist * minDist) {
              const dist = Math.sqrt(distSq) || 0.001;
              const overlap = minDist - dist;
              const nx = dx / dist;
              const ny = dy / dist;

              const sep = overlap / 2;
              if (!b1.isStatic) {
                b1.x -= nx * sep;
                b1.y -= ny * sep;
              }
              if (!b2.isStatic) {
                b2.x += nx * sep;
                b2.y += ny * sep;
              }

              const vRel = (b2.vx - b1.vx) * nx + (b2.vy - b1.vy) * ny;
              if (vRel < 0) {
                const rest = Math.abs(vRel) < 25 ? 0 : Math.min(b1.restitution, b2.restitution);
                const impulse = -(1 + rest) * vRel / 2;
                if (!b1.isStatic) {
                  b1.vx -= impulse * nx;
                  b1.vy -= impulse * ny;
                }
                if (!b2.isStatic) {
                  b2.vx += impulse * nx;
                  b2.vy += impulse * ny;
                }
              }
            }
            continue;
          }

          // B. Box vs Box (and Box vs Circle / Diamond) Collision
          const c1x = b1.x + b1.width / 2;
          const c1y = b1.y + b1.height / 2;
          const c2x = b2.x + b2.width / 2;
          const c2y = b2.y + b2.height / 2;

          const dx = c2x - c1x;
          const dy = c2y - c1y;
          const overlapX = (b1.width / 2 + b2.width / 2) - Math.abs(dx);
          const overlapY = (b1.height / 2 + b2.height / 2) - Math.abs(dy);

          if (overlapX > 0 && overlapY > 0) {
            const rest = Math.min(b1.restitution, b2.restitution);

            if (overlapX < overlapY) {
              // Horizontal separation: dirX points from b1 to b2
              const dirX = dx > 0 ? 1 : -1;
              const sep = overlapX / 2;
              if (!b1.isStatic) b1.x -= dirX * sep;
              if (!b2.isStatic) b2.x += dirX * sep;

              const vRelX = (b2.vx - b1.vx) * dirX;
              if (vRelX < 0) {
                const effectiveRest = Math.abs(vRelX) < 25 ? 0 : rest;
                const impulse = -(1 + effectiveRest) * vRelX / 2;
                if (!b1.isStatic) b1.vx -= impulse * dirX;
                if (!b2.isStatic) b2.vx += impulse * dirX;
              }
            } else {
              // Vertical separation: dirY points from b1 to b2
              const dirY = dy > 0 ? 1 : -1;
              const sep = overlapY / 2;

              // Prevent pushing resting shapes down through the floor
              if (!b1.isStatic && !b2.isStatic) {
                if (b2.y + b2.height >= floorY - 1 && dirY > 0) {
                  b1.y -= overlapY;
                } else if (b1.y + b1.height >= floorY - 1 && dirY < 0) {
                  b2.y -= overlapY;
                } else {
                  b1.y -= dirY * sep;
                  b2.y += dirY * sep;
                }
              } else if (!b1.isStatic) {
                b1.y -= dirY * overlapY;
              } else if (!b2.isStatic) {
                b2.y += dirY * overlapY;
              }

              const vRelY = (b2.vy - b1.vy) * dirY;
              if (vRelY < 0) {
                const effectiveRest = Math.abs(vRelY) < 25 ? 0 : rest;
                const impulse = -(1 + effectiveRest) * vRelY / 2;
                if (!b1.isStatic) b1.vy -= impulse * dirY;
                if (!b2.isStatic) b2.vy += impulse * dirY;
              }
            }
          }
        }
      }

      // Enforce boundary clamping after each relaxation pass
      for (const b of bodyList) {
        if (b.isStatic) continue;
        if (b.y + b.height > floorY) {
          b.y = floorY - b.height;
          if (b.vy > 0) b.vy = 0;
        }
        if (b.y < ceilingY) {
          b.y = ceilingY;
          if (b.vy < 0) b.vy = 0;
        }
        if (b.x < leftWall) {
          b.x = leftWall;
          if (b.vx < 0) b.vx = 0;
        } else if (b.x + b.width > rightWall) {
          b.x = rightWall - b.width;
          if (b.vx > 0) b.vx = 0;
        }
      }
    }
  }

  /**
   * Apply an explosive radial blast / shake impulse to all shapes.
   */
  shake(power = 650) {
    for (const body of this.bodies.values()) {
      if (body.isStatic) continue;
      body.vx += (Math.random() - 0.5) * power * 2;
      body.vy += - (Math.random() * power + power * 0.5);
    }
  }

  /**
   * Spawn extra dynamic fun bouncy spheres into the simulation.
   */
  spawnBall(x, y, radius = 24, color = '#f43f5e') {
    const id = `ball_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const body = {
      id,
      x: x - radius,
      y: y - radius,
      width: radius * 2,
      height: radius * 2,
      isCircle: true,
      radius,
      vx: (Math.random() - 0.5) * 300,
      vy: - (Math.random() * 200 + 100),
      mass: 2,
      restitution: 0.88,
      isStatic: false,
      isSpawned: true,
      color,
    };
    this.bodies.set(id, body);
    return body;
  }

  /**
   * Reset all elements back to their exact original design coordinates.
   */
  getRestoredElements(currentElements) {
    return currentElements
      .map((el) => {
        const original = this.originalSnapshots.get(el.id);
        if (original) {
          return {
            ...el,
            x: original.x,
            y: original.y,
            angle: original.angle || 0,
          };
        }
        return el;
      })
      .filter((el) => !el.id.startsWith('ball_') && !el.id.startsWith('phys_drop_') && (!el.id.startsWith('phys_ball_') || this.originalSnapshots.has(el.id)));
  }

  /**
   * Start the continuous animation loop.
   */
  start(callback) {
    this.isRunning = true;
    this.onUpdateCallback = callback;
    this.lastTime = performance.now();

    const loop = (time) => {
      if (!this.isRunning) return;
      const dt = Math.min((time - this.lastTime) / 1000, 0.05);
      this.lastTime = time;

      this.step(dt);

      if (this.onUpdateCallback) {
        this.onUpdateCallback(this.bodies);
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Stop the animation loop.
   */
  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
