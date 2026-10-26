import React, { useState, useMemo } from 'react';
import {
  X,
  History,
  Plus,
  Check,
  Copy,
  Download,
  ArrowRight,
  FileText,
} from 'lucide-react';
import {
  createCheckpoint,
  computeSemanticDiff,
  generateADRFromDiff,
} from '../utils/semanticHistoryEngine.js';

export default function SemanticCheckpointsModal({
  isOpen,
  onClose,
  elements = [],
  onRestoreElements,
}) {
  if (!isOpen) return null;

  // Initialize with at least an initial checkpoint
  const [checkpoints, setCheckpoints] = useState(() => [
    createCheckpoint('Initial Architecture', elements, 'Base canvas creation snapshot'),
  ]);
  const [newCheckpointName, setNewCheckpointName] = useState('');
  const [newCheckpointNote, setNewCheckpointNote] = useState('');
  const [selectedBaseIdx, setSelectedBaseIdx] = useState(0);
  const [selectedTargetIdx, setSelectedTargetIdx] = useState(0);
  const [viewingADR, setViewingADR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [restoredNotice, setRestoredNotice] = useState(false);

  const handleCreateCheckpoint = () => {
    if (!newCheckpointName.trim()) return;
    const cp = createCheckpoint(newCheckpointName, elements, newCheckpointNote);
    setCheckpoints((prev) => [cp, ...prev]);
    setNewCheckpointName('');
    setNewCheckpointNote('');
    setSelectedTargetIdx(0);
  };

  const baseCheckpoint = checkpoints[selectedBaseIdx] || checkpoints[0];
  const targetCheckpoint = checkpoints[selectedTargetIdx] || checkpoints[0];

  const diff = useMemo(() => {
    return computeSemanticDiff(baseCheckpoint.elements, targetCheckpoint.elements);
  }, [baseCheckpoint, targetCheckpoint]);

  const adrMarkdown = useMemo(() => {
    return generateADRFromDiff(baseCheckpoint, targetCheckpoint, diff);
  }, [baseCheckpoint, targetCheckpoint, diff]);

  const handleRestore = (cp) => {
    if (typeof onRestoreElements === 'function') {
      onRestoreElements(cp.elements);
      setRestoredNotice(true);
      setTimeout(() => setRestoredNotice(false), 2500);
    }
  };

  const handleCopyADR = () => {
    navigator.clipboard.writeText(adrMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadADR = () => {
    const blob = new Blob([adrMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ADR-${targetCheckpoint.name.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Semantic History & Checkpoints"
      className="studio-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="studio-modal-card"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '920px',
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          backgroundColor: '#111215',
          color: '#f4f4f5',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="studio-modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(24, 24, 27, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <History size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#f4f4f5', margin: 0 }}>
                  Semantic History & Checkpoints
                </h2>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#a1a1aa',
                  }}
                >
                  {checkpoints.length} Checkpoint{checkpoints.length === 1 ? '' : 's'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#a1a1aa', margin: '3px 0 0 0' }}>
                Architectural time-travel, semantic structural diffs, and automatic Architecture Decision Records (ADR)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#a1a1aa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#a1a1aa';
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Create Checkpoint bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(18, 18, 20, 0.5)',
          }}
        >
          <input
            type="text"
            value={newCheckpointName}
            onChange={(e) => setNewCheckpointName(e.target.value)}
            placeholder="New checkpoint name (e.g. Pre-refactor, Microservices freeze)..."
            style={{
              flex: 1,
              padding: '7px 12px',
              borderRadius: '6px',
              backgroundColor: '#16171b',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#f4f4f5',
              fontSize: '12px',
              fontFamily: 'inherit',
            }}
          />
          <input
            type="text"
            value={newCheckpointNote}
            onChange={(e) => setNewCheckpointNote(e.target.value)}
            placeholder="Optional context note..."
            style={{
              width: '220px',
              padding: '7px 12px',
              borderRadius: '6px',
              backgroundColor: '#16171b',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#f4f4f5',
              fontSize: '12px',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleCreateCheckpoint}
            disabled={!newCheckpointName.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '6px',
              backgroundColor: newCheckpointName.trim() ? '#10b981' : 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              color: newCheckpointName.trim() ? '#09090b' : '#71717a',
              fontWeight: 600,
              fontSize: '12px',
              cursor: newCheckpointName.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={14} />
            <span>Create Checkpoint</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left: Checkpoints list */}
          <div
            style={{
              width: '280px',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: 'rgba(20, 21, 24, 0.3)',
              padding: '12px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#71717a',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '4px',
              }}
            >
              Timeline Milestones
            </div>
            {checkpoints.map((cp, idx) => {
              const isSelected = selectedTargetIdx === idx;
              return (
                <div
                  key={cp.id}
                  onClick={() => setSelectedTargetIdx(idx)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: isSelected
                      ? '1px solid rgba(16, 185, 129, 0.5)'
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    backgroundColor: isSelected
                      ? 'rgba(16, 185, 129, 0.08)'
                      : 'rgba(255, 255, 255, 0.02)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600, color: isSelected ? '#34d399' : '#f4f4f5' }}>{cp.name}</span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        color: '#71717a',
                      }}
                    >
                      {cp.elementCount} items
                    </span>
                  </div>
                  {cp.note && (
                    <p style={{ fontSize: '11px', color: '#a1a1aa', margin: '2px 0 6px 0', lineHeight: 1.4 }}>
                      {cp.note}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: '#71717a', marginTop: '6px' }}>
                    <span>{new Date(cp.timestamp).toLocaleTimeString()}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(cp);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#34d399',
                        fontWeight: 600,
                        fontSize: '11px',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Restore
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Diff & ADR view */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px' }}>
            {restoredNotice && (
              <div
                style={{
                  marginBottom: '12px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontSize: '12px',
                  color: '#34d399',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Check size={14} />
                <span>Restored canvas state to "{targetCheckpoint.name}"!</span>
              </div>
            )}

            {/* Diff controls & ADR toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <span style={{ color: '#a1a1aa' }}>Comparing base:</span>
                <select
                  value={selectedBaseIdx}
                  onChange={(e) => setSelectedBaseIdx(Number(e.target.value))}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    backgroundColor: '#16171b',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#f4f4f5',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                  }}
                >
                  {checkpoints.map((cp, i) => (
                    <option key={cp.id} value={i}>
                      {cp.name}
                    </option>
                  ))}
                </select>
                <ArrowRight size={14} color="#71717a" />
                <span style={{ color: '#34d399', fontWeight: 600 }}>{targetCheckpoint.name}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setViewingADR(!viewingADR)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    border: viewingADR ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.12)',
                    backgroundColor: viewingADR ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                    color: viewingADR ? '#34d399' : '#e4e4e7',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <FileText size={14} />
                  <span>{viewingADR ? 'Show Structural Diff' : 'Generate ADR'}</span>
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflow: 'auto', paddingTop: '16px' }}>
              {!viewingADR ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Summary card */}
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      backgroundColor: 'rgba(24, 24, 27, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', color: '#a1a1aa' }}>Semantic Diff Summary</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#f4f4f5', marginTop: '2px' }}>
                        {diff.summary}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px', fontFamily: 'monospace' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                        }}
                      >
                        +{diff.added.length}
                      </span>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(245, 158, 11, 0.15)',
                          color: '#fbbf24',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                        }}
                      >
                        ~{diff.modified.length}
                      </span>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        -{diff.deleted.length}
                      </span>
                    </div>
                  </div>

                  {/* Added Elements */}
                  {diff.added.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#34d399' }}>
                        Added Components ({diff.added.length})
                      </div>
                      {diff.added.map((el) => (
                        <div
                          key={el.id}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(20, 21, 24, 0.6)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            fontSize: '12px',
                            color: '#e4e4e7',
                          }}
                        >
                          + [{el.type}] {el.text || el.name || 'Connector'}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Modified Elements */}
                  {diff.modified.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#fbbf24' }}>
                        Modified Components ({diff.modified.length})
                      </div>
                      {diff.modified.map((m) => (
                        <div
                          key={m.id}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(20, 21, 24, 0.6)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            fontSize: '12px',
                            color: '#e4e4e7',
                          }}
                        >
                          ~ [{m.element.type}] {m.element.text || m.element.name || 'Component'}: {m.changes.join('; ')}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Deleted Elements */}
                  {diff.deleted.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#f87171' }}>
                        Deleted Components ({diff.deleted.length})
                      </div>
                      {diff.deleted.map((el) => (
                        <div
                          key={el.id}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(20, 21, 24, 0.6)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            fontSize: '12px',
                            color: '#e4e4e7',
                          }}
                        >
                          - [{el.type}] {el.text || el.name || 'Component'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
                      Auto-generated Architecture Decision Record:
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={handleCopyADR}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 500,
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          color: copied ? '#34d399' : '#e4e4e7',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={handleDownloadADR}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#10b981',
                          color: '#09090b',
                          cursor: 'pointer',
                        }}
                      >
                        <Download size={14} />
                        <span>Download ADR</span>
                      </button>
                    </div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      backgroundColor: '#0c0d0f',
                      padding: '16px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '12px',
                      color: '#e4e4e7',
                      lineHeight: '1.6',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      boxSizing: 'border-box',
                    }}
                  >
                    {adrMarkdown}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
