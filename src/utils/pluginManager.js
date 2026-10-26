/**
 * pluginManager.js
 * WASM & Local Plugin Ecosystem Manager for Doodle Desk.
 * 100% Offline, Sandboxed Extension Architecture.
 */

const DEFAULT_BUILTIN_PLUGINS = [
  {
    id: 'com.doodledesk.cloud-stencils',
    name: 'AWS & Cloud Architecture Stencils',
    version: '1.2.0',
    type: 'shapeRenderer',
    author: 'Doodle Desk Core',
    description: 'High-fidelity AWS, GCP, and Kubernetes cloud architecture icons and shapes',
    enabled: true,
    entry: 'cloud_stencils.wasm',
    permissions: ['canvas.read', 'canvas.write'],
  },
  {
    id: 'com.doodledesk.k8s-crd',
    name: 'Kubernetes Pod & CRD Visualizer',
    version: '1.1.0',
    type: 'shapeRenderer',
    author: 'DevOps Community',
    description: 'Declarative Kubernetes resource topologies, pods, services, and ingress boundaries',
    enabled: true,
    entry: 'k8s_visualizer.wasm',
    permissions: ['canvas.read', 'canvas.write'],
  },
  {
    id: 'com.doodledesk.queueing-sim',
    name: 'Queueing Theory Simulator (M/M/c)',
    version: '2.0.0',
    type: 'simulator',
    author: 'Systems Lab',
    description: 'Interactive Poisson arrival queueing theory simulator with Little\'s Law metrics',
    enabled: true,
    entry: 'queueing_sim.wasm',
    permissions: ['canvas.read', 'canvas.write', 'ui.panel'],
  },
  {
    id: 'com.doodledesk.universal-exporters',
    name: 'Mermaid, PlantUML & C4 Model Pack',
    version: '1.4.0',
    type: 'exporter',
    author: 'Architecture Special Interest Group',
    description: 'One-click lossless export of canvas topologies into Mermaid flowchart, PlantUML, and C4 DSL',
    enabled: true,
    entry: 'universal_exporters.wasm',
    permissions: ['canvas.read'],
  },
  {
    id: 'com.doodledesk.schema-parsers',
    name: 'GraphQL & Terraform HCL Importer',
    version: '1.0.0',
    type: 'importer',
    author: 'Doodle Desk Core',
    description: 'Reverse-engineer GraphQL schemas and Terraform HCL resource trees into visual DAG diagrams',
    enabled: true,
    entry: 'schema_parsers.wasm',
    permissions: ['canvas.write'],
  },
];

let pluginsRegistry = [...DEFAULT_BUILTIN_PLUGINS];

export function getInstalledPlugins() {
  return [...pluginsRegistry];
}

export function togglePlugin(pluginId) {
  pluginsRegistry = pluginsRegistry.map(p => {
    if (p.id === pluginId) {
      return { ...p, enabled: !p.enabled };
    }
    return p;
  });
  return getInstalledPlugins();
}

export function registerPlugin(manifest) {
  if (!manifest || !manifest.id) {
    throw new Error('Plugin manifest must contain a valid id');
  }

  const existing = pluginsRegistry.find(p => p.id === manifest.id);
  if (existing) {
    pluginsRegistry = pluginsRegistry.map(p => (p.id === manifest.id ? { ...p, ...manifest } : p));
  } else {
    pluginsRegistry.push({
      enabled: true,
      permissions: ['canvas.read'],
      ...manifest,
    });
  }

  return getInstalledPlugins();
}

export function exportPluginManifestTemplate() {
  return JSON.stringify(
    {
      id: 'com.myorg.custom-plugin',
      name: 'Custom Visual Extension',
      version: '1.0.0',
      type: 'shapeRenderer',
      entry: 'plugin.wasm',
      author: 'Developer Name',
      description: 'Extends Doodle Desk with bespoke domain-specific rendering logic',
      elementTypes: ['custom-node', 'custom-connector'],
      permissions: ['canvas.read', 'canvas.write', 'ui.panel'],
    },
    null,
    2
  );
}
