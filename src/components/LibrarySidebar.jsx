import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search,
  BookOpen,
  Pin,
  X,
  MoreVertical,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  GitFork,
  Cpu,
  Network,
  Kanban,
  Smartphone,
  FolderPlus,
  Check,
} from 'lucide-react';
import {
  generateFlowchart,
  generateArchitecture,
  generateMindMap,
  generateKanban,
  generateWireframe,
} from '../templates/templatePresets';

const STORAGE_KEY = 'doodle_user_library_items_v1';
const TEMPLATES_STORAGE_KEY = 'doodle_custom_templates_v1';

// Visual SVG Shape & Frame Preview Component
function ShapePreview({ elements = [] }) {
  if (!elements || elements.length === 0) {
    return (
      <div style={{ width: '60px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '26px', border: '1px dashed #71717a', borderRadius: '4px' }} />
      </div>
    );
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  elements.forEach(el => {
    const x = el.x || 0;
    const y = el.y || 0;
    const w = el.width || 0;
    const h = el.height || 0;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w;
    if (y + h > maxY) maxY = y + h;
  });

  if (minX === Infinity) { minX = 0; minY = 0; maxX = 100; maxY = 80; }
  const width = Math.max(maxX - minX, 20);
  const height = Math.max(maxY - minY, 20);
  const pad = 12;
  const viewBox = `${minX - pad} ${minY - pad} ${width + pad * 2} ${height + pad * 2}`;

  return (
    <svg
      viewBox={viewBox}
      style={{
        width: '74px',
        height: '56px',
        overflow: 'visible',
        display: 'block',
      }}
    >
      {elements.map((el, i) => {
        const stroke = el.strokeColor || '#9ca3af';
        const fill = el.backgroundColor && el.backgroundColor !== 'transparent' ? el.backgroundColor : 'none';
        const strokeW = el.strokeWidth ? Math.min(el.strokeWidth, 2) : 1.5;
        const isDashed = el.strokeStyle === 'dashed' || el.strokeStyle === 'dotted';

        if (el.type === 'rectangle' || el.type === 'frame') {
          return (
            <rect
              key={i}
              x={el.x}
              y={el.y}
              width={el.width}
              height={el.height}
              rx={el.roundness || el.type === 'frame' ? 6 : 0}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeW}
              strokeDasharray={isDashed || el.type === 'frame' ? '4 3' : 'none'}
            />
          );
        }

        if (el.type === 'ellipse') {
          return (
            <ellipse
              key={i}
              cx={el.x + (el.width || 0) / 2}
              cy={el.y + (el.height || 0) / 2}
              rx={(el.width || 0) / 2}
              ry={(el.height || 0) / 2}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeW}
            />
          );
        }

        if (el.type === 'diamond') {
          const cx = el.x + (el.width || 0) / 2;
          const cy = el.y + (el.height || 0) / 2;
          const points = `${cx},${el.y} ${el.x + (el.width || 0)},${cy} ${cx},${el.y + (el.height || 0)} ${el.x},${cy}`;
          return (
            <polygon
              key={i}
              points={points}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeW}
            />
          );
        }

        if (el.type === 'line' || el.type === 'arrow') {
          return (
            <line
              key={i}
              x1={el.x}
              y1={el.y}
              x2={el.x + (el.width || 0)}
              y2={el.y + (el.height || 0)}
              stroke={stroke}
              strokeWidth={strokeW}
            />
          );
        }

        if (el.type === 'text') {
          return (
            <text
              key={i}
              x={el.x + (el.width || 60) / 2}
              y={el.y + (el.height || 20) / 2 + 4}
              textAnchor="middle"
              fill={stroke}
              fontSize="11"
              fontFamily="sans-serif"
              fontWeight="600"
            >
              {el.text || ''}
            </text>
          );
        }

        return null;
      })}
    </svg>
  );
}

// Built-in Shapes & Frames (NOT templates — reusable visual components)
const BUILTIN_SHAPES_AND_FRAMES = [
  {
    id: 'shape-frame-mobile',
    name: 'Mobile Frame',
    category: 'Frames',
    elements: [
      {
        id: 'f-mob-outer',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 130,
        height: 200,
        strokeColor: '#9ca3af',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        fillStyle: 'solid',
        strokeWidth: 2,
        roughness: 0,
        roundness: { type: 3 },
      },
      {
        id: 'f-mob-notch',
        type: 'rectangle',
        x: 40,
        y: 6,
        width: 50,
        height: 8,
        strokeColor: '#71717a',
        backgroundColor: '#71717a',
        fillStyle: 'solid',
        strokeWidth: 1,
        roughness: 0,
        roundness: { type: 3 },
      }
    ]
  },
  {
    id: 'shape-frame-window',
    name: 'Window Frame',
    category: 'Frames',
    elements: [
      {
        id: 'f-win-outer',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 170,
        height: 120,
        strokeColor: '#9ca3af',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        fillStyle: 'solid',
        strokeWidth: 1.5,
        roughness: 0,
        roundness: { type: 3 },
      },
      {
        id: 'f-win-bar',
        type: 'line',
        x: 0,
        y: 22,
        width: 170,
        height: 0,
        strokeColor: '#71717a',
        strokeWidth: 1,
        roughness: 0,
      },
      {
        id: 'f-win-d1',
        type: 'ellipse',
        x: 8,
        y: 7,
        width: 8,
        height: 8,
        strokeColor: '#ef4444',
        backgroundColor: '#ef4444',
        fillStyle: 'solid',
        strokeWidth: 1,
      },
      {
        id: 'f-win-d2',
        type: 'ellipse',
        x: 20,
        y: 7,
        width: 8,
        height: 8,
        strokeColor: '#f59e0b',
        backgroundColor: '#f59e0b',
        fillStyle: 'solid',
        strokeWidth: 1,
      },
      {
        id: 'f-win-d3',
        type: 'ellipse',
        x: 32,
        y: 7,
        width: 8,
        height: 8,
        strokeColor: '#10b981',
        backgroundColor: '#10b981',
        fillStyle: 'solid',
        strokeWidth: 1,
      }
    ]
  },
  {
    id: 'shape-sticky-yellow',
    name: 'Yellow Sticky Note',
    category: 'Shapes',
    elements: [
      {
        id: 'sh-stk-bg',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 130,
        height: 120,
        strokeColor: '#ca8a04',
        backgroundColor: '#fef08a',
        fillStyle: 'solid',
        strokeWidth: 1.5,
        roughness: 1,
      },
      {
        id: 'sh-stk-tx',
        type: 'text',
        x: 14,
        y: 16,
        width: 100,
        height: 36,
        text: 'Quick Note',
        fontSize: 15,
        strokeColor: '#713f12',
      }
    ]
  },
  {
    id: 'shape-decision-diamond',
    name: 'Decision Diamond',
    category: 'Shapes',
    elements: [
      {
        id: 'sh-dia-box',
        type: 'diamond',
        x: 0,
        y: 0,
        width: 130,
        height: 90,
        strokeColor: '#e5e7eb',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        fillStyle: 'solid',
        strokeWidth: 2,
        roughness: 1,
      },
      {
        id: 'sh-dia-txt',
        type: 'text',
        x: 35,
        y: 35,
        width: 60,
        height: 20,
        text: 'Decision ?',
        fontSize: 14,
        strokeColor: '#f3f4f6',
      }
    ]
  },
  {
    id: 'shape-db-cylinder',
    name: 'Database Cylinder',
    category: 'Shapes',
    elements: [
      {
        id: 'sh-db-b',
        type: 'rectangle',
        x: 0,
        y: 16,
        width: 120,
        height: 80,
        strokeColor: '#9ca3af',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        fillStyle: 'solid',
        strokeWidth: 1.5,
        roughness: 1,
        roundness: { type: 3 },
      },
      {
        id: 'sh-db-t',
        type: 'ellipse',
        x: 0,
        y: 0,
        width: 120,
        height: 32,
        strokeColor: '#9ca3af',
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        fillStyle: 'solid',
        strokeWidth: 1.5,
        roughness: 1,
      },
      {
        id: 'sh-db-txt',
        type: 'text',
        x: 25,
        y: 45,
        width: 70,
        height: 20,
        text: 'Database',
        fontSize: 13,
        strokeColor: '#e5e7eb',
      }
    ]
  },
  {
    id: 'shape-process-step',
    name: 'Process Step',
    category: 'Shapes',
    elements: [
      {
        id: 'sh-step-box',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 140,
        height: 70,
        strokeColor: '#9ca3af',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        fillStyle: 'solid',
        strokeWidth: 1.5,
        roughness: 1,
        roundness: { type: 3 },
      },
      {
        id: 'sh-step-txt',
        type: 'text',
        x: 20,
        y: 24,
        width: 100,
        height: 22,
        text: 'Process Step',
        fontSize: 14,
        strokeColor: '#f3f4f6',
      }
    ]
  },
  {
    id: 'shape-cloud-boundary',
    name: 'Cloud Boundary',
    category: 'Shapes',
    elements: [
      {
        id: 'sh-c-box',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 150,
        height: 80,
        strokeColor: '#9ca3af',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        fillStyle: 'solid',
        strokeWidth: 1.5,
        strokeStyle: 'dashed',
        roughness: 1,
        roundness: { type: 3 },
      }
    ]
  },
  {
    id: 'shape-ui-card',
    name: 'UI Wireframe Card',
    category: 'Shapes',
    elements: [
      {
        id: 'sh-card-bg',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 160,
        height: 110,
        strokeColor: '#9ca3af',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        fillStyle: 'solid',
        strokeWidth: 1.5,
        roughness: 0,
        roundness: { type: 3 },
      },
      {
        id: 'sh-card-header',
        type: 'rectangle',
        x: 14,
        y: 14,
        width: 70,
        height: 10,
        strokeColor: '#9ca3af',
        backgroundColor: '#9ca3af',
        fillStyle: 'solid',
        strokeWidth: 1,
        roughness: 0,
        roundness: { type: 3 },
      },
      {
        id: 'sh-card-line1',
        type: 'line',
        x: 14,
        y: 38,
        width: 132,
        height: 0,
        strokeColor: '#71717a',
        strokeWidth: 1,
        roughness: 0,
      },
      {
        id: 'sh-card-btn',
        type: 'rectangle',
        x: 14,
        y: 65,
        width: 50,
        height: 20,
        strokeColor: '#9ca3af',
        backgroundColor: '#9ca3af',
        fillStyle: 'solid',
        strokeWidth: 1,
        roughness: 0,
        roundness: { type: 3 },
      }
    ]
  },
];

export function LibrarySidebar({
  isOpen,
  onClose,
  doodleAPI,
  canvasAPI,
  theme = 'dark',
  initialTab = 'templates',
}) {
  doodleAPI = doodleAPI || canvasAPI || (typeof window !== 'undefined' ? window.__doodleAPI : null);
  // Synchronize active theme dynamically with both prop and HTML data-theme attribute
  const [activeTheme, setActiveTheme] = useState(() => {
    return theme || (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : 'dark') || 'dark';
  });

  useEffect(() => {
    if (theme) setActiveTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => {
      const attr = document.documentElement.getAttribute('data-theme');
      if (attr) setActiveTheme(attr);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const isDark = activeTheme === 'dark';

  // State: Tab Defaults to 'templates' (Smart Template Library)
  const [activeTab, setActiveTab] = useState(initialTab || 'templates'); // 'templates' | 'library' | 'search'
  const [templateSubTab, setTemplateSubTab] = useState('presets'); // 'presets' | 'my'
  const [isPinned, setIsPinned] = useState(false);
  const [canvasSearchQuery, setCanvasSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // User Custom Templates
  const [customTemplates, setCustomTemplates] = useState(() => {
    try {
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // Template Creator Form State
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Custom');
  const [formDesc, setFormDesc] = useState('');
  const [saveScope, setSaveScope] = useState('all'); // 'all' | 'selection'

  // User Custom Saved Shapes & Frames
  const [userItems, setUserItems] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  const [selectedCount, setSelectedCount] = useState(0);
  const [totalCanvasCount, setTotalCanvasCount] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);

  // Global listener to switch to templates tab when triggered elsewhere
  useEffect(() => {
    window.__doodleOpenLibraryTemplates = () => {
      setActiveTab('templates');
      setTemplateSubTab('presets');
    };
    return () => {
      delete window.__doodleOpenLibraryTemplates;
    };
  }, []);

  // Track canvas selection count
  useEffect(() => {
    if (!isOpen || !doodleAPI) return;
    const interval = setInterval(() => {
      try {
        const appState = doodleAPI.getAppState?.();
        const allElements = (doodleAPI.getSceneElements?.() || []).filter(el => !el.isDeleted);
        const selectedIds = appState?.selectedElementIds || {};
        const count = Object.values(selectedIds).filter(Boolean).length;
        setSelectedCount(count);
        setTotalCanvasCount(allElements.length);
      } catch (e) {}
    }, 200);
    return () => clearInterval(interval);
  }, [isOpen, doodleAPI]);

  // Persist user items
  const saveUserItems = useCallback((items) => {
    setUserItems(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {}
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Preset templates
  const presetTemplates = [
    {
      id: 'flowchart',
      title: 'Flowchart & Decision Tree',
      category: 'LOGIC & WORKFLOWS',
      desc: 'User authentication flowchart with decision diamond, branched conditions, and error loops.',
      icon: <GitFork size={17} />,
      action: () => handleInsertPresetTemplate(generateFlowchart, 'Flowchart & Decision Tree'),
    },
    {
      id: 'architecture',
      title: 'Cloud System Architecture',
      category: 'INFRASTRUCTURE',
      desc: 'Frontend client, API Gateway, Auth/Sync microservices with Redis cache and PostgreSQL database.',
      icon: <Cpu size={17} />,
      action: () => handleInsertPresetTemplate(generateArchitecture, 'Cloud System Architecture'),
    },
    {
      id: 'mindmap',
      title: 'Brainstorming Mind Map',
      category: 'IDEATION',
      desc: 'Central core initiative with 4 branch topics and curved connectors.',
      icon: <Network size={17} />,
      action: () => handleInsertPresetTemplate(generateMindMap, 'Brainstorming Mind Map'),
    },
    {
      id: 'kanban',
      title: 'Agile Kanban Board',
      category: 'MANAGEMENT',
      desc: 'Three swimlanes (To Do, In Progress, Completed) populated with status cards.',
      icon: <Kanban size={17} />,
      action: () => handleInsertPresetTemplate(generateKanban, 'Agile Kanban Board'),
    },
    {
      id: 'wireframe',
      title: 'Mobile App Wireframe',
      category: 'PRODUCT DESIGN',
      desc: 'Modern smartphone frame featuring status bar, hero card, action button, and tab bar.',
      icon: <Smartphone size={17} />,
      action: () => handleInsertPresetTemplate(generateWireframe, 'Mobile App Wireframe'),
    },
  ];

  // Insert built-in preset generator onto canvas
  const handleInsertPresetTemplate = (generator, title) => {
    if (!doodleAPI) return;
    const currentElements = doodleAPI.getSceneElements?.() || [];
    const appState = doodleAPI.getAppState?.();
    const zoom = appState?.zoom?.value || 1;
    const scrollX = appState?.scrollX || 0;
    const scrollY = appState?.scrollY || 0;
    const spawnX = (-scrollX + 120) / zoom;
    const spawnY = (-scrollY + 100) / zoom;

    const newElements = generator(spawnX, spawnY);
    doodleAPI.updateScene?.({
      elements: [...currentElements, ...newElements],
      commitToHistory: true,
      appState: { showWelcomeScreen: false },
    });

    setTimeout(() => {
      doodleAPI.scrollToContent?.(newElements, { fitToContent: true, animate: true });
    }, 50);

    showToast(`Added "${title}" to canvas`);
  };

  // Insert user custom template onto canvas
  const handleInsertCustomTemplate = (tpl) => {
    if (!doodleAPI || !tpl.elements || tpl.elements.length === 0) return;
    const currentElements = doodleAPI.getSceneElements?.() || [];
    const appState = doodleAPI.getAppState?.();
    const zoom = appState?.zoom?.value || 1;
    const scrollX = appState?.scrollX || 0;
    const scrollY = appState?.scrollY || 0;
    const spawnX = (-scrollX + 120) / zoom;
    const spawnY = (-scrollY + 100) / zoom;

    const idMap = new Map();
    const newElements = tpl.elements.map((el) => {
      const newId = 'doodle_' + Math.random().toString(36).substring(2, 9);
      idMap.set(el.id, newId);
      return {
        ...el,
        id: newId,
        x: el.x + spawnX,
        y: el.y + spawnY,
        version: 1,
        versionNonce: Date.now() + Math.random() * 1000,
      };
    });

    const finalElements = newElements.map((el) => {
      const updated = { ...el };
      if (updated.boundElements && Array.isArray(updated.boundElements)) {
        updated.boundElements = updated.boundElements.map((b) => ({
          ...b,
          id: idMap.get(b.id) || b.id,
        }));
      }
      if (updated.containerId && idMap.has(updated.containerId)) {
        updated.containerId = idMap.get(updated.containerId);
      }
      return updated;
    });

    doodleAPI.updateScene?.({
      elements: [...currentElements, ...finalElements],
      commitToHistory: true,
      appState: { showWelcomeScreen: false },
    });

    setTimeout(() => {
      doodleAPI.scrollToContent?.(finalElements, { fitToContent: true, animate: true });
    }, 50);

    showToast(`Added "${tpl.title}" to canvas`);
  };

  // Open creation panel for new template
  const handleStartCreateTemplate = () => {
    if (!doodleAPI) return;
    const elements = (doodleAPI.getSceneElements?.() || []).filter(el => !el.isDeleted);
    const appState = doodleAPI.getAppState?.() || {};
    const selectedIds = Object.keys(appState.selectedElementIds || {}).filter(
      id => appState.selectedElementIds[id]
    );
    const selected = elements.filter(el => selectedIds.includes(el.id));

    setFormTitle(`Template ${customTemplates.length + 1}`);
    setFormCategory('Custom');
    setFormDesc('');
    setSaveScope(selected.length > 0 ? 'selection' : 'all');
    setIsCreatingTemplate(true);
  };

  // Save new custom template to storage
  const handleSaveCustomTemplate = (e) => {
    e.preventDefault();
    if (!doodleAPI) return;

    const allElements = (doodleAPI.getSceneElements?.() || []).filter(el => !el.isDeleted);
    const appState = doodleAPI.getAppState?.() || {};
    const selectedIds = Object.keys(appState.selectedElementIds || {}).filter(
      id => appState.selectedElementIds[id]
    );

    let targetElements = [];
    if (saveScope === 'selection' && selectedIds.length > 0) {
      targetElements = allElements.filter(el => selectedIds.includes(el.id));
    } else {
      targetElements = allElements;
    }

    if (targetElements.length === 0) {
      showToast('Cannot save empty template. Draw shapes on canvas first!');
      return;
    }

    const minX = Math.min(...targetElements.map(e => e.x));
    const minY = Math.min(...targetElements.map(e => e.y));

    const normalizedElements = targetElements.map(el => ({
      ...JSON.parse(JSON.stringify(el)),
      x: el.x - minX,
      y: el.y - minY,
    }));

    const newTemplate = {
      id: 'tpl_' + Date.now(),
      title: formTitle.trim() || `Template ${customTemplates.length + 1}`,
      category: formCategory.trim() || 'Custom',
      desc: formDesc.trim() || `${targetElements.length} elements saved`,
      elements: normalizedElements,
      createdAt: Date.now(),
      elementCount: targetElements.length,
    };

    const updated = [newTemplate, ...customTemplates];
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
      setCustomTemplates(updated);
      setIsCreatingTemplate(false);
      setTemplateSubTab('my');
      showToast(`Saved template "${newTemplate.title}"!`);
    } catch (err) {
      console.error('Failed to save template:', err);
      showToast('Failed to save template to local storage.');
    }
  };

  // Delete a custom template
  const handleDeleteCustomTemplate = (e, id) => {
    e.stopPropagation();
    const updated = customTemplates.filter(t => t.id !== id);
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
      setCustomTemplates(updated);
      showToast('Template deleted');
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  // Close 3-dots menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [showMenu]);

  // Keyboard shortcut (Escape to close unless pinned)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isPinned) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isPinned]);

  // Add currently selected shapes or frame to personal library
  const handleAddSelectedToLibrary = () => {
    setShowMenu(false);
    if (!doodleAPI) return;
    const appState = doodleAPI.getAppState?.();
    const allElements = doodleAPI.getSceneElements?.() || [];
    const selectedIds = appState?.selectedElementIds || {};

    const selected = allElements.filter(el => selectedIds[el.id] && !el.isDeleted);
    if (!selected.length) {
      showToast('Select shape(s) or a frame on canvas first!');
      return;
    }

    let minX = Infinity, minY = Infinity;
    selected.forEach(el => {
      if (el.x < minX) minX = el.x;
      if (el.y < minY) minY = el.y;
    });

    const normalized = selected.map(el => ({
      ...el,
      x: el.x - minX,
      y: el.y - minY,
    }));

    const isFrame = selected.length === 1 && selected[0].type === 'frame';
    const newItem = {
      id: `user-shape-${Date.now()}`,
      name: isFrame ? `Custom Frame (${userItems.length + 1})` : `My Shape (${userItems.length + 1})`,
      category: isFrame ? 'Frames' : 'My Shapes',
      elements: normalized,
      createdAt: Date.now()
    };

    saveUserItems([newItem, ...userItems]);
    showToast(`Saved ${selected.length} element(s) to personal library!`);
  };

  // Delete item from personal library
  const handleDeleteUserItem = (e, id) => {
    e.stopPropagation();
    const next = userItems.filter(item => item.id !== id);
    saveUserItems(next);
    showToast('Removed from library');
  };

  // Insert item onto canvas at center
  const handleInsertItem = (item) => {
    if (!doodleAPI) return;
    const appState = doodleAPI.getAppState?.();
    const currentElements = doodleAPI.getSceneElements?.() || [];

    const zoom = appState?.zoom?.value || 1;
    const scrollX = appState?.scrollX || 0;
    const scrollY = appState?.scrollY || 0;

    const targetCenterX = (-scrollX + window.innerWidth / 2) / zoom;
    const targetCenterY = (-scrollY + window.innerHeight / 2) / zoom;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    item.elements.forEach(el => {
      if (el.x < minX) minX = el.x;
      if (el.y < minY) minY = el.y;
      if ((el.x + (el.width || 0)) > maxX) maxX = el.x + (el.width || 0);
      if ((el.y + (el.height || 0)) > maxY) maxY = el.y + (el.height || 0);
    });
    const width = maxX - minX || 100;
    const height = maxY - minY || 80;

    const offsetX = targetCenterX - width / 2;
    const offsetY = targetCenterY - height / 2;

    const newSelectedIds = {};
    const nonce = Math.random().toString(36).substring(2, 9);

    const insertedElements = item.elements.map((el, i) => {
      const newId = `lib_${nonce}_${i}`;
      newSelectedIds[newId] = true;

      let stroke = el.strokeColor;
      if (!isDark && (stroke === '#ffffff' || stroke === '#fff')) {
        stroke = '#1e1e1e';
      } else if (isDark && (stroke === '#1e1e1e' || stroke === '#000000' || stroke === '#000')) {
        stroke = '#ffffff';
      }

      return {
        ...el,
        id: newId,
        x: el.x + offsetX,
        y: el.y + offsetY,
        strokeColor: stroke,
        version: 1,
        versionNonce: Date.now() + i,
      };
    });

    doodleAPI.updateScene?.({
      elements: [...currentElements, ...insertedElements],
      appState: {
        selectedElementIds: newSelectedIds,
        activeTool: { type: 'selection' },
        showWelcomeScreen: false,
      },
      commitToHistory: true,
    });

    showToast(`Added "${item.name}"`);
  };

  // Combine user items and built-in shapes/frames
  const allShapes = useMemo(() => {
    return [...userItems, ...BUILTIN_SHAPES_AND_FRAMES];
  }, [userItems]);

  // Canvas text search matches
  const canvasSearchMatches = useMemo(() => {
    if (!doodleAPI || !canvasSearchQuery.trim()) return [];
    const elements = doodleAPI.getSceneElements?.() || [];
    const q = canvasSearchQuery.toLowerCase();
    return elements.filter(el =>
      el.type === 'text' && !el.isDeleted && (el.text || '').toLowerCase().includes(q)
    );
  }, [doodleAPI, canvasSearchQuery]);

  const handleFocusCanvasElement = (el) => {
    if (!doodleAPI) return;
    doodleAPI.updateScene?.({
      appState: {
        selectedElementIds: { [el.id]: true },
        scrollX: window.innerWidth / 2 - el.x - (el.width || 0) / 2,
        scrollY: window.innerHeight / 2 - el.y - (el.height || 0) / 2,
      }
    });
  };

  if (!isOpen) return null;

  // Pure Black & Neutral Dark Palette (Zero Blue Tint, matching Settings Sidebar)
  const themeStyles = isDark ? {
    sidebarBg: '#141417',
    headerBorder: 'rgba(255, 255, 255, 0.08)',
    titleColor: '#f4f4f5',
    sectionTitleColor: '#9ca3af',
    textColor: '#f4f4f5',
    subtextColor: '#9ca3af',
    cardBg: '#1c1c1f',
    cardBorder: 'rgba(255, 255, 255, 0.07)',
    cardHoverBorder: 'rgba(255, 255, 255, 0.22)',
    cardHoverBg: '#242428',
    pillActiveBg: '#27272a',
    pillActiveColor: '#ffffff',
    inactiveIconColor: '#71717a',
    menuBg: '#1c1c1f',
    menuBorder: 'rgba(255, 255, 255, 0.1)',
    btnPrimaryBg: '#27272a',
    btnPrimaryBorder: 'rgba(255, 255, 255, 0.14)',
    btnPrimaryHover: '#333338',
    btnPrimaryColor: '#ffffff',
    inputBg: '#18181b',
    inputBorder: 'rgba(255, 255, 255, 0.1)',
    scrollbarThumb: '#333338',
  } : {
    sidebarBg: '#ffffff',
    headerBorder: '#e4e4e7',
    titleColor: '#18181b',
    sectionTitleColor: '#71717a',
    textColor: '#18181b',
    subtextColor: '#71717a',
    cardBg: '#f4f4f5',
    cardBorder: '#e4e4e7',
    cardHoverBorder: '#a1a1aa',
    cardHoverBg: '#ebebef',
    pillActiveBg: '#e4e4e7',
    pillActiveColor: '#18181b',
    inactiveIconColor: '#a1a1aa',
    menuBg: '#ffffff',
    menuBorder: '#e4e4e7',
    btnPrimaryBg: '#f4f4f5',
    btnPrimaryBorder: '#d4d4d8',
    btnPrimaryHover: '#e4e4e7',
    btnPrimaryColor: '#18181b',
    inputBg: '#f4f4f5',
    inputBorder: '#d4d4d8',
    scrollbarThumb: '#d4d4d8',
  };

  return (
    <>
      {/* Backdrop for unpinned view - starts at 38px below topbar so Live / Export remain fully clickable */}
      {!isPinned && (
        <div
          className="settings-sidebar-overlay library-sidebar-overlay"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            top: '38px',
            zIndex: 999,
            background: 'rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Library Sidebar Panel - docked below studio topbar matching settings sidebar */}
      <aside
        className="settings-sidebar-panel library-sidebar-panel"
        style={{
          position: 'fixed',
          top: '38px',
          right: 0,
          bottom: 0,
          width: '360px',
          maxWidth: '90vw',
          zIndex: 1000,
          background: themeStyles.sidebarBg,
          borderLeft: `1px solid ${themeStyles.headerBorder}`,
          boxShadow: isDark
            ? '-8px 0 32px rgba(0, 0, 0, 0.6)'
            : '-8px 0 24px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          userSelect: 'none',
          animation: 'slideInFromRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          boxSizing: 'border-box',
          transition: 'background 0.2s ease, border-color 0.2s ease',
        }}
      >
        {/* TOP BAR: Search & BookOpen Pills + Pin & Close (Neutral Black/Gray) */}
        <div
          style={{
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${themeStyles.headerBorder}`,
            minHeight: '48px',
          }}
        >
          {/* Left Segment: Templates, Shapes, Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              title="Smart Templates"
              style={{
                background: activeTab === 'templates' ? themeStyles.pillActiveBg : 'transparent',
                color: activeTab === 'templates' ? themeStyles.pillActiveColor : themeStyles.inactiveIconColor,
                border: 'none',
                borderRadius: '8px',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                fontWeight: activeTab === 'templates' ? 600 : 500,
                transition: 'all 0.15s ease',
              }}
            >
              <Layers size={15} strokeWidth={activeTab === 'templates' ? 2.4 : 1.8} />
              <span>Templates</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('library')}
              title="Shapes & Frames"
              style={{
                background: activeTab === 'library' ? themeStyles.pillActiveBg : 'transparent',
                color: activeTab === 'library' ? themeStyles.pillActiveColor : themeStyles.inactiveIconColor,
                border: 'none',
                borderRadius: '8px',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                fontWeight: activeTab === 'library' ? 600 : 500,
                transition: 'all 0.15s ease',
              }}
            >
              <BookOpen size={15} strokeWidth={activeTab === 'library' ? 2.4 : 1.8} />
              <span>Shapes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('search')}
              title="Search canvas text"
              style={{
                background: activeTab === 'search' ? themeStyles.pillActiveBg : 'transparent',
                color: activeTab === 'search' ? themeStyles.pillActiveColor : themeStyles.inactiveIconColor,
                border: 'none',
                borderRadius: '8px',
                padding: '6px 9px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <Search size={15} strokeWidth={activeTab === 'search' ? 2.4 : 1.8} />
            </button>
          </div>

          {/* Right Segment: Pin & Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setIsPinned(prev => !prev)}
              title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
              style={{
                background: isPinned ? themeStyles.pillActiveBg : 'transparent',
                color: isPinned ? themeStyles.pillActiveColor : themeStyles.inactiveIconColor,
                border: 'none',
                padding: '6px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <Pin size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close sidebar"
              style={{
                background: 'transparent',
                color: themeStyles.inactiveIconColor,
                border: 'none',
                padding: '6px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.color = themeStyles.textColor}
              onMouseLeave={e => e.currentTarget.style.color = themeStyles.inactiveIconColor}
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Temporary Toast Alert */}
        {toastMessage && (
          <div
            style={{
              padding: '7px 12px',
              background: '#262626',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              animation: 'fadeIn 0.15s ease',
            }}
          >
            <Sparkles size={13} />
            {toastMessage}
          </div>
        )}

        {/* TAB 0: Smart Template Library */}
        {activeTab === 'templates' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Subbar: Presets / My Templates Tabs + Save Template Button */}
            <div
              style={{
                padding: '12px 14px 10px 14px',
                borderBottom: `1px solid ${themeStyles.headerBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              {/* Segmented Filter */}
              <div
                style={{
                  display: 'flex',
                  background: themeStyles.cardBg,
                  padding: '2px',
                  borderRadius: '7px',
                  border: `1px solid ${themeStyles.cardBorder}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => { setTemplateSubTab('presets'); setIsCreatingTemplate(false); }}
                  style={{
                    background: templateSubTab === 'presets' ? themeStyles.pillActiveBg : 'transparent',
                    color: templateSubTab === 'presets' ? themeStyles.pillActiveColor : themeStyles.subtextColor,
                    border: 'none',
                    borderRadius: '5px',
                    padding: '4px 9px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Built-in ({presetTemplates.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setTemplateSubTab('my'); setIsCreatingTemplate(false); }}
                  style={{
                    background: templateSubTab === 'my' ? themeStyles.pillActiveBg : 'transparent',
                    color: templateSubTab === 'my' ? themeStyles.pillActiveColor : themeStyles.subtextColor,
                    border: 'none',
                    borderRadius: '5px',
                    padding: '4px 9px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  My Templates ({customTemplates.length})
                </button>
              </div>

              {/* + Save as Template Trigger */}
              <button
                type="button"
                onClick={() => {
                  if (isCreatingTemplate) setIsCreatingTemplate(false);
                  else handleStartCreateTemplate();
                }}
                title="Save current canvas or selected shapes as a reusable template"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 9px',
                  borderRadius: '6px',
                  border: `1px solid ${themeStyles.btnPrimaryBorder}`,
                  background: isCreatingTemplate ? themeStyles.pillActiveBg : themeStyles.btnPrimaryBg,
                  color: themeStyles.btnPrimaryColor,
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = themeStyles.btnPrimaryHover}
                onMouseLeave={e => e.currentTarget.style.background = isCreatingTemplate ? themeStyles.pillActiveBg : themeStyles.btnPrimaryBg}
              >
                <FolderPlus size={13} />
                <span>+ Save Template</span>
              </button>
            </div>

            {/* Inline Creator Form (if opened) */}
            {isCreatingTemplate && (
              <form
                onSubmit={handleSaveCustomTemplate}
                style={{
                  padding: '12px 14px',
                  background: isDark ? '#18181c' : '#f8fafc',
                  borderBottom: `1px solid ${themeStyles.headerBorder}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: themeStyles.textColor }}>
                    Save Canvas as Template
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingTemplate(false)}
                    style={{ background: 'none', border: 'none', color: themeStyles.inactiveIconColor, cursor: 'pointer', padding: 0 }}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div>
                  <label style={{ fontSize: '10.5px', fontWeight: 600, color: themeStyles.subtextColor, display: 'block', marginBottom: '3px' }}>
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="e.g. User Flow Diagram"
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: themeStyles.inputBg,
                      border: `1px solid ${themeStyles.inputBorder}`,
                      borderRadius: '6px',
                      padding: '6px 8px',
                      color: themeStyles.textColor,
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '10.5px', fontWeight: 600, color: themeStyles.subtextColor, display: 'block', marginBottom: '3px' }}>
                    Category
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
                    {['Logic', 'Infrastructure', 'Ideation', 'Management', 'Wireframe', 'Custom'].map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormCategory(cat)}
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 7px',
                          borderRadius: '4px',
                          border: `1px solid ${formCategory === cat ? themeStyles.cardHoverBorder : themeStyles.cardBorder}`,
                          background: formCategory === cat ? themeStyles.pillActiveBg : 'transparent',
                          color: formCategory === cat ? themeStyles.pillActiveColor : themeStyles.subtextColor,
                          cursor: 'pointer',
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '10.5px', fontWeight: 600, color: themeStyles.subtextColor, display: 'block', marginBottom: '3px' }}>
                    Scope
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <label style={{ fontSize: '11px', color: themeStyles.textColor, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="saveScope"
                        value="all"
                        checked={saveScope === 'all'}
                        onChange={() => setSaveScope('all')}
                      />
                      Entire Canvas ({totalCanvasCount})
                    </label>
                    <label style={{ fontSize: '11px', color: themeStyles.textColor, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="saveScope"
                        value="selection"
                        checked={saveScope === 'selection'}
                        onChange={() => setSaveScope('selection')}
                      />
                      Selection only ({selectedCount})
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      background: '#4f46e5',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Save Template
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingTemplate(false)}
                    style={{
                      background: themeStyles.cardBg,
                      color: themeStyles.subtextColor,
                      border: `1px solid ${themeStyles.cardBorder}`,
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '11.5px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Scrollable Template Cards Container */}
            <div
              className="library-items-container"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '10px 14px 24px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {templateSubTab === 'presets' && presetTemplates.map((preset) => (
                <div
                  key={preset.id}
                  style={{
                    background: themeStyles.cardBg,
                    border: `1px solid ${themeStyles.cardBorder}`,
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = themeStyles.cardHoverBorder;
                    e.currentTarget.style.background = themeStyles.cardHoverBg;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = themeStyles.cardBorder;
                    e.currentTarget.style.background = themeStyles.cardBg;
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '7px',
                          background: isDark ? 'rgba(99, 102, 241, 0.16)' : 'rgba(99, 102, 241, 0.1)',
                          color: isDark ? '#a5b4fc' : '#4f46e5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {preset.icon}
                      </div>
                      <div>
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            color: isDark ? '#9ca3af' : '#6b7280',
                            display: 'block',
                          }}
                        >
                          {preset.category}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: themeStyles.textColor, lineHeight: 1.3 }}>
                          {preset.title}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={preset.action}
                      style={{
                        background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e5e7eb',
                        color: themeStyles.textColor,
                        border: 'none',
                        borderRadius: '6px',
                        padding: '5px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(99, 102, 241, 0.35)' : '#d1d5db'}
                      onMouseLeave={e => e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.08)' : '#e5e7eb'}
                    >
                      <Plus size={12} strokeWidth={2.4} />
                      Insert
                    </button>
                  </div>

                  <p style={{ margin: 0, fontSize: '11.5px', color: themeStyles.subtextColor, lineHeight: 1.45 }}>
                    {preset.desc}
                  </p>
                </div>
              ))}

              {templateSubTab === 'my' && (
                <>
                  {customTemplates.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '40px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          background: themeStyles.cardBg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: themeStyles.inactiveIconColor,
                        }}
                      >
                        <Layers size={22} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: themeStyles.textColor }}>
                        No custom templates yet
                      </span>
                      <p style={{ margin: 0, fontSize: '11.5px', color: themeStyles.subtextColor, maxWidth: '240px', lineHeight: 1.4 }}>
                        Draw shapes or diagrams on your canvas, then click "+ Save Template" to reuse them anytime.
                      </p>
                      <button
                        type="button"
                        onClick={handleStartCreateTemplate}
                        style={{
                          marginTop: '6px',
                          background: themeStyles.btnPrimaryBg,
                          border: `1px solid ${themeStyles.btnPrimaryBorder}`,
                          borderRadius: '7px',
                          color: themeStyles.btnPrimaryColor,
                          padding: '7px 12px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <FolderPlus size={13} />
                        + Save Current Canvas
                      </button>
                    </div>
                  ) : (
                    customTemplates.map(tpl => (
                      <div
                        key={tpl.id}
                        style={{
                          background: themeStyles.cardBg,
                          border: `1px solid ${themeStyles.cardBorder}`,
                          borderRadius: '10px',
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          position: 'relative',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = themeStyles.cardHoverBorder;
                          e.currentTarget.style.background = themeStyles.cardHoverBg;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = themeStyles.cardBorder;
                          e.currentTarget.style.background = themeStyles.cardBg;
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                          <div>
                            <span
                              style={{
                                fontSize: '9.5px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                color: isDark ? '#9ca3af' : '#6b7280',
                                display: 'block',
                              }}
                            >
                              {tpl.category || 'CUSTOM'} • {tpl.elements?.length || 0} shapes
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: themeStyles.textColor }}>
                              {tpl.title}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => handleInsertCustomTemplate(tpl)}
                              style={{
                                background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e5e7eb',
                                color: themeStyles.textColor,
                                border: 'none',
                                borderRadius: '6px',
                                padding: '5px 9px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Plus size={12} strokeWidth={2.4} />
                              Insert
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCustomTemplate(e, tpl.id)}
                              title="Delete template"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '5px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0.7,
                              }}
                              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                              onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {tpl.desc && (
                          <p style={{ margin: 0, fontSize: '11.5px', color: themeStyles.subtextColor, lineHeight: 1.4 }}>
                            {tpl.desc}
                          </p>
                        )}

                        {tpl.elements && tpl.elements.length > 0 && (
                          <div
                            style={{
                              marginTop: '4px',
                              padding: '6px 0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.03)',
                              borderRadius: '6px',
                            }}
                          >
                            <ShapePreview elements={tpl.elements} />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: Search Canvas Text */}
        {activeTab === 'search' && (
          <div style={{ padding: '16px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                background: themeStyles.inputBg,
                border: `1px solid ${themeStyles.inputBorder}`,
                borderRadius: '8px',
                padding: '9px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Search size={16} color={themeStyles.inactiveIconColor} />
              <input
                type="text"
                placeholder="Find text on canvas..."
                value={canvasSearchQuery}
                onChange={e => setCanvasSearchQuery(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: themeStyles.textColor,
                  fontSize: '13.5px',
                }}
              />
              {canvasSearchQuery && (
                <button
                  type="button"
                  onClick={() => setCanvasSearchQuery('')}
                  style={{ background: 'none', border: 'none', color: themeStyles.inactiveIconColor, cursor: 'pointer', padding: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginTop: '14px' }}>
              {canvasSearchQuery && canvasSearchMatches.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: themeStyles.subtextColor, fontSize: '13px' }}>
                  No matching text found
                </div>
              )}
              {canvasSearchMatches.map(el => (
                <div
                  key={el.id}
                  onClick={() => handleFocusCanvasElement(el)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: themeStyles.cardBg,
                    marginBottom: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: themeStyles.textColor,
                    border: `1px solid ${themeStyles.cardBorder}`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = themeStyles.cardHoverBorder}
                  onMouseLeave={e => e.currentTarget.style.borderColor = themeStyles.cardBorder}
                >
                  {el.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: Library (Visual Shapes & Frames Grid + Personal Saving) */}
        {activeTab === 'library' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Action Bar: "+ Add selected to library" and 3-Dots Menu */}
            <div
              style={{
                padding: '12px 14px 8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {/* Primary Action Button: Add selected elements/frame to personal library */}
              <button
                type="button"
                onClick={handleAddSelectedToLibrary}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${selectedCount > 0 ? themeStyles.btnPrimaryBorder : themeStyles.headerBorder}`,
                  background: selectedCount > 0 ? themeStyles.btnPrimaryBg : 'transparent',
                  color: selectedCount > 0 ? themeStyles.btnPrimaryColor : themeStyles.subtextColor,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = themeStyles.btnPrimaryHover;
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = selectedCount > 0 ? themeStyles.btnPrimaryBg : 'transparent';
                  e.currentTarget.style.color = selectedCount > 0 ? themeStyles.btnPrimaryColor : themeStyles.subtextColor;
                }}
              >
                <Plus size={14} strokeWidth={2.4} />
                {selectedCount > 0 ? `Add ${selectedCount} selected to library` : 'Add selected to library'}
              </button>

              {/* 3-Dots Menu */}
              <div style={{ position: 'relative' }} ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setShowMenu(prev => !prev)}
                  title="Library actions"
                  style={{
                    background: themeStyles.cardBg,
                    border: `1px solid ${themeStyles.cardBorder}`,
                    borderRadius: '8px',
                    padding: '7px 8px',
                    color: themeStyles.textColor,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MoreVertical size={15} />
                </button>

                {showMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '34px',
                      background: themeStyles.menuBg,
                      border: `1px solid ${themeStyles.menuBorder}`,
                      borderRadius: '8px',
                      boxShadow: isDark ? '0 10px 25px rgba(0, 0, 0, 0.7)' : '0 10px 25px rgba(0, 0, 0, 0.12)',
                      width: '190px',
                      zIndex: 100,
                      padding: '4px 0',
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleAddSelectedToLibrary}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 12px',
                        background: 'transparent',
                        border: 'none',
                        color: themeStyles.textColor,
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Plus size={14} /> Add selected shapes/frame
                    </button>
                    {userItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          saveUserItems([]);
                          setShowMenu(false);
                          showToast('Cleared personal shapes');
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 12px',
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Trash2 size={14} /> Clear personal shapes
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Visual Shapes & Frames 2-Column Grid */}
            <div
              className="library-items-container"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '6px 14px 20px 14px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px',
                alignContent: 'start',
              }}
            >
              {allShapes.map((item) => {
                const isUserItem = item.id.startsWith('user-shape-');
                return (
                  <div
                    key={item.id}
                    onClick={() => handleInsertItem(item)}
                    style={{
                      background: themeStyles.cardBg,
                      border: `1px solid ${themeStyles.cardBorder}`,
                      borderRadius: '10px',
                      padding: '10px 8px 8px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                      minHeight: '100px',
                      boxSizing: 'border-box',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = themeStyles.cardHoverBorder;
                      e.currentTarget.style.background = themeStyles.cardHoverBg;
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = isDark ? '0 6px 16px rgba(0, 0, 0, 0.5)' : '0 4px 12px rgba(0, 0, 0, 0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = themeStyles.cardBorder;
                      e.currentTarget.style.background = themeStyles.cardBg;
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Visual Shape / Frame SVG Preview */}
                    <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px' }}>
                      <ShapePreview elements={item.elements} />
                    </div>

                    {/* Shape / Frame Label */}
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: themeStyles.textColor,
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                      }}
                    >
                      {item.name}
                    </span>

                    {/* Trash icon for user's personal saved items */}
                    {isUserItem && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteUserItem(e, item.id)}
                        title="Remove from personal library"
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '3px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0.65,
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.65'}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      <style>{`
        .library-items-container::-webkit-scrollbar {
          width: 5px;
        }
        .library-items-container::-webkit-scrollbar-thumb {
          background: ${themeStyles.scrollbarThumb};
          border-radius: 4px;
        }
        .library-items-container::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </>
  );
}

export default LibrarySidebar;
