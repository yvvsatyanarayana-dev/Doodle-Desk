export function getFrameMoveElementIds(elements, selectedIds) {
  const idsToMove = new Set(selectedIds);
  const selectedFrames = elements.filter((element) => (
    idsToMove.has(element.id)
    && element.type === 'frame'
    && !element.isDeleted
    && !element.isHidden
    && !element.locked
  ));

  for (const frame of selectedFrames) {
    const left = Math.min(frame.x, frame.x + (frame.width || 0));
    const right = Math.max(frame.x, frame.x + (frame.width || 0));
    const top = Math.min(frame.y, frame.y + (frame.height || 0));
    const bottom = Math.max(frame.y, frame.y + (frame.height || 0));

    for (const element of elements) {
      if (
        element.id === frame.id
        || element.type === 'frame'
        || element.isDeleted
        || element.isHidden
        || element.locked
      ) continue;

      if (element.frameId === frame.id) {
        idsToMove.add(element.id);
        continue;
      }

      if (element.frameId) continue;
      const centerX = element.x + (element.width || 0) / 2;
      const centerY = element.y + (element.height || 0) / 2;
      if (centerX >= left && centerX <= right && centerY >= top && centerY <= bottom) {
        idsToMove.add(element.id);
      }
    }
  }

  return idsToMove;
}
