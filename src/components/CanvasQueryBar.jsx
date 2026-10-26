import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  ArrowRight,
  Database,
  Layers,
  Sparkles,
} from 'lucide-react';
import { parseAndExecuteCQL } from '../utils/cqlEngine.js';

export default function CanvasQueryBar({
  isOpen,
  onClose,
  elements = [],
  onSelectElements,
  onHighlightElements,
}) {
  const [query, setQuery] = useState('');
  const [hoveredPreset, setHoveredPreset] = useState(null);
  const inputRef = useRef(null);

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
    <div
      role="search"
      aria-label="Canvas Query Language (CQL) Bar"
      className="studio-query-bar"
      style={{
        position: 'fixed',
        top: '64px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999999,
        width: '100%',
        maxWidth: '680px',
        padding: '0 16px',
        boxSizing: 'border-box',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backgroundColor: '#111215',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: '#f4f4f5',
        }}
      >
        {/* Main Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            backgroundColor: '#16171b',
          }}
        >
          <div
            style={{
              padding: '6px',
              borderRadius: '6px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Search size={16} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter') handleSelectMatches();
            }}
            placeholder="Type CQL or keyword (e.g. SHOW frames, WHERE type=cylinder, FIND auth)..."
            style={{
              flex: 1,
              fontSize: '13px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f4f4f5',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              boxShadow: 'none',
              padding: '4px 0',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#71717a',
                padding: '4px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              paddingLeft: '10px',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '11px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              color: '#71717a',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            <span>ESC to exit</span>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(18, 18, 20, 0.6)',
            overflowX: 'auto',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#71717a',
              whiteSpace: 'nowrap',
              marginRight: '4px',
              userSelect: 'none',
            }}
          >
            CQL Presets:
          </span>
          {QUICK_QUERIES.map((q, idx) => {
            const isHov = hoveredPreset === idx;
            return (
              <button
                key={idx}
                onClick={() => setQuery(q.cql)}
                onMouseEnter={() => setHoveredPreset(idx)}
                onMouseLeave={() => setHoveredPreset(null)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '5px',
                  backgroundColor: isHov ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  border: isHov ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid rgba(255, 255, 255, 0.08)',
                  color: isHov ? '#ffffff' : '#d4d4d8',
                  fontSize: '11px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
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
              padding: '8px 14px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: 'rgba(24, 24, 27, 0.8)',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: queryResult.count > 0 ? '#10b981' : '#f59e0b',
                  display: 'inline-block',
                }}
              />
              <span style={{ color: '#d4d4d8', fontWeight: 500 }}>{queryResult.message}</span>
            </div>
            {queryResult.count > 0 && (
              <button
                onClick={handleSelectMatches}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#10b981',
                  border: 'none',
                  color: '#09090b',
                  fontWeight: 600,
                  fontSize: '11px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#059669'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#10b981'; }}
              >
                <span>Select Matches ({queryResult.count})</span>
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
