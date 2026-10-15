import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { auditDiagram } from '../engine/diagramAudit.js';

const severityIcon = {
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
};

export function DiagramHealthCheck({ isOpen, onClose, doodleAPI, theme = 'dark' }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const runCheck = useCallback(() => {
    try {
      const elements = doodleAPI?.getSceneElements?.();
      if (!Array.isArray(elements)) {
        throw new Error('Canvas data is not available yet.');
      }
      setResult(auditDiagram(elements));
      setError('');
    } catch (checkError) {
      console.error('Diagram health check failed:', checkError);
      setResult(null);
      setError(`Could not check this diagram: ${checkError.message}`);
    }
  }, [doodleAPI]);

  useEffect(() => {
    if (isOpen) runCheck();
  }, [isOpen, runCheck]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleIssueClick = (issue) => {
    if (!issue.elementId || !doodleAPI) return;
    const element = (doodleAPI.getSceneElements?.() || []).find((item) => item.id === issue.elementId && !item.isDeleted);
    if (!element) return;

    doodleAPI.updateScene?.({
      appState: {
        selectedElementIds: { [element.id]: true },
        selectedGroupIds: {},
        activeTool: { type: 'selection' },
      },
    });
    doodleAPI.scrollToContent?.([element], { fitToContent: false, animate: true, duration: 350 });
    onClose?.();
  };

  return (
    <div className="modal-overlay diagram-audit-overlay" onClick={onClose} data-theme={theme}>
      <section
        className="diagram-audit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="diagram-audit-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="diagram-audit-header">
          <div className="diagram-audit-heading">
            <span className="diagram-audit-icon"><ShieldCheck size={19} /></span>
            <div>
              <h2 id="diagram-audit-title">Diagram Health Check</h2>
              <p>Offline review of structure and readability</p>
            </div>
          </div>
          <button type="button" className="diagram-audit-icon-button" onClick={onClose} aria-label="Close health check">
            <X size={17} />
          </button>
        </header>

        {result && (
          <div className="diagram-audit-summary" aria-live="polite">
            <div className="diagram-audit-count">
              <strong>{result.summary.elementsChecked}</strong>
              <span>objects checked</span>
            </div>
            <div className="diagram-audit-count is-error">
              <strong>{result.summary.errors}</strong>
              <span>errors</span>
            </div>
            <div className="diagram-audit-count is-warning">
              <strong>{result.summary.warnings}</strong>
              <span>warnings</span>
            </div>
            <div className="diagram-audit-count is-info">
              <strong>{result.summary.info}</strong>
              <span>readability tips</span>
            </div>
          </div>
        )}

        <div className="diagram-audit-results">
          {error ? (
            <p className="diagram-audit-empty is-error" role="alert">{error}</p>
          ) : result?.issues.length ? (
            result.issues.map((issue) => {
              const Icon = severityIcon[issue.severity];
              return (
                <button
                  type="button"
                  key={issue.id}
                  className={`diagram-audit-issue is-${issue.severity}${issue.elementId ? ' is-actionable' : ''}`}
                  onClick={() => handleIssueClick(issue)}
                  disabled={!issue.elementId}
                >
                  <Icon size={16} />
                  <span className="diagram-audit-issue-copy">
                    <strong>{issue.title}</strong>
                    <span>{issue.description}</span>
                  </span>
                  {issue.elementId && <span className="diagram-audit-inspect">Inspect</span>}
                </button>
              );
            })
          ) : result ? (
            <div className="diagram-audit-empty">
              <CheckCircle2 size={25} />
              <strong>Your diagram looks healthy</strong>
              <span>No structural or readability issues were found.</span>
            </div>
          ) : null}
        </div>

        <footer className="diagram-audit-footer">
          <span>Checks run locally; your drawing is not uploaded.</span>
          <button type="button" className="diagram-audit-refresh" onClick={runCheck}>
            <RefreshCw size={14} /> Run check again
          </button>
        </footer>
      </section>
    </div>
  );
}
