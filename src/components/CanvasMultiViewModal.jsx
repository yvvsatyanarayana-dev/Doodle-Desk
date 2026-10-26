import React, { useState, useMemo } from 'react';
import {
  X,
  Table as TableIcon,
  GitFork,
  Kanban,
  ShieldAlert,
  Search,
  Layers,
} from 'lucide-react';
import { extractEntityGraph, evaluateKnowledgeRules } from '../utils/cqlEngine.js';

export default function CanvasMultiViewModal({
  isOpen,
  onClose,
  elements = [],
  onSelectElement,
}) {
  if (!isOpen) return null;

  const [activeView, setActiveView] = useState('table'); // 'table' | 'graph' | 'kanban' | 'rules'
  const [searchTerm, setSearchTerm] = useState('');

  const { entities } = useMemo(() => {
    return extractEntityGraph(elements);
  }, [elements]);

  const rulesData = useMemo(() => {
    return evaluateKnowledgeRules(elements);
  }, [elements]);

  const filteredEntities = useMemo(() => {
    if (!searchTerm.trim()) return entities;
    const term = searchTerm.toLowerCase();
    return entities.filter(
      (e) =>
        e.name.toLowerCase().includes(term) ||
        e.type.toLowerCase().includes(term) ||
        e.status.toLowerCase().includes(term)
    );
  }, [entities, searchTerm]);

  // Kanban buckets
  const kanbanColumns = useMemo(() => {
    const buckets = {
      'Open / Backlog': [],
      'In Progress': [],
      'Decisions': [],
      'Completed': [],
    };

    entities.forEach((e) => {
      if (/decision/i.test(e.name) || e.type === 'diamond') {
        buckets['Decisions'].push(e);
      } else if (e.status === 'locked' || e.status === 'done' || /done|complete/i.test(e.name)) {
        buckets['Completed'].push(e);
      } else if (e.status === 'active' || /progress|wip/i.test(e.name)) {
        buckets['In Progress'].push(e);
      } else {
        buckets['Open / Backlog'].push(e);
      }
    });

    return buckets;
  }, [entities]);

  const handleEntityClick = (id) => {
    if (typeof onSelectElement === 'function') {
      onSelectElement(id);
      onClose();
    }
  };

  const views = [
    { id: 'table', label: 'Entity Table', icon: TableIcon },
    { id: 'graph', label: 'DAG Topology', icon: GitFork },
    { id: 'kanban', label: 'Kanban Workflow', icon: Kanban },
    { id: 'rules', label: 'Rules & Violations', icon: ShieldAlert, badge: rulesData.issuesCount },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Knowledge Graph Multi-View"
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
          maxWidth: '960px',
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
              <Layers size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#f4f4f5', margin: 0 }}>
                  Knowledge Graph Multi-View
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
                  {entities.length} Active Entities
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#a1a1aa', margin: '3px 0 0 0' }}>
                Transform canvas topology into computable tables, DAG graphs, and task workflows
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

        {/* Top Controls & Navigation */}
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
          {/* Views switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {views.map((v) => {
              const Icon = v.icon;
              const isActive = activeView === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setActiveView(v.id)}
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
                  <Icon size={14} />
                  <span>{v.label}</span>
                  {v.badge > 0 && (
                    <span
                      style={{
                        marginLeft: '4px',
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        fontSize: '10px',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        color: '#fbbf24',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                      }}
                    >
                      {v.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search
                size={14}
                style={{
                  color: '#71717a',
                  position: 'absolute',
                  left: '10px',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter entities..."
                style={{
                  padding: '6px 12px 6px 30px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  backgroundColor: '#16171b',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#f4f4f5',
                  outline: 'none',
                  width: '180px',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>
        </div>

        {/* Body content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {/* 1. TABLE VIEW */}
          {activeView === 'table' && (
            <div
              style={{
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: 'rgba(20, 21, 24, 0.4)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px', color: '#d4d4d8' }}>
                <thead
                  style={{
                    backgroundColor: 'rgba(24, 24, 27, 0.9)',
                    color: '#a1a1aa',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <tr>
                    <th style={{ padding: '10px 16px' }}>Name / Label</th>
                    <th style={{ padding: '10px 12px' }}>Type</th>
                    <th style={{ padding: '10px 12px' }}>In-Degree</th>
                    <th style={{ padding: '10px 12px' }}>Out-Degree</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                    <th style={{ padding: '10px 12px' }}>Owner</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntities.map((e) => (
                    <tr
                      key={e.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(ev) => { ev.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'; }}
                      onMouseLeave={(ev) => { ev.currentTarget.style.backgroundColor = 'transparent'; }}
                      onClick={() => handleEntityClick(e.id)}
                    >
                      <td style={{ padding: '10px 16px', fontWeight: 500, color: '#f4f4f5' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{e.name}</span>
                          {e.frameId && (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                color: '#a1a1aa',
                              }}
                            >
                              framed
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#a1a1aa' }}>{e.type}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#d4d4d8' }}>{e.inDegree}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#d4d4d8' }}>{e.outDegree}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 500,
                            backgroundColor: e.status === 'locked' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(16, 185, 129, 0.15)',
                            color: e.status === 'locked' ? '#a1a1aa' : '#34d399',
                            border: e.status === 'locked' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(16, 185, 129, 0.25)',
                          }}
                        >
                          {e.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#a1a1aa' }}>{e.owner}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <button
                          onClick={(evt) => {
                            evt.stopPropagation();
                            handleEntityClick(e.id);
                          }}
                          style={{
                            fontSize: '11px',
                            padding: '3px 10px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#e4e4e7',
                            cursor: 'pointer',
                          }}
                        >
                          Locate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 2. GRAPH DAG VIEW */}
          {activeView === 'graph' && (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '24px',
                backgroundColor: 'rgba(20, 21, 24, 0.3)',
                textAlign: 'center',
              }}
            >
              <GitFork size={36} color="#34d399" style={{ marginBottom: '12px', opacity: 0.85 }} />
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#f4f4f5', margin: '0 0 6px 0' }}>
                Sugiyama Topological Hierarchy
              </h3>
              <p style={{ fontSize: '12px', color: '#a1a1aa', maxWidth: '440px', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                Visualizing {entities.length} nodes and their directed dependencies across the topological layout tiers.
              </p>
              <div
                style={{
                  width: '100%',
                  maxHeight: '50vh',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  textAlign: 'left',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '12px',
                  padding: '16px',
                  borderRadius: '8px',
                  backgroundColor: '#0c0d0f',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxSizing: 'border-box',
                }}
              >
                {entities.map((e) => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#34d399' }}>[{e.type}]</span>
                    <span style={{ color: '#f4f4f5' }}>{e.name}</span>
                    {e.outgoing.length > 0 && (
                      <span style={{ color: '#71717a' }}>
                        → connects to {e.outgoing.length} target{e.outgoing.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. KANBAN WORKFLOW VIEW */}
          {activeView === 'kanban' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', height: '100%' }}>
              {Object.entries(kanbanColumns).map(([colName, items]) => (
                <div
                  key={colName}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backgroundColor: 'rgba(20, 21, 24, 0.4)',
                    padding: '12px',
                    height: '100%',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#e4e4e7' }}>{colName}</span>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        color: '#a1a1aa',
                      }}
                    >
                      {items.length}
                    </span>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                    {items.map((card) => (
                      <div
                        key={card.id}
                        onClick={() => handleEntityClick(card.id)}
                        style={{
                          padding: '10px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(ev) => { ev.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.07)'; }}
                        onMouseLeave={(ev) => { ev.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'; }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: 500, color: '#f4f4f5' }}>{card.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', fontSize: '10px', color: '#71717a' }}>
                          <span style={{ fontFamily: 'monospace' }}>{card.type}</span>
                          <span style={{ marginLeft: 'auto' }}>deg: {card.degree}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 4. RULES AUDIT VIEW */}
          {activeView === 'rules' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: 'rgba(24, 24, 27, 0.6)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#f4f4f5', margin: '0 0 4px 0' }}>
                      Knowledge Graph Quality Rules
                    </h3>
                    <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0 }}>
                      Evaluated {rulesData.totalRulesEvaluated} architectural constraints. {rulesData.issuesCount} active violation{rulesData.issuesCount === 1 ? '' : 's'} detected.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rulesData.issues.map((issue) => (
                  <div
                    key={issue.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      backgroundColor: 'rgba(20, 21, 24, 0.4)',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span
                          style={{
                            padding: '2px 6px',
                            fontSize: '10px',
                            fontWeight: 600,
                            borderRadius: '4px',
                            backgroundColor: issue.severity === 'critical' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: issue.severity === 'critical' ? '#fca5a5' : '#fcd34d',
                            border: issue.severity === 'critical' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          {issue.severity.toUpperCase()}
                        </span>
                        <span style={{ fontWeight: 500, color: '#f4f4f5' }}>{issue.rule}</span>
                      </div>
                      <p style={{ color: '#a1a1aa', margin: 0 }}>{issue.message}</p>
                    </div>
                    <button
                      onClick={() => handleEntityClick(issue.elementId)}
                      style={{
                        padding: '4px 12px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#e4e4e7',
                        cursor: 'pointer',
                        flexShrink: 0,
                        marginLeft: '12px',
                      }}
                    >
                      Locate
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
