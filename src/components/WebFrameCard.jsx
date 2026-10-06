import React, { useState, useRef, useEffect, memo } from 'react';
import { Globe, Pencil, ExternalLink, Check, X, MousePointer, Play } from 'lucide-react';

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
          {isEditingUrl ? (
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
                  border: '1px solid #4f46e5',
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
                  background: '#6366f1',
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
                      background: isInteractive ? '#6366f1' : 'rgba(255, 255, 255, 0.08)',
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
          border: '1px solid ' + (isSelected ? '#6366f1' : 'rgba(255, 255, 255, 0.15)'),
          pointerEvents: 'auto',
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!isBlocked) setIsInteractive(true);
        }}
      >
        {/* Case A: Video Embed (YouTube / Vimeo) */}
        {ytMatch && ytMatch[1] ? (
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

  if (rawUrl) {
    return (
      <WebEmbedFrame
        rawUrl={rawUrl}
        normalizedUrl={normalizedUrl}
        currentTitle={currentTitle}
        isSelected={isSelected}
        element={element}
        onLinkOpen={onLinkOpen}
        onSaveUrl={handleSaveUrl}
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
