import React, { useState, useEffect, useMemo, memo } from 'react';
import { MapPin, X } from 'lucide-react';

function MiniMapNavigatorComponent({ isOpen, onToggle, doodleAPI, canvasAPI }) {
  doodleAPI = doodleAPI || canvasAPI || (typeof window !== 'undefined' ? window.__doodleAPI : null);
  const [elements, setElements] = useState([]);
  const [appState, setAppState] = useState(null);
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 560 });

  useEffect(() => {
    if (!isOpen || !doodleAPI) return undefined;

    const canvasContainer = document.querySelector('.doodle-engine-container');
    const updateViewportSize = () => {
      const bounds = canvasContainer?.getBoundingClientRect();
      if (bounds?.width && bounds?.height) {
        setViewportSize({ width: bounds.width, height: bounds.height });
      }
    };

    const updateMap = () => {
      const nextElements = doodleAPI.getSceneElements?.() || [];
      const nextAppState = doodleAPI.getAppState?.();
      setElements(nextElements.filter((element) => !element.isDeleted));
      setAppState(nextAppState ? { ...nextAppState } : null);
      updateViewportSize();
    };

    updateMap();
    const interval = window.setInterval(updateMap, 250);
    const resizeObserver = canvasContainer && typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateViewportSize)
      : null;
    if (canvasContainer) resizeObserver?.observe(canvasContainer);
    window.addEventListener('resize', updateViewportSize);

    return () => {
      window.clearInterval(interval);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateViewportSize);
    };
  }, [isOpen, doodleAPI]);

  const sceneBounds = useMemo(() => {
    if (elements.length === 0) {
      return { minX: -500, minY: -400, width: 2000, height: 1600 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    elements.forEach((element) => {
      const x2 = element.x + (element.width || 0);
      const y2 = element.y + (element.height || 0);
      minX = Math.min(minX, element.x, x2);
      minY = Math.min(minY, element.y, y2);
      maxX = Math.max(maxX, element.x, x2);
      maxY = Math.max(maxY, element.y, y2);
    });

    const padding = Math.max(100, Math.max(maxX - minX, maxY - minY) * 0.12);
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    return {
      minX,
      minY,
      width: Math.max(maxX - minX, 1000),
      height: Math.max(maxY - minY, 800),
    };
  }, [elements]);

  const MAP_WIDTH = 180;
  const MAP_HEIGHT = 120;
  const scale = Math.min(MAP_WIDTH / sceneBounds.width, MAP_HEIGHT / sceneBounds.height);
  const mapOffsetX = (MAP_WIDTH - sceneBounds.width * scale) / 2;
  const mapOffsetY = (MAP_HEIGHT - sceneBounds.height * scale) / 2;

  const viewportRect = useMemo(() => {
    if (!appState) return { x: 0, y: 0, width: MAP_WIDTH, height: MAP_HEIGHT };

    const zoom = appState.zoom?.value || 1;
    const viewLeft = -(appState.scrollX || 0) / zoom;
    const viewTop = -(appState.scrollY || 0) / zoom;
    return {
      x: (viewLeft - sceneBounds.minX) * scale + mapOffsetX,
      y: (viewTop - sceneBounds.minY) * scale + mapOffsetY,
      width: Math.max((viewportSize.width / zoom) * scale, 8),
      height: Math.max((viewportSize.height / zoom) * scale, 8),
    };
  }, [appState, sceneBounds, scale, mapOffsetX, mapOffsetY, viewportSize]);

  const handleMapClick = (event) => {
    if (!doodleAPI || !appState || !scale) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const clickX = (event.clientX - rect.left) * MAP_WIDTH / rect.width;
    const clickY = (event.clientY - rect.top) * MAP_HEIGHT / rect.height;
    const targetSceneX = sceneBounds.minX + (clickX - mapOffsetX) / scale;
    const targetSceneY = sceneBounds.minY + (clickY - mapOffsetY) / scale;
    const zoom = appState.zoom?.value || 1;

    doodleAPI.updateScene({
      appState: {
        scrollX: viewportSize.width / 2 - targetSceneX * zoom,
        scrollY: viewportSize.height / 2 - targetSceneY * zoom,
      },
    });
  };

  if (!isOpen) {
    return (
      <button className="minimap-toggle-btn" onClick={onToggle} title="Open Mini-Map Radar (M)">
        <MapPin size={14} />
      </button>
    );
  }

  return (
    <div className="minimap-card">
      <div className="minimap-header">
        <div className="minimap-title-group">
          <MapPin size={12} />
          <span>Radar</span>
        </div>
        <button className="minimap-close-btn" onClick={onToggle} title="Close Mini-Map (M)">
          <X size={12} />
        </button>
      </div>

      <div
        className="minimap-canvas"
        style={{ width: `${MAP_WIDTH}px`, height: `${MAP_HEIGHT}px` }}
        onClick={handleMapClick}
      >
        <svg width={MAP_WIDTH} height={MAP_HEIGHT} className="minimap-svg">
          {elements.map((element) => {
            const elementX = (element.x - sceneBounds.minX) * scale + mapOffsetX;
            const elementY = (element.y - sceneBounds.minY) * scale + mapOffsetY;
            const elementWidth = Math.max(Math.abs(element.width || 0) * scale, 3);
            const elementHeight = Math.max(Math.abs(element.height || 0) * scale, 3);
            let stroke = element.strokeColor && element.strokeColor !== 'transparent' ? element.strokeColor : '#94a3b8';
            if (['#000000', '#1e1e1e', '#121212'].includes(stroke.toLowerCase())) stroke = '#cbd5e1';
            const fill = element.backgroundColor && element.backgroundColor !== 'transparent'
              ? element.backgroundColor
              : 'rgba(255, 255, 255, 0.18)';
            const rotation = element.angle
              ? `rotate(${(element.angle * 180) / Math.PI} ${elementX + elementWidth / 2} ${elementY + elementHeight / 2})`
              : undefined;

            if (element.type === 'ellipse') {
              return <ellipse key={element.id} cx={elementX + elementWidth / 2} cy={elementY + elementHeight / 2} rx={Math.max(elementWidth / 2, 2)} ry={Math.max(elementHeight / 2, 2)} fill={fill} stroke={stroke} strokeWidth={1} transform={rotation} />;
            }
            if (element.type === 'diamond') {
              const points = `${elementX + elementWidth / 2},${elementY} ${elementX + elementWidth},${elementY + elementHeight / 2} ${elementX + elementWidth / 2},${elementY + elementHeight} ${elementX},${elementY + elementHeight / 2}`;
              return <polygon key={element.id} points={points} fill={fill} stroke={stroke} strokeWidth={1} transform={rotation} />;
            }
            if ((element.type === 'line' || element.type === 'arrow' || element.type === 'freedraw') && element.points?.length > 1) {
              const points = element.points.map(([px, py]) => `${elementX + px * scale},${elementY + py * scale}`).join(' ');
              return <polyline key={element.id} points={points} fill="none" stroke={stroke} strokeWidth={1} transform={rotation} />;
            }
            if (element.type === 'text') {
              return <rect key={element.id} x={elementX} y={elementY} width={elementWidth} height={Math.max(2, Math.min(elementHeight, 4))} fill={stroke} opacity={0.65} rx={1} transform={rotation} />;
            }

            const isFrame = element.type === 'frame';
            const radius = element.roundness ? Math.min(elementWidth, elementHeight) * 0.18 : 1;
            return (
              <rect
                key={element.id}
                x={elementX}
                y={elementY}
                width={elementWidth}
                height={elementHeight}
                fill={isFrame ? 'rgba(255,255,255,0.06)' : fill}
                stroke={isFrame ? 'rgba(255,255,255,0.35)' : stroke}
                strokeWidth={1}
                strokeDasharray={isFrame ? '2,2' : undefined}
                rx={isFrame ? 2 : radius}
                transform={rotation}
              />
            );
          })}

          <rect
            x={viewportRect.x}
            y={viewportRect.y}
            width={viewportRect.width}
            height={viewportRect.height}
            fill="rgba(56, 189, 248, 0.18)"
            stroke="#38bdf8"
            strokeWidth={1.5}
            rx={2}
          />
        </svg>
      </div>
    </div>
  );
}

export const MiniMapNavigator = memo(MiniMapNavigatorComponent);
