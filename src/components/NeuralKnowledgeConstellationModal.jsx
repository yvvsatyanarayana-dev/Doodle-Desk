import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Share2,
  Sparkles,
  Search,
  Filter,
  Layers,
  ArrowRight,
  ExternalLink,
  X,
  Orbit,
  Maximize2,
  Compass,
} from 'lucide-react';

export function NeuralKnowledgeConstellationModal({
  isOpen,
  onClose,
  doodleAPI,
  isDark = true,
}) {
  const canvasRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'frame' | 'table' | 'text' | 'card'

  // 3D Orbit state
  const orbitRef = useRef({
    rotX: 0.35,
    rotY: -0.4,
    distance: 650,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
  });

  // Extract graph nodes and edges from canvas elements
  const graphData = useMemo(() => {
    if (!doodleAPI) return { nodes: [], links: [] };
    const elements = (doodleAPI.getSceneElements?.() || []).filter((el) => !el.isDeleted && !el.isHidden);

    const nodes = [];
    const nodeMap = new Map();

    elements.forEach((el, idx) => {
      // Meaningful nodes: frames, tables, text elements, cards, and shapes with text
      const textContent = el.text || el.title || el.name || '';
      const isCard = el.type === 'embeddable' || el.type === 'iframe';
      const isFrame = el.type === 'frame';
      const isTable = el.docType === 'interactive_table';
      const hasText = textContent.trim().length > 0;

      if (isFrame || isCard || isTable || hasText || idx < 30) {
        // Derive clean title
        let title = textContent.trim();
        if (!title) {
          title = isFrame ? 'Canvas Frame' : isTable ? 'Data Table' : isCard ? 'Smart Card' : `Shape ${idx + 1}`;
        }
        title = title.split('\n')[0].slice(0, 28);

        // Derive tags (#tag) and [[WikiLinks]]
        const tags = (textContent.match(/#([a-zA-Z0-9_-]+)/g) || []).map((t) => t.slice(1));
        const wikiLinks = (textContent.match(/\[\[([^\]]+)\]\]/g) || []).map((w) => w.slice(2, -2).trim().toLowerCase());

        // Spherical pseudo-3D initial layout
        const phi = Math.acos(-1 + (2 * idx) / Math.max(1, elements.length));
        const theta = Math.sqrt(elements.length * Math.PI) * phi;
        const radius = 240 + (idx % 3) * 40;

        const node = {
          id: el.id,
          element: el,
          title,
          fullText: textContent,
          type: isTable ? 'table' : isFrame ? 'frame' : isCard ? 'card' : 'text',
          tags,
          wikiLinks,
          x: radius * Math.cos(theta) * Math.sin(phi),
          y: radius * Math.sin(theta) * Math.sin(phi),
          z: radius * Math.cos(phi),
          vx: 0,
          vy: 0,
          vz: 0,
        };

        nodes.push(node);
        nodeMap.set(el.id, node);
        nodeMap.set(title.toLowerCase(), node);
      }
    });

    // Detect Links: Connectors (arrows) + WikiLinks + Shared Tags
    const links = [];

    // 1. Direct Arrow Connections
    elements.forEach((el) => {
      if ((el.type === 'arrow' || el.type === 'line') && (el.startBinding || el.endBinding)) {
        const sourceId = el.startBinding?.elementId;
        const targetId = el.endBinding?.elementId;
        if (sourceId && targetId && nodeMap.has(sourceId) && nodeMap.has(targetId)) {
          links.push({
            id: `link_${sourceId}_${targetId}`,
            source: nodeMap.get(sourceId),
            target: nodeMap.get(targetId),
            label: el.text || 'connects',
            type: 'connector',
          });
        }
      }
    });

    // 2. [[WikiLink]] Connections
    nodes.forEach((source) => {
      source.wikiLinks.forEach((targetName) => {
        const target = nodeMap.get(targetName);
        if (target && target.id !== source.id) {
          links.push({
            id: `wiki_${source.id}_${target.id}`,
            source,
            target,
            label: 'references',
            type: 'backlink',
          });
        }
      });
    });

    // 3. Fallback semantic proximity links if sparse
    if (links.length < nodes.length - 1 && nodes.length > 1) {
      for (let i = 0; i < nodes.length - 1; i++) {
        links.push({
          id: `proximity_${nodes[i].id}_${nodes[i + 1].id}`,
          source: nodes[i],
          target: nodes[i + 1],
          label: 'context',
          type: 'proximity',
        });
      }
    }

    return { nodes, links };
  }, [doodleAPI, isOpen]);

  // Selected node details
  const selectedNode = useMemo(() => {
    return graphData.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [graphData.nodes, selectedNodeId]);

  // Inbound & Outbound connected nodes
  const connectedNodes = useMemo(() => {
    if (!selectedNodeId) return { inbound: [], outbound: [] };
    const inbound = [];
    const outbound = [];

    graphData.links.forEach((l) => {
      if (l.source.id === selectedNodeId) outbound.push(l.target);
      if (l.target.id === selectedNodeId) inbound.push(l.source);
    });

    return { inbound, outbound };
  }, [graphData.links, selectedNodeId]);

  // Render 3D Galaxy Canvas Loop
  const renderConstellation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const { rotX, rotY, distance } = orbitRef.current;

    ctx.clearRect(0, 0, width, height);

    // Deep space dark/light gradient background
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 40, width / 2, height / 2, width / 1.5);
    if (isDark) {
      bgGrad.addColorStop(0, '#1c1b29');
      bgGrad.addColorStop(1, '#0e0e12');
    } else {
      bgGrad.addColorStop(0, '#f8fafc');
      bgGrad.addColorStop(1, '#e2e8f0');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 3D Math Helper: Rotate & Project
    const project3D = (x, y, z) => {
      // Y-axis rotation
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const x1 = x * cosY - z * sinY;
      const z1 = z * cosY + x * sinY;

      // X-axis rotation
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const y2 = y * cosX - z1 * sinX;
      const z2 = z1 * cosX + y * sinX;

      // Perspective projection
      const fov = 600;
      const depth = z2 + distance;
      if (depth <= 10) return null;

      const scale = fov / depth;
      const projX = width / 2 + x1 * scale;
      const projY = height / 2 + y2 * scale;

      return { x: projX, y: projY, z: z2, scale };
    };

    // Project all nodes
    const projectedNodes = graphData.nodes
      .map((node) => {
        const p = project3D(node.x, node.y, node.z);
        return { node, proj: p };
      })
      .filter((n) => n.proj !== null)
      .sort((a, b) => b.proj.z - a.proj.z); // Painter's algorithm (far to near)

    const projectedMap = new Map();
    projectedNodes.forEach((pn) => projectedMap.set(pn.node.id, pn.proj));

    // Draw Links with animated data particle pulses
    const now = performance.now() * 0.0015;
    graphData.links.forEach((link) => {
      const p1 = projectedMap.get(link.source.id);
      const p2 = projectedMap.get(link.target.id);
      if (!p1 || !p2) return;

      const isHighlighted =
        selectedNodeId && (link.source.id === selectedNodeId || link.target.id === selectedNodeId);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = isHighlighted
        ? (isDark ? '#ffffff' : '#18181b')
        : link.type === 'backlink'
        ? (isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.35)')
        : (isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)');
      ctx.lineWidth = isHighlighted ? 2.5 : 1.2;
      ctx.stroke();

      // Traveling glowing data pulse packet
      const pulseT = (now + link.source.x * 0.01) % 1;
      const pulseX = p1.x + (p2.x - p1.x) * pulseT;
      const pulseY = p1.y + (p2.y - p1.y) * pulseT;

      ctx.fillStyle = isDark ? '#ffffff' : '#18181b';
      ctx.shadowColor = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(pulseX, pulseY, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw Nodes
    projectedNodes.forEach(({ node, proj }) => {
      const isSelected = node.id === selectedNodeId;
      const matchesSearch =
        searchQuery && node.title.toLowerCase().includes(searchQuery.toLowerCase());
      const radius = Math.max(5, (isSelected ? 10 : 7) * proj.scale);

      ctx.save();
      ctx.translate(proj.x, proj.y);

      // Node Color Palette
      let color = isDark ? '#ffffff' : '#18181b'; // default monochromatic
      if (node.type === 'table') color = '#2dd4bf';
      if (node.type === 'frame') color = '#f59e0b';
      if (node.type === 'card') color = '#ec4899';

      // Outer glow if selected
      if (isSelected || matchesSearch) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
      }

      // Circle Body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      // Ring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 2, 0, Math.PI * 2);
      ctx.stroke();

      // Node Title Label in Virgil Hand-drawn font
      if (proj.scale > 0.45 || isSelected || matchesSearch) {
        ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
        ctx.font = `${Math.max(10, Math.round(12 * proj.scale))}px "Doodlefont", "Virgil", cursive, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(node.title, 0, radius + 14 * proj.scale);
      }

      ctx.restore();
    });
  }, [isDark, graphData, selectedNodeId, searchQuery]);

  // Orbit drag controls
  const handlePointerDown = (e) => {
    orbitRef.current.isDragging = true;
    orbitRef.current.lastMouseX = e.clientX;
    orbitRef.current.lastMouseY = e.clientY;
  };

  const handlePointerMove = (e) => {
    if (!orbitRef.current.isDragging) return;
    const dx = e.clientX - orbitRef.current.lastMouseX;
    const dy = e.clientY - orbitRef.current.lastMouseY;
    orbitRef.current.lastMouseX = e.clientX;
    orbitRef.current.lastMouseY = e.clientY;

    orbitRef.current.rotY += dx * 0.008;
    orbitRef.current.rotX = Math.max(-1.4, Math.min(1.4, orbitRef.current.rotX + dy * 0.008));
    renderConstellation();
  };

  const handlePointerUp = () => {
    orbitRef.current.isDragging = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    orbitRef.current.distance = Math.max(250, Math.min(1200, orbitRef.current.distance + e.deltaY * 0.6));
    renderConstellation();
  };

  // Click on canvas to select closest node
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Find clicked node
    let closestNode = null;
    let minDistance = 24;

    const { rotX, rotY, distance } = orbitRef.current;
    const fov = 600;

    graphData.nodes.forEach((node) => {
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const x1 = node.x * cosY - node.z * sinY;
      const z1 = node.z * cosY + node.x * sinY;

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const y2 = node.y * cosX - z1 * sinX;
      const z2 = z1 * cosX + node.y * sinX;

      const depth = z2 + distance;
      if (depth <= 10) return;

      const scale = fov / depth;
      const px = canvas.width / 2 + x1 * scale;
      const py = canvas.height / 2 + y2 * scale;

      const dist = Math.hypot(px - mouseX, py - mouseY);
      if (dist < minDistance) {
        minDistance = dist;
        closestNode = node;
      }
    });

    if (closestNode) {
      setSelectedNodeId(closestNode.id);
    } else {
      setSelectedNodeId(null);
    }
  };

  // Animation Loop for moving link particles
  useEffect(() => {
    if (!isOpen) return;
    let animId;
    const loop = () => {
      renderConstellation();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, renderConstellation]);

  // Jump canvas to selected node
  const handleZoomToCard = () => {
    if (!selectedNode || !doodleAPI) return;
    doodleAPI.scrollToContent?.([selectedNode.element], { fitToContent: true, animate: true });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay neural-knowledge-constellation-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? 'rgba(8, 8, 12, 0.88)' : 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        padding: '20px',
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
      onClick={onClose}
    >
      <div
        className="neural-knowledge-constellation-modal"
        style={{
          width: '100%',
          maxWidth: '1000px',
          height: 'min(760px, 92vh)',
          backgroundColor: isDark ? '#141418' : '#ffffff',
          borderRadius: '20px',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
          boxShadow: '0 28px 72px rgba(0, 0, 0, 0.65)',
          display: 'flex',
          flexDirection: 'column',
          color: isDark ? '#f4f4f5' : '#18181b',
          overflow: 'hidden',
          fontFamily: 'var(--font-family, "Doodlefont", "Virgil", cursive, sans-serif)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header Bar ── */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: isDark ? '#18181c' : '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #d4d4d8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDark ? '#ffffff' : '#18181b',
              }}
            >
              <Orbit size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Neural Knowledge Constellation</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e4e4e7',
                    color: isDark ? '#e4e4e7' : '#27272a',
                  }}
                >
                  3D Thought Matrix
                </span>
              </div>
              <div style={{ fontSize: '11px', color: isDark ? '#a1a1aa' : '#64748b', marginTop: '2px' }}>
                {graphData.nodes.length} nodes • {graphData.links.length} backlink connections
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Search Box */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                borderRadius: '8px',
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                backgroundColor: isDark ? '#232329' : '#f8fafc',
              }}
            >
              <Search size={12} style={{ color: isDark ? '#71717a' : '#94a3b8' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find in constellation..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: isDark ? '#f4f4f5' : '#0f172a',
                  fontSize: '11px',
                  width: '140px',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              title="Close Constellation (Esc)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '8px',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
                background: isDark ? '#27272a' : '#f1f5f9',
                color: isDark ? '#e4e4e7' : '#334155',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              <X size={14} />
              <kbd className="doodle-help-kbd" style={{ minWidth: 16, height: 18, fontSize: 10, padding: '1px 5px' }}>Esc</kbd>
            </button>
          </div>
        </div>

        {/* ── Main 3D Canvas Stage + Side Inspector ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          {/* 3D Orbiting Canvas */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              cursor: 'grab',
              overflow: 'hidden',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
            onClick={handleCanvasClick}
          >
            <canvas
              ref={canvasRef}
              width={700}
              height={580}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
              }}
            />

            {/* Orbit Instructions Pill */}
            <div
              style={{
                position: 'absolute',
                bottom: 14,
                left: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: '20px',
                backgroundColor: isDark ? 'rgba(24, 24, 28, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                backdropFilter: 'blur(8px)',
                fontSize: '11px',
                color: isDark ? '#a1a1aa' : '#64748b',
                pointerEvents: 'none',
              }}
            >
              <Compass size={12} />
              <span>Drag to orbit in 3D • Scroll to zoom • Click node to inspect</span>
            </div>
          </div>

          {/* Side Node Details Inspector */}
          <div
            style={{
              width: '300px',
              borderLeft: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
              backgroundColor: isDark ? '#18181c' : '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              padding: '16px',
              boxSizing: 'border-box',
              overflowY: 'auto',
            }}
          >
            {selectedNode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div
                    style={{
                      display: 'inline-block',
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '8px',
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                      border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #d4d4d8',
                      color: isDark ? '#ffffff' : '#18181b',
                      marginBottom: '6px',
                    }}
                  >
                    {selectedNode.type}
                  </div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                    {selectedNode.title}
                  </h3>
                </div>

                {/* Content snippet */}
                {selectedNode.fullText && (
                  <div
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      backgroundColor: isDark ? '#232329' : '#f8fafc',
                      fontSize: '11px',
                      lineHeight: 1.5,
                      color: isDark ? '#d4d4d8' : '#334155',
                      maxHeight: '120px',
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {selectedNode.fullText}
                  </div>
                )}

                {/* Connected Inbound Backlinks */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: isDark ? '#e4e4e7' : '#27272a', marginBottom: '6px' }}>
                    Referenced by ({connectedNodes.inbound.length}):
                  </div>
                  {connectedNodes.inbound.length === 0 ? (
                    <div style={{ fontSize: '11px', color: isDark ? '#71717a' : '#94a3b8' }}>
                      No incoming connections
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {connectedNodes.inbound.map((node) => (
                        <div
                          key={node.id}
                          onClick={() => setSelectedNodeId(node.id)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            backgroundColor: isDark ? '#27272a' : '#f1f5f9',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          ← {node.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Connected Outbound Links */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: isDark ? '#e4e4e7' : '#27272a', marginBottom: '6px' }}>
                    Links to ({connectedNodes.outbound.length}):
                  </div>
                  {connectedNodes.outbound.length === 0 ? (
                    <div style={{ fontSize: '11px', color: isDark ? '#71717a' : '#94a3b8' }}>
                      No outgoing connections
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {connectedNodes.outbound.map((node) => (
                        <div
                          key={node.id}
                          onClick={() => setSelectedNodeId(node.id)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            backgroundColor: isDark ? '#27272a' : '#f1f5f9',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          → {node.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Jump to card on canvas button */}
                <button
                  type="button"
                  onClick={handleZoomToCard}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: isDark ? '#ffffff' : '#18181b',
                    color: isDark ? '#000000' : '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: 'auto',
                    boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  <ExternalLink size={13} />
                  <span>Zoom Canvas to Object</span>
                </button>
              </div>
            ) : (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  color: isDark ? '#71717a' : '#94a3b8',
                }}
              >
                <Orbit size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Select any galaxy node</div>
                <div style={{ fontSize: '11px', marginTop: '4px', maxWidth: '180px' }}>
                  Click a sphere in 3D space to inspect its knowledge backlinks and jump to it.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NeuralKnowledgeConstellationModal;
