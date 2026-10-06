import React, { useState, useRef, memo } from 'react';
import { X, GitBranch, Sparkles, ArrowRight, Layers, Play, Check } from 'lucide-react';
import { FONT_FAMILY } from '../engine/elements.js';

const FLOW_TEMPLATES = [
  {
    id: 'oauth',
    name: 'OAuth 2.0 Auth Flow',
    description: 'Client, Authorization Server, Resource Server & Token handshake',
    syntax: `Client App -> Authorization Server: Request Auth Code
Authorization Server -> User Login: Validate Credentials
User Login -> Authorization Server: Grant Access
Authorization Server -> Client App: Return Auth Code
Client App -> Token Endpoint: Exchange Code for Access Token
Token Endpoint -> Resource API: Access Protected User Data`,
  },
  {
    id: 'microservices',
    name: 'Microservices Event Architecture',
    description: 'API Gateway, Kafka event broker, and independent services',
    syntax: `Mobile / Web Client -> API Gateway: HTTPS REST / GraphQL
API Gateway -> Auth Service: Validate JWT Token
API Gateway -> Order Service: Place Order Request
Order Service -> Kafka Event Bus: Publish OrderCreated Event
Kafka Event Bus -> Payment Worker: Process Charge
Kafka Event Bus -> Notification Service: Send Customer Email
Kafka Event Bus -> Inventory Service: Reserve Stock`,
  },
  {
    id: 'cicd',
    name: 'CI/CD Cloud Pipeline',
    description: 'Git commit to production multi-region deployment',
    syntax: `Developer -> GitHub Repo: Push Commit / Pull Request
GitHub Repo -> GitHub Actions: Trigger CI Runner
GitHub Actions -> Unit & Lint Tests: Run Parallel Matrix
Unit & Lint Tests -> Docker Build: Package OCI Container
Docker Build -> Container Registry: Push Signed Image
Container Registry -> Kubernetes Cluster: Rolling Zero-Downtime Deploy`,
  },
  {
    id: 'decision',
    name: 'User Onboarding Decision Tree',
    description: 'Branching logic for customer conversion and verification',
    syntax: `New Visitor -> Sign Up Form: Submit Email & Password
Sign Up Form -> Email Verification: Send Activation Link
Email Verification -> Is Link Verified?: Check Status
Is Link Verified? -> [Yes] Welcome Dashboard: Unlock Features
Is Link Verified? -> [No] Resend Prompt: Trigger Reminder Notification`,
  },
  {
    id: 'checkout',
    name: 'E-Commerce Checkout Flow',
    description: 'Cart, coupon engine, payment gateway, and confirmation',
    syntax: `Shopping Cart -> Checkout Form: Proceed to Pay
Checkout Form -> Stripe Gateway: Process Card Charge
Stripe Gateway -> Is Payment Approved?: Verify 3D Secure
Is Payment Approved? -> [Approved] Order Confirmation: Issue Receipt
Is Payment Approved? -> [Declined] Retry Screen: Prompt New Payment Method`,
  },
];

function SmartDiagramGeneratorModalComponent({ isOpen, onClose, doodleAPI, canvasAPI }) {
  const [inputText, setInputText] = useState(FLOW_TEMPLATES[0].syntax);
  const [diagramTitle, setDiagramTitle] = useState('Smart Flowchart');
  const [nodeShape, setNodeShape] = useState('rounded'); // 'rounded' | 'rectangle'
  const [flowDirection, setFlowDirection] = useState('TB'); // 'TB' (Top-to-Bottom) | 'LR' (Left-to-Right)
  const textareaRef = useRef(null);

  if (!isOpen) return null;

  // Smart parser: turns text lines into nodes and edges
  const parseFlow = (text) => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));

    const nodesMap = new Map();
    const edges = [];

    const getOrCreateNode = (name) => {
      const cleanName = name.trim();
      if (!nodesMap.has(cleanName)) {
        const isDecision = cleanName.endsWith('?') || cleanName.toLowerCase().startsWith('is ') || cleanName.toLowerCase().startsWith('check ');
        nodesMap.set(cleanName, {
          id: `node-${Math.random().toString(36).substring(2, 9)}`,
          label: cleanName,
          isDecision,
        });
      }
      return nodesMap.get(cleanName);
    };

    for (const line of lines) {
      // Look for -> or --> or =>
      const arrowMatch = line.match(/(.+?)\s*(?:->|-->|=>)\s*(.+)/);
      if (arrowMatch) {
        const sourcePart = arrowMatch[1].trim();
        const targetFull = arrowMatch[2].trim();

        // Check if there is an edge label after colon: "Target: Label"
        let targetPart = targetFull;
        let edgeLabel = '';
        if (targetFull.includes(':')) {
          const parts = targetFull.split(':');
          targetPart = parts[0].trim();
          edgeLabel = parts.slice(1).join(':').trim();
        }

        const sourceNode = getOrCreateNode(sourcePart);
        const targetNode = getOrCreateNode(targetPart);

        edges.push({
          source: sourceNode,
          target: targetNode,
          label: edgeLabel,
        });
      } else {
        // Standalone node
        getOrCreateNode(line);
      }
    }

    return {
      nodes: Array.from(nodesMap.values()),
      edges,
    };
  };

  const handleGenerate = () => {
    const api = doodleAPI || canvasAPI || window.__doodleAPI;
    if (!api) {
      onClose();
      return;
    }

    const { nodes, edges } = parseFlow(inputText);
    if (nodes.length === 0) {
      onClose();
      return;
    }

    const appState = api.getAppState?.() || {};
    const zoom = appState.zoom?.value || 1;
    const scrollX = appState.scrollX || 0;
    const scrollY = appState.scrollY || 0;
    const width = appState.width || window.innerWidth;
    const height = appState.height || window.innerHeight;

    // Viewport center
    const centerX = -scrollX + width / (2 * zoom);
    const centerY = -scrollY + height / (2 * zoom);

    const font = FONT_FAMILY?.Doodlefont ?? 5;
    const elements = [];

    // Layout configuration
    const isLR = flowDirection === 'LR';
    const nodeWidth = 190;
    const nodeHeight = 72;
    const gapX = isLR ? 140 : 80;
    const gapY = isLR ? 90 : 110;

    // Calculate hierarchical levels using simple topological / step ranking
    const inDegree = new Map();
    nodes.forEach((n) => inDegree.set(n.id, 0));
    edges.forEach((e) => {
      inDegree.set(e.target.id, (inDegree.get(e.target.id) || 0) + 1);
    });

    const levels = new Map();
    const visited = new Set();
    const queue = [];

    // Roots
    nodes.forEach((n) => {
      if ((inDegree.get(n.id) || 0) === 0) {
        queue.push({ node: n, level: 0 });
        visited.add(n.id);
      }
    });

    // If cycle or no roots found, seed with first node
    if (queue.length === 0 && nodes.length > 0) {
      queue.push({ node: nodes[0], level: 0 });
      visited.add(nodes[0].id);
    }

    while (queue.length > 0) {
      const { node, level } = queue.shift();
      levels.set(node.id, Math.max(levels.get(node.id) || 0, level));

      const outgoing = edges.filter((e) => e.source.id === node.id);
      for (const edge of outgoing) {
        if (!visited.has(edge.target.id)) {
          visited.add(edge.target.id);
          queue.push({ node: edge.target, level: level + 1 });
        } else {
          levels.set(edge.target.id, Math.max(levels.get(edge.target.id) || 0, level + 1));
        }
      }
    }

    // Assign any unvisited nodes
    nodes.forEach((n, idx) => {
      if (!levels.has(n.id)) {
        levels.set(n.id, idx);
      }
    });

    // Group nodes by level to position columns/rows
    const levelGroups = new Map();
    nodes.forEach((n) => {
      const lvl = levels.get(n.id) || 0;
      if (!levelGroups.has(lvl)) levelGroups.set(lvl, []);
      levelGroups.get(lvl).push(n);
    });

    const maxLevel = Math.max(...Array.from(levelGroups.keys()), 0);
    const totalPrimaryLength = (maxLevel + 1) * (isLR ? nodeWidth + gapX : nodeHeight + gapY);
    const startPrimary = isLR ? centerX - totalPrimaryLength / 2 : centerY - totalPrimaryLength / 2;

    const nodePositions = new Map();

    levelGroups.forEach((groupNodes, level) => {
      const totalSecondaryLength = groupNodes.length * (isLR ? nodeHeight + gapY : nodeWidth + gapX);
      const startSecondary = isLR ? centerY - totalSecondaryLength / 2 : centerX - totalSecondaryLength / 2;

      groupNodes.forEach((node, idx) => {
        let posX, posY;
        if (isLR) {
          posX = startPrimary + level * (nodeWidth + gapX);
          posY = startSecondary + idx * (nodeHeight + gapY);
        } else {
          posX = startSecondary + idx * (nodeWidth + gapX);
          posY = startPrimary + level * (nodeHeight + gapY);
        }
        nodePositions.set(node.id, { x: posX, y: posY });
      });
    });

    // Render nodes
    nodes.forEach((n) => {
      const pos = nodePositions.get(n.id) || { x: centerX, y: centerY };
      const isDecision = n.isDecision;

      const boxId = `box-${n.id}`;
      const textId = `text-${n.id}`;

      // Node container
      const nodeEl = {
        id: boxId,
        type: isDecision ? 'diamond' : 'rectangle',
        x: pos.x,
        y: pos.y,
        width: nodeWidth,
        height: nodeHeight,
        angle: 0,
        strokeColor: isDecision ? '#d97706' : '#93c5fd',
        backgroundColor: isDecision ? 'rgba(217, 119, 6, 0.12)' : 'rgba(147, 197, 253, 0.08)',
        fillStyle: 'solid',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        groupIds: [`group-${n.id}`],
        frameId: null,
        roundness: isDecision ? null : { type: nodeShape === 'rounded' ? 3 : 2 },
        seed: Math.floor(Math.random() * 100000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 100000),
        isDeleted: false,
        boundElements: [{ id: textId, type: 'text' }],
        updated: Date.now(),
        link: null,
        locked: false,
      };

      // Node label
      const textEl = {
        id: textId,
        type: 'text',
        x: pos.x + 10,
        y: pos.y + nodeHeight / 2 - 12,
        width: nodeWidth - 20,
        height: 24,
        angle: 0,
        strokeColor: '#f3f4f6',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        groupIds: [`group-${n.id}`],
        frameId: null,
        roundness: null,
        seed: Math.floor(Math.random() * 100000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 100000),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        text: n.label,
        fontSize: 14,
        fontFamily: font,
        textAlign: 'center',
        verticalAlign: 'middle',
        baseline: 14,
        containerId: boxId,
        originalText: n.label,
        lineHeight: 1.25,
      };

      elements.push(nodeEl, textEl);
    });

    // Render arrows
    edges.forEach((edge, idx) => {
      const srcPos = nodePositions.get(edge.source.id);
      const tgtPos = nodePositions.get(edge.target.id);
      if (!srcPos || !tgtPos) return;

      let startX, startY, endX, endY;
      if (isLR) {
        startX = srcPos.x + nodeWidth;
        startY = srcPos.y + nodeHeight / 2;
        endX = tgtPos.x;
        endY = tgtPos.y + nodeHeight / 2;
      } else {
        startX = srcPos.x + nodeWidth / 2;
        startY = srcPos.y + nodeHeight;
        endX = tgtPos.x + nodeWidth / 2;
        endY = tgtPos.y;
      }

      const dx = endX - startX;
      const dy = endY - startY;

      const arrowId = `arrow-${edge.source.id}-${edge.target.id}-${idx}`;

      const arrowEl = {
        id: arrowId,
        type: 'arrow',
        x: startX,
        y: startY,
        width: Math.abs(dx),
        height: Math.abs(dy),
        angle: 0,
        strokeColor: '#94a3b8',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 90,
        groupIds: [],
        frameId: null,
        roundness: { type: 2 },
        seed: Math.floor(Math.random() * 100000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 100000),
        isDeleted: false,
        points: [
          [0, 0],
          [dx, dy],
        ],
        lastCommittedPoint: null,
        startBinding: { elementId: `box-${edge.source.id}`, focus: 0, gap: 1 },
        endBinding: { elementId: `box-${edge.target.id}`, focus: 0, gap: 1 },
        startArrowhead: null,
        endArrowhead: 'arrow',
        updated: Date.now(),
        link: null,
        locked: false,
      };

      elements.push(arrowEl);

      // Edge label if present
      if (edge.label) {
        const midX = startX + dx / 2;
        const midY = startY + dy / 2 - 14;
        const edgeTextEl = {
          id: `label-${arrowId}`,
          type: 'text',
          x: midX - 30,
          y: midY,
          width: 60,
          height: 18,
          angle: 0,
          strokeColor: '#e2e8f0',
          backgroundColor: 'transparent',
          fillStyle: 'solid',
          strokeWidth: 1,
          strokeStyle: 'solid',
          roughness: 1,
          opacity: 100,
          groupIds: [],
          frameId: null,
          roundness: null,
          seed: Math.floor(Math.random() * 100000),
          version: 1,
          versionNonce: Math.floor(Math.random() * 100000),
          isDeleted: false,
          boundElements: null,
          updated: Date.now(),
          link: null,
          locked: false,
          text: edge.label,
          fontSize: 12,
          fontFamily: font,
          textAlign: 'center',
          verticalAlign: 'middle',
          baseline: 12,
          containerId: null,
          originalText: edge.label,
          lineHeight: 1.2,
        };
        elements.push(edgeTextEl);
      }
    });

    const currentElements = api.getSceneElements?.() || [];
    api.updateScene({
      elements: [...currentElements, ...elements],
      commitToHistory: true,
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container smart-diagram-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '780px',
          maxWidth: '94vw',
          maxHeight: '90vh',
          background: '#121214',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
              }}
            >
              <GitBranch size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f3f4f6' }}>
                Smart Diagram & Flowchart Generator
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                Generate editable hand-drawn diagrams from simple text or prompts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="smart-diagram-modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          {/* Preset Buttons */}
          <div>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
              Quick Architecture Presets
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {FLOW_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setInputText(tmpl.syntax)}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    color: '#d1d5db',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  }}
                >
                  <Sparkles size={12} style={{ color: '#38bdf8' }} />
                  <span>{tmpl.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Syntax Textarea */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', fontWeight: 600 }}>
                Flow Steps & Connections
              </label>
              <span style={{ fontSize: '11px', color: '#6b7280' }}>
                Use <code>A -&gt; B: Label</code> syntax
              </span>
            </div>
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g.: User -> Login Screen -> Auth Gateway -> Dashboard"
              rows={8}
              style={{
                width: '100%',
                padding: '12px',
                background: '#18181b',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '13px',
                fontFamily: 'monospace',
                lineHeight: 1.5,
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Options Row */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Flow Layout:</span>
              <button
                onClick={() => setFlowDirection('TB')}
                style={{
                  padding: '5px 10px',
                  background: flowDirection === 'TB' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: flowDirection === 'TB' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '5px',
                  color: flowDirection === 'TB' ? '#38bdf8' : '#9ca3af',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Top to Bottom (Vertical)
              </button>
              <button
                onClick={() => setFlowDirection('LR')}
                style={{
                  padding: '5px 10px',
                  background: flowDirection === 'LR' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: flowDirection === 'LR' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '5px',
                  color: flowDirection === 'LR' ? '#38bdf8' : '#9ca3af',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Left to Right (Horizontal)
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Corner Style:</span>
              <button
                onClick={() => setNodeShape('rounded')}
                style={{
                  padding: '5px 10px',
                  background: nodeShape === 'rounded' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: nodeShape === 'rounded' ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '5px',
                  color: nodeShape === 'rounded' ? '#ffffff' : '#9ca3af',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Hand-Drawn Rounded
              </button>
              <button
                onClick={() => setNodeShape('rectangle')}
                style={{
                  padding: '5px 10px',
                  background: nodeShape === 'rectangle' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: nodeShape === 'rectangle' ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '5px',
                  color: nodeShape === 'rectangle' ? '#ffffff' : '#9ca3af',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Crisp Rectangle
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            padding: '14px 20px',
            background: 'rgba(0, 0, 0, 0.25)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              color: '#d1d5db',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              background: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              color: '#000000',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(255, 255, 255, 0.2)',
            }}
          >
            <Play size={15} fill="#000000" />
            <span>Generate Diagram on Canvas</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export const SmartDiagramGeneratorModal = memo(SmartDiagramGeneratorModalComponent);
