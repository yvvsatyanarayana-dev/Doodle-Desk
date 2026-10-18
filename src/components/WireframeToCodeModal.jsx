import React, { useState, useMemo, useEffect } from 'react';
import {
  Code2,
  Eye,
  Copy,
  Check,
  Download,
  LayoutTemplate,
  Monitor,
  Tablet,
  Smartphone,
  Sun,
  Moon,
} from 'lucide-react';
import { generateWireframeCode } from '../utils/wireframeToCode';

export function WireframeToCodeModal({
  isOpen,
  onClose,
  selectedElements = [],
  allElements = [],
  theme = 'dark',
}) {
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'react' | 'html'
  const [viewport, setViewport] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [previewTheme, setPreviewTheme] = useState(theme === 'light' ? 'light' : 'dark');
  const [copied, setCopied] = useState(false);
  const isDark = theme !== 'light';

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, onClose]);

  // If there are selected elements, use them; otherwise use all active canvas elements
  const targetElements = useMemo(() => {
    if (selectedElements && selectedElements.length > 0) {
      return selectedElements;
    }
    return (allElements || []).filter(el => !el.isDeleted);
  }, [selectedElements, allElements]);

  const { jsx, html, previewHtml, elementCount } = useMemo(() => {
    return generateWireframeCode(targetElements);
  }, [targetElements]);

  // Adjust preview HTML for light vs dark theme
  const renderedPreviewHtml = useMemo(() => {
    const base = previewHtml || html || '';
    if (previewTheme === 'light') {
      return base
        .replace('<html lang="en" class="dark">', '<html lang="en" class="light">')
        .replace('dark:bg-zinc-950', '')
        .replace('dark:text-zinc-100', '');
    }
    return base;
  }, [previewHtml, html, previewTheme]);

  if (!isOpen) return null;

  const handleCopy = () => {
    const textToCopy = activeTab === 'html' ? html : jsx;
    navigator.clipboard?.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const isHtml = activeTab === 'html';
    const content = isHtml ? html : jsx;
    const filename = isHtml ? 'Wireframe.html' : 'GeneratedWireframe.jsx';
    const blob = new Blob([content], { type: isHtml ? 'text/html' : 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getViewportWidth = () => {
    if (viewport === 'mobile') return '390px';
    if (viewport === 'tablet') return '768px';
    return '100%';
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
      <div
        className="wireframe-to-code-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching Doodle Desk Dialog System */}
        <div className="pref-header" style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="help-dialog-icon-badge">
              <Code2 size={16} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 className="pref-title" style={{ fontSize: '18px', fontWeight: 600 }}>
                  Wireframe to React & Tailwind
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                    color: isDark ? '#a1a1aa' : '#71717a',
                  }}
                >
                  {elementCount} element{elementCount === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="pref-esc-pill"
              onClick={onClose}
              aria-label="Close dialog"
            >
              Esc to close
            </button>
          </div>
        </div>

        {/* Unified Responsive Toolbar matching Doodle Desk UI */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
            paddingBottom: '4px',
          }}
        >
          {/* Left: Tab switchers */}
          <div
            style={{
              display: 'flex',
              background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
              padding: '3px',
              borderRadius: '8px',
              gap: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'preview' ? (isDark ? '#27272a' : '#ffffff') : 'transparent',
                color: activeTab === 'preview' ? (isDark ? '#ffffff' : '#09090b') : (isDark ? '#a1a1aa' : '#71717a'),
                boxShadow: activeTab === 'preview' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Eye size={13} />
              <span>Live Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('react')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'react' ? (isDark ? '#27272a' : '#ffffff') : 'transparent',
                color: activeTab === 'react' ? (isDark ? '#ffffff' : '#09090b') : (isDark ? '#a1a1aa' : '#71717a'),
                boxShadow: activeTab === 'react' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Code2 size={13} />
              <span>React JSX</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('html')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'html' ? (isDark ? '#27272a' : '#ffffff') : 'transparent',
                color: activeTab === 'html' ? (isDark ? '#ffffff' : '#09090b') : (isDark ? '#a1a1aa' : '#71717a'),
                boxShadow: activeTab === 'html' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <LayoutTemplate size={13} />
              <span>HTML + Tailwind</span>
            </button>
          </div>

          {/* Right: Controls aligned horizontally */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeTab === 'preview' && (
              <>
                {/* Viewport switchers */}
                <div
                  style={{
                    display: 'flex',
                    background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
                    padding: '3px',
                    borderRadius: '8px',
                    gap: '2px',
                  }}
                  title="Preview viewport size"
                >
                  <button
                    type="button"
                    onClick={() => setViewport('desktop')}
                    style={{
                      background: viewport === 'desktop' ? (isDark ? '#27272a' : '#ffffff') : 'transparent',
                      color: viewport === 'desktop' ? (isDark ? '#ffffff' : '#18181b') : (isDark ? '#71717a' : '#a1a1aa'),
                      border: 'none',
                      borderRadius: '5px',
                      padding: '5px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                    title="Desktop view"
                  >
                    <Monitor size={12} />
                    <span className="hidden-mobile">Desktop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewport('tablet')}
                    style={{
                      background: viewport === 'tablet' ? (isDark ? '#27272a' : '#ffffff') : 'transparent',
                      color: viewport === 'tablet' ? (isDark ? '#ffffff' : '#18181b') : (isDark ? '#71717a' : '#a1a1aa'),
                      border: 'none',
                      borderRadius: '5px',
                      padding: '5px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                    title="Tablet view (768px)"
                  >
                    <Tablet size={12} />
                    <span className="hidden-mobile">Tablet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewport('mobile')}
                    style={{
                      background: viewport === 'mobile' ? (isDark ? '#27272a' : '#ffffff') : 'transparent',
                      color: viewport === 'mobile' ? (isDark ? '#ffffff' : '#18181b') : (isDark ? '#71717a' : '#a1a1aa'),
                      border: 'none',
                      borderRadius: '5px',
                      padding: '5px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                    title="Mobile view (390px)"
                  >
                    <Smartphone size={12} />
                    <span className="hidden-mobile">Mobile</span>
                  </button>
                </div>

                {/* Dark/Light mode toggle for preview */}
                <button
                  type="button"
                  onClick={() => setPreviewTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    height: '30px',
                    padding: '0 9px',
                    borderRadius: '8px',
                    background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
                    border: 'none',
                    color: isDark ? '#d4d4d8' : '#3f3f46',
                    cursor: 'pointer',
                    fontSize: '11.5px',
                    fontWeight: 600,
                  }}
                  title={`Switch preview to ${previewTheme === 'dark' ? 'Light' : 'Dark'} mode`}
                >
                  {previewTheme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
                  <span>{previewTheme === 'dark' ? 'Light' : 'Dark'}</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="help-dialog-btn primary"
              style={{
                height: '30px',
                padding: '0 12px',
                fontSize: '12px',
                gap: '5px',
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="help-dialog-btn secondary"
              style={{
                height: '30px',
                padding: '0 9px',
              }}
              title="Download component file"
            >
              <Download size={13} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '12px',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e4e4e7',
            background: isDark ? '#09090b' : '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '4px',
          }}
        >
          {activeTab === 'preview' ? (
            <div
              style={{
                width: getViewportWidth(),
                height: '100%',
                maxHeight: '100%',
                transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: viewport !== 'desktop' ? '0 16px 48px rgba(0,0,0,0.45)' : 'none',
                borderRadius: viewport !== 'desktop' ? '14px' : 0,
                overflow: 'hidden',
                background: previewTheme === 'dark' ? '#09090b' : '#f8fafc',
                border: viewport !== 'desktop' ? (isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1') : 'none',
              }}
            >
              <iframe
                srcDoc={renderedPreviewHtml}
                title="Live Wireframe Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                }}
                sandbox="allow-scripts"
              />
            </div>
          ) : (
            <div
              className="wireframe-code-scroll"
              style={{
                width: '100%',
                height: '100%',
                overflow: 'auto',
                background: isDark ? '#0c0c0e' : '#ffffff',
                padding: '16px 20px',
                boxSizing: 'border-box',
              }}
            >
              <pre
                style={{
                  margin: 0,
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                  fontSize: '12.5px',
                  lineHeight: '1.65',
                  color: isDark ? '#f4f4f5' : '#18181b',
                  whiteSpace: 'pre',
                  tabSize: 2,
                }}
              >
                {activeTab === 'html' ? html : jsx}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
