import React, { useState } from 'react';
import {
  Download,
  Image as ImageIcon,
  Code,
  FileText,
  Copy,
  Check,
} from 'lucide-react';

export default function ExportDropdown({
  onExport,
  onExportPdf,
  onCopyToClipboard,
  onClose,
  theme = 'dark',
  isDark = theme !== 'light',
}) {
  const [copiedType, setCopiedType] = useState(null);

  const isLightTheme = !isDark;

  const T = isLightTheme
    ? {
        bg: '#ffffff',
        bgCard: '#f8fafc',
        border: 'rgba(0, 0, 0, 0.09)',
        borderSubtle: 'rgba(0, 0, 0, 0.06)',
        text: '#0f172a',
        textSecondary: '#475569',
        textMuted: '#64748b',
        textDim: '#94a3b8',
        shadow: '0 20px 45px rgba(0, 0, 0, 0.14), 0 0 0 1px rgba(0, 0, 0, 0.05)',
      }
    : {
        bg: '#111113',
        bgCard: 'rgba(255, 255, 255, 0.03)',
        border: 'rgba(255, 255, 255, 0.09)',
        borderSubtle: 'rgba(255, 255, 255, 0.06)',
        text: '#e4e4e7',
        textSecondary: '#a1a1aa',
        textMuted: '#71717a',
        textDim: '#52525b',
        shadow: '0 24px 60px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.05)',
      };

  const handleCopy = (type) => {
    onCopyToClipboard?.(type);
    setCopiedType(type);
    setTimeout(() => {
      setCopiedType(null);
      onClose?.();
    }, 1200);
  };

  const handleExportFile = (action) => {
    action?.();
    onClose?.();
  };

  const sectionLabel = {
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: T.textMuted,
    padding: '4px 8px 2px',
  };

  const itemBtnStyle = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 10px',
    background: 'transparent',
    border: 'none',
    borderRadius: '7px',
    color: T.text,
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.12s ease',
  };

  const badgeStyle = {
    fontSize: '10px',
    fontWeight: 600,
    color: T.textMuted,
    background: isLightTheme ? '#f1f5f9' : 'rgba(255, 255, 255, 0.06)',
    border: '1px solid ' + (isLightTheme ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'),
    padding: '2px 6px',
    borderRadius: '4px',
    letterSpacing: '0.03em',
  };

  const hoverBg = isLightTheme ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)';

  return (
    <div
      style={{
        background: T.bg,
        border: '1px solid ' + T.border,
        borderRadius: '14px',
        boxShadow: T.shadow,
        width: '250px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'system-ui,-apple-system,sans-serif',
        color: T.text,
        fontSize: '13px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Header ─────────────────────────── */}
      <div
        style={{
          padding: '11px 14px',
          borderBottom: '1px solid ' + T.borderSubtle,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: '8px',
            flexShrink: 0,
            background: isLightTheme ? '#f1f5f9' : 'rgba(255, 255, 255, 0.06)',
            border: '1px solid ' + (isLightTheme ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)'),
            color: isLightTheme ? '#0f172a' : '#f4f4f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Download size={15} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '13px', color: T.text }}>Export Diagram</div>
          <div style={{ fontSize: '11px', color: T.textMuted, marginTop: 1 }}>
            Save or copy your canvas
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────── */}
      <div style={{ padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Section 1: Files */}
        <div style={sectionLabel}>Save As File</div>

        <button
          type="button"
          style={itemBtnStyle}
          onClick={() => handleExportFile(() => onExport?.('png'))}
          onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <ImageIcon size={14} style={{ color: T.textSecondary }} />
            <span>Export PNG Image...</span>
          </div>
          <span style={badgeStyle}>PNG</span>
        </button>

        <button
          type="button"
          style={itemBtnStyle}
          onClick={() => handleExportFile(() => onExport?.('svg'))}
          onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Code size={14} style={{ color: T.textSecondary }} />
            <span>Export SVG Vector...</span>
          </div>
          <span style={badgeStyle}>SVG</span>
        </button>

        <button
          type="button"
          style={itemBtnStyle}
          onClick={() => handleExportFile(() => onExportPdf?.())}
          onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <FileText size={14} style={{ color: T.textSecondary }} />
            <span>Export PDF Document...</span>
          </div>
          <span style={badgeStyle}>PDF</span>
        </button>

        {/* Divider */}
        <div
          style={{
            height: '1px',
            background: T.borderSubtle,
            margin: '4px 6px',
          }}
        />

        {/* Section 2: Clipboard */}
        <div style={sectionLabel}>Quick Clipboard</div>

        <button
          type="button"
          style={itemBtnStyle}
          onClick={() => handleCopy('png')}
          onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {copiedType === 'png' ? (
              <Check size={14} style={{ color: '#10b981' }} />
            ) : (
              <Copy size={14} style={{ color: T.textSecondary }} />
            )}
            <span>{copiedType === 'png' ? 'Copied to Clipboard!' : 'Copy PNG to Clipboard'}</span>
          </div>
          <span style={badgeStyle}>Image</span>
        </button>

        <button
          type="button"
          style={itemBtnStyle}
          onClick={() => handleCopy('svg')}
          onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {copiedType === 'svg' ? (
              <Check size={14} style={{ color: '#10b981' }} />
            ) : (
              <Copy size={14} style={{ color: T.textSecondary }} />
            )}
            <span>{copiedType === 'svg' ? 'Copied to Clipboard!' : 'Copy SVG to Clipboard'}</span>
          </div>
          <span style={badgeStyle}>Vector</span>
        </button>
      </div>
    </div>
  );
}
