export function getWalkthroughFrames(elements = []) {
  return elements
    .filter((element) => element.type === 'frame' && !element.isDeleted && !element.isHidden)
    .sort((left, right) => left.y - right.y || left.x - right.x)
    .map((frame, index) => ({
      ...frame,
      name: frame.name?.trim() || `Scene ${index + 1}`,
      walkthroughDescription: typeof frame.walkthroughDescription === 'string'
        ? frame.walkthroughDescription
        : '',
    }));
}

export function getWalkthroughFrameForElement(elements = [], elementOrId) {
  const frames = getWalkthroughFrames(elements);
  const element = typeof elementOrId === 'string'
    ? elements.find((item) => item.id === elementOrId)
    : elementOrId;
  if (!element) return null;
  if (element.type === 'frame') return frames.find((frame) => frame.id === element.id) || null;

  const assignedFrame = frames.find((frame) => frame.id === element.frameId);
  if (assignedFrame) return assignedFrame;

  const centerX = element.x + (element.width || 0) / 2;
  const centerY = element.y + (element.height || 0) / 2;
  return frames.find((frame) => (
    centerX >= frame.x
    && centerX <= frame.x + frame.width
    && centerY >= frame.y
    && centerY <= frame.y + frame.height
  )) || null;
}

function getElementLabel(element) {
  const text = typeof element.text === 'string' ? element.text.trim() : '';
  return text.split('\n')[0] || element.name?.trim() || `${element.type || 'Object'} choice`;
}

function getInternalTargetId(link) {
  if (typeof link !== 'string') return null;
  try {
    const parsed = new URL(link, 'https://doodledesk.local');
    if (parsed.searchParams.has('element')) return parsed.searchParams.get('element');
    if (parsed.hash) {
      const hash = parsed.hash.slice(1);
      const params = new URLSearchParams(hash);
      if (params.has('element')) return params.get('element');
      if (/^[a-zA-Z0-9_-]{10,}$/.test(hash)) return hash;
    }
  } catch {
    return null;
  }
  return null;
}

export function getWalkthroughChoices(elements = [], frameId) {
  const byId = new Map(elements.filter((element) => !element.isDeleted && !element.isHidden)
    .map((element) => [element.id, element]));
  return elements.flatMap((source) => {
    if (source.isDeleted || source.isHidden || !source.link) return [];
    const sourceFrame = getWalkthroughFrameForElement(elements, source);
    if (sourceFrame?.id !== frameId) return [];

    const target = byId.get(getInternalTargetId(source.link));
    const targetFrame = target && getWalkthroughFrameForElement(elements, target);
    if (!targetFrame || targetFrame.id === frameId) return [];

    return [{
      sourceId: source.id,
      label: getElementLabel(source),
      targetFrameId: targetFrame.id,
      targetFrameName: targetFrame.name,
    }];
  });
}

export function getScenarioWalkthroughScenes(elements = []) {
  return getWalkthroughFrames(elements).map((frame) => ({
    id: frame.id,
    name: frame.name,
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
    description: frame.walkthroughDescription,
    choices: getWalkthroughChoices(elements, frame.id),
  }));
}
