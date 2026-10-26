import { describe, it, expect, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

// Engines & Utils
import {
  parseGraphQlSdl,
  parseTerraformHcl,
  exportToMermaid,
  exportToPlantUML,
  exportToC4Model,
  generateArchitectureDecisionRecord,
  exportShortcutsToMarkdown,
} from '../src/utils/schemaParsers.js';
import {
  explainDiagram,
  generateDiagramFromPrompt,
  lintDiagram,
  reviewArchitecture,
  generateAutoFlashcards,
} from '../src/utils/localAiCopilotEngine.js';
import {
  parseAndExecuteCQL,
  extractEntityGraph,
  evaluateKnowledgeRules,
} from '../src/utils/cqlEngine.js';
import {
  extractStateMachine,
  generateTLAPlusSpec,
  generateAlloySpec,
  generateXStateConfig,
  computeStepTrace,
} from '../src/utils/formalMethodsEngine.js';
import { QueueingSimulator } from '../src/engine/simulation/queueingSim.js';
import { RaftConsensusSimulator } from '../src/engine/simulation/consensusSim.js';
import {
  GATE_TYPES,
  evaluateGate,
  generateTruthTable,
  generateLogicCircuitElements,
} from '../src/engine/simulation/digitalLogicSim.js';
import {
  createCheckpoint,
  computeSemanticDiff,
  generateADRFromDiff,
} from '../src/utils/semanticHistoryEngine.js';
import { FOCUS_MODES } from '../src/config/focusModes.js';
import {
  getInstalledPlugins,
  togglePlugin,
  registerPlugin,
  exportPluginManifestTemplate,
} from '../src/utils/pluginManager.js';

// UI Components
import LocalAiCopilotModal from '../src/components/LocalAiCopilotModal.jsx';
import CanvasQueryBar from '../src/components/CanvasQueryBar.jsx';
import CanvasMultiViewModal from '../src/components/CanvasMultiViewModal.jsx';
import FormalSpecsModal from '../src/components/FormalSpecsModal.jsx';
import SimulationCenterModal from '../src/components/SimulationCenterModal.jsx';
import SemanticCheckpointsModal from '../src/components/SemanticCheckpointsModal.jsx';
import FocusModeSwitcherModal from '../src/components/FocusModeSwitcherModal.jsx';
import PluginsManagerModal from '../src/components/PluginsManagerModal.jsx';
import LocalSyncConfigModal from '../src/components/LocalSyncConfigModal.jsx';
import { CommandPalette } from '../src/components/CommandPalette.jsx';
import StudioTopBar from '../src/components/StudioTopBar.jsx';

describe('Features Roadmap Strategic Test Suite (features.md)', () => {
  // Test Data
  const sampleElements = [
    {
      id: 'f1',
      type: 'frame',
      name: 'Authentication Subsystem',
      x: 100,
      y: 100,
      width: 400,
      height: 300,
    },
    {
      id: 'c1',
      type: 'rectangle',
      text: 'API Gateway',
      x: 120,
      y: 140,
      width: 120,
      height: 60,
      frameId: 'f1',
    },
    {
      id: 'c2',
      type: 'rectangle',
      text: 'Auth Service',
      x: 320,
      y: 140,
      width: 120,
      height: 60,
      frameId: 'f1',
    },
    {
      id: 'c3',
      type: 'cylinder',
      text: 'Redis Token Store',
      x: 320,
      y: 260,
      width: 120,
      height: 60,
      frameId: 'f1',
    },
    {
      id: 'a1',
      type: 'arrow',
      text: 'POST /login',
      x: 240,
      y: 170,
      width: 80,
      height: 0,
      startBinding: { elementId: 'c1' },
      endBinding: { elementId: 'c2' },
    },
    {
      id: 'a2',
      type: 'arrow',
      text: 'Validate JWT',
      x: 380,
      y: 200,
      width: 0,
      height: 60,
      startBinding: { elementId: 'c2' },
      endBinding: { elementId: 'c3' },
    },
  ];

  describe('Module 1: Universal Schema Parsers & Exporters', () => {
    it('parses GraphQL SDL schemas into visual node topologies', () => {
      const sdl = `
        type User {
          id: ID!
          posts: [Post]
        }
        type Post {
          id: ID!
          title: String
        }
      `;
      const records = parseGraphQlSdl(sdl);
      expect(records.length).toBe(2);
      expect(records[0].id).toBe('User');
      expect(records[1].id).toBe('Post');
    });

    it('parses Terraform HCL resource trees into visual diagrams', () => {
      const hcl = `
        resource "aws_vpc" "main" {
          cidr_block = "10.0.0.0/16"
        }
        resource "aws_subnet" "subnet_a" {
          vpc_id = aws_vpc.main.id
        }
      `;
      const records = parseTerraformHcl(hcl);
      expect(records.length).toBe(2);
      expect(records[0].id).toContain('aws_vpc.main');
    });

    it('exports canvas elements to Mermaid flowchart syntax', () => {
      const mermaid = exportToMermaid(sampleElements);
      expect(mermaid).toContain('flowchart TD');
      expect(mermaid).toContain('API Gateway');
      expect(mermaid).toContain('POST /login');
    });

    it('exports canvas elements to PlantUML specification', () => {
      const puml = exportToPlantUML(sampleElements);
      expect(puml).toContain('@startuml');
      expect(puml).toContain('@enduml');
    });

    it('exports canvas elements to C4 Model DSL', () => {
      const c4 = exportToC4Model(sampleElements);
      expect(c4).toContain('workspace');
      expect(c4).toContain('softwareSystem');
    });

    it('generates an Architecture Decision Record (ADR) from selection', () => {
      const adr = generateArchitectureDecisionRecord(sampleElements);
      expect(adr).toContain('ADR: Authentication Subsystem');
      expect(adr).toContain('Authentication Subsystem');
      expect(adr).toContain('Redis Token Store');
    });

    it('exports keyboard shortcut cheat sheet to markdown', () => {
      const sheet = exportShortcutsToMarkdown();
      expect(sheet).toContain('Keyboard Shortcuts Cheat Sheet');
      expect(sheet).toContain('Command Palette');
    });
  });

  describe('Module 2: Local AI Copilot ("Offline Cursor")', () => {
    it('generates narrative architecture documentation via explainDiagram', () => {
      const doc = explainDiagram(sampleElements);
      expect(doc).toContain('Architectural Walkthrough');
      expect(doc).toContain('Authentication Subsystem');
      expect(doc).toContain('Data Stores & State Repositories');
    });

    it('generates complete diagram elements from natural language prompt', () => {
      const batch = generateDiagramFromPrompt('Draw Kafka consumer group with DLQ and dead letter topic');
      expect(batch.length).toBeGreaterThan(4);
      expect(batch.some(b => b.type === 'frame')).toBe(true);
      expect(batch.some(b => b.type === 'arrow')).toBe(true);
    });

    it('audits diagrams with lintDiagram and checks quality', () => {
      const lint = lintDiagram(sampleElements);
      expect(lint.summary).toBeDefined();
      expect(lint.issues).toBeInstanceOf(Array);
    });

    it('identifies SPOF and circular dependencies with reviewArchitecture', () => {
      const review = reviewArchitecture(sampleElements);
      expect(review.riskScore).toBeDefined();
      expect(review.spofCandidates).toBeInstanceOf(Array);
      expect(review.circularDependencies).toBeInstanceOf(Array);
    });

    it('generates study flashcards from diagram elements', () => {
      const cards = generateAutoFlashcards(sampleElements);
      expect(cards.length).toBeGreaterThan(0);
      expect(cards[0].question).toBeDefined();
      expect(cards[0].answer).toBeDefined();
    });
  });

  describe('Module 3: Canvas Query Language (CQL) & Knowledge Graph Engine', () => {
    it('parses and executes keyword FIND query', () => {
      const res = parseAndExecuteCQL(sampleElements, 'FIND gateway');
      expect(res.count).toBe(1);
      expect(res.matchedElements[0].text).toContain('API Gateway');
    });

    it('parses and executes SHOW frames query', () => {
      const res = parseAndExecuteCQL(sampleElements, 'SHOW frames');
      expect(res.count).toBe(1);
      expect(res.matchedElements[0].type).toBe('frame');
    });

    it('parses and executes SHOW components WHERE type="cylinder"', () => {
      const res = parseAndExecuteCQL(sampleElements, 'SHOW components WHERE type="cylinder"');
      expect(res.count).toBe(1);
      expect(res.matchedElements[0].text).toContain('Redis Token Store');
    });

    it('parses and executes CONNECTED_TO query', () => {
      const res = parseAndExecuteCQL(sampleElements, 'SHOW nodes CONNECTED_TO "gateway"');
      expect(res.count).toBeGreaterThan(0);
    });

    it('extracts structured entity model graph', () => {
      const graph = extractEntityGraph(sampleElements);
      expect(graph.count).toBe(sampleElements.length);
      expect(graph.frames.length).toBe(1);
      expect(graph.components.length).toBe(3);
      expect(graph.connectors.length).toBe(2);
    });

    it('evaluates architectural knowledge rules', () => {
      const rules = evaluateKnowledgeRules(sampleElements);
      expect(rules.totalRulesEvaluated).toBe(4);
      expect(rules.issues).toBeInstanceOf(Array);
    });
  });

  describe('Module 4: Executable Specification Canvas (Formal Methods)', () => {
    it('extracts states and transitions from diagram', () => {
      const sm = extractStateMachine(sampleElements);
      expect(sm.states.length).toBe(3);
      expect(sm.transitions.length).toBe(2);
      expect(sm.initialState).toBeDefined();
    });

    it('generates clean TLA+ specification', () => {
      const sm = extractStateMachine(sampleElements);
      const tla = generateTLAPlusSpec(sm, 'AuthSpec');
      expect(tla).toContain('MODULE AuthSpec');
      expect(tla).toContain('EXTENDS Naturals, Sequences, TLC');
      expect(tla).toContain('Init ==');
      expect(tla).toContain('Next ==');
    });

    it('generates valid Alloy specification', () => {
      const sm = extractStateMachine(sampleElements);
      const als = generateAlloySpec(sm, 'AuthSpec');
      expect(als).toContain('module AuthSpec');
      expect(als).toContain('assert NoDeadlock');
    });

    it('generates production XState v5 code', () => {
      const sm = extractStateMachine(sampleElements);
      const xs = generateXStateConfig(sm);
      expect(xs).toContain("import { createMachine } from 'xstate';");
      expect(xs).toContain('canvasSpecMachine');
    });

    it('computes step trace for live visual debugger', () => {
      const sm = extractStateMachine(sampleElements);
      const trace = computeStepTrace(sm, 0);
      expect(trace.totalSteps).toBe(2);
      expect(trace.currentStep).toBe(1);
      expect(trace.activeStateId).toBeDefined();
    });
  });

  describe('Module 5: Executable Mental Models Simulation Layer', () => {
    it('simulates Queueing Theory and verifies Little\'s Law', () => {
      const sim = new QueueingSimulator({ arrivalRate: 15, serviceRate: 20, servers: 1 });
      const metrics = sim.getMetrics();
      expect(metrics.isStable).toBe(true);
      expect(metrics.utilization).toBe(0.75);
      expect(metrics.littlesLawVerified).toBe(true);
      expect(parseFloat(metrics.avgWaitTimeMs)).toBeGreaterThan(0);

      const elements = sim.generateStationElements(100, 100, true);
      expect(elements.length).toBeGreaterThan(4);
    });

    it('simulates Raft Distributed Consensus leader election and logs', () => {
      const sim = new RaftConsensusSimulator({ nodeCount: 3 });
      expect(sim.nodes.length).toBe(3);
      expect(sim.nodes[0].state).toBe('Leader');

      // Tick step
      const stepResult = sim.step();
      expect(stepResult.event).toBe('HEARTBEAT_AND_REPLICATE');
      expect(sim.logs.length).toBe(2);

      // Kill leader and step to elect new leader
      sim.toggleNodeAlive('node-1');
      const electionResult = sim.step();
      expect(electionResult.event).toBe('NEW_LEADER_ELECTED');
      expect(sim.nodes.find(n => n.id === 'node-2')?.state).toBe('Leader');

      const clusterElements = sim.generateClusterElements(100, 100, true);
      expect(clusterElements.length).toBeGreaterThan(3);
    });

    it('evaluates Boolean Logic gates and truth tables', () => {
      expect(evaluateGate(GATE_TYPES.AND, 1, 1)).toBe(1);
      expect(evaluateGate(GATE_TYPES.AND, 1, 0)).toBe(0);
      expect(evaluateGate(GATE_TYPES.OR, 0, 1)).toBe(1);
      expect(evaluateGate(GATE_TYPES.XOR, 1, 1)).toBe(0);
      expect(evaluateGate(GATE_TYPES.NOT, 1)).toBe(0);

      const table = generateTruthTable(GATE_TYPES.AND);
      expect(table.length).toBe(4);
      expect(table[3].out).toBe(1);

      const circuit = generateLogicCircuitElements('AND', 100, 100, true);
      expect(circuit.length).toBeGreaterThan(3);
    });
  });

  describe('Module 6: Semantic History & Checkpoints', () => {
    it('creates named checkpoints', () => {
      const cp = createCheckpoint('v1.0 Baseline', sampleElements, 'Production release');
      expect(cp.name).toBe('v1.0 Baseline');
      expect(cp.elementCount).toBe(sampleElements.length);
      expect(cp.elements.length).toBe(sampleElements.length);
    });

    it('computes semantic structural diff between checkpoints', () => {
      const modified = [
        ...sampleElements,
        { id: 'c4', type: 'rectangle', text: 'New Microservice', x: 500, y: 140, width: 100, height: 60 },
      ];
      const diff = computeSemanticDiff(sampleElements, modified);
      expect(diff.hasChanges).toBe(true);
      expect(diff.added.length).toBe(1);
      expect(diff.added[0].text).toBe('New Microservice');
      expect(diff.summary).toContain('1 added');
    });

    it('generates an Architecture Decision Record (ADR) from a checkpoint diff', () => {
      const cpBefore = createCheckpoint('Monolith Base', sampleElements);
      const cpAfter = createCheckpoint('Distributed Mesh', [
        ...sampleElements,
        { id: 'c4', type: 'rectangle', text: 'Payment Gateway', x: 500, y: 140, width: 100, height: 60 },
      ]);
      const diff = computeSemanticDiff(cpBefore.elements, cpAfter.elements);
      const adr = generateADRFromDiff(cpBefore, cpAfter, diff);
      expect(adr).toContain('ADR: Migration from Monolith Base to Distributed Mesh');
      expect(adr).toContain('Payment Gateway');
    });
  });

  describe('Module 7: Focus Modes & WASM Plugin Ecosystem', () => {
    it('provides 5 preset persona workspaces with tailored shortcuts', () => {
      expect(FOCUS_MODES.ARCHITECT.canvasStyle).toBe('blueprint');
      expect(FOCUS_MODES.TEACHER.canvasStyle).toBe('parchment');
      expect(FOCUS_MODES.DEVELOPER.canvasStyle).toBe('engineeringDark');
      expect(FOCUS_MODES.DESIGNER.canvasStyle).toBe('standard');
      expect(FOCUS_MODES.RESEARCHER.canvasStyle).toBe('dotGrid');
    });

    it('manages WASM plugins with toggle and registration', () => {
      const plugins = getInstalledPlugins();
      expect(plugins.length).toBeGreaterThan(3);
      const firstId = plugins[0].id;
      const initialEnabled = plugins[0].enabled;

      const updated = togglePlugin(firstId);
      expect(updated.find(p => p.id === firstId)?.enabled).toBe(!initialEnabled);

      togglePlugin(firstId); // toggle back

      const manifestTemplate = exportPluginManifestTemplate();
      expect(manifestTemplate).toContain('com.myorg.custom-plugin');
    });
  });

  describe('Module 8: Strategic UI Modals Rendering', () => {
    const renderComponent = (ui) => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);
      act(() => {
        root.render(ui);
      });
      return { container, root };
    };

    it('renders LocalAiCopilotModal with synthesis and explain tabs', () => {
      const { container } = renderComponent(
        <LocalAiCopilotModal
          isOpen={true}
          onClose={vi.fn()}
          elements={sampleElements}
        />
      );
      expect(container.querySelector('[aria-label="Local AI Copilot"]')).toBeTruthy();
      expect(container.textContent).toContain('Generate Architecture');
      expect(container.textContent).toContain('100% Offline');
    });

    it('renders CanvasQueryBar with CQL presets', () => {
      const { container } = renderComponent(
        <CanvasQueryBar
          isOpen={true}
          onClose={vi.fn()}
          elements={sampleElements}
        />
      );
      expect(container.querySelector('[aria-label="Canvas Query Language (CQL) Bar"]')).toBeTruthy();
      expect(container.textContent).toContain('All Frames');
    });

    it('renders CanvasMultiViewModal with table, graph, and kanban views', () => {
      const { container } = renderComponent(
        <CanvasMultiViewModal
          isOpen={true}
          onClose={vi.fn()}
          elements={sampleElements}
        />
      );
      expect(container.querySelector('[aria-label="Knowledge Graph Multi-View"]')).toBeTruthy();
      expect(container.textContent).toContain('Entity Table');
      expect(container.textContent).toContain('DAG Topology');
      expect(container.textContent).toContain('Kanban Workflow');
    });

    it('renders FormalSpecsModal with TLA+ and XState specifications', () => {
      const { container } = renderComponent(
        <FormalSpecsModal
          isOpen={true}
          onClose={vi.fn()}
          elements={sampleElements}
        />
      );
      expect(container.querySelector('[aria-label="Executable Specification Canvas"]')).toBeTruthy();
      expect(container.textContent).toContain('TLA+ Spec');
      expect(container.textContent).toContain('Alloy Model');
      expect(container.textContent).toContain('XState v5');
    });

    it('renders SimulationCenterModal with Queueing Theory, Consensus, and Logic', () => {
      const { container } = renderComponent(
        <SimulationCenterModal
          isOpen={true}
          onClose={vi.fn()}
          elements={sampleElements}
        />
      );
      expect(container.querySelector('[aria-label="Executable Mental Models Simulation Center"]')).toBeTruthy();
      expect(container.textContent).toContain("Queueing Theory (Little's Law)");
      expect(container.textContent).toContain('Raft Consensus Protocol');
      expect(container.textContent).toContain('Digital Logic & Gates');
    });

    it('renders SemanticCheckpointsModal with diff and ADR views', () => {
      const { container } = renderComponent(
        <SemanticCheckpointsModal
          isOpen={true}
          onClose={vi.fn()}
          elements={sampleElements}
        />
      );
      expect(container.querySelector('[aria-label="Semantic History & Checkpoints"]')).toBeTruthy();
      expect(container.textContent).toContain('Timeline Milestones');
    });

    it('renders FocusModeSwitcherModal with 5 personas', () => {
      const { container } = renderComponent(
        <FocusModeSwitcherModal
          isOpen={true}
          onClose={vi.fn()}
        />
      );
      expect(container.querySelector('[aria-label="Focus Mode Presets"]')).toBeTruthy();
      expect(container.textContent).toContain('Architect');
      expect(container.textContent).toContain('Developer');
      expect(container.textContent).toContain('Researcher');
    });

    it('renders PluginsManagerModal with WASM plugin catalog', () => {
      const { container } = renderComponent(
        <PluginsManagerModal
          isOpen={true}
          onClose={vi.fn()}
        />
      );
      expect(container.querySelector('[aria-label="WASM Plugin Ecosystem"]')).toBeTruthy();
      expect(container.textContent).toContain('AWS & Cloud Architecture Stencils');
      expect(container.textContent).toContain('Copy Plugin Template');
    });

    it('renders LocalSyncConfigModal with user-owned infrastructure options', () => {
      const { container } = renderComponent(
        <LocalSyncConfigModal
          isOpen={true}
          onClose={vi.fn()}
          elements={sampleElements}
        />
      );
      expect(container.querySelector('[aria-label="Local-First Sync & User-Owned Infrastructure"]')).toBeTruthy();
      expect(container.textContent).toContain('Syncthing Folder');
      expect(container.textContent).toContain('WebDAV / Nextcloud');
      expect(container.textContent).toContain('S3 / MinIO');
    });

    it('successfully triggers onOpenLocalAiCopilot from CommandPalette and keeps quick action uncluttered', () => {
      const openAiSpy = vi.fn();
      const openCqlSpy = vi.fn();

      // Test StudioTopBar buttons
      const { container: topBarEl } = renderComponent(
        <StudioTopBar
          currentFileName="test.doodle"
          isDirty={false}
          theme="dark"
          canvasStyle="standard"
          onOpenLocalAiCopilot={openAiSpy}
          onOpenCanvasQueryBar={openCqlSpy}
        />
      );

      // AI icon is removed from quick action capsule to keep top bar minimalist and uncluttered
      const aiBtn = topBarEl.querySelector('button[aria-label="Local AI Copilot"]');
      expect(aiBtn).toBeNull();

      const cqlBtn = topBarEl.querySelector('button[aria-label="Canvas Query Language Bar"]');
      expect(cqlBtn).toBeTruthy();
      cqlBtn.click();
      expect(openCqlSpy).toHaveBeenCalledTimes(1);

      // Test CommandPalette execution
      const cpAiSpy = vi.fn();
      const { container: cpEl } = renderComponent(
        <CommandPalette
          isOpen={true}
          onClose={vi.fn()}
          onOpenLocalAiCopilot={cpAiSpy}
        />
      );

      const aiCmd = Array.from(cpEl.querySelectorAll('.cmd-item')).find(el =>
        el.textContent.includes('Local AI Copilot')
      );
      expect(aiCmd).toBeTruthy();
      expect(() => {
        aiCmd.click();
      }).not.toThrow();
      expect(cpAiSpy).toHaveBeenCalledTimes(1);
    });
  });
});
