import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  ArrowRight,
} from 'lucide-react';
import { parseAndExecuteCQL } from '../utils/cqlEngine.js';
import { useTheme } from '../hooks/useTheme.js';

export default function CanvasQueryBar({
  isOpen,
  onClose,
  elements = [],
  onSelectElements,
  onHighlightElements,
}) {
  const [query, setQuery] = useState('');
  const [hoveredPreset, setHoveredPreset] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  const { effectiveTheme } = useTheme();
  const isLight = effectiveTheme === 'light';

  const theme = useMemo(() => {
    return isLight
      ? {
          bg: '#ffffff',
          headerBg: '#ffffff',
          footerBg: '#f8fafc',
          border: 'rgba(0, 0, 0, 0.12)',
          borderSubtle: 'rgba(0, 0, 0, 0.06)',
          text: '#0f172a',
          textMuted: '#64748b',
          textDim: '#94a3b8',
          chipBg: 'rgba(0, 0, 0, 0.04)',
          chipBgHover: 'rgba(0, 0, 0, 0.08)',
          chipBorder: 'rgba(0, 0, 0, 0.08)',
          chipBorderHover: 'rgba(0, 0, 0, 0.16)',
          kbdBg: 'rgba(0, 0, 0, 0.04)',
          kbdBorder: 'rgba(0, 0, 0, 0.1)',
          shadow: '0 16px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.06)',
        }
      : {
          bg: '#141417',
          headerBg: '#18181c',
          footerBg: 'rgba(18, 18, 22, 0.75)',
          border: 'rgba(255, 255, 255, 0.11)',
          borderSubtle: 'rgba(255, 255, 255, 0.06)',
          text: '#f4f4f5',
          textMuted: '#a1a1aa',
          textDim: '#71717a',
          chipBg: 'rgba(255, 255, 255, 0.04)',
          chipBgHover: 'rgba(255, 255, 255, 0.09)',
          chipBorder: 'rgba(255, 255, 255, 0.08)',
          chipBorderHover: 'rgba(255, 255, 255, 0.18)',
          kbdBg: 'rgba(255, 255, 255, 0.06)',
          kbdBorder: 'rgba(255, 255, 255, 0.12)',
          shadow: '0 20px 50px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        };
  }, [isLight]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  const queryResult = useMemo(() => {
    return parseAndExecuteCQL(elements, query);
  }, [elements, query]);

  // When query result changes, notify highlight if any
  useEffect(() => {
    if (isOpen && query.trim() && typeof onHighlightElements === 'function') {
      onHighlightElements(queryResult.matchedIds);
    }
  }, [isOpen, query, queryResult.matchedIds, onHighlightElements]);

  if (!isOpen) return null;

  const handleSelectMatches = () => {
    if (typeof onSelectElements === 'function' && queryResult.matchedIds.length > 0) {
      onSelectElements(queryResult.matchedIds);
      onClose();
    }
  };

  const QUICK_QUERIES = [
    { label: 'All Frames', cql: 'SHOW frames' },
    { label: 'Databases', cql: 'SHOW components WHERE type="cylinder"' },
    { label: 'Decision Nodes', cql: 'SHOW components WHERE type="diamond"' },
    { label: 'Connected to API', cql: 'SHOW nodes CONNECTED_TO "api"' },
    { label: 'All Connectors', cql: 'SHOW connectors' },
  ];

  return (
    <>
      {/* Invisible backdrop to close on outside click */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999998,
        }}
        onClick={onClose}
      />

      <div
        role="search"
        aria-label="Canvas Query Language (CQL) Bar"
        className="studio-query-bar"
        style={{
          position: 'fixed',
          top: '48px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999999,
          width: 'min(580px, calc(100vw - 24px))',
          maxWidth: 'calc(100vw - 24px)',
          boxSizing: 'border-box',
          pointerEvents: 'auto',
          animation: 'scaleIn 0.12s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '9px',
            border: '1px solid ' + theme.border,
            backgroundColor: theme.bg,
            boxShadow: theme.shadow,
            overflow: 'hidden',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: theme.text,
          }}
        >
          {/* Main Search Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              backgroundColor: theme.headerBg,
            }}
          >
            <Search
              size={14}
              style={{
                color: isFocused ? '#10b981' : theme.textDim,
                flexShrink: 0,
                transition: 'color 0.15s ease',
              }}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onClose();
                if (e.key === 'Enter') handleSelectMatches();
              }}
              placeholder="Type CQL or keyword (e.g. SHOW frames, WHERE type=cylinder, FIND auth)..."
              style={{
                flex: 1,
                fontSize: '12.5px',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: theme.text,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                boxShadow: 'none',
                padding: '2px 0',
                minWidth: 0,
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.textDim,
                  padding: '2px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
            <kbd
              onClick={onClose}
              style={{
                fontSize: '10px',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                padding: '1px 5px',
                borderRadius: '4px',
                background: theme.kbdBg,
                border: '1px solid ' + theme.kbdBorder,
                color: theme.textMuted,
                cursor: 'pointer',
                userSelect: 'none',
                flexShrink: 0,
              }}
              title="Close (Escape)"
            >
              Esc
            </kbd>
          </div>

          {/* Quick Suggestion Chips */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderTop: '1px solid ' + theme.borderSubtle,
              backgroundColor: theme.footerBg,
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: theme.textDim,
                whiteSpace: 'nowrap',
                marginRight: '3px',
                userSelect: 'none',
                flexShrink: 0,
              }}
            >
              Presets:
            </span>
            {QUICK_QUERIES.map((q, idx) => {
              const isHov = hoveredPreset === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setQuery(q.cql)}
                  onMouseEnter={() => setHoveredPreset(idx)}
                  onMouseLeave={() => setHoveredPreset(null)}
                  style={{
                    padding: '2px 7px',
                    borderRadius: '4px',
                    backgroundColor: isHov ? theme.chipBgHover : theme.chipBg,
                    border: '1px solid ' + (isHov ? theme.chipBorderHover : theme.chipBorder),
                    color: isHov ? theme.text : theme.textMuted,
                    fontSize: '11px',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    transition: 'all 0.12s ease',
                    flexShrink: 0,
                  }}
                >
                  {q.label}
                </button>
              );
            })}
          </div>

          {/* Results Bar */}
          {query.trim() && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '5px 12px',
                borderTop: '1px solid ' + theme.borderSubtle,
                backgroundColor: isLight ? '#f1f5f9' : 'rgba(24, 24, 27, 0.9)',
                fontSize: '11.5px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: queryResult.count > 0 ? '#10b981' : '#f59e0b',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    color: theme.textMuted,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {queryResult.message}
                </span>
              </div>
              {queryResult.count > 0 && (
                <button
                  type="button"
                  onClick={handleSelectMatches}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 9px',
                    borderRadius: '5px',
                    backgroundColor: '#10b981',
                    border: 'none',
                    color: '#09090b',
                    fontWeight: 600,
                    fontSize: '11px',
                    cursor: 'pointer',
                    transition: 'background 0.12s ease',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#059669'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#10b981'; }}
                >
                  <span>Select Matches ({queryResult.count})</span>
                  <ArrowRight size={11} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
