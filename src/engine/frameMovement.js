export function getDragMoveElementIds(elements, selectedIds) {
  const idsToMove = new Set(selectedIds);
  const elementsById = new Map(elements.map((element) => [element.id, element]));
  const groupMembers = new Map();
  const componentMembers = new Map();

  for (const element of elements) {
    for (const groupId of element.groupIds || []) {
      let members = groupMembers.get(groupId);
      if (!members) {
        members = [];
        groupMembers.set(groupId, members);
      }
      members.push(element.id);
    }
    if (element.componentInstanceId) {
      let members = componentMembers.get(element.componentInstanceId);
      if (!members) {
        members = [];
        componentMembers.set(element.componentInstanceId, members);
      }
      members.push(element.id);
    }
  }

  const pending = [...idsToMove];
  for (let index = 0; index < pending.length; index += 1) {
    const element = elementsById.get(pending[index]);
    if (!element) continue;
    const relatedIds = [
      ...(element.boundElements || []).map((binding) => binding.id),
      element.containerId,
      ...(element.groupIds || []).flatMap((groupId) => groupMembers.get(groupId) || []),
      ...(element.componentInstanceId ? componentMembers.get(element.componentInstanceId) || [] : []),
    ];
    for (const id of relatedIds) {
      if (id && !idsToMove.has(id)) {
        idsToMove.add(id);
        pending.push(id);
      }
    }
  }

  return idsToMove;
}

export function moveBoundLinearElement(element, dx, dy, movingElementIds) {
  if (
    (element.type !== 'arrow' && element.type !== 'line')
    || !Array.isArray(element.points)
    || element.points.length < 2
  ) return null;

  const moveStart = movingElementIds.has(element.startBinding?.elementId);
  const moveEnd = movingElementIds.has(element.endBinding?.elementId);
  if (!moveStart && !moveEnd) return null;

  const points = element.points.map(([x, y]) => [x + element.x, y + element.y]);
  if (moveStart && moveEnd) {
    for (const point of points) {
      point[0] += dx;
      point[1] += dy;
    }
  } else if (moveStart) {
    points[0][0] += dx;
    points[0][1] += dy;
  } else {
    const lastPoint = points[points.length - 1];
    lastPoint[0] += dx;
    lastPoint[1] += dy;
  }

  const minX = Math.min(...points.map(([x]) => x));
  const minY = Math.min(...points.map(([, y]) => y));
  const maxX = Math.max(...points.map(([x]) => x));
  const maxY = Math.max(...points.map(([, y]) => y));
  return {
    ...element,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    points: points.map(([x, y]) => [x - minX, y - minY]),
  };
}

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
