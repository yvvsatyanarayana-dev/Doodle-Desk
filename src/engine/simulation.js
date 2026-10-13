export function buildSimulationGraph(elements) {
  const shapeNodes = (elements || []).filter(element =>
    !element.isDeleted && !element.isHidden &&
    !['arrow', 'line', 'freedraw'].includes(element.type)
  );
  const shapeIds = new Set(shapeNodes.map(element => element.id));
  const edges = (elements || [])
    .filter(element =>
      !element.isDeleted &&
      (element.type === 'arrow' || element.type === 'line') &&
      element.startBinding?.elementId &&
      element.endBinding?.elementId &&
      shapeIds.has(element.startBinding.elementId) &&
      shapeIds.has(element.endBinding.elementId)
    )
    .map(element => ({
      id: element.id,
      from: element.startBinding.elementId,
      to: element.endBinding.elementId,
      label: element.label || '',
    }));
  const connectedIds = new Set(edges.flatMap(edge => [edge.from, edge.to]));
  const nodes = shapeNodes.filter(node => connectedIds.has(node.id));
  const incoming = new Set(edges.map(edge => edge.to));
  const starts = nodes.filter(node => !incoming.has(node.id));
  return { nodes, edges, starts };
}

export function getSimulationChoices(graph, nodeId) {
  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  return graph.edges
    .filter(edge => edge.from === nodeId)
    .map(edge => {
      const target = byId.get(edge.to);
      return {
        ...edge,
        target,
        label: edge.label || target?.text || target?.name || target?.label || target?.type || 'Next step',
      };
    })
    .filter(choice => choice.target);
}

export function getSimulationNodeTitle(node) {
  if (!node) return '';
  return node.text || node.name || node.label || node.link || node.type || 'Step';
}
