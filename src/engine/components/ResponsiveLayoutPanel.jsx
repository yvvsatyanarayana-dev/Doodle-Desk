import React from 'react';
import { Check, Monitor, Smartphone, Tablet } from 'lucide-react';
import { RESPONSIVE_BREAKPOINTS } from '../responsiveLayouts.js';

const ICONS = { phone: Smartphone, tablet: Tablet, desktop: Monitor };

export function ResponsiveLayoutPanel({
  activeBreakpoint,
  overrideCounts,
  onSelect,
  onSave,
  onClose,
}) {
  return (
    <aside className="doodle-layers-panel doodle-feature-panel doodle-responsive-panel" aria-label="Responsive layouts">
      <header className="doodle-layers-header">
        <div className="doodle-layers-heading">
          <Monitor size={16} />
          <div>
            <strong>Responsive layouts</strong>
            <span>Arrange one board for each screen size</span>
          </div>
        </div>
        <button type="button" className="doodle-layers-icon-button" onClick={onClose} aria-label="Close responsive layouts">×</button>
      </header>
      <div className="doodle-responsive-breakpoints">
        {Object.entries(RESPONSIVE_BREAKPOINTS).map(([key, breakpoint]) => {
          const Icon = ICONS[key];
          return (
            <button
              type="button"
              key={key}
              className={`doodle-responsive-breakpoint${activeBreakpoint === key ? ' is-active' : ''}`}
              onClick={() => onSelect(key)}
              aria-pressed={activeBreakpoint === key}
            >
              <span><Icon size={17} />{breakpoint.label}</span>
              <small>{breakpoint.width} × {breakpoint.height}</small>
              <em>{overrideCounts[key] || 0} saved</em>
            </button>
          );
        })}
      </div>
      {activeBreakpoint && (
        <div className="doodle-components-create">
          <button type="button" className="doodle-components-add" onClick={onSave}>
            <Check size={14} /> Save {RESPONSIVE_BREAKPOINTS[activeBreakpoint].label} layout
          </button>
          <span className="doodle-responsive-hint">Move or resize objects on the canvas, then save this screen layout.</span>
        </div>
      )}
      <footer className="doodle-layers-footer">One set of objects, custom positions per breakpoint</footer>
    </aside>
  );
}
