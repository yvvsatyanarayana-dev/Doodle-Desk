import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  FileCode,
  Play,
  Pause,
  RotateCcw,
  Check,
  Copy,
  Download,
  StepForward,
  ChevronRight,
  Activity,
} from 'lucide-react';
import {
  extractStateMachine,
  generateTLAPlusSpec,
  generateAlloySpec,
  generateXStateConfig,
  computeStepTrace,
} from '../utils/formalMethodsEngine.js';

export default function FormalSpecsModal({
  isOpen,
  onClose,
  elements = [],
  onHighlightElements,
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('tlaplus'); // 'tlaplus' | 'alloy' | 'xstate' | 'debugger'
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  const stateMachine = useMemo(() => {
    return extractStateMachine(elements);
  }, [elements]);

  const tlaSpec = useMemo(() => generateTLAPlusSpec(stateMachine), [stateMachine]);
  const alloySpec = useMemo(() => generateAlloySpec(stateMachine), [stateMachine]);
  const xstateSpec = useMemo(() => generateXStateConfig(stateMachine), [stateMachine]);

  const traceInfo = useMemo(() => {
    return computeStepTrace(stateMachine, stepIndex);
  }, [stateMachine, stepIndex]);

  // Highlight elements on canvas during debugging
  useEffect(() => {
    if (activeTab === 'debugger' && typeof onHighlightElements === 'function') {
      const ids = [];
      if (traceInfo.activeStateId) ids.push(traceInfo.activeStateId);
      if (traceInfo.activeArrowId) ids.push(traceInfo.activeArrowId);
      if (ids.length > 0) {
        onHighlightElements(ids);
      }
    }
  }, [activeTab, traceInfo, onHighlightElements]);

  // Auto-play timer for debugger
  useEffect(() => {
    let timer;
    if (isPlaying && stateMachine.transitions.length > 0) {
      timer = setInterval(() => {
        setStepIndex((prev) => (prev + 1) % stateMachine.transitions.length);
      }, 1200);
    }
    return () => clearInterval(timer);
  }, [isPlaying, stateMachine.transitions.length]);

  const activeContent = useMemo(() => {
    if (activeTab === 'tlaplus') return tlaSpec;
    if (activeTab === 'alloy') return alloySpec;
    if (activeTab === 'xstate') return xstateSpec;
    return '';
  }, [activeTab, tlaSpec, alloySpec, xstateSpec]);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = activeTab === 'tlaplus' ? 'tla' : activeTab === 'alloy' ? 'als' : 'js';
    const blob = new Blob([activeContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CanvasSpec.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'tlaplus', label: 'TLA+ Spec' },
    { id: 'alloy', label: 'Alloy Model' },
    { id: 'xstate', label: 'XState v5' },
    { id: 'debugger', label: 'Visual Step Debugger', icon: Activity },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Executable Specification Canvas"
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
              <FileCode size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#f4f4f5', margin: 0 }}>
                  Executable Formal Specifications
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
                  {stateMachine.states.length} States • {stateMachine.transitions.length} Transitions
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#a1a1aa', margin: '3px 0 0 0' }}>
                Transform statecharts & protocols directly into TLA+, Alloy, and XState v5 code
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

        {/* Tab Strip & Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(18, 18, 20, 0.5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: isActive ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid transparent',
                    backgroundColor: isActive ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                    color: isActive ? '#34d399' : '#a1a1aa',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                      e.currentTarget.style.color = '#f4f4f5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#a1a1aa';
                    }
                  }}
                >
                  {TabIcon && <TabIcon size={14} />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeTab !== 'debugger' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleCopy}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: copied ? '#34d399' : '#f4f4f5',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={handleDownload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#10b981',
                  color: '#09090b',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#059669'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#10b981'; }}
              >
                <Download size={14} />
                <span>Download</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {activeTab !== 'debugger' ? (
            <div
              style={{
                height: '100%',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: '#0c0d0f',
                padding: '16px',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '12px',
                color: '#e4e4e7',
                lineHeight: '1.6',
                overflow: 'auto',
                whiteSpace: 'pre',
                boxSizing: 'border-box',
              }}
            >
              {activeContent}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
              {/* Debugger HUD */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: 'rgba(24, 24, 27, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: '#a1a1aa' }}>Step Replay Controller</div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#f4f4f5',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '2px',
                    }}
                  >
                    <span>Step {traceInfo.currentStep} of {traceInfo.totalSteps}</span>
                    <span
                      style={{
                        color: '#34d399',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '12px',
                      }}
                    >
                      [{traceInfo.activeEvent}]
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '4px' }}>
                    Transitioning: <span style={{ color: '#e4e4e7' }}>{traceInfo.previousStateName || 'Init'}</span> →{' '}
                    <span style={{ color: '#34d399', fontWeight: 500 }}>{traceInfo.activeStateName}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setStepIndex(0)}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#e4e4e7',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Reset to Init"
                  >
                    <RotateCcw size={15} />
                  </button>
                  <button
                    onClick={() => setStepIndex((prev) => (prev > 0 ? prev - 1 : 0))}
                    disabled={stepIndex === 0}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: stepIndex === 0 ? '#52525b' : '#e4e4e7',
                      cursor: stepIndex === 0 ? 'not-allowed' : 'pointer',
                      opacity: stepIndex === 0 ? 0.5 : 1,
                    }}
                  >
                    Step Back
                  </button>
                  <button
                    onClick={() => setStepIndex((prev) => prev + 1)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#e4e4e7',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <span>Step Forward</span>
                    <StepForward size={14} />
                  </button>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: isPlaying ? '#f59e0b' : '#10b981',
                      color: '#09090b',
                      cursor: 'pointer',
                    }}
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    <span>{isPlaying ? 'Pause' : 'Play Trace'}</span>
                  </button>
                </div>
              </div>

              {/* State Transitions List */}
              <div
                style={{
                  flex: 1,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '12px',
                  backgroundColor: 'rgba(18, 18, 20, 0.4)',
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
                  Execution Pathway Trace
                </div>
                {stateMachine.transitions.length === 0 ? (
                  <div style={{ color: '#71717a', fontSize: '12px', padding: '12px 0' }}>
                    No transitions detected. Connect shapes with labeled arrows to generate state pathways.
                  </div>
                ) : (
                  stateMachine.transitions.map((t, idx) => {
                    const isCurrent = (stepIndex % (stateMachine.transitions.length || 1)) === idx;
                    return (
                      <div
                        key={t.id || idx}
                        onClick={() => setStepIndex(idx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '6px',
                          border: isCurrent
                            ? '1px solid rgba(16, 185, 129, 0.5)'
                            : '1px solid rgba(255, 255, 255, 0.06)',
                          backgroundColor: isCurrent
                            ? 'rgba(16, 185, 129, 0.1)'
                            : 'rgba(255, 255, 255, 0.02)',
                          color: isCurrent ? '#34d399' : '#a1a1aa',
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                              fontSize: '11px',
                              width: '24px',
                              color: '#71717a',
                            }}
                          >
                            #{idx + 1}
                          </span>
                          <span style={{ fontWeight: 500, color: '#f4f4f5' }}>{t.from}</span>
                          <ChevronRight size={14} color="#71717a" />
                          <span style={{ fontWeight: 500, color: '#f4f4f5' }}>{t.to}</span>
                        </div>
                        <span
                          style={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            color: '#d4d4d8',
                          }}
                        >
                          {t.event}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
