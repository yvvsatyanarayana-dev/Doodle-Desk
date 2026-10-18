import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Sliders, GripVertical, Settings, Trash2, Check, Sparkles } from 'lucide-react';
import { generateSketchyRoundedRectPath } from '../engine/renderer/sketchy.js';

// Global variable storage for reactive board equations
if (typeof window !== 'undefined' && !window.__doodleVariables) {
  window.__doodleVariables = {};
}

export function ReactiveSliderCard({ element, doodleAPI, isDark = true }) {
  const [varName, setVarName] = useState(element.varName || 'X');
  const [min, setMin] = useState(element.min !== undefined ? element.min : 0);
  const [max, setMax] = useState(element.max !== undefined ? element.max : 100);
  const [step, setStep] = useState(element.step !== undefined ? element.step : 1);
  const [value, setValue] = useState(element.value !== undefined ? element.value : 50);
  const [isEditingSettings, setIsEditingSettings] = useState(false);

  const strokeColor = element.strokeColor || (isDark ? '#e4e4e7' : '#18181b');
  const seed = element.seed || 12345;
  const width = Math.max(260, element.width || 320);
  const height = Math.max(100, element.height || 130);

  // Sketchy border
  const sketchBorder = useMemo(() => {
    return generateSketchyRoundedRectPath(3, 3, width - 6, height - 6, 14, seed, 1.2);
  }, [width, height, seed]);

  // Propagate variable change across board elements
  const broadcastVariable = useCallback(
    (newVal) => {
      if (typeof window !== 'undefined') {
        window.__doodleVariables = window.__doodleVariables || {};
        window.__doodleVariables[varName] = newVal;
        window.dispatchEvent(
          new CustomEvent('doodle:variableChange', {
            detail: { varName, value: newVal },
          })
        );
      }

      // Update text in elements referencing {{varName}}
      if (doodleAPI) {
        const elements = doodleAPI.getSceneElements?.() || [];
        let hasModifications = false;

        const updated = elements.map((el) => {
          if (el.type === 'text' && el.originalTemplateText) {
            // Evaluates {{X}} or {{X * 2.5}}
            const regex = new RegExp(`\\{\\{\\s*(${varName}[^}]*)\\s*\\}\\}`, 'g');
            const newText = el.originalTemplateText.replace(regex, (_, expr) => {
              try {
                // Safe numeric evaluation
                const safeExpr = expr.replace(new RegExp(`\\b${varName}\\b`, 'g'), String(newVal));
                // Only allow numbers and basic math operators
                if (/^[0-9+\-*/().\s]+$/.test(safeExpr)) {
                  return String(Function(`"use strict"; return (${safeExpr})`)());
                }
              } catch {
                // Fallback
              }
              return String(newVal);
            });

            if (newText !== el.text) {
              hasModifications = true;
              return { ...el, text: newText, version: (el.version || 1) + 1 };
            }
          } else if (el.type === 'text' && el.text && el.text.includes(`{{${varName}`)) {
            // First time encountering template: save originalTemplateText
            const original = el.text;
            const regex = new RegExp(`\\{\\{\\s*(${varName}[^}]*)\\s*\\}\\}`, 'g');
            const newText = original.replace(regex, (_, expr) => {
              try {
                const safeExpr = expr.replace(new RegExp(`\\b${varName}\\b`, 'g'), String(newVal));
                if (/^[0-9+\-*/().\s]+$/.test(safeExpr)) {
                  return String(Function(`"use strict"; return (${safeExpr})`)());
                }
              } catch {}
              return String(newVal);
            });

            hasModifications = true;
            return {
              ...el,
              originalTemplateText: original,
              text: newText,
              version: (el.version || 1) + 1,
            };
          }
          return el;
        });

        if (hasModifications) {
          doodleAPI.updateScene?.({ elements: updated, commitToHistory: false });
        }
      }
    },
    [varName, doodleAPI]
  );

  const handleSliderChange = (e) => {
    const num = Number(e.target.value);
    setValue(num);
    broadcastVariable(num);
  };

  useEffect(() => {
    broadcastVariable(value);
  }, [value, broadcastVariable]);

  const handleDeleteCard = (e) => {
    e.stopPropagation();
    if (!doodleAPI) return;
    const elements = doodleAPI.getSceneElements?.() || [];
    const updated = elements.map((el) => (el.id === element.id ? { ...el, isDeleted: true } : el));
    doodleAPI.updateScene?.({ elements: updated, commitToHistory: true });
  };

  const pct = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;

  return (
    <div
      className="reactive-slider-card"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        boxSizing: 'border-box',
        borderRadius: '16px',
        backgroundColor: isDark ? '#18181c' : '#ffffff',
        boxShadow: isDark
          ? '0 10px 28px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.25)'
          : '0 10px 28px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '12px 14px',
        overflow: 'hidden',
        userSelect: 'none',
        fontFamily: 'var(--font-family, "Doodlefont", "Virgil", cursive, sans-serif)',
        color: isDark ? '#f4f4f5' : '#18181b',
      }}
      onClick={(e) => {
        if (!['button', 'input'].includes(e.target.tagName.toLowerCase())) {
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
          stroke={strokeColor}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* ── Top Bar: Variable & Current Value ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #d4d4d8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#ffffff' : '#18181b',
            }}
          >
            <Sliders size={13} />
          </div>

          <span style={{ fontSize: '14px', fontWeight: 700, color: strokeColor }}>
            {varName}
          </span>
          <span style={{ fontSize: '11px', color: isDark ? '#a1a1aa' : '#64748b' }}>
            ({`{{${varName}}}`})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: isDark ? '#ffffff' : '#18181b',
              padding: '1px 8px',
              borderRadius: '8px',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #d4d4d8',
            }}
          >
            {value}
          </div>

          <button
            type="button"
            onClick={() => setIsEditingSettings((p) => !p)}
            title="Configure Variable limits"
            style={{
              padding: '4px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
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

      {/* ── Interactive Slider Track ── */}
      <div style={{ position: 'relative', zIndex: 2, padding: '6px 2px' }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          onInput={handleSliderChange}
          style={{
            width: '100%',
            cursor: 'ew-resize',
            accentColor: strokeColor,
            height: '6px',
            borderRadius: '99px',
          }}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: isDark ? '#71717a' : '#94a3b8',
            marginTop: '4px',
          }}
        >
          <span>Min: {min}</span>
          <span>Max: {max}</span>
        </div>
      </div>

      {/* ── Settings Drawer ── */}
      {isEditingSettings && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            backgroundColor: isDark ? '#18181c' : '#ffffff',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700 }}>Variable Settings</span>
            <button
              type="button"
              onClick={() => setIsEditingSettings(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: isDark ? '#a1a1aa' : '#64748b',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              Done
            </button>
          </div>

          <div style={{ display: 'flex', gap: '6px', fontSize: '10px' }}>
            <div style={{ flex: 1 }}>
              <span style={{ color: isDark ? '#a1a1aa' : '#64748b' }}>Name:</span>
              <input
                type="text"
                value={varName}
                onChange={(e) => setVarName(e.target.value.trim().toUpperCase() || 'X')}
                style={{
                  width: '100%',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  border: isDark ? '1px solid #3f3f46' : '1px solid #cbd5e1',
                  background: isDark ? '#27272a' : '#f8fafc',
                  color: isDark ? '#f4f4f5' : '#0f172a',
                  fontSize: '11px',
                }}
              />
            </div>
            <div style={{ width: '50px' }}>
              <span style={{ color: isDark ? '#a1a1aa' : '#64748b' }}>Min:</span>
              <input
                type="number"
                value={min}
                onChange={(e) => setMin(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  border: isDark ? '1px solid #3f3f46' : '1px solid #cbd5e1',
                  background: isDark ? '#27272a' : '#f8fafc',
                  color: isDark ? '#f4f4f5' : '#0f172a',
                  fontSize: '11px',
                }}
              />
            </div>
            <div style={{ width: '50px' }}>
              <span style={{ color: isDark ? '#a1a1aa' : '#64748b' }}>Max:</span>
              <input
                type="number"
                value={max}
                onChange={(e) => setMax(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  border: isDark ? '1px solid #3f3f46' : '1px solid #cbd5e1',
                  background: isDark ? '#27272a' : '#f8fafc',
                  color: isDark ? '#f4f4f5' : '#0f172a',
                  fontSize: '11px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button
              type="button"
              onClick={handleDeleteCard}
              title="Delete slider"
              style={{
                background: 'transparent',
                border: 'none',
                color: isDark ? '#71717a' : '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '10px',
              }}
            >
              <Trash2 size={11} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReactiveSliderCard;
