import React, { useState, useMemo } from 'react';
import {
  X,
  Activity,
  Play,
  Plus,
  Check,
} from 'lucide-react';
import { QueueingSimulator } from '../engine/simulation/queueingSim.js';
import { RaftConsensusSimulator } from '../engine/simulation/consensusSim.js';
import {
  GATE_TYPES,
  evaluateGate,
  generateTruthTable,
  generateLogicCircuitElements,
} from '../engine/simulation/digitalLogicSim.js';

export default function SimulationCenterModal({
  isOpen,
  onClose,
  onAddElements,
  isDark = true,
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('queueing'); // 'queueing' | 'consensus' | 'logic'

  // Queueing Sim State
  const [lambda, setLambda] = useState(18);
  const [mu, setMu] = useState(24);
  const [servers, setServers] = useState(1);
  const [insertedNotice, setInsertedNotice] = useState(false);

  const queueingSim = useMemo(() => {
    return new QueueingSimulator({ arrivalRate: lambda, serviceRate: mu, servers });
  }, [lambda, mu, servers]);

  const queueMetrics = useMemo(() => {
    return queueingSim.getMetrics();
  }, [queueingSim]);

  // Consensus Sim State
  const [consensusSim] = useState(() => new RaftConsensusSimulator({ nodeCount: 3 }));
  const [consensusTick, setConsensusTick] = useState(0);
  const [lastConsensusEvent, setLastConsensusEvent] = useState(null);

  const handleConsensusStep = () => {
    const res = consensusSim.step();
    setLastConsensusEvent(res);
    setConsensusTick((t) => t + 1);
  };

  const handleToggleNode = (nodeId) => {
    consensusSim.toggleNodeAlive(nodeId);
    setConsensusTick((t) => t + 1);
  };

  // Logic Sim State
  const [selectedGate, setSelectedGate] = useState('AND');
  const [inputA, setInputA] = useState(1);
  const [inputB, setInputB] = useState(0);

  const logicOutput = useMemo(() => {
    return evaluateGate(selectedGate, inputA, inputB);
  }, [selectedGate, inputA, inputB]);

  const truthTable = useMemo(() => {
    return generateTruthTable(selectedGate);
  }, [selectedGate]);

  const handleInsertElements = (elements) => {
    if (typeof onAddElements === 'function') {
      onAddElements(elements);
      setInsertedNotice(true);
      setTimeout(() => setInsertedNotice(false), 2500);
    }
  };

  const tabs = [
    { id: 'queueing', label: "Queueing Theory (Little's Law)" },
    { id: 'consensus', label: 'Raft Consensus Protocol' },
    { id: 'logic', label: 'Digital Logic & Gates' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Executable Mental Models Simulation Center"
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
              <Activity size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#f4f4f5', margin: 0 }}>
                  Executable Simulation Layer
                </h2>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  WASM-Grade Offline Engine
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#a1a1aa', margin: '3px 0 0 0' }}>
                Execute mental models directly: Queueing Theory, Consensus, and Digital Logic circuits
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

        {/* Tab Strip */}
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
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
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
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {insertedNotice && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#34d399', fontWeight: 500 }}>
              <Check size={14} />
              <span>Diagram inserted onto canvas!</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {/* 1. QUEUEING THEORY */}
          {activeTab === 'queueing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Sliders */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '16px',
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: 'rgba(20, 21, 24, 0.4)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ color: '#f4f4f5', fontWeight: 500 }}>Arrival Rate (λ)</span>
                    <span style={{ fontFamily: 'monospace', color: '#34d399' }}>{lambda} req/s</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="60"
                    value={lambda}
                    onChange={(e) => setLambda(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#10b981' }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ color: '#f4f4f5', fontWeight: 500 }}>Service Rate (μ)</span>
                    <span style={{ fontFamily: 'monospace', color: '#34d399' }}>{mu} req/s</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    value={mu}
                    onChange={(e) => setMu(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#10b981' }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ color: '#f4f4f5', fontWeight: 500 }}>Parallel Stations (c)</span>
                    <span style={{ fontFamily: 'monospace', color: '#34d399' }}>{servers} servers</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={servers}
                    onChange={(e) => setServers(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#10b981' }}
                  />
                </div>
              </div>

              {/* Metrics Dash */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backgroundColor: 'rgba(24, 24, 27, 0.6)',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#a1a1aa' }}>System Utilization (ρ)</div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#f4f4f5', marginTop: '2px' }}>
                    {(queueMetrics.utilization * 100).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '10px', color: '#71717a', marginTop: '4px' }}>
                    {queueMetrics.isStable ? 'Stable operating state' : 'Overloaded (ρ ≥ 1)'}
                  </div>
                </div>
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backgroundColor: 'rgba(24, 24, 27, 0.6)',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#a1a1aa' }}>Avg Queue Wait (Wq)</div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#34d399', marginTop: '2px' }}>
                    {queueMetrics.avgWaitTimeMs} ms
                  </div>
                  <div style={{ fontSize: '10px', color: '#71717a', marginTop: '4px' }}>Time spent in FIFO buffer</div>
                </div>
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backgroundColor: 'rgba(24, 24, 27, 0.6)',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#a1a1aa' }}>Total Latency (W)</div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#f4f4f5', marginTop: '2px' }}>
                    {queueMetrics.avgSystemTimeMs} ms
                  </div>
                  <div style={{ fontSize: '10px', color: '#71717a', marginTop: '4px' }}>Wait time + service execution</div>
                </div>
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backgroundColor: 'rgba(24, 24, 27, 0.6)',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#a1a1aa' }}>In-Flight Jobs (L = λW)</div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#f4f4f5', marginTop: '2px' }}>
                    {queueMetrics.avgSystemCustomers}
                  </div>
                  <div style={{ fontSize: '10px', color: '#71717a', marginTop: '4px' }}>Little's Law verified</div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => handleInsertElements(queueingSim.generateStationElements(180, 180, isDark))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    backgroundColor: '#10b981',
                    border: 'none',
                    color: '#09090b',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#059669'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#10b981'; }}
                >
                  <Plus size={14} />
                  <span>Insert Queueing Station Topology onto Canvas</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. RAFT CONSENSUS */}
          {activeTab === 'consensus' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: 'rgba(20, 21, 24, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: '#a1a1aa' }}>Raft State Machine</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#f4f4f5', marginTop: '2px' }}>
                    Cluster Term: {consensusSim.term} • Leader:{' '}
                    <span style={{ color: '#34d399' }}>
                      {consensusSim.nodes.find((n) => n.state === 'Leader')?.name || 'No Leader (Split Brain)'}
                    </span>
                  </div>
                  {lastConsensusEvent && (
                    <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#a1a1aa', marginTop: '4px' }}>
                      Event: [{lastConsensusEvent.event}] {lastConsensusEvent.leader ? `Leader: ${lastConsensusEvent.leader}` : ''}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={handleConsensusStep}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      backgroundColor: '#10b981',
                      border: 'none',
                      color: '#09090b',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    <Play size={14} />
                    <span>Tick Step (Heartbeat / Replicate)</span>
                  </button>
                  <button
                    onClick={() => handleInsertElements(consensusSim.generateClusterElements(180, 180, isDark))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#e4e4e7',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={14} />
                    <span>Insert Cluster</span>
                  </button>
                </div>
              </div>

              {/* Node Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {consensusSim.nodes.map((node) => (
                  <div
                    key={node.id}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      border: !node.alive
                        ? '1px solid rgba(239, 68, 68, 0.25)'
                        : node.state === 'Leader'
                        ? '1px solid rgba(16, 185, 129, 0.4)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      backgroundColor: !node.alive
                        ? 'rgba(239, 68, 68, 0.08)'
                        : node.state === 'Leader'
                        ? 'rgba(16, 185, 129, 0.08)'
                        : 'rgba(24, 24, 27, 0.6)',
                      opacity: !node.alive ? 0.6 : 1,
                      fontSize: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, color: '#f4f4f5' }}>{node.name}</span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          backgroundColor: !node.alive
                            ? 'rgba(239, 68, 68, 0.15)'
                            : node.state === 'Leader'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(255, 255, 255, 0.06)',
                          color: !node.alive ? '#fca5a5' : node.state === 'Leader' ? '#34d399' : '#a1a1aa',
                          border: !node.alive
                            ? '1px solid rgba(239, 68, 68, 0.3)'
                            : node.state === 'Leader'
                            ? '1px solid rgba(16, 185, 129, 0.3)'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        {node.alive ? node.state : 'OFFLINE'}
                      </span>
                    </div>

                    <div style={{ fontSize: '11px', color: '#a1a1aa', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div>Term: {node.term}</div>
                      <div>Committed Logs: {node.logCount}</div>
                    </div>

                    <button
                      onClick={() => handleToggleNode(node.id)}
                      style={{
                        width: '100%',
                        padding: '6px 0',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: node.alive
                          ? '1px solid rgba(239, 68, 68, 0.3)'
                          : '1px solid rgba(16, 185, 129, 0.3)',
                        backgroundColor: node.alive
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'rgba(16, 185, 129, 0.15)',
                        color: node.alive ? '#fca5a5' : '#34d399',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {node.alive ? 'Simulate Crash (Kill)' : 'Revive Node'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. DIGITAL LOGIC */}
          {activeTab === 'logic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: 'rgba(20, 21, 24, 0.4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#a1a1aa' }}>Select Logic Gate:</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {Object.keys(GATE_TYPES).map((gate) => (
                      <button
                        key={gate}
                        onClick={() => setSelectedGate(gate)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: selectedGate === gate
                            ? '1px solid rgba(16, 185, 129, 0.35)'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                          backgroundColor: selectedGate === gate
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(255, 255, 255, 0.04)',
                          color: selectedGate === gate ? '#34d399' : '#a1a1aa',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {gate}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleInsertElements(generateLogicCircuitElements(selectedGate, 180, 180, isDark))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#10b981',
                    border: 'none',
                    color: '#09090b',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} />
                  <span>Insert Logic Circuit</span>
                </button>
              </div>

              {/* Interactive Logic Sandbox */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backgroundColor: 'rgba(24, 24, 27, 0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#f4f4f5' }}>Interactive Inputs</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={() => setInputA(inputA ? 0 : 1)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: inputA ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                        backgroundColor: inputA ? '#10b981' : 'rgba(255, 255, 255, 0.06)',
                        color: inputA ? '#09090b' : '#a1a1aa',
                      }}
                    >
                      Input A: {inputA}
                    </button>

                    {selectedGate !== GATE_TYPES.NOT && (
                      <button
                        onClick={() => setInputB(inputB ? 0 : 1)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: inputB ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                          backgroundColor: inputB ? '#10b981' : 'rgba(255, 255, 255, 0.06)',
                          color: inputB ? '#09090b' : '#a1a1aa',
                        }}
                      >
                        Input B: {inputB}
                      </button>
                    )}
                  </div>

                  <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '12px', color: '#a1a1aa' }}>Evaluated Output:</div>
                    <div style={{ fontSize: '24px', fontFamily: 'monospace', fontWeight: 700, color: '#34d399', marginTop: '4px' }}>
                      OUT = {logicOutput}
                    </div>
                  </div>
                </div>

                {/* Truth Table */}
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backgroundColor: 'rgba(24, 24, 27, 0.5)',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#f4f4f5', marginBottom: '8px' }}>
                    Truth Table ({selectedGate})
                  </div>
                  <table style={{ width: '100%', fontSize: '12px', fontFamily: 'monospace', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead style={{ color: '#71717a', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <tr>
                        <th style={{ padding: '6px 0' }}>A</th>
                        {selectedGate !== GATE_TYPES.NOT && <th style={{ padding: '6px 0' }}>B</th>}
                        <th style={{ padding: '6px 0' }}>Output</th>
                      </tr>
                    </thead>
                    <tbody>
                      {truthTable.map((row, i) => (
                        <tr key={i} style={{ color: '#e4e4e7', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '6px 0' }}>{row.a}</td>
                          {selectedGate !== GATE_TYPES.NOT && <td style={{ padding: '6px 0' }}>{row.b}</td>}
                          <td style={{ padding: '6px 0', fontWeight: 600, color: '#34d399' }}>{row.out}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
