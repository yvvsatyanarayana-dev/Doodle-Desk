export function adaptDefaultStrokeColors(elements, theme) {
  const isDark = theme === 'dark';
  const previousDefault = isDark ? '#1e1e1e' : '#ffffff';
  const nextDefault = isDark ? '#ffffff' : '#1e1e1e';
  let changed = false;

  const nextElements = elements.map(element => {
    if (element.strokeColor !== previousDefault) return element;
    changed = true;
    return {
      ...element,
      strokeColor: nextDefault,
      version: (element.version || 0) + 1,
      updated: Date.now(),
    };
  });

  return changed ? nextElements : elements;
}
