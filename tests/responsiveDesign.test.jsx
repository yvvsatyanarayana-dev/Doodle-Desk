import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { StudioTopBar } from '../src/components/StudioTopBar.jsx';
import { TopToolbar } from '../src/engine/components/TopToolbar.jsx';
import WorkspaceDropdown from '../src/components/WorkspaceDropdown.jsx';
import ExportDropdown from '../src/components/ExportDropdown.jsx';
import LiveCollabDropdown from '../src/components/LiveCollabDropdown.jsx';
import { PropertiesPanel } from '../src/engine/components/PropertiesPanel.jsx';
import { FooterLeft } from '../src/engine/components/FooterLeft.jsx';

describe('Responsive Design Master Suite', () => {
  it('defines comprehensive CSS responsive breakpoints and safe area variables in index.css', () => {
    const cssPath = path.resolve(__dirname, '../src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    // Safe Area & Topbar Height Variables
    expect(cssContent).toContain('--studio-topbar-height: 38px');
    expect(cssContent).toContain('--safe-top: env(safe-area-inset-top');
    expect(cssContent).toContain('--safe-bottom: env(safe-area-inset-bottom');
    expect(cssContent).toContain('-webkit-tap-highlight-color: transparent');

    // Breakpoint Rules
    expect(cssContent).toContain('@media (max-width: 1024px)');
    expect(cssContent).toContain('@media (max-width: 768px)');
    expect(cssContent).toContain('@media (max-width: 600px)');
    expect(cssContent).toContain('@media (max-width: 420px)');

    // Responsive Canvas Toolbar & Modal Handling
    expect(cssContent).toContain('.doodle-canvas-root .App-toolbar');
    expect(cssContent).toContain('overflow-x: auto');
    expect(cssContent).toContain('-webkit-overflow-scrolling: touch');
    expect(cssContent).toContain('.studio-btn-label');
  });

  it('renders StudioTopBar with responsive label classes and clamped dropdown positioning', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const dummyWorkspace = { id: 'ws-1', name: 'Product Architecture', icon: 'layers', color: '#6366f1' };
    const dummyWorkspaces = [dummyWorkspace];

    act(() => {
      root.render(
        <StudioTopBar
          currentFileName="System Overview Diagram"
          isDirty={true}
          theme="dark"
          activeWorkspace={dummyWorkspace}
          workspaces={dummyWorkspaces}
          activeWorkspaceId="ws-1"
          collabStatus="disconnected"
        />
      );
    });

    // Verify studio-btn-label class is present for responsive collapse
    const btnLabels = container.querySelectorAll('.studio-btn-label');
    expect(btnLabels.length).toBeGreaterThan(0);

    // Export button has responsive studio-btn-label
    const exportBtn = container.querySelector('button[title="Export canvas"]');
    expect(exportBtn).toBeTruthy();
    expect(exportBtn.querySelector('.studio-btn-label')?.textContent).toBe('Export');

    // Collab button has responsive studio-btn-label
    const collabBtn = container.querySelector('button[title="Live Collaboration"]');
    expect(collabBtn).toBeTruthy();
    expect(collabBtn.querySelector('.studio-btn-label')?.textContent).toBe('Live Collab');

    // Mobile header quick undo & redo buttons
    const mobileUndoBtn = container.querySelector('.studio-mobile-undo-btn');
    expect(mobileUndoBtn).toBeTruthy();
    const mobileRedoBtn = container.querySelector('.studio-mobile-redo-btn');
    expect(mobileRedoBtn).toBeTruthy();

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it('renders TopToolbar with responsive touch-scrolling container styles', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <TopToolbar
          activeTool="selection"
          onSelectTool={vi.fn()}
          isLocked={false}
          onToggleLock={vi.fn()}
        />
      );
    });

    const toolbarEl = container.querySelector('.Island.App-toolbar');
    expect(toolbarEl).toBeTruthy();
    expect(toolbarEl?.style.maxWidth).toBe('calc(100vw - 16px)');
    expect(toolbarEl?.style.overflowX).toBe('auto');
    expect(toolbarEl?.style.scrollbarWidth).toBe('none');

    const contentEl = container.querySelector('.App-toolbar-content');
    expect(contentEl).toBeTruthy();
    expect(contentEl?.style.flexShrink).toBe('0');

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it('ensures WorkspaceDropdown adapts width to mobile viewports without overflowing', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <WorkspaceDropdown
          workspaces={[{ id: '1', name: 'Mobile Test', icon: 'grid', color: '#10b981', files: [] }]}
          activeWorkspaceId="1"
          activeFileId="f-1"
          onSwitchWorkspace={vi.fn()}
          onCreateWorkspace={vi.fn()}
          onClose={vi.fn()}
          theme="dark"
          isDark={true}
        />
      );
    });

    const rootDropdown = container.firstChild;
    expect(rootDropdown.style.width).toMatch(/min\(340px,.*100vw.*\)/);
    expect(rootDropdown.style.maxWidth).toMatch(/100vw/);

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it('ensures ExportDropdown adapts width to mobile viewports without overflowing', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ExportDropdown
          onExport={vi.fn()}
          onExportPdf={vi.fn()}
          onCopyToClipboard={vi.fn()}
          theme="dark"
          isDark={true}
          onClose={vi.fn()}
        />
      );
    });

    const rootDropdown = container.firstChild;
    expect(rootDropdown.style.width).toMatch(/min\(264px,.*100vw.*\)/);
    expect(rootDropdown.style.maxWidth).toMatch(/100vw/);

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it('ensures LiveCollabDropdown adapts width to mobile viewports without overflowing', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <LiveCollabDropdown
          status="disconnected"
          theme="dark"
          isDark={true}
          collaborators={new Map()}
          onClose={vi.fn()}
        />
      );
    });

    const rootDropdown = container.firstChild;
    expect(rootDropdown.style.width).toMatch(/min\(300px,.*100vw.*\)/);
    expect(rootDropdown.style.maxWidth).toMatch(/100vw/);

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it('enforces responsive properties panel layout without overlapping bottom footer-left', () => {
    const cssPath = path.resolve(__dirname, '../src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    // .App-menu__left-wrapper must have bottom: 60px to clear footer-left (bottom: 16px, height: 34px)
    expect(cssContent).toContain('.doodle-canvas-root .App-menu__left-wrapper');
    expect(cssContent).toContain('bottom: 60px !important');

    // .App-menu__left must fit inside wrapper with max-height: 100% and scrollbar-width: thin
    expect(cssContent).toContain('max-height: 100% !important');
    expect(cssContent).toContain('scrollbar-width: thin !important');

    // Compact heights media query support
    expect(cssContent).toContain('@media (max-height: 720px)');
  });

  it('enforces unified bottom-right tool rail alignment and stacking order', () => {
    const cssPath = path.resolve(__dirname, '../src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    // .layer-ui__wrapper__footer-right unified flex container aligned at right: 14px, bottom: 16px
    expect(cssContent).toContain('.doodle-canvas-root .layer-ui__wrapper__footer-right');
    expect(cssContent).toContain('right: 14px !important');
    expect(cssContent).toContain('bottom: 16px !important');
    expect(cssContent).toContain('flex-direction: column !important');
    expect(cssContent).toContain('gap: 8px !important');

    // Explicit ordering: MiniMap (1), Data Diagram (2), Help (3)
    expect(cssContent).toContain('.layer-ui__wrapper__footer-right .minimap-toggle-btn');
    expect(cssContent).toContain('order: 1 !important');
    expect(cssContent).toContain('.layer-ui__wrapper__footer-right .data-diagram-trigger');
    expect(cssContent).toContain('order: 2 !important');
    expect(cssContent).toContain('.layer-ui__wrapper__footer-right .help-icon');
    expect(cssContent).toContain('order: 3 !important');

    // MiniMap card anchors beside the tool rail
    expect(cssContent).toContain('right: 58px !important');
  });

  it('verifies mobile whiteboard properties bar and bottom sheet CSS architecture', () => {
    const cssPath = path.resolve(__dirname, '../src/index.css');
    const rawCss = fs.readFileSync(cssPath, 'utf8');
    const cssContent = rawCss.replace(/\r\n/g, '\n');

    // Desktop default: mobile properties container is hidden
    expect(cssContent).toContain('.mobile-properties-container');
    expect(cssContent).toMatch(/\.mobile-properties-container\s*\{\s*display:\s*none !important;/);

    // Mobile media query: hides desktop sidebar and docks toolbar at bottom
    expect(cssContent).toMatch(/\.mobile-properties-container\s*\{\s*display:\s*block !important;/);
    expect(cssContent).toMatch(/\.doodle-canvas-root \.App-menu__left-wrapper\s*\{\s*display:\s*none !important;/);
    expect(cssContent).toMatch(/\.doodle-canvas-root \.App-toolbar-container\s*\{\s*position:\s*fixed !important;\s*top:\s*auto !important;/);

    // Mobile clean canvas: desktop corner widgets (footer-left, footer-right, minimap) are hidden
    expect(cssContent).toMatch(/\.doodle-canvas-root \.layer-ui__wrapper__footer-left[\s\S]*?\{[\s\S]*?display:\s*none !important;/);
    expect(cssContent).toMatch(/\.studio-mobile-undo-redo\s*\{\s*display:\s*inline-flex !important;/);

    // Mobile quick properties bar
    expect(cssContent).toContain('.mobile-properties-quick-bar');
    expect(cssContent).toContain('.mobile-quick-btn');
    expect(cssContent).toContain('.mobile-swatch-preview');

    // Mobile actions popover (Layers & Actions)
    expect(cssContent).toContain('.mobile-actions-popover');
    expect(cssContent).toContain('.mobile-popover-grid');
    expect(cssContent).toContain('.mobile-color-swatches');

    // Mobile Excalidraw-parity properties popover & actions popover
    expect(cssContent).toContain('.mobile-actions-popover');
    expect(cssContent).toContain('.mobile-actions-popover::after');
    expect(cssContent).toContain('.mobile-properties-popover');
    expect(cssContent).toContain('width: 140px !important');
    expect(cssContent).toContain('scrollbar-width: none !important');
    expect(cssContent).toContain('.mobile-properties-popover .mobile-popover-btn-group .ToolIcon');
    expect(cssContent).toContain('height: 30px !important');
    expect(cssContent).toContain('.mobile-popover-range');
    expect(cssContent).toContain('.mobile-popover-range-labels');
  });

  it('renders mobile quick properties bar when element is selected and opens layers popover and properties popover', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const dummyElement = {
      id: 'rect-1',
      type: 'rectangle',
      strokeColor: '#e03131',
      backgroundColor: '#ffc9c9',
      fillStyle: 'solid',
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      roundness: 'round',
    };

    const onUpdateProperty = vi.fn();
    const onAction = vi.fn();
    const onUndo = vi.fn();
    const onRedo = vi.fn();

    act(() => {
      root.render(
        <PropertiesPanel
          selectedElements={[dummyElement]}
          appState={{}}
          onUpdateProperty={onUpdateProperty}
          onAction={onAction}
          onUndo={onUndo}
          onRedo={onRedo}
        />
      );
    });

    // Mobile properties container must be rendered
    const mobileContainer = container.querySelector('.mobile-properties-container');
    expect(mobileContainer).toBeTruthy();

    // Floating quick bar must be present with controls
    const quickBar = container.querySelector('.mobile-properties-quick-bar');
    expect(quickBar).toBeTruthy();

    const swatchBtns = container.querySelectorAll('.mobile-swatch-btn');
    expect(swatchBtns.length).toBeGreaterThanOrEqual(2); // Stroke and background swatches

    const slidersBtn = container.querySelector('button[aria-label="Toggle element properties sheet"]');
    expect(slidersBtn).toBeTruthy();

    const moreActionsBtn = container.querySelector('button[aria-label="Layers and Actions"]');
    expect(moreActionsBtn).toBeTruthy();

    const undoBtn = container.querySelector('button[aria-label="Undo"]');
    expect(undoBtn).toBeTruthy();
    act(() => {
      undoBtn?.click();
    });
    expect(onUndo).toHaveBeenCalledTimes(1);

    const redoBtn = container.querySelector('button[aria-label="Redo"]');
    expect(redoBtn).toBeTruthy();
    act(() => {
      redoBtn?.click();
    });
    expect(onRedo).toHaveBeenCalledTimes(1);

    // Clicking "Layers and Actions" opens the popover
    act(() => {
      moreActionsBtn?.click();
    });

    const actionsPopover = container.querySelector('.mobile-actions-popover');
    expect(actionsPopover).toBeTruthy();
    expect(actionsPopover?.textContent).toContain('Layers');
    expect(actionsPopover?.textContent).toContain('Actions');

    // Test duplicate action button inside popover
    const duplicateBtn = container.querySelector('button[aria-label="Duplicate"]');
    expect(duplicateBtn).toBeTruthy();
    act(() => {
      duplicateBtn?.click();
    });
    expect(onAction).toHaveBeenCalledWith('duplicate');

    // Clicking sliders button opens the Excalidraw-parity floating properties popover
    act(() => {
      slidersBtn?.click();
    });

    const propertiesPopover = container.querySelector('.mobile-properties-popover');
    expect(propertiesPopover).toBeTruthy();
    expect(propertiesPopover?.textContent).toContain('Stroke width');
    expect(propertiesPopover?.textContent).toContain('Stroke style');
    expect(propertiesPopover?.textContent).toContain('Sloppiness');
    expect(propertiesPopover?.textContent).toContain('Edges');
    expect(propertiesPopover?.textContent).toContain('Opacity');

    // Test clicking a stroke width option inside popover
    const thinStrokeBtn = propertiesPopover?.querySelector('button[aria-label="Thin stroke"]');
    expect(thinStrokeBtn).toBeTruthy();
    act(() => {
      thinStrokeBtn?.click();
    });
    expect(onUpdateProperty).toHaveBeenCalledWith('strokeWidth', 1);

    // Verify opacity range and 0 - 100 labels are present
    const rangeSlider = propertiesPopover?.querySelector('.mobile-popover-range');
    expect(rangeSlider).toBeTruthy();
    const rangeLabels = propertiesPopover?.querySelector('.mobile-popover-range-labels');
    expect(rangeLabels?.textContent).toContain('0');
    expect(rangeLabels?.textContent).toContain('100');

    // Tapping sliders button again toggles popover closed
    act(() => {
      slidersBtn?.click();
    });

    expect(container.querySelector('.mobile-properties-popover')).toBeNull();

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it('renders FooterLeft with has-selection class when shapes are selected to prevent mobile dock overlap', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <FooterLeft
          zoomLevel={1.25}
          hasSelection={true}
          onZoomIn={vi.fn()}
          onZoomOut={vi.fn()}
          onZoomReset={vi.fn()}
        />
      );
    });

    const footerLeftEl = container.querySelector('.layer-ui__wrapper__footer-left');
    expect(footerLeftEl).toBeTruthy();
    expect(footerLeftEl?.classList.contains('has-selection')).toBe(true);
    expect(footerLeftEl?.textContent).toContain('125%');

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});
