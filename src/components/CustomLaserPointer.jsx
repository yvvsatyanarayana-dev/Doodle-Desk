import React, { useEffect, useRef, memo } from 'react';

const UI_SELECTOR = 'button, a, input, select, textarea, [role="button"], header, nav, dialog, ' +
  '.studio-topbar, .studio-topbar-left, .studio-topbar-center, .studio-topbar-right, ' +
  '.Island, .App-toolbar, .App-toolbar-container, .App-toolbar-content, .ToolIcon, ' +
  '.canvas-extra-tools-popover, .dropdown-panel, .dropdown-menu, .studio-dropdown-menu, ' +
  '.canvas-style-dropdown, .minimap-toggle-btn, .minimap-card, .help-icon, ' +
  '.layer-ui__wrapper__top-right, .layer-ui__wrapper__footer-right, .FooterLeft, ' +
  '.undo-redo-stack, .zoom-actions, .sidebar, .sidebar-trigger, .Modal, ' +
  '.live-collab-dropdown, .live-collab-chat-toggle, .live-collab-chat-panel, ' +
  '.studio-properties-panel, .App-menu__left-wrapper, .welcome-screen, .zen-mode-toggle-btn';

/**
 * Minimal Laser Pointer
 * Draws an ultra-fine, elegant glowing crimson beam when holding down and dragging on the canvas.
 * Always keeps pointerEvents: 'none' on the canvas overlay so it NEVER blocks clicks on toolbars or UI.
 * Passes through pointer events seamlessly when interacting with toolbars, headers, or menus.
 */
function CustomLaserPointerComponent({ isActive, onClose }) {
  const canvasRef = useRef(null);
  const pointsRef = useRef([]);
  const animFrameRef = useRef(null);
  const currentPosRef = useRef({ x: -100, y: -100 });
  const isPointerDownRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      pointsRef.current = [];
      isPointerDownRef.current = false;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const isOverUI = (target) => {
      if (!target) return false;
      return !!target.closest?.(UI_SELECTOR);
    };

    const handlePointerDown = (e) => {
      // If clicking on any toolbar or UI button, deactivate laser so the tool is selected
      if (isOverUI(e.target)) {
        onClose?.();
        return;
      }

      if (e.button === 0) {
        isPointerDownRef.current = true;
        const now = performance.now();
        pointsRef.current.push({ x: e.clientX, y: e.clientY, time: now });
      }
    };

    const handlePointerUp = () => {
      isPointerDownRef.current = false;
    };

    const handlePointerMove = (e) => {
      if (isOverUI(e.target)) {
        currentPosRef.current = { x: -100, y: -100 };
      } else {
        currentPosRef.current = { x: e.clientX, y: e.clientY };
      }

      if (isPointerDownRef.current) {
        const now = performance.now();
        pointsRef.current.push({ x: e.clientX, y: e.clientY, time: now });
      }
    };

    const handleKeyDown = (e) => {
      if (
        e.key === 'Escape' ||
        ((e.key === 'k' || e.key === 'K') && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey)
      ) {
        e.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('keydown', handleKeyDown);

    // Minimal render loop
    const render = (now) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const MAX_AGE = 350; // Smooth 350ms fade-out

      // Filter old trail points
      pointsRef.current = pointsRef.current.filter((p) => now - p.time < MAX_AGE);
      const pts = pointsRef.current;

      // Draw minimal smooth laser beam only when dragging
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

          // Minimal glowing crimson line
          ctx.strokeStyle = `rgba(244, 63, 94, ${progress * 0.95})`;
          ctx.lineWidth = Math.max(progress * 3, 1.5);
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 4;
          ctx.stroke();
        }
      }

      // Draw minimal laser bead at cursor position when over canvas
      const head = currentPosRef.current;
      if (head.x > 0 && head.y > 0) {
        ctx.beginPath();
        ctx.arc(head.x, head.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 6;
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('keydown', handleKeyDown);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isActive, onClose]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="custom-laser-canvas"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}

export const CustomLaserPointer = memo(CustomLaserPointerComponent);
