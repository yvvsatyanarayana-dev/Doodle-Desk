import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  AlertTriangle,
  CheckCircle,
  XCircle,
  X,
  Radio,
  Zap,
} from 'lucide-react';
import { NetworkTrafficEngine, NODE_HEALTH } from '../engine/simulation/trafficSimulator.js';
import { proceduralAudio } from '../utils/proceduralAudio.js';

export function NetworkTrafficSimulator({
  isActive,
  onClose,
  doodleAPI,
}) {
  const canvasRef = useRef(null);
  const engineRef = useRef(new NetworkTrafficEngine());
  const animFrameRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [metrics, setMetrics] = useState({
    inFlight: 0,
    delivered: 0,
    dropped: 0,
    errorRate: '0.0%',
    reqPerSec: 0,
  });

  const togglePlay = () => {
    proceduralAudio.playSnapClick();
    const next = !isPlaying;
    setIsPlaying(next);
    engineRef.current.isRunning = next;
  };

  const handleSpeedChange = (mult) => {
    setSpeedMultiplier(mult);
    engineRef.current.speedMultiplier = mult;
  };

  const handleCanvasClick = useCallback((e) => {
    if (!doodleAPI) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const appState = doodleAPI.getAppState?.() || {};
    const zoom = appState.zoom?.value || 1;
    const scrollX = appState.scrollX || 0;
    const scrollY = appState.scrollY || 0;

    // Convert to scene coordinates
    const sceneX = -scrollX + clickX / zoom;
    const sceneY = -scrollY + clickY / zoom;

    // Check hit on network nodes
    const engine = engineRef.current;
    for (const node of engine.network.nodes) {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const w = node.width ?? 100;
      const h = node.height ?? 60;

      if (sceneX >= x && sceneX <= x + w && sceneY >= y && sceneY <= y + h) {
        proceduralAudio.playSnapClick();
        const nextStatus = engine.toggleNodeHealth(node.id);
        doodleAPI.onToast?.(`${node.text || node.name || 'Service'} is now ${nextStatus.toUpperCase()}`);
        return;
      }
    }
  }, [doodleAPI]);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const engine = engineRef.current;
    engine.isRunning = isPlaying;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      if (doodleAPI) {
        const elements = doodleAPI.getSceneElements?.() || [];
        engine.updateElements(elements);
      }

      engine.step();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const appState = doodleAPI?.getAppState?.() || {};
      const zoom = appState.zoom?.value || 1;
      const scrollX = appState.scrollX || 0;
      const scrollY = appState.scrollY || 0;

      const toScreen = (x, y) => ({
        x: (x + scrollX) * zoom,
        y: (y + scrollY) * zoom,
      });

      // ── 1. Draw Flowing Traffic Packets ──
      for (const pkt of engine.packets) {
        const edge = engine.network.edges.find((e) => e.id === pkt.edgeId);
        if (!edge) continue;

        const from = edge.fromNode;
        const to = edge.toNode;
        if (!from || !to) continue;

        const fromCenter = {
          x: (from.x ?? 0) + (from.width ?? 100) / 2,
          y: (from.y ?? 0) + (from.height ?? 60) / 2,
        };
        const toCenter = {
          x: (to.x ?? 0) + (to.width ?? 100) / 2,
          y: (to.y ?? 0) + (to.height ?? 60) / 2,
        };

        const currentSceneX = fromCenter.x + (toCenter.x - fromCenter.x) * pkt.progress;
        const currentSceneY = fromCenter.y + (toCenter.y - fromCenter.y) * pkt.progress;
        const screenPos = toScreen(currentSceneX, currentSceneY);

        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, 4.5 * Math.min(zoom, 1.4), 0, Math.PI * 2);
        ctx.fillStyle = pkt.color;
        ctx.shadowColor = pkt.color;
        ctx.shadowBlur = 8;
        ctx.fill();
      }

      // ── 2. Draw Node Health Halos & Status Badges ──
      for (const node of engine.network.nodes) {
        const health = engine.nodeHealth.get(node.id) || NODE_HEALTH.HEALTHY;
        const screenPos = toScreen(node.x ?? 0, node.y ?? 0);
        const screenW = (node.width ?? 100) * zoom;
        const screenH = (node.height ?? 60) * zoom;

        if (health === NODE_HEALTH.FAILED) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;
          ctx.strokeRect(screenPos.x - 4, screenPos.y - 4, screenW + 8, screenH + 8);
        } else if (health === NODE_HEALTH.DEGRADED) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 8;
          ctx.strokeRect(screenPos.x - 3, screenPos.y - 3, screenW + 6, screenH + 6);
        }
      }

      // ── 3. Draw Particle Bursts ──
      for (const burst of engine.bursts) {
        const node = engine.network.nodeMap.get(burst.nodeId);
        if (!node) continue;
        const center = toScreen(
          (node.x ?? 0) + (node.width ?? 100) / 2,
          (node.y ?? 0) + (node.height ?? 60) / 2
        );
        const radius = burst.life * 2.5 * zoom;
        const alpha = Math.max(0, 1 - burst.life / burst.maxLife);

        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = burst.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      setMetrics(engine.getMetrics());
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isActive, isPlaying, doodleAPI]);

  if (!isActive) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9997,
          cursor: 'pointer',
        }}
      />

      {/* Traffic Simulator HUD Control Dock */}
      <div
        className="traffic-simulator-hud"
        style={{
          position: 'fixed',
          top: '68px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 16px',
          background: 'rgba(18, 18, 24, 0.94)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '30px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          zIndex: 10002,
          color: '#f4f4f5',
          fontSize: '12px',
          fontWeight: 600,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8' }}>
          <Radio size={14} className="animate-pulse" />
          <span>Traffic Simulator</span>
        </div>

        <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.15)' }} />

        {/* Play/Pause */}
        <button
          type="button"
          onClick={togglePlay}
          style={{
            background: isPlaying ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.08)',
            color: isPlaying ? '#38bdf8' : '#a1a1aa',
            border: 'none',
            borderRadius: '16px',
            padding: '4px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
          aria-label={isPlaying ? 'Pause traffic' : 'Resume traffic'}
        >
          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          <span>{isPlaying ? 'Pause' : 'Resume'}</span>
        </button>

        {/* Speed Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {[0.5, 1, 2].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSpeedChange(s)}
              style={{
                background: speedMultiplier === s ? '#6366f1' : 'transparent',
                color: speedMultiplier === s ? '#fff' : '#a1a1aa',
                border: 'none',
                borderRadius: '8px',
                padding: '2px 6px',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              {s}x
            </button>
          ))}
        </div>

        <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.15)' }} />

        {/* Live Metrics */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'monospace', fontSize: '11px' }}>
          <span style={{ color: '#38bdf8' }}>{metrics.reqPerSec} req/s</span>
          <span style={{ color: '#10b981' }}>{metrics.inFlight} in-flight</span>
          <span style={{ color: metrics.dropped > 0 ? '#ef4444' : '#a1a1aa' }}>
            {metrics.dropped} dropped ({metrics.errorRate})
          </span>
        </div>

        <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.15)' }} />

        <span style={{ fontSize: '11px', color: '#a1a1aa' }}>Click any node to simulate failure</span>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: '2px' }}
          aria-label="Exit traffic simulator"
        >
          <X size={14} />
        </button>
      </div>
    </>
  );
}

export default NetworkTrafficSimulator;
