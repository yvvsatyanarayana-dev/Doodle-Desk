import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, FileText, Search, X } from 'lucide-react';
import { searchBoards } from '../engine/boardSearch.js';

export function SmartBoardSearch({
  workspaces,
  activeWorkspaceId,
  activeFileId,
  currentElements,
  onNavigate,
  onClose,
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const allResults = useMemo(() => searchBoards(workspaces, query, {
    activeWorkspaceId,
    activeFileId,
    currentElements,
    limit: 101,
  }), [workspaces, query, activeWorkspaceId, activeFileId, currentElements]);
  const results = allResults.slice(0, 100);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const navigate = (result) => {
    onNavigate(result);
    onClose();
  };

  return (
    <div className="smart-board-search-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className="smart-board-search-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="smart-board-search-title"
      >
        <header className="smart-board-search-header">
          <div>
            <h2 id="smart-board-search-title"><Search size={17} /> Search all boards</h2>
            <p>Find text across every workspace and jump straight to it.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close board search"><X size={18} /></button>
        </header>
        <div className="smart-board-search-input-wrap">
          <Search size={17} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose();
              if (event.key === 'Enter' && results[0]) navigate(results[0]);
            }}
            placeholder="Search board names, frame titles, notes, and labels…"
            aria-label="Search across all boards"
          />
          <kbd>Ctrl+Shift+F</kbd>
        </div>
        <div className="smart-board-search-results" aria-live="polite">
          {query.trim().length < 2 ? (
            <div className="smart-board-search-empty">Type at least two characters to search.</div>
          ) : results.length === 0 ? (
            <div className="smart-board-search-empty">No matching boards or content found.</div>
          ) : results.map((result) => (
            <button
              type="button"
              className="smart-board-search-result"
              key={result.id}
              onClick={() => navigate(result)}
            >
              <span className="smart-board-search-result-icon">
                {result.kind === 'board' ? <FileText size={15} /> : <ArrowUpRight size={15} />}
              </span>
              <span className="smart-board-search-result-copy">
                <span className="smart-board-search-result-title">{result.label}</span>
                <span className="smart-board-search-result-location">
                  {result.workspaceName} / {result.fileName}
                  {result.kind === 'element' && ` · ${result.elementType || 'object'}`}
                </span>
                {result.kind === 'element' && result.excerpt !== result.label && (
                  <span className="smart-board-search-result-excerpt">{result.excerpt}</span>
                )}
              </span>
            </button>
          ))}
          {allResults.length > 100 && <div className="smart-board-search-limit">Showing the first 100 results. Refine your search for more.</div>}
        </div>
        <footer className="smart-board-search-footer">Search stays on this device.</footer>
      </section>
    </div>
  );
}
