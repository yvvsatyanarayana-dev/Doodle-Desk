import React, { useState, useRef, useEffect, memo } from 'react';
import { Globe, Pencil, ExternalLink, Check, X, MousePointer, Play, FileText, FileCode, Trash2 } from 'lucide-react';
import { renderMarkdownToJSX } from '../utils/markdownRenderer';
import { ExecutableCodeCard } from './ExecutableCodeCard.jsx';
import { MathGraphCard } from './MathGraphCard.jsx';
import { InteractiveTableCard } from './InteractiveTableCard.jsx';
import { LiveDataCard } from './LiveDataCard.jsx';
import { ReactiveSliderCard } from './ReactiveSliderCard.jsx';
import { InteractiveStencilCard } from './InteractiveStencilCard.jsx';

export function extractElementIdFromLink(link) {
  if (!link || typeof link !== 'string') return null;
  const trimmed = link.trim();
  try {
    const parsed = new URL(trimmed, window.location.href);
    if (parsed.searchParams.has('element')) {
      return parsed.searchParams.get('element');
    }
    if (parsed.hash) {
      const hash = parsed.hash.replace(/^#/, '');
      const hashParams = new URLSearchParams(hash);
      if (hashParams.has('element')) {
        return hashParams.get('element');
      }
      if (/^[a-zA-Z0-9_-]{10,}$/.test(hash)) {
        return hash;
      }
    }
  } catch {
    const match = trimmed.match(/[?&#]element=([^&#\s]+)/);
    if (match && match[1]) return match[1];
  }
  return null;
}

function getDefaultTitleFromUrl(url) {
  if (!url) return 'Web Frame';
  try {
    let clean = url.trim();
    if (!/^https?:\/\//i.test(clean) && !clean.startsWith('/')) clean = `https://${clean}`;
    const parsed = new URL(clean, 'http://localhost');
    const host = parsed.hostname.replace(/^www\./, '');
    const namePart = host.split('.')[0];
    if (namePart) {
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    return host;
  } catch {
    const raw = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    return raw || 'Web Frame';
  }
}

function getDomainFromUrl(url) {
  try {
    let clean = url.trim();
    if (!/^https?:\/\//i.test(clean) && !clean.startsWith('/')) clean = `https://${clean}`;
    const parsed = new URL(clean);
    return parsed.hostname;
  } catch {
    return url;
  }
}

// Known domains that reject iframe embedding via CSP / X-Frame-Options
const UNFRAMABLE_DOMAINS = [
  'google.com', 'google.co', 'google.', 'github.com', 'twitter.com', 'x.com',
  'facebook.com', 'instagram.com', 'linkedin.com', 'reddit.com', 'amazon.com',
  'netflix.com', 'apple.com', 'microsoft.com', 'medium.com'
];

function isUnframableUrl(url) {
  try {
    let clean = url.trim();
    if (!/^https?:\/\//i.test(clean) && !clean.startsWith('/')) clean = `https://${clean}`;
    const parsed = new URL(clean);
    const host = parsed.hostname.toLowerCase();
    return UNFRAMABLE_DOMAINS.some(d => host === d || host.endsWith('.' + d) || host.includes('google.'));
  } catch {
    return false;
  }
}

function WebEmbedFrame({
  rawUrl,
  normalizedUrl,
  currentTitle,
  isSelected,
  element,
  onLinkOpen,
  onSaveUrl,
  doodleAPI,
}) {
  const [hasError, setHasError] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(rawUrl);

  const domain = getDomainFromUrl(normalizedUrl);
  const isBlocked = isUnframableUrl(normalizedUrl) || hasError;
  const urlInputRef = useRef(null);

  useEffect(() => {
    setUrlInput(rawUrl);
    setHasError(false);
  }, [rawUrl]);

  useEffect(() => {
    if (isEditingUrl && urlInputRef.current) {
      urlInputRef.current.focus();
      urlInputRef.current.select();
    }
  }, [isEditingUrl]);

  // If user deselects element, reset interactive mode so they can drag easily
  useEffect(() => {
    if (!isSelected) {
      setIsInteractive(false);
      setIsEditingUrl(false);
    }
  }, [isSelected]);

  const handleDelete = (e) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    if (doodleAPI) {
      const allElements = doodleAPI.getSceneElements?.() || [];
      const updated = allElements.map((el) =>
        el.id === element.id
          ? { ...el, isDeleted: true, version: (el.version || 1) + 1, versionNonce: Math.floor(Math.random() * 100000) }
          : el
      );
      doodleAPI.updateScene?.({ elements: updated, commitToHistory: true });
      doodleAPI.setSelectedElements?.({});
    }
  };

  const handleSelectCard = (e) => {
    if (['input', 'textarea', 'button', 'a'].includes(e?.target?.tagName?.toLowerCase())) return;
    doodleAPI?.setSelectedElements?.({ [element.id]: true });
  };

  const handleOpenExternal = (e) => {
    e?.stopPropagation?.();
    if (onLinkOpen) {
      onLinkOpen(element, e);
    } else if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(normalizedUrl);
    } else {
      window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSave = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    let trimmed = urlInput.trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    }
    if (trimmed) {
      onSaveUrl(trimmed);
    }
    setIsEditingUrl(false);
  };

  // Video embeds check (YouTube / Vimeo)
  const ytMatch = normalizedUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  const vimeoMatch = normalizedUrl.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/i);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
      {/* ── Doodle-Exact Floating Action Bar (Floats ABOVE the card when selected) ── */}
      {isSelected && (
        <div
          className="web-embed-floating-bar"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 14px)',
            left: '50%',
            transform: 'translateX(-50%)',
            minWidth: '220px',
            maxWidth: '96%',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '4px 12px',
            background: 'rgba(28, 28, 34, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '8px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4)',
            pointerEvents: 'auto',
            zIndex: 100,
            boxSizing: 'border-box',
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {element.docType === 'markdown' || element.docType === 'pdf' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden' }}>
                {element.docType === 'pdf' ? (
                  <FileCode size={14} style={{ color: '#f87171', flexShrink: 0 }} />
                ) : (
                  <FileText size={14} style={{ color: '#34d399', flexShrink: 0 }} />
                )}
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#f4f4f5',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {element.title || element.name || 'Document'}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: element.docType === 'pdf' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: element.docType === 'pdf' ? '#f87171' : '#34d399',
                    flexShrink: 0,
                  }}
                >
                  {element.docType === 'pdf' ? 'PDF' : 'Markdown'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {element.docType === 'pdf' && (
                  <button
                    type="button"
                    onClick={() => setIsInteractive((prev) => !prev)}
                    style={{
                      background: isInteractive ? '#111111' : 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      borderRadius: '5px',
                      padding: '5px 8px',
                      color: '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                    title={isInteractive ? 'Exit interaction mode' : 'Interact with PDF'}
                  >
                    <MousePointer size={12} />
                    <span>{isInteractive ? 'Interacting' : 'Interact'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDelete}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '5px',
                    padding: '5px 8px',
                    color: '#f87171',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '11px',
                    fontWeight: 600,
                    transition: 'all 0.15s ease',
                  }}
                  title="Delete document card from canvas"
                  aria-label="Delete document card"
                >
                  <Trash2 size={12} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ) : isEditingUrl ? (
            <form
              onSubmit={handleSave}
              style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}
            >
              <input
                ref={urlInputRef}
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Escape') setIsEditingUrl(false);
                }}
                placeholder="https://..."
                style={{
                  flex: 1,
                  minWidth: '160px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid #333333',
                  borderRadius: '5px',
                  color: '#ffffff',
                  fontSize: '12px',
                  padding: '4px 8px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#111111',
                  border: 'none',
                  borderRadius: '5px',
                  color: '#ffffff',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Save"
              >
                <Check size={12} />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingUrl(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '5px',
                  color: '#a1a1aa',
                  padding: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Cancel"
              >
                <X size={12} />
              </button>
            </form>
          ) : (
            <>
              {/* Clickable domain link */}
              <div
                onClick={handleOpenExternal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#60a5fa',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={`Open ${domain} in external browser`}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{domain}</span>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {/* Pencil to edit URL */}
                <button
                  type="button"
                  onClick={() => setIsEditingUrl(true)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '5px 7px',
                    color: '#e4e4e7',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'background 0.15s',
                  }}
                  title="Edit link"
                >
                  <Pencil size={13} />
                </button>

                {/* Interact mode toggle (if embeddable) */}
                {!isBlocked && (
                  <button
                    type="button"
                    onClick={() => setIsInteractive((prev) => !prev)}
                    style={{
                      background: isInteractive ? '#111111' : 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      borderRadius: '5px',
                      padding: '5px 8px',
                      color: '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '11px',
                      fontWeight: 600,
                      transition: 'background 0.15s',
                    }}
                    title={isInteractive ? 'Exit interaction mode' : 'Interact with webpage'}
                  >
                    <MousePointer size={12} />
                    <span>{isInteractive ? 'Interacting' : 'Interact'}</span>
                  </button>
                )}

                {/* External link */}
                <button
                  type="button"
                  onClick={handleOpenExternal}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '5px 7px',
                    color: '#e4e4e7',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'background 0.15s',
                  }}
                  title="Open in browser"
                >
                  <ExternalLink size={13} />
                </button>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={handleDelete}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '5px',
                    padding: '5px 7px',
                    color: '#f87171',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'background 0.15s',
                  }}
                  title="Delete from canvas"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Main Embed Box (Clean, Border-Radius, No Inner Header) ── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: '#121214',
          borderRadius: '8px',
          overflow: 'hidden',
          boxSizing: 'border-box',
          border: '1px solid ' + (isSelected ? '#444444' : 'rgba(255, 255, 255, 0.15)'),
          pointerEvents: 'auto',
          cursor: isSelected ? 'default' : 'pointer',
        }}
        onClick={handleSelectCard}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!isBlocked) setIsInteractive(true);
        }}
      >
        {/* Case 0: Local Markdown / PDF Document Card */}
        {element.docType === 'markdown' ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              background: '#16161a',
              color: '#f4f4f5',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            {/* Document Card Header */}
            <div
              style={{
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.04)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                cursor: 'pointer',
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                doodleAPI?.setSelectedElements?.({ [element.id]: true });
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <FileText size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#f4f4f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {element.name || element.title || 'Document'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                  }}
                >
                  Markdown
                </span>
                <button
                  type="button"
                  onClick={handleDelete}
                  title="Delete document card (or press Delete/Backspace)"
                  aria-label="Delete document card"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#a1a1aa',
                    cursor: 'pointer',
                    padding: '3px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ef4444';
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#a1a1aa';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            {/* Scrollable Document Content */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px 16px',
                userSelect: 'text',
              }}
              onPointerDown={(e) => {
                // When clicking inside markdown, select the card too
                doodleAPI?.setSelectedElements?.({ [element.id]: true });
                e.stopPropagation();
              }}
            >
              {renderMarkdownToJSX(element.markdownText || element.customData?.markdownText || '', true)}
            </div>
          </div>
        ) : element.docType === 'pdf' ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              background: '#16161a',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.04)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                cursor: 'pointer',
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                doodleAPI?.setSelectedElements?.({ [element.id]: true });
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <FileCode size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#f4f4f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {element.name || element.title || 'PDF Document'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                  }}
                >
                  PDF
                </span>
                <button
                  type="button"
                  onClick={handleDelete}
                  title="Delete PDF document card (or press Delete/Backspace)"
                  aria-label="Delete PDF document card"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#a1a1aa',
                    cursor: 'pointer',
                    padding: '3px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ef4444';
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#a1a1aa';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <iframe
              src={element.pdfDataUrl || normalizedUrl}
              title={currentTitle}
              style={{
                width: '100%',
                flex: 1,
                border: 'none',
                background: '#ffffff',
                pointerEvents: isInteractive ? 'auto' : 'none',
              }}
            />
          </div>
        ) : ytMatch && ytMatch[1] ? (
          <iframe
            src={`https://www.youtube.com/embed/${ytMatch[1]}?enablejsapi=1`}
            title="YouTube Video"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
              pointerEvents: isInteractive ? 'auto' : 'none',
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : vimeoMatch && vimeoMatch[3] ? (
          <iframe
            src={`https://player.vimeo.com/video/${vimeoMatch[3]}?api=1`}
            title="Vimeo Video"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
              pointerEvents: isInteractive ? 'auto' : 'none',
            }}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : isBlocked ? (
          /* Case B: Doodle-Exact Preview for Unframable Sites (Google, etc. - Screenshot 2) */
          <div
            onClick={handleOpenExternal}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              boxSizing: 'border-box',
              background: '#121214',
              userSelect: 'none',
              textAlign: 'center',
              cursor: 'pointer',
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: Math.min(26, Math.max(16, element.width / 18)),
                fontWeight: 500,
                color: '#f4f4f5',
                letterSpacing: '-0.01em',
                maxWidth: '92%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              {domain}
            </div>
            <div style={{ fontSize: '12px', color: '#71717a' }}>
              Click to open in browser
            </div>
          </div>
        ) : (
          /* Case C: Full-Bleed Iframe (Wikipedia, etc.) */
          <>
            <iframe
              className="doodle__embeddable_frame"
              src={normalizedUrl}
              title={currentTitle}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              onError={() => setHasError(true)}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                border: 0,
                background: '#121214',
                pointerEvents: isInteractive ? 'auto' : 'none',
              }}
            />

            {/* Canvas drag shield: when not interacting, permits smooth canvas selection and dragging */}
            {!isInteractive && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 2,
                  cursor: 'default',
                  background: 'transparent',
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setIsInteractive(true);
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function WebFrameCardComponent({ element, appState, doodleAPI, onLinkOpen }) {
  const rawUrl = (element.link || '').trim();
  const isSelected = Boolean(appState?.selectedElementIds?.[element.id]);

  const existingName = element.name || element.customData?.name || '';
  const defaultTitle = getDefaultTitleFromUrl(rawUrl);
  const currentTitle = existingName || defaultTitle;

  const normalizedUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : (rawUrl ? `https://${rawUrl}` : '');

  // Handle URL change
  const handleSaveUrl = (newUrl) => {
    if (doodleAPI && newUrl) {
      const allElements = doodleAPI.getSceneElements?.() || [];
      const updated = allElements.map((el) =>
        el.id === element.id
          ? { ...el, link: newUrl, version: (el.version || 1) + 1, versionNonce: Math.floor(Math.random() * 100000) }
          : el
      );
      doodleAPI.updateScene({ elements: updated, commitToHistory: true });
    }
  };

  if (element.docType === 'code_runner') {
    return (
      <div style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}>
        <ExecutableCodeCard
          element={element}
          doodleAPI={doodleAPI}
          isDark={true}
        />
      </div>
    );
  }

  if (element.docType === 'math_graph') {
    return (
      <div style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}>
        <MathGraphCard
          element={element}
          doodleAPI={doodleAPI}
          isDark={true}
        />
      </div>
    );
  }

  if (element.docType === 'interactive_table') {
    return (
      <div style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}>
        <InteractiveTableCard
          element={element}
          doodleAPI={doodleAPI}
          appState={appState}
          isDark={appState?.theme === 'dark' || (typeof document !== 'undefined' && document.body?.classList.contains('theme--dark'))}
        />
      </div>
    );
  }

  if (element.docType === 'live_data') {
    return (
      <div style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}>
        <LiveDataCard
          element={element}
          doodleAPI={doodleAPI}
          isDark={appState?.theme === 'dark' || (typeof document !== 'undefined' && document.body?.classList.contains('theme--dark'))}
        />
      </div>
    );
  }

  if (element.docType === 'reactive_slider') {
    return (
      <div style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}>
        <ReactiveSliderCard
          element={element}
          doodleAPI={doodleAPI}
          isDark={appState?.theme === 'dark' || (typeof document !== 'undefined' && document.body?.classList.contains('theme--dark'))}
        />
      </div>
    );
  }

  if (element.docType === 'interactive_stencil') {
    return (
      <div style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}>
        <InteractiveStencilCard
          element={element}
          doodleAPI={doodleAPI}
          isDark={appState?.theme === 'dark' || (typeof document !== 'undefined' && document.body?.classList.contains('theme--dark'))}
        />
      </div>
    );
  }

  if (rawUrl || element.docType === 'markdown' || element.docType === 'pdf') {
    return (
      <WebEmbedFrame
        rawUrl={rawUrl}
        normalizedUrl={normalizedUrl}
        currentTitle={currentTitle}
        isSelected={isSelected}
        element={element}
        onLinkOpen={onLinkOpen}
        onSaveUrl={handleSaveUrl}
        doodleAPI={doodleAPI}
      />
    );
  }

  // Fallback if no URL set
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#121214',
        borderRadius: '8px',
        border: '1px dashed rgba(255, 255, 255, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#71717a',
        fontSize: '13px',
        pointerEvents: 'auto',
      }}
    >
      <Globe size={24} style={{ marginBottom: 6, opacity: 0.6 }} />
      <span>Web Embed</span>
    </div>
  );
}

export const WebFrameCard = memo(WebFrameCardComponent);
export default WebFrameCard;
