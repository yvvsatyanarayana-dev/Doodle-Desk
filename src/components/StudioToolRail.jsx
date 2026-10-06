import React from 'react';
import {
  MousePointer,
  Square,
  Diamond,
  Circle,
  ArrowRight,
  Minus,
  Pencil,
  Type,
  Eraser,
  Sparkles,
  Layout,
  Lock,
  Unlock,
} from 'lucide-react';

export function StudioToolRail({
  activeTool = 'selection',
  onSelectTool,
  isLocked = false,
  onToggleLock,
}) {
  const tools = [
    { id: 'selection', name: 'Selection', shortcut: 'V', icon: <MousePointer size={18} /> },
    { id: 'rectangle', name: 'Rectangle', shortcut: 'R', icon: <Square size={18} /> },
    { id: 'diamond', name: 'Diamond', shortcut: 'D', icon: <Diamond size={18} /> },
    { id: 'ellipse', name: 'Ellipse', shortcut: 'O', icon: <Circle size={18} /> },
    { id: 'arrow', name: 'Arrow', shortcut: 'A', icon: <ArrowRight size={18} /> },
    { id: 'line', name: 'Line', shortcut: 'L', icon: <Minus size={18} /> },
    { id: 'freedraw', name: 'Draw', shortcut: 'P', icon: <Pencil size={18} /> },
    { id: 'text', name: 'Text', shortcut: 'T', icon: <Type size={18} /> },
    { id: 'eraser', name: 'Eraser', shortcut: 'E', icon: <Eraser size={18} /> },
    { id: 'frame', name: 'Frame', shortcut: 'F', icon: <Layout size={18} /> },
    { id: 'laser', name: 'Laser', shortcut: 'K', icon: <Sparkles size={18} /> },
  ];

  return (
    <aside className="studio-tool-rail">
      <div className="studio-tool-rail-inner">
        {tools.map((t) => {
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              className={`studio-rail-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTool(t.id)}
              title={`${t.name} (${t.shortcut})`}
            >
              {t.icon}
              {isActive && <span className="studio-rail-dot" />}
              <span className="studio-rail-tooltip">
                {t.name} <kbd>{t.shortcut}</kbd>
              </span>
            </button>
          );
        })}

        <div className="studio-rail-divider" />

        <button
          className={`studio-rail-btn lock-btn ${isLocked ? 'active' : ''}`}
          onClick={onToggleLock}
          title={isLocked ? 'Keep selected tool active (Locked)' : 'Lock tool (Unlocked)'}
        >
          {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
          <span className="studio-rail-tooltip">
            {isLocked ? 'Tool Locked' : 'Tool Unlocked'}
          </span>
        </button>
      </div>
    </aside>
  );
}
