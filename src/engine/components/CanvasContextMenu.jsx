import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpToLine,
  Clipboard,
  Copy,
  CopyCheck,
  FlipHorizontal2,
  FlipVertical2,
  Frame,
  Link2,
  LockKeyhole,
  MoreHorizontal,
  Scissors,
  Trash2,
  Unlink,
  X,
} from 'lucide-react';

const SECTIONS = [
  [
    { id: 'cut', label: 'Cut', icon: Scissors, shortcut: 'Ctrl+X' },
    { id: 'copy', label: 'Copy', icon: Copy, shortcut: 'Ctrl+C' },
    { id: 'paste', label: 'Paste', icon: Clipboard, shortcut: 'Ctrl+V' },
  ],
  [
    { id: 'wrapFrame', label: 'Wrap selection in frame', icon: Frame },
  ],
  [
    { id: 'copyPng', label: 'Copy as PNG', icon: CopyCheck },
    { id: 'copySvg', label: 'Copy as SVG', icon: CopyCheck },
  ],
  [
    { id: 'copyStyles', label: 'Copy styles', icon: Copy },
    { id: 'pasteStyles', label: 'Paste styles', icon: Clipboard },
  ],
  [
    { id: 'addToLibrary', label: 'Save selection to library', icon: MoreHorizontal },
  ],
  [
    { id: 'sendBackward', label: 'Send backward', icon: ArrowDownToLine },
    { id: 'bringForward', label: 'Bring forward', icon: ArrowUpFromLine },
    { id: 'sendToBack', label: 'Send to back', icon: ArrowDownToLine, shortcut: 'Ctrl+[' },
    { id: 'bringToFront', label: 'Bring to front', icon: ArrowUpToLine, shortcut: 'Ctrl+]' },
  ],
  [
    { id: 'flipHorizontal', label: 'Flip horizontal', icon: FlipHorizontal2 },
    { id: 'flipVertical', label: 'Flip vertical', icon: FlipVertical2 },
  ],
  [
    { id: 'addLink', label: 'Add link', icon: Link2 },
    { id: 'copyLink', label: 'Copy link to object', icon: Copy },
  ],
  [
    { id: 'duplicate', label: 'Duplicate', icon: Copy, shortcut: 'Ctrl+D' },
    { id: 'toggleLock', label: 'Lock', icon: LockKeyhole },
  ],
];

export function CanvasContextMenu({
  x,
  y,
  hasSelection,
  canEdit,
  canPaste,
  hasStyles,
  selectedLocked,
  onAction,
  onClose,
  theme = 'dark',
}) {
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ left: x, top: y });
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const linkInputRef = useRef(null);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return undefined;
    const bounds = menu.getBoundingClientRect();
    setPosition({
      left: Math.max(8, Math.min(x, window.innerWidth - bounds.width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - bounds.height - 8)),
    });
    return undefined;
  }, [x, y, isEditingLink]);

  useEffect(() => {
    if (isEditingLink) linkInputRef.current?.focus();
  }, [isEditingLink]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) onClose();
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onClose]);

  const isDisabled = (id) => {
    if (id === 'paste') return !canPaste;
    if (['copy', 'copyPng', 'copySvg', 'copyStyles', 'copyLink'].includes(id)) return !hasSelection;
    if (id === 'pasteStyles') return !hasSelection || !canEdit || !hasStyles;
    if (id === 'toggleLock') return !hasSelection;
    return !hasSelection || !canEdit;
  };

  const runAction = (id) => {
    if (isDisabled(id)) return;
    if (id === 'addLink') {
      setIsEditingLink(true);
      return;
    }
    onAction(id);
    onClose();
  };

  const saveLink = (event) => {
    event.preventDefault();
    onAction('saveLink', linkValue.trim());
    onClose();
  };

  return (
    <div className="canvas-context-menu-layer" data-theme={theme}>
      <div
        ref={menuRef}
        className="canvas-context-menu"
        role="menu"
        aria-label={hasSelection ? 'Selection actions' : 'Canvas actions'}
        style={{ left: position.left, top: position.top }}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="canvas-context-menu-list">
          {isEditingLink ? (
            <form className="canvas-context-link-form" onSubmit={saveLink}>
              <div className="canvas-context-link-heading">
                <span><Link2 size={15} /> Add link</span>
                <button type="button" onClick={() => setIsEditingLink(false)} aria-label="Cancel adding link"><X size={14} /></button>
              </div>
              <input
                ref={linkInputRef}
                type="text"
                value={linkValue}
                onChange={(event) => setLinkValue(event.target.value)}
                placeholder="https://example.com or #element=id"
              />
              <div className="canvas-context-link-actions">
                <button type="button" onClick={() => setIsEditingLink(false)}>Cancel</button>
                <button type="submit" disabled={!linkValue.trim()}>Apply link</button>
              </div>
            </form>
          ) : (
            <>
              {SECTIONS.map((section, sectionIndex) => (
                <React.Fragment key={`section-${sectionIndex}`}>
                  {sectionIndex > 0 && <div className="canvas-context-separator" role="separator" />}
                  {section.map(({ id, label, icon: Icon, shortcut }) => {
                    const disabled = isDisabled(id);
                    const displayLabel = id === 'toggleLock' && selectedLocked ? 'Unlock' : label;
                    const MenuIcon = id === 'toggleLock' && selectedLocked ? Unlink : Icon;
                    return (
                      <button
                        type="button"
                        role="menuitem"
                        key={id}
                        className="canvas-context-item"
                        disabled={disabled}
                        onClick={() => runAction(id)}
                      >
                        <MenuIcon size={15} strokeWidth={1.8} aria-hidden="true" />
                        <span>{displayLabel}</span>
                        {shortcut && <kbd>{shortcut}</kbd>}
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </>
          )}
        </div>
        <div className="canvas-context-menu-footer">
          <button
            type="button"
            role="menuitem"
            className="canvas-context-item is-danger"
            disabled={isDisabled('delete')}
            onClick={() => runAction('delete')}
          >
            <Trash2 size={15} strokeWidth={1.8} aria-hidden="true" />
            <span>Delete</span>
            <kbd>Delete</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
