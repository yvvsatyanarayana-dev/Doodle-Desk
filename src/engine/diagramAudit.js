const SMALL_TEXT_SIZE = 12;

export function auditDiagram(elements = []) {
  const visibleElements = elements.filter((element) => element && !element.isDeleted && !element.isHidden);
  const validTargets = new Set(
    elements
      .filter((element) => element && !element.isDeleted)
      .map((element) => element.id)
      .filter((id) => typeof id === 'string' && id.length > 0)
  );
  const ids = new Map();
  const issues = [];

  for (const element of visibleElements) {
    if (typeof element.id === 'string' && element.id) {
      ids.set(element.id, (ids.get(element.id) || 0) + 1);
    }

    const geometry = [element.x, element.y, element.width, element.height];
    if (!geometry.every(Number.isFinite)) {
      issues.push({
        id: `geometry:${element.id || issues.length}`,
        type: 'invalid-geometry',
        severity: 'error',
        elementId: element.id,
        title: 'Invalid shape position or size',
        description: 'One or more position or size values are missing or not finite.',
      });
    }

    if (element.type === 'text') {
      const text = typeof element.text === 'string' ? element.text : '';
      if (!text.trim()) {
        issues.push({
          id: `empty-text:${element.id || issues.length}`,
          type: 'empty-text',
          severity: 'warning',
          elementId: element.id,
          title: 'Empty text element',
          description: 'This text object has no visible content.',
        });
      } else if (Number.isFinite(element.fontSize) && element.fontSize < SMALL_TEXT_SIZE) {
        issues.push({
          id: `small-text:${element.id || issues.length}`,
          type: 'small-text',
          severity: 'info',
          elementId: element.id,
          title: 'Small text may be hard to read',
          description: `Text is set to ${element.fontSize}px; consider using at least ${SMALL_TEXT_SIZE}px.`,
        });
      }
    }

    if (element.type === 'arrow' || element.type === 'line') {
      for (const endpoint of ['start', 'end']) {
        const binding = element[`${endpoint}Binding`];
        const targetId = binding?.elementId;
        if (binding && (typeof targetId !== 'string' || !validTargets.has(targetId))) {
          issues.push({
            id: `broken-binding:${element.id || issues.length}:${endpoint}`,
            type: 'broken-binding',
            severity: 'error',
            elementId: element.id,
            title: 'Connector points to a missing shape',
            description: `The ${endpoint} end is bound to an element that no longer exists.`,
          });
        }
      }
    }
  }

  for (const [elementId, count] of ids) {
    if (count > 1) {
      issues.push({
        id: `duplicate-id:${elementId}`,
        type: 'duplicate-id',
        severity: 'error',
        elementId: null,
        title: 'Duplicate element identifier',
        description: `${count} visible objects share the same internal identifier.`,
      });
    }
  }

  const summary = {
    elementsChecked: visibleElements.length,
    errors: issues.filter((issue) => issue.severity === 'error').length,
    warnings: issues.filter((issue) => issue.severity === 'warning').length,
    info: issues.filter((issue) => issue.severity === 'info').length,
  };

  return { issues, summary };
}
