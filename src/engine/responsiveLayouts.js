export const RESPONSIVE_BREAKPOINTS = {
  phone: { label: 'Phone', width: 390, height: 844 },
  tablet: { label: 'Tablet', width: 768, height: 1024 },
  desktop: { label: 'Desktop', width: 1440, height: 900 },
};

function geometryOf(element) {
  return {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    angle: element.angle || 0,
  };
}

export function initializeResponsiveBase(elements) {
  return (elements || []).map(element => {
    if (element.isDeleted || element.responsiveLayouts?.base) return element;
    return {
      ...element,
      responsiveLayouts: {
        ...element.responsiveLayouts,
        base: geometryOf(element),
      },
    };
  });
}

export function captureResponsiveLayout(elements, breakpoint) {
  if (!RESPONSIVE_BREAKPOINTS[breakpoint]) {
    throw new Error(`Unknown responsive breakpoint: ${breakpoint}`);
  }
  return (elements || []).map(element => {
    if (element.isDeleted) return element;
    const current = geometryOf(element);
    const layouts = element.responsiveLayouts || {};
    return {
      ...element,
      responsiveLayouts: {
        ...layouts,
        base: layouts.base || current,
        [breakpoint]: current,
      },
      version: (element.version || 0) + 1,
      updated: Date.now(),
    };
  });
}

export function applyResponsiveLayout(elements, breakpoint) {
  if (!RESPONSIVE_BREAKPOINTS[breakpoint]) {
    throw new Error(`Unknown responsive breakpoint: ${breakpoint}`);
  }
  return (elements || []).map(element => {
    if (element.isDeleted) return element;
    const geometry = element.responsiveLayouts?.[breakpoint] ||
      element.responsiveLayouts?.base;
    if (!geometry) return element;
    return {
      ...element,
      ...geometry,
      version: (element.version || 0) + 1,
      updated: Date.now(),
    };
  });
}

export function countResponsiveOverrides(elements, breakpoint) {
  return (elements || []).filter(element =>
    !element.isDeleted && Boolean(element.responsiveLayouts?.[breakpoint])
  ).length;
}
