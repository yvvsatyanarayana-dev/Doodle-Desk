import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  X,
  Cpu,
  FileText,
  AlertTriangle,
  Layers,
  Wand2,
  Check,
  Copy,
  Plus,
  BookOpen,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  explainDiagram,
  generateDiagramFromPrompt,
  lintDiagram,
  reviewArchitecture,
  generateAutoFlashcards,
} from '../utils/localAiCopilotEngine.js';

export default function LocalAiCopilotModal({
  isOpen,
  onClose,
  elements = [],
  selectedElements = [],
  onAddElements,
  onHighlightElements,
  isDark = true,
  onOpenFlashcards,
  doodleAPI,
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('generate'); // 'generate' | 'explain' | 'audit' | 'review' | 'flashcards'
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [generatedBatch, setGeneratedBatch] = useState(null);
  const [insertedNotice, setInsertedNotice] = useState(false);

  // Quick prompt suggestions
  const PROMPT_SUGGESTIONS = [
    { label: 'Kafka Consumer Group + DLQ', query: 'Draw Kafka consumer group with DLQ and dead letter topic' },
    { label: 'OAuth2 / JWT Auth Flow', query: 'Create OAuth2 JWT authentication flow with client, gateway, and auth service' },
    { label: 'Microservices Mesh & Cache', query: 'Microservices architecture with API gateway, order service, payment service, and Redis cache' },
    { label: '3-Tier Cloud Topology', query: 'Three tier cloud web app with load balancer, app servers, and database cluster' },
  ];

  // Active elements to analyze
  const targetElements = useMemo(() => {
    if (selectedElements && selectedElements.length > 0) return selectedElements;
    return elements.filter(el => el && !el.isDeleted && !el.isHidden);
  }, [elements, selectedElements]);

  // Explanations
  const explanation = useMemo(() => {
    if (activeTab === 'explain') {
      return explainDiagram(targetElements);
    }
    return '';
  }, [activeTab, targetElements]);

  // Diagram Health / Lint
  const lintResults = useMemo(() => {
    if (activeTab === 'audit') {
      return lintDiagram(targetElements);
    }
    return { issues: [], summary: { totalIssues: 0, critical: 0, warnings: 0, info: 0 } };
  }, [activeTab, targetElements]);

  // Architecture Review (SPOF / Cycles)
  const reviewResults = useMemo(() => {
    if (activeTab === 'review') {
      return reviewArchitecture(targetElements);
    }
    return { spofCandidates: [], circularDependencies: [], riskScore: 0, summary: '' };
  }, [activeTab, targetElements]);

  // Flashcards
  const flashcardDeck = useMemo(() => {
    if (activeTab === 'flashcards') {
      return generateAutoFlashcards(targetElements);
    }
    return [];
  }, [activeTab, targetElements]);

  const handleGenerate = (customPrompt) => {
    const p = customPrompt || prompt;
    if (!p.trim()) return;

    // Dynamically calculate origin from active viewport center
    const activeAPI = doodleAPI || (typeof window !== 'undefined' ? window.__doodleAPI : null);
    const appState = activeAPI?.getAppState?.() || {};
    const zoom = appState.zoom?.value || 1;
    const scrollX = appState.scrollX !== undefined ? appState.scrollX : 0;
    const scrollY = appState.scrollY !== undefined ? appState.scrollY : 0;
    const canvas = typeof document !== 'undefined' ? document.querySelector('canvas') : null;
    const cw = canvas ? canvas.width / (window.devicePixelRatio || 1) : 1200;
    const ch = canvas ? canvas.height / (window.devicePixelRatio || 1) : 800;

    // Compute center of current camera
    const sceneCenterX = (-scrollX + cw / 2) / zoom;
    const sceneCenterY = (-scrollY + ch / 2) / zoom;
    const originX = Math.round(sceneCenterX - 420);
    const originY = Math.round(sceneCenterY - 240);

    const batch = generateDiagramFromPrompt(p, originX, originY, isDark);
    setGeneratedBatch(batch);
    setInsertedNotice(false);
  };

  const handleInsertGenerated = () => {
    if (!generatedBatch || generatedBatch.length === 0) return;
    if (typeof onAddElements === 'function') {
      onAddElements(generatedBatch);
      setInsertedNotice(true);
      setTimeout(() => {
        if (typeof onClose === 'function') onClose();
      }, 250);
    }
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Local AI Copilot"
      className="studio-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
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
          maxWidth: '860px',
          maxHeight: '85vh',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f4f4f5' }}>
                  Local AI Copilot
                </h2>
                <span
                  style={{
                    padding: '2px 7px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(6, 78, 59, 0.6)',
                    color: '#6ee7b7',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  100% Offline
                </span>
                <span
                  style={{
                    padding: '2px 7px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(39, 39, 42, 0.8)',
                    color: '#a1a1aa',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  Zero Telemetry
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#a1a1aa' }}>
                {selectedElements.length > 0
                  ? `Analyzing ${selectedElements.length} selected elements`
                  : `Analyzing entire canvas (${targetElements.length} elements)`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: '6px',
              color: '#a1a1aa',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className="studio-modal-tabs"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(18, 18, 20, 0.5)',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'generate', label: 'Generate Architecture', icon: Wand2 },
            { id: 'explain', label: 'Explain Diagram', icon: FileText },
            { id: 'audit', label: 'Lint & Quality Audit', icon: ShieldCheck },
            { id: 'review', label: 'SPOF & Cycles', icon: AlertTriangle },
            { id: 'flashcards', label: 'Auto Flashcards', icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`studio-modal-tab-btn ${isActive ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  border: isActive ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid transparent',
                  backgroundColor: isActive ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                  color: isActive ? '#34d399' : '#a1a1aa',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div
          className="studio-modal-body"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* TAB 1: GENERATE ARCHITECTURE */}
          {activeTab === 'generate' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#d4d4d8', marginBottom: '6px' }}>
                  Natural Language Architecture Prompt
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleGenerate();
                    }}
                    placeholder="e.g. Draw Kafka consumer group with DLQ and dead letter topic..."
                    style={{
                      flex: 1,
                      padding: '9px 14px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      backgroundColor: '#191a20',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#f4f4f5',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => handleGenerate()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 16px',
                      borderRadius: '8px',
                      backgroundColor: '#10b981',
                      color: '#09090b',
                      fontWeight: 600,
                      fontSize: '12px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Wand2 size={15} />
                    <span>Synthesize</span>
                  </button>
                </div>
              </div>

              {/* Suggestions */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Preset Blueprints
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
                  {PROMPT_SUGGESTIONS.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setPrompt(s.query);
                        handleGenerate(s.query);
                      }}
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        backgroundColor: 'rgba(25, 26, 32, 0.6)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: '#e4e4e7', fontSize: '12px' }}>{s.label}</div>
                      <div style={{ fontSize: '11px', color: '#71717a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '3px' }}>
                        {s.query}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generated Result Preview */}
              {generatedBatch && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: 'rgba(24, 25, 30, 0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Zap size={16} color="#34d399" />
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#f4f4f5' }}>
                        Synthesized {generatedBatch.length} Visual Elements
                      </span>
                    </div>
                    <button
                      onClick={handleInsertGenerated}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 14px',
                        borderRadius: '6px',
                        backgroundColor: '#10b981',
                        color: '#09090b',
                        fontWeight: 600,
                        fontSize: '12px',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={14} />
                      <span>Insert Onto Canvas</span>
                    </button>
                  </div>
                  {insertedNotice && (
                    <div style={{ fontSize: '12px', color: '#34d399', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Check size={14} />
                      <span>Diagram elements inserted into canvas successfully!</span>
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: '11.5px',
                      color: '#a1a1aa',
                      fontFamily: 'monospace',
                      backgroundColor: 'rgba(10, 10, 12, 0.8)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      maxHeight: '140px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    {generatedBatch.map((el, i) => (
                      <div key={el.id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>
                          [{el.type}] {el.text || el.name || 'Connector / Boundary'}
                        </span>
                        <span style={{ color: '#52525b', fontSize: '10px' }}>
                          x:{Math.round(el.x)} y:{Math.round(el.y)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPLAIN DIAGRAM */}
          {activeTab === 'explain' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
                  Synthesized architecture documentation from active elements:
                </span>
                <button
                  onClick={() => handleCopyText(explanation)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 10px',
                    fontSize: '11.5px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    backgroundColor: 'rgba(39, 39, 42, 0.6)',
                    color: '#e4e4e7',
                    cursor: 'pointer',
                  }}
                >
                  {copied ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy Markdown'}</span>
                </button>
              </div>
              <div
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: 'rgba(20, 21, 25, 0.6)',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: '#d4d4d8',
                  lineHeight: '1.65',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '48vh',
                  overflowY: 'auto',
                }}
              >
                {explanation}
              </div>
            </div>
          )}

          {/* TAB 3: DIAGRAM LINT */}
          {activeTab === 'audit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#18191d', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ fontSize: '11px', color: '#71717a' }}>Total Checks</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#f4f4f5', marginTop: '2px' }}>{lintResults.summary.totalIssues}</div>
                </div>
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(136, 19, 55, 0.15)', border: '1px solid rgba(244, 63, 94, 0.25)' }}>
                  <div style={{ fontSize: '11px', color: '#fb7185' }}>Critical</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#fda4af', marginTop: '2px' }}>{lintResults.summary.critical}</div>
                </div>
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(120, 53, 15, 0.15)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                  <div style={{ fontSize: '11px', color: '#fbbf24' }}>Warnings</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#fde68a', marginTop: '2px' }}>{lintResults.summary.warnings}</div>
                </div>
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#18191d', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ fontSize: '11px', color: '#71717a' }}>Notices</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#d4d4d8', marginTop: '2px' }}>{lintResults.summary.info}</div>
                </div>
              </div>

              {lintResults.issues.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: '#34d399', backgroundColor: 'rgba(6, 78, 59, 0.15)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px' }}>
                  <ShieldCheck size={32} style={{ margin: '0 auto 8px auto', opacity: 0.8 }} />
                  Diagram passed all architectural lint checks! No unlabelled connectors, orphan nodes, or incomplete decision branches detected.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '40vh', overflowY: 'auto' }}>
                  {lintResults.issues.map((issue) => (
                    <div
                      key={issue.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        backgroundColor: 'rgba(24, 25, 30, 0.5)',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              padding: '1px 6px',
                              fontSize: '10px',
                              fontWeight: 700,
                              borderRadius: '4px',
                              border: issue.severity === 'critical' ? '1px solid rgba(244, 63, 94, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)',
                              backgroundColor: issue.severity === 'critical' ? 'rgba(136, 19, 55, 0.3)' : 'rgba(120, 53, 15, 0.3)',
                              color: issue.severity === 'critical' ? '#fda4af' : '#fde68a',
                            }}
                          >
                            {issue.severity.toUpperCase()}
                          </span>
                          <span style={{ fontWeight: 600, color: '#f4f4f5' }}>{issue.title}</span>
                        </div>
                        <p style={{ margin: '3px 0 0 0', color: '#a1a1aa', fontSize: '11.5px' }}>{issue.description}</p>
                      </div>
                      {typeof onHighlightElements === 'function' && issue.elementId && (
                        <button
                          onClick={() => onHighlightElements([issue.elementId])}
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            borderRadius: '6px',
                            backgroundColor: '#27272a',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#d4d4d8',
                            cursor: 'pointer',
                            marginLeft: '8px',
                            flexShrink: 0,
                          }}
                        >
                          Highlight
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ARCHITECTURE REVIEW (SPOF / CYCLES) */}
          {activeTab === 'review' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: '#18191d' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#f4f4f5' }}>System Resilience Assessment</div>
                  <span
                    style={{
                      padding: '2px 8px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      borderRadius: '4px',
                      border: reviewResults.riskScore > 40 ? '1px solid rgba(244, 63, 94, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)',
                      backgroundColor: reviewResults.riskScore > 40 ? 'rgba(136, 19, 55, 0.3)' : 'rgba(6, 78, 59, 0.3)',
                      color: reviewResults.riskScore > 40 ? '#fda4af' : '#6ee7b7',
                    }}
                  >
                    Risk Score: {reviewResults.riskScore} / 100
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#a1a1aa', lineHeight: '1.5' }}>{reviewResults.summary}</p>
              </div>

              {/* SPOF Candidates */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#e4e4e7', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={15} color="#fbbf24" />
                  <span>Single Points of Failure (SPOF)</span>
                </div>
                {reviewResults.spofCandidates.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#71717a', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(24, 25, 30, 0.4)' }}>
                    No critical single points of failure detected in the active graph topology.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {reviewResults.spofCandidates.map((c, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid rgba(245, 158, 11, 0.25)',
                          backgroundColor: 'rgba(120, 53, 15, 0.12)',
                          fontSize: '12px',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600, color: '#fde68a' }}>{c.name}</span>
                          <div style={{ fontSize: '11px', color: '#a1a1aa', marginTop: '2px' }}>
                            Central topological hub (Degree: {c.degree}, In: {c.inDegree}, Out: {c.outDegree})
                          </div>
                        </div>
                        {typeof onHighlightElements === 'function' && (
                          <button
                            onClick={() => onHighlightElements([c.id])}
                            style={{
                              padding: '4px 10px',
                              fontSize: '11px',
                              borderRadius: '6px',
                              backgroundColor: '#27272a',
                              color: '#d4d4d8',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              cursor: 'pointer',
                            }}
                          >
                            Locate
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Circular Dependencies */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#e4e4e7', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={15} color="#fb7185" />
                  <span>Circular Dependencies</span>
                </div>
                {reviewResults.circularDependencies.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#71717a', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(24, 25, 30, 0.4)' }}>
                    No circular reference loops detected. Directed graph satisfies DAG constraints.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {reviewResults.circularDependencies.map((cycle, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid rgba(244, 63, 94, 0.25)',
                          backgroundColor: 'rgba(136, 19, 55, 0.12)',
                          fontSize: '12px',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: '#fda4af' }}>Cycle {i + 1}:</span>
                        <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#e4e4e7', marginTop: '4px' }}>
                          {cycle.path.join(' -> ')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: AUTO FLASHCARDS */}
          {activeTab === 'flashcards' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
                  Extracted {flashcardDeck.length} study flashcards from diagram elements:
                </span>
                {typeof onOpenFlashcards === 'function' && flashcardDeck.length > 0 && (
                  <button
                    onClick={() => onOpenFlashcards(flashcardDeck)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      backgroundColor: '#10b981',
                      color: '#09090b',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <BookOpen size={14} />
                    <span>Study in Flashcard Mode</span>
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '45vh', overflowY: 'auto' }}>
                {flashcardDeck.map((card, i) => (
                  <div
                    key={card.id || i}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      backgroundColor: 'rgba(24, 25, 30, 0.5)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#34d399' }}>Q: {card.question}</div>
                    <div style={{ color: '#d4d4d8' }}>A: {card.answer}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="studio-modal-footer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(18, 18, 20, 0.6)',
            fontSize: '12px',
            color: '#71717a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={15} color="#34d399" />
            <span>Deterministic Local Heuristic & Pattern Engine • Privacy Guaranteed</span>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: '#27272a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#e4e4e7',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
