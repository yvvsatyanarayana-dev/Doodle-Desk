import React from 'react';
import {
  Palette,
  Layout,
  Sparkles,
  Rocket,
  Lightbulb,
  Kanban,
  Compass,
  Code2,
  Layers,
  Flame,
  Zap,
  Workflow,
  Target,
  Smartphone,
  Box,
  BrainCircuit,
  PenTool,
} from 'lucide-react';

export const WORKSPACE_THEME_ICONS = [
  { id: 'palette', label: 'Art & Design', Icon: Palette },
  { id: 'layout', label: 'Wireframe & UI', Icon: Layout },
  { id: 'sparkles', label: 'Brainstorm & Ideas', Icon: Sparkles },
  { id: 'rocket', label: 'Project Launch', Icon: Rocket },
  { id: 'workflow', label: 'Flowcharts', Icon: Workflow },
  { id: 'kanban', label: 'Agile & Tasks', Icon: Kanban },
  { id: 'cpu', label: 'Architecture', Icon: BrainCircuit },
  { id: 'code', label: 'Engineering', Icon: Code2 },
  { id: 'compass', label: 'Specs & Guides', Icon: Compass },
  { id: 'layers', label: 'Diagram Layers', Icon: Layers },
  { id: 'flame', label: 'Sprint & Focus', Icon: Flame },
  { id: 'zap', label: 'Quick Notes', Icon: Zap },
  { id: 'target', label: 'Goals', Icon: Target },
  { id: 'mobile', label: 'Mobile Apps', Icon: Smartphone },
  { id: 'box', label: 'Components', Icon: Box },
  { id: 'brain', label: 'Mind Map', Icon: BrainCircuit },
];

export const WORKSPACE_COLORS = [
  { id: '#3b82f6', name: 'Azure Blue' },
  { id: '#10b981', name: 'Emerald' },
  { id: '#8b5cf6', name: 'Violet' },
  { id: '#f59e0b', name: 'Amber' },
  { id: '#ec4899', name: 'Rose' },
  { id: '#06b6d4', name: 'Cyan' },
  { id: '#ef4444', name: 'Coral Red' },
  { id: '#64748b', name: 'Slate Gray' },
];

export function getWorkspaceIconComponent(iconKey) {
  if (!iconKey) return Palette;
  const match = WORKSPACE_THEME_ICONS.find((icon) => icon.id === iconKey);
  if (match) return match.Icon;

  // Backward compatibility with legacy emoji strings.
  if (iconKey === '🎨') return Palette;
  if (iconKey === '📐') return Compass;
  if (iconKey === '🚀') return Rocket;
  if (iconKey === '💡') return Lightbulb;
  if (iconKey === '📊' || iconKey === '📈') return Workflow;
  if (iconKey === '⚡') return Zap;
  if (iconKey === '🏗️' || iconKey === 'Layers') return Layers;
  if (iconKey === '🎯') return Target;
  if (iconKey === '📱') return Smartphone;
  if (iconKey === '✨' || iconKey === '🔮') return Sparkles;
  if (iconKey === '🧠') return BrainCircuit;
  if (iconKey === '📝') return PenTool;

  return Palette;
}

export function WorkspaceIconBadge({ icon, color = '#3b82f6', size = 18, style = {} }) {
  const IconComponent = getWorkspaceIconComponent(icon);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size + 14}px`,
        height: `${size + 14}px`,
        borderRadius: '8px',
        backgroundColor: `${color}18`,
        border: `1px solid ${color}35`,
        color,
        flexShrink: 0,
        ...style,
      }}
    >
      <IconComponent size={size} strokeWidth={2.2} />
    </div>
  );
}