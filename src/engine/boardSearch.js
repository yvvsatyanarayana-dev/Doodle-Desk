const getElementLabel = (element) => {
  const content = element.text || element.name || element.label || element.url || element.link || '';
  return String(content).trim();
};

const excerptFor = (text, query) => {
  const index = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (index < 0 || text.length <= 100) return text.slice(0, 100);
  const start = Math.max(0, index - 35);
  const end = Math.min(text.length, index + query.length + 55);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
};

export function searchBoards(workspaces, query, {
  activeWorkspaceId,
  activeFileId,
  currentElements,
  limit = 100,
} = {}) {
  const term = String(query || '').trim();
  if (term.length < 2) return [];
  const normalizedTerm = term.toLocaleLowerCase();
  const results = [];

  for (const workspace of workspaces || []) {
    for (const file of workspace.files || []) {
      const isActiveFile = workspace.id === activeWorkspaceId && file.id === activeFileId;
      const elements = isActiveFile && Array.isArray(currentElements)
        ? currentElements
        : file.elements || [];
      const boardLabel = `${workspace.name || ''} ${file.name || ''}`;
      if (boardLabel.toLocaleLowerCase().includes(normalizedTerm)) {
        results.push({
          id: `board:${workspace.id}:${file.id}`,
          kind: 'board',
          workspaceId: workspace.id,
          fileId: file.id,
          workspaceName: workspace.name || 'Workspace',
          fileName: file.name || 'Untitled board',
          label: file.name || 'Untitled board',
          excerpt: workspace.name || 'Board name match',
          elementId: null,
        });
      }

      for (const element of elements) {
        if (!element || element.isDeleted || element.isHidden) continue;
        const label = getElementLabel(element);
        if (!label || !label.toLocaleLowerCase().includes(normalizedTerm)) continue;
        results.push({
          id: `element:${workspace.id}:${file.id}:${element.id}`,
          kind: 'element',
          workspaceId: workspace.id,
          fileId: file.id,
          workspaceName: workspace.name || 'Workspace',
          fileName: file.name || 'Untitled board',
          elementId: element.id,
          elementType: element.type,
          label,
          excerpt: excerptFor(label, term),
        });
        if (results.length >= limit) return results;
      }
      if (results.length >= limit) return results;
    }
  }

  return results;
}
