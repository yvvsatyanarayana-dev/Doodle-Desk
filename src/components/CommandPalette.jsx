import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Sparkles,
  GitFork,
  Cpu,
  Network,
  Kanban,
  Smartphone,
  Download,
  Copy,
  FileText,
  Sun,
  Moon,
  Grid,
  Eye,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Sliders,
  Play,
  MapPin,
  Layers,
  StickyNote,
  Ruler,
  Palette,
  FolderKanban,
  Radio,
  Users,
  BookOpen,
} from 'lucide-react';
import {
  generateFlowchart,
  generateArchitecture,
  generateMindMap,
  generateKanban,
  generateWireframe,
} from '../templates/templatePresets';

export function CommandPalette({
  isOpen,
  onClose,
  doodleAPI,
  canvasAPI,
  
  effectiveTheme,
  onThemeToggle,
  onOpenPreferences,
  onOpenTemplates,
  onToggleLibrary,
  onTogglePresentation,
  onToggleMiniMap,
  onSetCanvasStyle,
  onExport,
  onExportPdf,
  onCopyToClipboard,
  onOpenStickyNotes,
  onToggleRuler,
  onOpenColorPalette,
  onOpenWorkspaces,
  onOpenLiveCollab,
  onOpenMermaid,
}) {
  const activeAPI = doodleAPI || canvasAPI || (typeof window !== 'undefined' ? window.__doodleAPI : null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const isKeyNavRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      isKeyNavRef.current = false;
      const t = setTimeout(() => {
        inputRef.current?.focus();
        if (listRef.current) {
          listRef.current.scrollTop = 0;
        }
      }, 40);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Insert template helper
  const insertTemplate = (generator) => {
    if (!activeAPI) return;
    const currentElements = activeAPI.getSceneElements?.() || [];
    const appState = activeAPI.getAppState?.() || {};
    const spawnX = appState.scrollX !== undefined ? -appState.scrollX + 150 : 150;
    const spawnY = appState.scrollY !== undefined ? -appState.scrollY + 100 : 100;

    const newElements = generator(spawnX, spawnY);
    activeAPI.updateScene?.({
      elements: [...currentElements, ...newElements],
      commitToHistory: true,
    });
    setTimeout(() => {
      activeAPI.scrollToContent?.(newElements, { fitToContent: true, animate: true });
    }, 50);
    onClose();
  };

  const commands = [
    // Presentation & Views
    {
      id: 'present',
      title: 'Start Presentation Mode',
      category: 'Presentation',
      icon: <Play size={14} />,
      shortcut: 'Ctrl+Alt+P',
      action: () => {
        onTogglePresentation();
        onClose();
      },
    },
    {
      id: 'minimap',
      title: 'Toggle Mini-Map Radar',
      category: 'View & Navigation',
      icon: <MapPin size={14} />,
      shortcut: 'M',
      action: () => {
        onToggleMiniMap();
        onClose();
      },
    },
    {
      id: 'library_sidebar',
      title: 'Toggle Library Sidebar (Shapes & Components)',
      category: 'Tools & Sidebar',
      icon: <BookOpen size={14} />,
      shortcut: 'Alt+L',
      action: () => {
        onToggleLibrary?.();
        onClose();
      },
    },
    {
      id: 'templates_dialog',
      title: 'Open Diagram Templates (Flowcharts, System Architecture, Mind Maps)',
      category: 'Templates',
      icon: <Layers size={14} />,
      action: () => {
        onOpenTemplates?.();
        onClose();
      },
    },
    {
      id: 'workspaces',
      title: 'Workspace Manager (Switch, Create, Import/Export Boards)',
      category: 'Workspaces & Projects',
      icon: <FolderKanban size={14} />,
      shortcut: 'Ctrl+W',
      action: () => {
        onClose();
        onOpenWorkspaces?.();
      },
    },
    {
      id: 'live_collab',
      title: 'Live Collaboration (Peer-to-Peer Room, Sync Cursors & Chat)',
      category: 'Collaboration',
      icon: <Radio size={14} />,
      shortcut: 'Ctrl+L',
      action: () => {
        onClose();
        onOpenLiveCollab?.();
      },
    },

    {
      id: 'sticky_notes',
      title: 'Sticky Notes & Quick Cards...',
      category: 'Creative Tools',
      icon: <StickyNote size={14} />,
      shortcut: 'N',
      action: () => {
        onClose();
        onOpenStickyNotes?.();
      },
    },
    {
      id: 'mermaid_dialog',
      title: 'Mermaid to Doodle Diagram...',
      category: 'Creative Tools',
      icon: <Sparkles size={14} />,
      action: () => {
        onClose();
        if (onOpenMermaid) {
          onOpenMermaid();
          return;
        }
        if (activeAPI) {
          activeAPI.updateScene?.({
            appState: {
              openDialog: { name: 'ttd', tab: 'mermaid' },
            },
          });
        }
      },
    },
    {
      id: 'precision_ruler',
      title: 'Toggle Precision Ruler & Compass Guide',
      category: 'Drawing Tools',
      icon: <Ruler size={14} />,
      shortcut: 'Shift+R',
      action: () => {
        onClose();
        onToggleRuler?.();
      },
    },
    {
      id: 'color_palette_studio',
      title: 'Curated Color Palette Studio (Themes & Swatches)...',
      category: 'Design & Themes',
      icon: <Palette size={14} />,
      shortcut: 'Shift+C',
      action: () => {
        onClose();
        onOpenColorPalette?.();
      },
    },

    // Templates
    {
      id: 'tpl_flowchart',
      title: 'Insert Flowchart (Decision Tree)',
      category: 'Templates',
      icon: <GitFork size={14} />,
      action: () => insertTemplate(generateFlowchart),
    },
    {
      id: 'tpl_arch',
      title: 'Insert System Architecture (Cloud/DB)',
      category: 'Templates',
      icon: <Cpu size={14} />,
      action: () => insertTemplate(generateArchitecture),
    },
    {
      id: 'tpl_mindmap',
      title: 'Insert Radiant Mind Map',
      category: 'Templates',
      icon: <Network size={14} />,
      action: () => insertTemplate(generateMindMap),
    },
    {
      id: 'tpl_kanban',
      title: 'Insert Sprint Kanban Board',
      category: 'Templates',
      icon: <Kanban size={14} />,
      action: () => insertTemplate(generateKanban),
    },
    {
      id: 'tpl_wireframe',
      title: 'Insert Mobile App Wireframe',
      category: 'Templates',
      icon: <Smartphone size={14} />,
      action: () => insertTemplate(generateWireframe),
    },

    // Canvas Paper & Grid Styles
    {
      id: 'style_blueprint',
      title: 'Canvas Style: Blueprint Grid',
      category: 'Canvas Styles',
      icon: <Grid size={14} />,
      action: () => {
        onSetCanvasStyle('blueprint');
        onClose();
      },
    },
    {
      id: 'style_dotgrid',
      title: 'Canvas Style: Dot Grid Notebook',
      category: 'Canvas Styles',
      icon: <Grid size={14} />,
      action: () => {
        onSetCanvasStyle('dotgrid');
        onClose();
      },
    },
    {
      id: 'style_isometric',
      title: 'Canvas Style: Isometric 3D Grid',
      category: 'Canvas Styles',
      icon: <Grid size={14} />,
      action: () => {
        onSetCanvasStyle('isometric');
        onClose();
      },
    },
    {
      id: 'style_parchment',
      title: 'Canvas Style: Warm Parchment Paper',
      category: 'Canvas Styles',
      icon: <Grid size={14} />,
      action: () => {
        onSetCanvasStyle('parchment');
        onClose();
      },
    },
    {
      id: 'style_standard',
      title: 'Canvas Style: Standard Whiteboard',
      category: 'Canvas Styles',
      icon: <Grid size={14} />,
      action: () => {
        onSetCanvasStyle('standard');
        onClose();
      },
    },

    // Canvas Tools & Actions
    {
      id: 'theme',
      title: `Toggle Theme (${effectiveTheme === 'dark' ? 'Switch to Light' : 'Switch to Dark'})`,
      category: 'Settings',
      icon: effectiveTheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />,
      action: () => {
        onThemeToggle();
        onClose();
      },
    },
    {
      id: 'zoom_fit',
      title: 'Zoom to Fit All Content',
      category: 'View & Navigation',
      icon: <Maximize2 size={14} />,
      action: () => {
        activeAPI?.scrollToContent?.();
        onClose();
      },
    },
    {
      id: 'zoom_in',
      title: 'Zoom In',
      category: 'View & Navigation',
      icon: <ZoomIn size={14} />,
      shortcut: 'Ctrl +',
      action: () => {
        if (activeAPI?.zoomIn) {
          activeAPI.zoomIn();
        } else {
          const appState = activeAPI?.getAppState?.();
          if (appState?.zoom) {
            activeAPI.updateScene?.({ appState: { zoom: { value: Math.min((appState.zoom.value || 1) + 0.2, 5) } } });
          }
        }
        onClose();
      },
    },
    {
      id: 'zoom_out',
      title: 'Zoom Out',
      category: 'View & Navigation',
      icon: <ZoomOut size={14} />,
      shortcut: 'Ctrl -',
      action: () => {
        if (activeAPI?.zoomOut) {
          activeAPI.zoomOut();
        } else {
          const appState = activeAPI?.getAppState?.();
          if (appState?.zoom) {
            activeAPI.updateScene?.({ appState: { zoom: { value: Math.max((appState.zoom.value || 1) - 0.2, 0.1) } } });
          }
        }
        onClose();
      },
    },
    {
      id: 'preferences',
      title: 'Open Preferences',
      category: 'Settings',
      icon: <Sliders size={14} />,
      shortcut: 'Ctrl+,',
      action: () => {
        onOpenPreferences();
        onClose();
      },
    },

    // Export & Sharing
    {
      id: 'export_png',
      title: 'Export as PNG Image...',
      category: 'Export',
      icon: <Download size={14} />,
      shortcut: 'Ctrl+Shift+E',
      action: () => {
        onExport('png');
        onClose();
      },
    },
    {
      id: 'export_svg',
      title: 'Export as SVG Vector...',
      category: 'Export',
      icon: <Download size={14} />,
      action: () => {
        onExport('svg');
        onClose();
      },
    },
    {
      id: 'export_pdf',
      title: 'Export as PDF Document...',
      category: 'Export',
      icon: <FileText size={14} />,
      action: () => {
        onExportPdf();
        onClose();
      },
    },
    {
      id: 'copy_png',
      title: 'Copy PNG to Clipboard',
      category: 'Export',
      icon: <Copy size={14} />,
      action: () => {
        onCopyToClipboard('png');
        onClose();
      },
    },
  ];

  const filteredCommands = commands.filter(cmd => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q) ||
      (cmd.shortcut && cmd.shortcut.toLowerCase().includes(q))
    );
  });

  // Handle Keyboard Navigation (Up, Down, Enter, Esc, Home, End)
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      isKeyNavRef.current = true;
      setSelectedIndex(prev => (filteredCommands.length ? (prev + 1) % filteredCommands.length : 0));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      isKeyNavRef.current = true;
      setSelectedIndex(prev => (filteredCommands.length ? (prev - 1 + filteredCommands.length) % filteredCommands.length : 0));
      return;
    }

    if (e.key === 'Home') {
      e.preventDefault();
      e.stopPropagation();
      isKeyNavRef.current = true;
      setSelectedIndex(0);
      return;
    }

    if (e.key === 'End') {
      e.preventDefault();
      e.stopPropagation();
      isKeyNavRef.current = true;
      setSelectedIndex(Math.max(0, filteredCommands.length - 1));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  };

  // Keep active item scrolled into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector('.cmd-item.active');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }
  }, [selectedIndex]);

  // Global window listener so arrow keys & enter work even if input loses focus
  useEffect(() => {
    if (!isOpen) return;

    const onGlobalKeyDown = (e) => {
      if (
        e.key === 'ArrowDown' ||
        e.key === 'ArrowUp' ||
        e.key === 'Enter' ||
        e.key === 'Escape' ||
        e.key === 'Home' ||
        e.key === 'End'
      ) {
        handleKeyDown(e);
      }
    };

    window.addEventListener('keydown', onGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', onGlobalKeyDown, true);
  }, [isOpen, filteredCommands, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay cmd-palette-overlay" onClick={onClose}>
      <div className="cmd-palette-box" onClick={e => e.stopPropagation()}>
        {/* Search Input Bar */}
        <div className="cmd-search-bar">
          <Search size={16} className="cmd-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-search-input"
            placeholder="Type a command, tool, or template..."
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
              isKeyNavRef.current = false;
              if (listRef.current) {
                listRef.current.scrollTop = 0;
              }
            }}
            onKeyDown={handleKeyDown}
          />
          <kbd className="cmd-esc-badge" onClick={onClose}>Esc</kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="cmd-results-list"
          onMouseMove={() => {
            isKeyNavRef.current = false;
          }}
        >
          {filteredCommands.length === 0 ? (
            <div className="cmd-empty-state">
              No matching commands or templates found for "{query}"
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  className={`cmd-item ${isSelected ? 'active' : ''}`}
                  onClick={cmd.action}
                  onMouseEnter={() => {
                    if (!isKeyNavRef.current) {
                      setSelectedIndex(idx);
                    }
                  }}
                  onMouseMove={() => {
                    isKeyNavRef.current = false;
                    setSelectedIndex(idx);
                  }}
                >
                  <div className="cmd-item-left">
                    <span className="cmd-item-icon">{cmd.icon}</span>
                    <span className="cmd-item-title">{cmd.title}</span>
                  </div>
                  <div className="cmd-item-right">
                    <span className="cmd-item-category">{cmd.category}</span>
                    {cmd.shortcut && <kbd className="cmd-item-shortcut">{cmd.shortcut}</kbd>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="cmd-footer-hint">
          <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
          <span><kbd>↵</kbd> to select</span>
          <span><kbd>Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
