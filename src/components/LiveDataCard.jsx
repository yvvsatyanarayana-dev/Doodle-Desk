import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Activity,
  Globe,
  Radio,
  Wifi,
  RefreshCw,
  Settings,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Pause,
  Play,
  GripVertical,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { generateSketchyRoundedRectPath } from '../engine/renderer/sketchy.js';

// Predefined mock endpoint simulators for offline & rapid testing
const MOCK_PRESETS = [
  {
    id: 'prod_api',
    name: 'Production Gateway API',
    url: 'https://api.doodledesk.local/v1/gateway/health',
    interval: 5,
    field: 'status',
    generateResponse: () => ({
      status: 'HEALTHY',
      code: 200,
      ping: Math.floor(18 + Math.random() * 22),
      activeConnections: Math.floor(1240 + Math.random() * 120),
      uptime: '99.98%',
      timestamp: new Date().toISOString(),
    }),
  },
  {
    id: 'db_cluster',
    name: 'PostgreSQL Database Cluster',
    url: 'https://db-cluster.internal/healthz',
    interval: 6,
    field: 'activeConnections',
    generateResponse: () => {
      const isSlow = Math.random() < 0.15;
      return {
        status: isSlow ? 'DEGRADED' : 'HEALTHY',
        code: isSlow ? 429 : 200,
        ping: isSlow ? Math.floor(120 + Math.random() * 180) : Math.floor(8 + Math.random() * 12),
        activeConnections: Math.floor(450 + Math.random() * 60),
        replicationLag: '0.02s',
        timestamp: new Date().toISOString(),
      };
    },
  },
  {
    id: 'payment_webhook',
    name: 'Stripe Webhook Dispatcher',
    url: 'https://api.stripe.com/v1/events/live',
    interval: 8,
    field: 'eventsProcessed',
    generateResponse: () => ({
      status: 'HEALTHY',
      code: 200,
      ping: Math.floor(42 + Math.random() * 30),
      eventsProcessed: Math.floor(8920 + Math.random() * 50),
      successRate: '99.99%',
      timestamp: new Date().toISOString(),
    }),
  },
];

export function LiveDataCard({ element, doodleAPI, isDark = true }) {
  const [dataState, setDataState] = useState(() => {
    const defaultPreset = MOCK_PRESETS[0];
    return {
      name: element.title || defaultPreset.name,
      url: element.url || defaultPreset.url,
      interval: element.pollInterval || defaultPreset.interval,
      field: element.metricField || 'status',
      isLive: element.isLive !== false,
      lastPolled: null,
      statusCode: 200,
      latency: 24,
      status: 'HEALTHY',
      payload: defaultPreset.generateResponse(),
      error: null,
    };
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState('prod_api');
  const timerRef = useRef(null);

  const strokeColor = element.strokeColor || (isDark ? '#e4e4e7' : '#18181b');
  const seed = element.seed || 12345;
  const width = Math.max(280, element.width || 360);
  const height = Math.max(180, element.height || 220);

  // Sketchy border path
  const sketchBorder = useMemo(() => {
    return generateSketchyRoundedRectPath(3, 3, width - 6, height - 6, 16, seed, 1.2);
  }, [width, height, seed]);

  // Execute fetch or simulated mock poll
  const executePoll = useCallback(async () => {
    setIsPolling(true);
    const start = performance.now();

    try {
      const preset = MOCK_PRESETS.find((p) => p.url === dataState.url || p.id === selectedPresetId);

      if (preset && (!dataState.url || dataState.url.includes('doodledesk.local') || dataState.url.includes('.internal'))) {
        // Fast procedural simulation with simulated jitter
        await new Promise((res) => setTimeout(res, 80 + Math.random() * 120));
        const resData = preset.generateResponse();
        const latency = Math.round(performance.now() - start);

        setDataState((prev) => ({
          ...prev,
          lastPolled: new Date().toLocaleTimeString(),
          statusCode: resData.code || 200,
          latency: latency,
          status: resData.status || (resData.code === 200 ? 'HEALTHY' : 'DEGRADED'),
          payload: resData,
          error: null,
        }));
      } else {
        // Real external network fetch
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(dataState.url, { signal: controller.signal, mode: 'cors' });
        clearTimeout(timeout);
        const latency = Math.round(performance.now() - start);

        let json;
        try {
          json = await res.json();
        } catch {
          json = { message: await res.text() };
        }

        setDataState((prev) => ({
          ...prev,
          lastPolled: new Date().toLocaleTimeString(),
          statusCode: res.status,
          latency: latency,
          status: res.ok ? 'HEALTHY' : 'DEGRADED',
          payload: json,
          error: null,
        }));
      }
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      setDataState((prev) => ({
        ...prev,
        lastPolled: new Date().toLocaleTimeString(),
        statusCode: 503,
        latency: latency,
        status: 'DOWN',
        error: err.name === 'AbortError' ? 'Timeout (6s)' : (err.message || 'Connection Refused'),
      }));
    } finally {
      setIsPolling(false);
    }
  }, [dataState.url, selectedPresetId]);

  // Recurring polling loop
  useEffect(() => {
    if (!dataState.isLive) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    executePoll();
    const sec = Math.max(2, dataState.interval || 5);
    timerRef.current = setInterval(executePoll, sec * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [dataState.isLive, dataState.interval, executePoll]);

  // Compute displayed value from selected JSON key
  const displayedMetric = useMemo(() => {
    if (dataState.error) return dataState.error;
    if (!dataState.payload) return 'No Data';

    const field = dataState.field;
    if (dataState.payload[field] !== undefined) {
      return String(dataState.payload[field]);
    }

    // Default heuristics
    if (dataState.payload.status) return String(dataState.payload.status);
    if (dataState.payload.ping) return `${dataState.payload.ping}ms`;
    if (dataState.payload.message) return String(dataState.payload.message);

    const firstVal = Object.values(dataState.payload)[0];
    return typeof firstVal === 'object' ? JSON.stringify(firstVal).slice(0, 30) : String(firstVal);
  }, [dataState.payload, dataState.field, dataState.error]);

  const handleDeleteCard = (e) => {
    e.stopPropagation();
    if (!doodleAPI) return;
    const elements = doodleAPI.getSceneElements?.() || [];
    const updated = elements.map((el) => (el.id === element.id ? { ...el, isDeleted: true } : el));
    doodleAPI.updateScene?.({ elements: updated, commitToHistory: true });
  };

  return (
    <div
      className="live-data-card"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        boxSizing: 'border-box',
        borderRadius: '16px',
        backgroundColor: isDark ? '#18181c' : '#ffffff',
        boxShadow: isDark
          ? '0 12px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)'
          : '0 12px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
        fontFamily: 'var(--font-family, "Doodlefont", "Virgil", cursive, sans-serif)',
        color: isDark ? '#f4f4f5' : '#18181b',
      }}
      onClick={(e) => {
        if (!['button', 'input', 'select'].includes(e.target.tagName.toLowerCase())) {
          doodleAPI?.setSelectedElements?.({ [element.id]: true });
        }
      }}
    >
      {/* Hand-drawn Sketchy SVG Border */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <path
          d={sketchBorder}
          stroke={
            dataState.status === 'DOWN'
              ? '#ef4444'
              : dataState.status === 'DEGRADED'
              ? '#f59e0b'
              : strokeColor
          }
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* ── Card Header ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '10px 14px',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
          backgroundColor: isDark ? '#141418' : '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '7px',
              backgroundColor:
                dataState.status === 'DOWN'
                  ? 'rgba(239, 68, 68, 0.15)'
                  : dataState.status === 'DEGRADED'
                  ? 'rgba(245, 158, 11, 0.15)'
                  : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'),
              border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #d4d4d8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color:
                dataState.status === 'DOWN'
                  ? '#ef4444'
                  : dataState.status === 'DEGRADED'
                  ? '#f59e0b'
                  : (isDark ? '#ffffff' : '#18181b'),
              flexShrink: 0,
            }}
          >
            <Radio size={14} className={dataState.isLive ? 'pulse-anim' : ''} />
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {dataState.name}
            </div>
            <div style={{ fontSize: '10px', color: isDark ? '#a1a1aa' : '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {dataState.url}
            </div>
          </div>
        </div>

        {/* Status Pill & Settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor:
                dataState.status === 'DOWN'
                  ? 'rgba(239, 68, 68, 0.15)'
                  : dataState.status === 'DEGRADED'
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(16, 185, 129, 0.15)',
              color:
                dataState.status === 'DOWN'
                  ? '#ef4444'
                  : dataState.status === 'DEGRADED'
                  ? '#f59e0b'
                  : '#10b981',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: 'currentColor',
              }}
            />
            {dataState.statusCode} {dataState.status}
          </span>

          <button
            type="button"
            onClick={() => setIsSettingsOpen((p) => !p)}
            title="Configure Live Endpoint"
            style={{
              padding: '4px',
              borderRadius: '6px',
              border: 'none',
              background: isSettingsOpen ? (isDark ? '#27272a' : '#e2e8f0') : 'transparent',
              color: isDark ? '#a1a1aa' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Settings size={13} />
          </button>
        </div>
      </div>

      {/* ── Main Metric Display ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: isDark ? '#a1a1aa' : '#64748b',
            marginBottom: '4px',
            fontWeight: 600,
          }}
        >
          Active Metric ({dataState.field})
        </div>

        <div
          style={{
            fontSize: displayedMetric.length > 15 ? '22px' : '32px',
            fontWeight: 800,
            color:
              dataState.status === 'DOWN'
                ? '#ef4444'
                : dataState.status === 'DEGRADED'
                ? '#f59e0b'
                : strokeColor,
            lineHeight: 1.2,
            maxWidth: '95%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayedMetric}
        </div>

        {/* Sub metrics: Ping & Last Poll */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: '8px',
            fontSize: '11px',
            color: isDark ? '#71717a' : '#94a3b8',
          }}
        >
          <span>Latency: <strong style={{ color: isDark ? '#e4e4e7' : '#334155' }}>{dataState.latency}ms</strong></span>
          <span>•</span>
          <span>Polled: <strong style={{ color: isDark ? '#e4e4e7' : '#334155' }}>{dataState.lastPolled || 'Just now'}</strong></span>
        </div>
      </div>

      {/* ── Footer Actions Bar ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '8px 14px',
          borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
          backgroundColor: isDark ? '#141418' : '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setDataState((p) => ({ ...p, isLive: !p.isLive }))}
            title={dataState.isLive ? 'Pause auto-polling' : 'Resume auto-polling'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
              backgroundColor: dataState.isLive
                ? 'rgba(16, 185, 129, 0.12)'
                : isDark ? '#27272a' : '#ffffff',
              color: dataState.isLive ? '#10b981' : isDark ? '#a1a1aa' : '#64748b',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {dataState.isLive ? <Pause size={11} /> : <Play size={11} />}
            <span>{dataState.isLive ? `${dataState.interval}s Polling` : 'Paused'}</span>
          </button>

          <button
            type="button"
            onClick={executePoll}
            disabled={isPolling}
            title="Poll endpoint now"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
              backgroundColor: isDark ? '#27272a' : '#ffffff',
              color: isDark ? '#e4e4e7' : '#334155',
              cursor: isPolling ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw size={11} className={isPolling ? 'spin-anim' : ''} />
            <span>Poll</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleDeleteCard}
          title="Delete card"
          style={{
            padding: '4px',
            borderRadius: '6px',
            border: 'none',
            background: 'transparent',
            color: isDark ? '#71717a' : '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* ── Settings Popover ── */}
      {isSettingsOpen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            backgroundColor: isDark ? '#18181c' : '#ffffff',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700 }}>Endpoint Configuration</span>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: isDark ? '#a1a1aa' : '#64748b',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              Done
            </button>
          </div>

          {/* Quick Mock Presets */}
          <div>
            <div style={{ fontSize: '11px', color: isDark ? '#a1a1aa' : '#64748b', marginBottom: '4px' }}>
              Load Preset:
            </div>
            <select
              value={selectedPresetId}
              onChange={(e) => {
                const preset = MOCK_PRESETS.find((p) => p.id === e.target.value);
                if (preset) {
                  setSelectedPresetId(preset.id);
                  setDataState((p) => ({
                    ...p,
                    name: preset.name,
                    url: preset.url,
                    interval: preset.interval,
                    field: preset.field,
                  }));
                }
              }}
              style={{
                width: '100%',
                padding: '5px 8px',
                borderRadius: '6px',
                border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                background: isDark ? '#232329' : '#f8fafc',
                color: isDark ? '#f4f4f5' : '#0f172a',
                fontSize: '11px',
                fontFamily: 'inherit',
              }}
            >
              {MOCK_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Custom URL */}
          <div>
            <div style={{ fontSize: '11px', color: isDark ? '#a1a1aa' : '#64748b', marginBottom: '4px' }}>
              Endpoint URL:
            </div>
            <input
              type="text"
              value={dataState.url}
              onChange={(e) => setDataState((p) => ({ ...p, url: e.target.value }))}
              placeholder="https://api.example.com/health"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '5px 8px',
                borderRadius: '6px',
                border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                background: isDark ? '#232329' : '#f8fafc',
                color: isDark ? '#f4f4f5' : '#0f172a',
                fontSize: '11px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* JSON Field */}
          <div>
            <div style={{ fontSize: '11px', color: isDark ? '#a1a1aa' : '#64748b', marginBottom: '4px' }}>
              Metric Property Key (e.g. status, ping):
            </div>
            <input
              type="text"
              value={dataState.field}
              onChange={(e) => setDataState((p) => ({ ...p, field: e.target.value }))}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '5px 8px',
                borderRadius: '6px',
                border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                background: isDark ? '#232329' : '#f8fafc',
                color: isDark ? '#f4f4f5' : '#0f172a',
                fontSize: '11px',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveDataCard;
