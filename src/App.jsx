import React, { lazy, Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from './hooks/useTheme';
import { useFileActions } from './hooks/useFileActions';
import { useAutoSave } from './hooks/useAutoSave';
import { DoodleDeskLogo } from './components/DoodleDeskLogo';
import { StudioTopBar } from './components/StudioTopBar';
import { MiniMapNavigator } from './components/MiniMapNavigator';
import { LiveCollabChatPanel } from './components/LiveCollabChatPanel';
import { BucketFillOverlay } from './components/BucketFillOverlay';
import { LassoSelectionOverlay } from './components/LassoSelectionOverlay';
import { PrecisionRulerOverlay } from './components/PrecisionRulerOverlay';
import { WebFrameCard, extractElementIdFromLink } from './components/WebFrameCard';
import { recognizeShape } from './utils/shapeRecognizer';
import { useWorkspaces } from './hooks/useWorkspaces';
import { useLiveCollaboration } from './hooks/useLiveCollaboration';

const PreferencesModal = lazy(() => import('./preferences/PreferencesModal').then((module) => ({ default: module.PreferencesModal })));
const UnsavedChangesModal = lazy(() => import('./components/UnsavedChangesModal').then((module) => ({ default: module.UnsavedChangesModal })));
const RecoveryPrompt = lazy(() => import('./components/RecoveryPrompt').then((module) => ({ default: module.RecoveryPrompt })));
const CommandPalette = lazy(() => import('./components/CommandPalette').then((module) => ({ default: module.CommandPalette })));
const TemplateLibraryModal = lazy(() => import('./components/TemplateLibraryModal').then((module) => ({ default: module.TemplateLibraryModal })));
const PresentationMode = lazy(() => import('./components/PresentationMode').then((module) => ({ default: module.PresentationMode })));
const StickyNotesModal = lazy(() => import('./components/StickyNotesModal').then((module) => ({ default: module.StickyNotesModal })));
const ColorPaletteStudioModal = lazy(() => import('./components/ColorPaletteStudioModal').then((module) => ({ default: module.ColorPaletteStudioModal })));
const WorkspaceModal = lazy(() => import('./components/WorkspaceModal'));
const LiveCollabModal = lazy(() => import('./components/LiveCollabModal'));
const HelpModal = lazy(() => import('./components/HelpModal').then((module) => ({ default: module.HelpModal })));
const MermaidToDoodleModal = lazy(() => import('./components/MermaidToDoodleModal').then((module) => ({ default: module.MermaidToDoodleModal })));
import { ThemedConfirmDialog } from './components/ThemedConfirmDialog';
import DoodleCanvas, { FONT_FAMILY } from './engine/DoodleCanvas.jsx';
import { exportToCanvas } from './engine/exports.js';
import { WelcomeScreen } from './engine/WelcomeScreen.jsx';
import { CanvasExtraToolsDropdown } from './components/CanvasExtraToolsDropdown';
import { CanvasTopRightSettings } from './components/CanvasTopRightSettings';
import { CustomLaserPointer } from './components/CustomLaserPointer';
import { LibrarySidebar } from './components/LibrarySidebar';

export default function App() {
  const doodleCanvasRef = useRef(null);
  const [doodleAPI, setDoodleAPI] = useState(null);
  // Native engine API references with full backward-compatibility aliases
  const canvasAPI = doodleAPI;
  

  const doodleAPICallback = useCallback((ref) => {
    if (!ref) return;
    doodleCanvasRef.current = ref;
    window.__doodleAPI = ref;
    setDoodleAPI((prev) => prev || ref);
  }, []);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isTemplateLibraryOpen, setIsTemplateLibraryOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isPresentationActive, setIsPresentationActive] = useState(false);
  const [isMiniMapOpen, setIsMiniMapOpen] = useState(false);
  const [isLiveChatOpen, setIsLiveChatOpen] = useState(false);
  const [isMermaidModalOpen, setIsMermaidModalOpen] = useState(false);
  const [canvasStyle, setCanvasStyle] = useState('standard');
  const [globalDialog, setGlobalDialog] = useState(null);

  // Global interceptor for alert() to use app-themed dialog
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (message) => {
      setGlobalDialog({
        title: 'Doodle Desk',
        subtitle: 'Notice',
        message: String(message),
        isAlert: true,
        confirmText: 'OK',
      });
    };
    return () => {
      window.alert = originalAlert;
    };
  }, []);

  // Great powerhouse features
  const [isStickyNotesOpen, setIsStickyNotesOpen] = useState(false);
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [isColorPaletteOpen, setIsColorPaletteOpen] = useState(false);

  // Creative drawing tools
  const [isDrawToShapeActive, setIsDrawToShapeActive] = useState(false);
  const [isBucketActive, setIsBucketActive] = useState(false);
  const [isLassoActive, setIsLassoActive] = useState(false);
  const [isLaserActive, setIsLaserActive] = useState(false);
  const [customTitle, setCustomTitle] = useState(null);
  const printCanvasRef = useRef(null);

  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const dragCounterRef = useRef(0);
  const { themeSetting, effectiveTheme, changeTheme } = useTheme();

  // Workspace management & Multi-board system
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    activeFile,
    activeFileId,
    switchWorkspace,
    createWorkspace,
    updateWorkspaceMetadata,
    duplicateWorkspace,
    deleteWorkspace,
    exportWorkspace,
    importWorkspace,
    saveActiveWorkspaceSnapshot,
    createFile,
    switchFile,
    renameFile,
    duplicateFile,
    deleteFile,
  } = useWorkspaces({ doodleAPI });

  // Live Collaboration & Real-time WebRTC Mesh
  const [isLiveCollabModalOpen, setIsLiveCollabModalOpen] = useState(false);
  const {
    status: collabStatus,
    connectionError: collabConnectionError,
    roomId: collabRoomId,
    myProfile: collabProfile,
    setMyProfile: setCollabProfile,
    collaborators,
    chatMessages: collabChatMessages,
    startHosting: startCollabHosting,
    joinSession: joinCollabSession,
    leaveSession: leaveCollabSession,
    broadcastPointer,
    broadcastScene,
    sendChatMessage: sendCollabChatMessage,
  } = useLiveCollaboration({ doodleAPI });

  // Auto-join room from URL query if present
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam && collabStatus === 'disconnected') {
        joinCollabSession(roomParam);
      }
    } catch {}
  }, [joinCollabSession, collabStatus]);

  useEffect(() => {
    if (collabStatus === 'disconnected') {
      setIsLiveChatOpen(false);
      if (doodleAPI && doodleAPI.getAppState?.()?.activeTool?.type === 'laser') {
        doodleAPI.setActiveTool({ type: 'selection' });
        setIsLaserActive(false);
        window.__doodleIsLaserActive = false;
      }
    } else if (doodleAPI) {
      // When live collaboration starts, automatically switch to laser pointer
      const activateLaser = () => {
        doodleAPI.setActiveTool({ type: 'laser' });
        setIsLaserActive(true);
        window.__doodleIsLaserActive = true;
      };

      activateLaser();
      const t1 = setTimeout(activateLaser, 50);
      const t2 = setTimeout(activateLaser, 200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [collabStatus, doodleAPI]);

  // Allow clicking active collaboration Laser Pointer button to toggle back to selection
  useEffect(() => {
    if (!doodleAPI) return;

    const handleLaserToggleClick = (e) => {
      const laserBtn = e.target.closest('.ToolIcon__LaserPointer, [data-testid="toolbar-LaserPointer"]');
      if (!laserBtn) return;

      const appState = doodleAPI.getAppState?.();
      if (appState?.activeTool?.type === 'laser') {
        e.preventDefault();
        doodleAPI.setActiveTool({ type: 'selection' });
        setIsLaserActive(false);
        window.__doodleIsLaserActive = false;
      }
    };

    document.addEventListener('pointerdown', handleLaserToggleClick);
    return () => {
      document.removeEventListener('pointerdown', handleLaserToggleClick);
    };
  }, [doodleAPI]);

  // Pointer broadcast callback
  const handlePointerUpdate = useCallback(
    (payload) => {
      if (collabStatus !== 'disconnected' && payload?.pointer) {
        broadcastPointer(
          payload.pointer.x,
          payload.pointer.y,
          payload.button || 'up',
          payload.selectedElementIds || {}
        );
      }
    },
    [collabStatus, broadcastPointer]
  );

  // Follow collaborator viewpoint
  const handleFollowCollaborator = useCallback(
    (collab) => {
      if (!doodleAPI || !collab?.pointer) return;
      try {
        doodleAPI.scrollToContent(
          [
            {
              x: collab.pointer.x - 250,
              y: collab.pointer.y - 250,
              width: 500,
              height: 500,
            },
          ],
          { animate: true, duration: 400 }
        );
      } catch (e) {
        console.warn('Could not follow collaborator:', e);
      }
    },
    [doodleAPI]
  );

  const handleToggleDrawToShape = useCallback(() => {
    setIsDrawToShapeActive((prev) => {
      const next = !prev;
      window.__doodleIsDrawToShapeActive = next;
      if (next) {
        setIsBucketActive(false);
        setIsLassoActive(false);
        setIsLaserActive(false);
        window.__doodleIsBucketActive = false;
        window.__doodleIsLassoActive = false;
        window.__doodleIsLaserActive = false;
        if (doodleAPI) {
          doodleAPI.setActiveTool({ type: 'freedraw' });
        }
      } else {
        if (doodleAPI) {
          doodleAPI.setActiveTool({ type: 'selection' });
        }
      }
      return next;
    });
  }, [doodleAPI]);

  const handleToggleBucket = useCallback(() => {
    setIsBucketActive((prev) => {
      const next = !prev;
      window.__doodleIsBucketActive = next;
      if (next) {
        setIsDrawToShapeActive(false);
        setIsLassoActive(false);
        setIsLaserActive(false);
        window.__doodleIsDrawToShapeActive = false;
        window.__doodleIsLassoActive = false;
        window.__doodleIsLaserActive = false;
      }
      return next;
    });
  }, []);

  const handleToggleLasso = useCallback(() => {
    setIsLassoActive((prev) => {
      const next = !prev;
      window.__doodleIsLassoActive = next;
      if (next) {
        setIsDrawToShapeActive(false);
        setIsBucketActive(false);
        setIsLaserActive(false);
        window.__doodleIsDrawToShapeActive = false;
        window.__doodleIsBucketActive = false;
        window.__doodleIsLaserActive = false;
      }
      return next;
    });
  }, []);

  const handleToggleLaser = useCallback(() => {
    if (!doodleAPI) return;
    const currentTool = doodleAPI.getAppState?.()?.activeTool?.type;
    const nextLaser = currentTool !== 'laser';
    doodleAPI.setActiveTool({ type: nextLaser ? 'laser' : 'selection' });
    setIsLaserActive(nextLaser);
    window.__doodleIsLaserActive = nextLaser;
    if (nextLaser) {
      setIsDrawToShapeActive(false);
      setIsBucketActive(false);
      setIsLassoActive(false);
      window.__doodleIsDrawToShapeActive = false;
      window.__doodleIsBucketActive = false;
      window.__doodleIsLassoActive = false;
    }
  }, [doodleAPI]);

  const handleSelectCanvasTool = useCallback((tool) => {
    setIsDrawToShapeActive(false);
    setIsBucketActive(false);
    setIsLassoActive(false);
    setIsLaserActive(false);
    window.__doodleIsDrawToShapeActive = false;
    window.__doodleIsBucketActive = false;
    window.__doodleIsLassoActive = false;
    window.__doodleIsLaserActive = false;
    doodleAPI?.setActiveTool({ type: tool });
  }, [doodleAPI]);

  // Bridge custom tools to native toolbar menu
  useEffect(() => {
    window.__doodleIsDrawToShapeActive = isDrawToShapeActive;
    window.__doodleToggleDrawToShape = handleToggleDrawToShape;
    window.__doodleIsLaserActive = isLaserActive;
    window.__doodleToggleLaser = handleToggleLaser;
    window.__doodleIsBucketActive = isBucketActive;
    window.__doodleToggleBucket = handleToggleBucket;
    window.__doodleIsLassoActive = isLassoActive;
    window.__doodleToggleLasso = handleToggleLasso;
    window.__doodleOpenHelp = () => setIsHelpModalOpen(true);
  }, [
    isDrawToShapeActive,
    handleToggleDrawToShape,
    isLaserActive,
    handleToggleLaser,
    isBucketActive,
    handleToggleBucket,
    isLassoActive,
    handleToggleLasso,
  ]);

  // If user directly clicks any standard tool in the toolbar, deactivate custom tools
  useEffect(() => {
    const handleToolbarToolClick = (e) => {
      const toolbar = e.target.closest('.App-toolbar');
      const trigger = e.target.closest('.App-toolbar__extra-tools-trigger');
      const popover = e.target.closest('.canvas-extra-tools-popover');
      if (toolbar && !trigger && !popover) {
        setIsDrawToShapeActive(false);
        window.__doodleIsDrawToShapeActive = false;
        setIsLaserActive(false);
        window.__doodleIsLaserActive = false;
        setIsBucketActive(false);
        window.__doodleIsBucketActive = false;
        setIsLassoActive(false);
        window.__doodleIsLassoActive = false;
      }
    };
    document.addEventListener('pointerdown', handleToolbarToolClick, true);
    return () => document.removeEventListener('pointerdown', handleToolbarToolClick, true);
  }, []);

  // Sync internally saved custom templates into Library on startup
  useEffect(() => {
    if (!doodleAPI) return;
    try {
      const stored = localStorage.getItem('doodle_custom_templates_v1');
      if (stored) {
        const templates = JSON.parse(stored);
        if (Array.isArray(templates) && templates.length > 0 && doodleAPI.updateLibrary) {
          const libItems = templates.map((tpl) => ({
            id: tpl.id,
            status: 'unpublished',
            elements: tpl.elements,
            created: tpl.createdAt || Date.now(),
          }));
          doodleAPI.updateLibrary({ libraryItems: libItems, merge: true });
        }
      }
    } catch (e) {
      console.warn('Failed to sync templates into library on startup:', e);
    }
  }, [doodleAPI]);

  const {
    currentFilePath,
    isDirty,
    showUnsavedModal,
    onSceneChange: onFileSceneChange,
    handleNew,
    handleOpen,
    handleSave,
    handleSaveAs,
    handleExport,
    resolveUnsavedModal,
    loadFileFromDisk,
  } = useFileActions({
    doodleAPI,
  });

  const {
    hasRecoverySession,
    recoveryMeta,
    restoreRecovery,
    clearRecovery,
  } = useAutoSave({
    doodleAPI,
    currentFilePath,
    isDirty,
    onDirectSave: handleSave,
  });

  // Set canvas paper & grid style with proper canvas scene synchronization
  const handleSetCanvasStyle = useCallback((style) => {
    setCanvasStyle(style);
    if (!doodleAPI) return;

    let bg = undefined;
    if (style === 'blueprint') bg = '#0c1b33';
    else if (style === 'parchment') bg = '#fbf7ee';
    else if (style === 'engineering') bg = '#121316';
    else if (style === 'standard' || style === 'dotgrid' || style === 'isometric') {
      bg = effectiveTheme === 'dark' ? '#121212' : '#ffffff';
    }

    const appState = doodleAPI.getAppState?.();
    const currentStroke = appState?.currentItemStrokeColor;
    let newStroke = currentStroke;

    if (style === 'blueprint') {
      if (!currentStroke || currentStroke === '#1e1e1e' || currentStroke === '#000000' || currentStroke === '#121212') {
        newStroke = '#ffffff';
      }
    } else if (style === 'engineering') {
      if (!currentStroke || currentStroke === '#1e1e1e' || currentStroke === '#000000' || currentStroke === '#121212') {
        newStroke = '#ffffff';
      }
    } else if (style === 'parchment') {
      if (!currentStroke || currentStroke === '#ffffff' || currentStroke === '#f8fafc' || currentStroke === '#ced4da') {
        newStroke = '#1e1e1e';
      }
    }

    doodleAPI.updateScene({
      appState: {
        ...(bg ? { viewBackgroundColor: bg } : {}),
        ...(newStroke ? { currentItemStrokeColor: newStroke } : {}),
      },
    });
  }, [doodleAPI, effectiveTheme]);

  // Load the default canvas font after the first paint so font decoding does not delay startup.
  useEffect(() => {
    let cancelled = false;
    const loadFont = () => {
      if (cancelled || !document.fonts) return;
      document.fonts.load('16px Doodlefont').then(() => {
        if (cancelled || !doodleAPI) return;
        const elements = doodleAPI.getSceneElements?.() ?? [];
        if (elements.some((el) => el.type === 'text' && !el.isDeleted)) {
          doodleAPI.updateScene({
            elements: elements.map((el) =>
              el.type === 'text' && !el.isDeleted
                ? { ...el, version: (el.version || 1) + 1, versionNonce: Math.floor(Math.random() * 100000) }
                : el
            ),
            commitToHistory: false,
          });
        }
      }).catch((err) => console.warn('Font load warning:', err));
    };

    const idleId = window.requestIdleCallback?.(loadFont, { timeout: 1800 });
    const fallbackId = idleId === undefined ? window.setTimeout(loadFont, 250) : null;
    return () => {
      cancelled = true;
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
      if (fallbackId !== null) window.clearTimeout(fallbackId);
    };
  }, [doodleAPI]);


  // Open Library Sidebar on the Smart Templates tab
  const handleOpenTemplates = useCallback(() => {
    setIsLibraryOpen(true);
    window.__doodleOpenLibraryTemplates?.();
  }, []);

  // Set authentic Doodle Desk hand-drawn font by default
  useEffect(() => {
    if (!doodleAPI) return;
    const handwrittenFont = FONT_FAMILY?.Doodlefont ?? 5;

    const existingElements = doodleAPI.getSceneElements?.() ?? [];
    const updatedElements = existingElements.map((el) =>
      el.type === 'text'
        ? {
            ...el,
            fontFamily: handwrittenFont,
            version: (el.version || 1) + 1,
            versionNonce: Math.floor(Math.random() * 100000),
          }
        : el
    );

    doodleAPI.updateScene({
      ...(updatedElements.length > 0 ? { elements: updatedElements } : {}),
      appState: {
        currentItemFontFamily: handwrittenFont,
      },
    });
  }, [doodleAPI]);

  // Safe scene change handler without infinite loops or redundant re-renders
  const handleSceneChange = useCallback((elements, appState) => {
    onFileSceneChange(elements, appState);
    if (collabStatus !== 'disconnected') {
      broadcastScene(elements);
    }
    if (appState) {
      if (appState.activeTool?.type) {
        const isLaser = appState.activeTool.type === 'laser';
        if (isLaser !== isLaserActive) {
          setIsLaserActive(isLaser);
          window.__doodleIsLaserActive = isLaser;
        }
      }
      if (appState.activeTool?.type && appState.activeTool.type !== 'freedraw' && isDrawToShapeActive) {
        setIsDrawToShapeActive(false);
        window.__doodleIsDrawToShapeActive = false;
      }
      if (appState.activeTool?.type && appState.activeTool.type !== 'laser') {
        if (isBucketActive) {
          setIsBucketActive(false);
          window.__doodleIsBucketActive = false;
        }
        if (isLassoActive) {
          setIsLassoActive(false);
          window.__doodleIsLassoActive = false;
        }
      }
      if (appState.openSidebar) {
        setIsPreferencesOpen((prev) => (prev ? false : prev));
      }
    }
  }, [onFileSceneChange, isDrawToShapeActive, isBucketActive, isLassoActive, isLaserActive, collabStatus, broadcastScene]);

  // Validate any URL for Web Embeds
  const validateEmbeddable = useCallback((url) => {
    return Boolean(url && url.trim().length > 0);
  }, []);

  // Handle opening embedded links or target element links cleanly
  const handleLinkOpen = useCallback((element, event) => {
    if (event?.preventDefault) event.preventDefault();
    if (event?.nativeEvent?.preventDefault) event.nativeEvent.preventDefault();

    const rawUrl = (element?.link || '').trim();
    if (!rawUrl) return;

    // 1. Check if this is an internal target element link (e.g. ?element=PTJIEF9OFk-lYKCbxZkeJ)
    const targetElementId = extractElementIdFromLink(rawUrl);

    if (targetElementId && doodleAPI) {
      const elements = doodleAPI.getSceneElements?.() || [];
      const targetElement = elements.find((el) => el.id === targetElementId && !el.isDeleted);

      if (targetElement) {
        // Select the target element and smoothly scroll & center it in the canvas viewport
        doodleAPI.updateScene({
          appState: {
            selectedElementIds: { [targetElement.id]: true },
            selectedGroupIds: {},
          },
        });
        doodleAPI.scrollToContent([targetElement], {
          fitToContent: false,
          animate: true,
          duration: 350,
        });
        return;
      }
    }

    // 2. Prevent opening internal app localhost / file URLs in external browser
    if (
      rawUrl.includes(window.location.origin) ||
      rawUrl.startsWith('/') ||
      rawUrl.includes('localhost:5173') ||
      rawUrl.includes('127.0.0.1:5173')
    ) {
      return;
    }

    // 3. For genuine external URLs (like https://google.com, etc.), open in system browser
    let url = rawUrl;
    if (!/^https?:\/\//i.test(url) && !url.startsWith('mailto:')) {
      url = `https://${url}`;
    }

    // Safety: Never open localhost app in external browser
    if (url.includes('localhost:5173') || url.includes('127.0.0.1:5173')) {
      return;
    }

    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [doodleAPI]);

  // Clean internal element linking without full localhost URLs
  const generateLinkForSelection = useCallback((id) => {
    return `/?element=${id}`;
  }, []);

  // Custom renderer for canvas embeddable elements
  // Renders the interactive WebFrameCard with full inline naming, editing, and URL handling
  const renderEmbeddable = useCallback((element, appState) => {
    return (
      <WebFrameCard
        element={element}
        appState={appState}
        doodleAPI={doodleAPI}
        onLinkOpen={handleLinkOpen}
      />
    );
  }, [doodleAPI, handleLinkOpen]);

  // Listen for preferences from native menu
  useEffect(() => {
    if (window.electronAPI) {
      const cleanup = window.electronAPI.on('app:preferences', () => {
        setIsPreferencesOpen(true);
      });
      return cleanup;
    }
  }, []);

  // Listen for action shortcuts from menu
  useEffect(() => {
    if (!window.electronAPI || !doodleAPI) return;

    const cleanups = [
      window.electronAPI.on('edit:undo', () => {
        doodleAPI.history?.undo?.();
      }),
      window.electronAPI.on('edit:redo', () => {
        doodleAPI.history?.redo?.();
      }),
      window.electronAPI.on('view:zoom-in', () => {
        const appState = doodleAPI.getAppState();
        const newZoom = Math.min(appState.zoom.value + 0.1, 5);
        doodleAPI.updateScene({ appState: { zoom: { value: newZoom } } });
      }),
      window.electronAPI.on('view:zoom-out', () => {
        const appState = doodleAPI.getAppState();
        const newZoom = Math.max(appState.zoom.value - 0.1, 0.1);
        doodleAPI.updateScene({ appState: { zoom: { value: newZoom } } });
      }),
      window.electronAPI.on('view:zoom-reset', () => {
        doodleAPI.scrollToContent();
      }),
      window.electronAPI.on('view:toggle-grid', () => {
        const appState = doodleAPI.getAppState();
        doodleAPI.updateScene({ appState: { gridSize: appState.gridSize ? null : 20 } });
      }),
      window.electronAPI.on('view:toggle-zen', () => {
        const appState = doodleAPI.getAppState();
        doodleAPI.updateScene({ appState: { zenModeEnabled: !appState.zenModeEnabled } });
      }),
    ];

    return () => {
      cleanups.forEach(fn => fn && fn());
    };
  }, [doodleAPI]);

  // Global application shortcuts (Save, Open, New, Command Palette, Presentation, etc.)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isInputFocused =
        e.target?.tagName === 'INPUT' ||
        e.target?.tagName === 'TEXTAREA' ||
        e.target?.isContentEditable;

      // Ctrl+K (Command Palette)
      if (isCtrlOrCmd && e.key.toLowerCase() === 'k' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // ? (Help & Keyboard Shortcuts)
      if (e.key === '?' && !isCtrlOrCmd && !e.altKey && !isInputFocused) {
        e.preventDefault();
        e.stopPropagation();
        setIsHelpModalOpen((prev) => !prev);
        return;
      }

      // Ctrl+Alt+P (Presentation Mode)
      if (isCtrlOrCmd && e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        e.stopPropagation();
        setIsPresentationActive((prev) => !prev);
        return;
      }

      // Shift+X (Draw to Shape)
      if (e.shiftKey && e.key.toLowerCase() === 'x' && !isCtrlOrCmd && !e.altKey && !isInputFocused) {
        e.preventDefault();
        e.stopPropagation();
        handleToggleDrawToShape();
        return;
      }

      // Shift+R (Precision Ruler Guide)
      if (e.shiftKey && e.key.toLowerCase() === 'r' && !isCtrlOrCmd && !e.altKey && !isInputFocused) {
        e.preventDefault();
        e.stopPropagation();
        setIsRulerActive((prev) => !prev);
        return;
      }

      // Shift+C (Color Palette Studio)
      if (e.shiftKey && e.key.toLowerCase() === 'c' && !isCtrlOrCmd && !e.altKey && !isInputFocused) {
        e.preventDefault();
        e.stopPropagation();
        setIsColorPaletteOpen((prev) => !prev);
        return;
      }

      // N (Sticky Notes & Quick Cards)
      if (e.key.toLowerCase() === 'n' && !isCtrlOrCmd && !e.shiftKey && !e.altKey && !isInputFocused) {
        e.preventDefault();
        e.stopPropagation();
        setIsStickyNotesOpen((prev) => !prev);
        return;
      }

      // K (Laser Pointer)
      if (e.key.toLowerCase() === 'k' && !isCtrlOrCmd && !e.shiftKey && !e.altKey && !isInputFocused) {
        e.preventDefault();
        e.stopPropagation();
        handleToggleLaser();
        return;
      }

      // B (Bucket fill)
      if (e.key.toLowerCase() === 'b' && !isCtrlOrCmd && !e.shiftKey && !e.altKey && !isInputFocused) {
        e.preventDefault();
        e.stopPropagation();
        handleToggleBucket();
        return;
      }

      // M for Mini-Map (only when no input is focused and no modifier keys)
      if (e.key.toLowerCase() === 'm' && !isCtrlOrCmd && !e.altKey && !isInputFocused) {
        // Toggle minimap
        setIsMiniMapOpen((prev) => !prev);
        return;
      }

      if (!isCtrlOrCmd || e.altKey) return;

      const key = e.key.toLowerCase();

      // Ctrl+S / Ctrl+Shift+S (Save / Save As)
      if (key === 's') {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          handleSaveAs();
        } else {
          handleSave();
        }
        return;
      }

      // Ctrl+O (Open)
      if (key === 'o' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleOpen();
        return;
      }

      // Ctrl+N (New File in Workspace)
      if (key === 'n' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        if (createFile && activeWorkspaceId) {
          createFile(activeWorkspaceId);
        } else {
          handleNew();
        }
        return;
      }

      // Ctrl+P (Print)
      if (key === 'p' && !e.shiftKey && !isInputFocused) {
        e.preventDefault();
        e.stopPropagation();
        printCanvasRef.current?.();
        return;
      }

      // Ctrl+, (Preferences)
      if ((e.key === ',' || e.code === 'Comma') && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        setIsPreferencesOpen((prev) => !prev);
        return;
      }

      // Ctrl+Shift+E (Quick Export PNG)
      if (key === 'e' && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleExport('png');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [handleSave, handleSaveAs, handleOpen, handleNew, handleExport]);

  // Drag and drop handler for OS files
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = file.path;
      const name = file.name.toLowerCase();

      if (filePath && (
        name.endsWith('.doodle') ||
        name.endsWith('.doodlelib') ||
        name.endsWith('.doodle-canvas-root') ||
        name.endsWith('.doodle-canvas-rootlib') ||
        name.endsWith('.png') ||
        name.endsWith('.svg')
      )) {
        await loadFileFromDisk(filePath);
      }
    }
  }, [loadFileFromDisk]);

  const currentFileName = activeFile?.name || customTitle || (currentFilePath ? currentFilePath.split(/[\\/]/).pop() : 'Untitled');

  const handleRenameTitle = useCallback((newTitle) => {
    setCustomTitle(newTitle);
    if (activeFile && activeWorkspace && renameFile) {
      renameFile(activeFile.id, newTitle, activeWorkspace.id);
    }
    if (doodleAPI) {
      doodleAPI.updateScene({
        appState: {
          name: newTitle,
        },
      });
    }
  }, [activeFile, activeWorkspace, renameFile, doodleAPI]);

  const handlePrintCanvas = useCallback(async () => {
    if (!doodleAPI) return;

    try {
      const elements = (doodleAPI.getSceneElements?.() || []).filter((element) => !element.isDeleted);
      if (elements.length === 0) {
        window.alert('The canvas is empty. There is nothing to print.');
        return;
      }

      const appState = doodleAPI.getAppState?.() || {};
      const canvas = await exportToCanvas(elements, appState, doodleAPI.getFiles?.() || {}, {
        exportBackground: true,
        exportPadding: 24,
        viewBackgroundColor: appState.viewBackgroundColor || '#ffffff',
      });

      if (!canvas) {
        window.alert('Could not export canvas for printing.');
        return;
      }

      const imageUrl = canvas.toDataURL('image/png');
      const isLandscape = canvas.width > canvas.height;
      const title = (appState.name || 'Doodle Desk Canvas').replace(/[&<>"']/g, '');

      // In Electron environment, call native print dialog
      if (window.electronAPI?.printCanvas) {
        const result = await window.electronAPI.printCanvas({
          dataUrl: imageUrl,
          title,
          isLandscape,
          theme: effectiveTheme,
        });
        if (result && !result.success && result.error && result.error !== 'cancelled') {
          console.warn('Native print:', result.error);
        }
        return;
      }

      // Use a hidden iframe as browser fallback
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);
      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>@page{size:auto;margin:10mm}*{box-sizing:border-box}html,body{margin:0;padding:0;width:100%;height:100%;background:#fff}body{display:flex;align-items:center;justify-content:center}img{display:block;max-width:100%;max-height:100%;object-fit:contain}</style></head><body><img src="${imageUrl}" alt="Doodle Desk Canvas"></body></html>`);
      iframeDoc.close();

      const cleanup = () => {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 2000);
      };

      const img = iframeDoc.querySelector('img');
      const triggerPrint = () => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (err) {
          console.error('Print trigger failed:', err);
        } finally {
          cleanup();
        }
      };

      if (img.complete) {
        setTimeout(triggerPrint, 50);
      } else {
        img.onload = () => setTimeout(triggerPrint, 50);
        img.onerror = () => {
          cleanup();
          window.alert('Could not prepare the canvas for printing.');
        };
      }
    } catch (error) {
      console.error('Canvas print failed:', error);
      window.alert(`Could not print canvas: ${error.message}`);
    }
  }, [doodleAPI, effectiveTheme]);
  printCanvasRef.current = handlePrintCanvas;

  useEffect(() => {
    if (!window.electronAPI) return;
    return window.electronAPI.on('file:print-canvas', handlePrintCanvas);
  }, [handlePrintCanvas]);

  const handleFreeDrawCommit = useCallback((stroke) => {
    if (!isDrawToShapeActive || !doodleAPI || !stroke?.points?.length) return;
    const recognized = recognizeShape(stroke);
    if (!recognized) return;

    const currentElements = doodleAPI.getSceneElements?.() || [];
    const appState = doodleAPI.getAppState?.() || {};
    const newElement = {
      ...stroke,
      ...recognized,
      roughness: appState.currentItemRoughness ?? 1,
      roundness: appState.currentItemRoundness ?? 'round',
      strokeColor: stroke.strokeColor || appState.currentItemStrokeColor || '#1e1e1e',
      backgroundColor: stroke.backgroundColor || appState.currentItemBackgroundColor || 'transparent',
      fillStyle: stroke.fillStyle || appState.currentItemFillStyle || 'hachure',
      strokeWidth: stroke.strokeWidth || appState.currentItemStrokeWidth || 2,
      id: `${stroke.id}-rec-${Date.now()}`,
      version: (stroke.version || 1) + 1,
      versionNonce: Math.floor(Math.random() * 1000000),
      isDeleted: false,
    };
    doodleAPI.updateScene({
      elements: currentElements
        .map((element) => element.id === stroke.id ? { ...element, isDeleted: true } : element)
        .concat(newElement),
      appState: {
        selectedElementIds: {},
        activeTool: { type: 'freedraw' },
      },
      commitToHistory: true,
    });
  }, [doodleAPI, isDrawToShapeActive]);

  return (
    <div
      className={`app-shell ${collabStatus !== 'disconnected' ? 'collaboration-active' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Studio TopBar */}
      <StudioTopBar
        currentFileName={currentFileName}
        isDirty={isDirty}
        theme={effectiveTheme}
        canvasStyle={canvasStyle}
        onSetCanvasStyle={handleSetCanvasStyle}
        onThemeToggle={() => changeTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onExport={handleExport}
        onExportPdf={() => window.electronAPI?.exportPDF?.({ landscape: true })}
        onCopyToClipboard={(fmt) => handleExport(fmt, { clipboardOnly: true })}
        onPrint={handlePrintCanvas}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenTemplates={handleOpenTemplates}
        onTogglePresentation={() => setIsPresentationActive((prev) => !prev)}
        onToggleMiniMap={() => setIsMiniMapOpen((prev) => !prev)}
        isMiniMapOpen={isMiniMapOpen}
        onRenameTitle={handleRenameTitle}
        activeWorkspace={activeWorkspace}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        activeFile={activeFile}
        activeFileId={activeFileId}
        onSwitchWorkspace={(id) => { saveActiveWorkspaceSnapshot(true); switchWorkspace(id); }}
        onOpenWorkspaces={() => {
          saveActiveWorkspaceSnapshot(true);
          setIsWorkspaceModalOpen(true);
        }}
        onCreateWorkspace={createWorkspace}
        onUpdateWorkspace={updateWorkspaceMetadata}
        onDuplicateWorkspace={duplicateWorkspace}
        onDeleteWorkspace={deleteWorkspace}
        onExportWorkspace={exportWorkspace}
        onImportWorkspace={importWorkspace}
        onCreateFile={(wsId) => createFile(wsId || activeWorkspaceId)}
        onSwitchFile={(fileId, wsId) => switchFile(fileId, wsId || activeWorkspaceId)}
        onRenameFile={(fileId, name, wsId) => renameFile(fileId, name, wsId || activeWorkspaceId)}
        onDuplicateFile={(fileId, wsId) => duplicateFile(fileId, wsId || activeWorkspaceId)}
        onDeleteFile={(fileId, wsId) => deleteFile(fileId, wsId || activeWorkspaceId)}
        collabStatus={collabStatus}
        collabConnectionError={collabConnectionError}
        collabPeersCount={collaborators.size}
        collabRoomId={collabRoomId}
        onOpenLiveCollab={() => setIsLiveCollabModalOpen(true)}
        onStartCollab={startCollabHosting}
        onJoinCollab={(roomId) => joinCollabSession(roomId)}
        onLeaveCollab={leaveCollabSession}
        myProfile={collabProfile}
        setMyProfile={setCollabProfile}
        collaborators={collaborators}
        chatMessages={collabChatMessages}
        onOpenLiveChat={() => setIsLiveChatOpen(true)}
        sendChatMessage={sendCollabChatMessage}
        onFollowCollaborator={handleFollowCollaborator}
      />

      {/* Drag & Drop Visual Indicator */}
      {isDraggingOver && (
        <div className="drag-overlay">
          <div className="drag-overlay-message">
            Drop diagram or library file to open
          </div>
        </div>
      )}

      {/* Doodle Canvas Container with Canvas Style Class */}
      <div
        className={`canvas-container canvas-style-${canvasStyle} ${isDrawToShapeActive ? 'draw-to-shape-mode-active' : ''} ${isLaserActive ? 'laser-mode-active' : ''}`}
        style={{ position: 'absolute', top: '38px', left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
      >
        <DoodleCanvas
          ref={doodleAPICallback}
          theme={effectiveTheme}
          onChange={handleSceneChange}
          isCollaborating={collabStatus !== 'disconnected'}
          collaborators={collaborators}
          onPointerUpdate={handlePointerUpdate}
          onLinkOpen={handleLinkOpen}
          renderEmbeddable={renderEmbeddable}
          isDrawToShapeActive={isDrawToShapeActive}
          onFreeDrawCommit={handleFreeDrawCommit}
          onToggleLibrary={() => setIsLibraryOpen((prev) => !prev)}
          onOpenLibrary={() => setIsLibraryOpen(true)}
          onOpenTemplates={handleOpenTemplates}
          onOpenHelp={() => setIsHelpModalOpen(true)}
          onOpenColorPalette={() => setIsColorPaletteOpen(true)}
          canvasStyle={canvasStyle}
          initialData={{
            appState: {
              name: 'Untitled Doodle',
              currentItemFontFamily: FONT_FAMILY?.Doodlefont ?? 5,
              showWelcomeScreen: true,
              activeTool: { type: 'selection' },
            },
          }}
        >
          <WelcomeScreen>
            <WelcomeScreen.Center>
              <WelcomeScreen.Center.Logo>
                <DoodleDeskLogo theme={effectiveTheme} size={54} />
              </WelcomeScreen.Center.Logo>
              <WelcomeScreen.Center.Heading>
                Hand-drawn diagramming, offline and native.
              </WelcomeScreen.Center.Heading>
              <WelcomeScreen.Center.Menu>
                <WelcomeScreen.Center.MenuItemLoadScene onSelect={handleOpen} />
                <WelcomeScreen.Center.MenuItemHelp onSelect={() => setIsHelpModalOpen(true)} />
              </WelcomeScreen.Center.Menu>
            </WelcomeScreen.Center>
          </WelcomeScreen>
        </DoodleCanvas>
      </div>

      <CanvasExtraToolsDropdown
        doodleAPI={doodleAPI}
        isDrawToShapeActive={isDrawToShapeActive}
        onToggleDrawToShape={handleToggleDrawToShape}
        isLaserActive={isLaserActive}
        onToggleLaser={handleToggleLaser}
        onSelectCanvasTool={handleSelectCanvasTool}
        isBucketActive={isBucketActive}
        onToggleBucket={handleToggleBucket}
        isLassoActive={isLassoActive}
        onToggleLasso={handleToggleLasso}
        isRulerActive={isRulerActive}
        onToggleRuler={() => setIsRulerActive((prev) => !prev)}
        onOpenStickyNotes={() => setIsStickyNotesOpen(true)}
        onOpenColorPalette={() => setIsColorPaletteOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenTemplates={handleOpenTemplates}
        onOpenMermaid={() => setIsMermaidModalOpen(true)}
      />

      {isLaserActive && (
        <CustomLaserPointer isActive={isLaserActive} onClose={handleToggleLaser} />
      )}

      <CanvasTopRightSettings
        isOpen={isPreferencesOpen}
        onTogglePreferences={() => {
          setIsPreferencesOpen((prev) => {
            const next = !prev;
            if (next && doodleAPI) {
              const appState = doodleAPI.getAppState?.();
              if (appState?.openSidebar) {
                doodleAPI.updateScene({ appState: { openSidebar: null } });
              }
            }
            return next;
          });
        }}
      />

      {/* Mini-Map Radar */}
      <MiniMapNavigator
        isOpen={isMiniMapOpen}
        onToggle={() => setIsMiniMapOpen((prev) => !prev)}
        doodleAPI={doodleAPI}
      />

      <LiveCollabChatPanel
        isOpen={isLiveChatOpen}
        onToggle={() => setIsLiveChatOpen((open) => !open)}
        isConnected={collabStatus !== 'disconnected'}
        chatMessages={collabChatMessages}
        sendChatMessage={sendCollabChatMessage}
        myProfile={collabProfile}
      />

      {/* Command Palette (Ctrl+K) */}
      {isCommandPaletteOpen && <Suspense fallback={null}><CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        doodleAPI={doodleAPI}
        effectiveTheme={effectiveTheme}
        onThemeToggle={() => changeTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
        onOpenPreferences={() => setIsPreferencesOpen(true)}
        onOpenTemplates={handleOpenTemplates}
        onToggleLibrary={() => setIsLibraryOpen((prev) => !prev)}
        onTogglePresentation={() => setIsPresentationActive((prev) => !prev)}
        onToggleMiniMap={() => setIsMiniMapOpen((prev) => !prev)}
        onSetCanvasStyle={handleSetCanvasStyle}
        onExport={handleExport}
        onExportPdf={() => window.electronAPI?.exportPDF?.({ landscape: true })}
        onCopyToClipboard={(fmt) => handleExport(fmt, { clipboardOnly: true })}
        onOpenStickyNotes={() => setIsStickyNotesOpen(true)}
        onToggleRuler={() => setIsRulerActive((prev) => !prev)}
        onOpenColorPalette={() => setIsColorPaletteOpen(true)}
        onOpenMermaid={() => setIsMermaidModalOpen(true)}
        onOpenWorkspaces={() => {
          saveActiveWorkspaceSnapshot(true);
          setIsWorkspaceModalOpen(true);
        }}
        activeWorkspace={activeWorkspace}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSwitchWorkspace={(id) => { saveActiveWorkspaceSnapshot(true); switchWorkspace(id); }}
        onCreateWorkspace={createWorkspace}
        onUpdateWorkspace={updateWorkspaceMetadata}
        onDuplicateWorkspace={duplicateWorkspace}
        onDeleteWorkspace={deleteWorkspace}
        onExportWorkspace={exportWorkspace}
        onImportWorkspace={importWorkspace}
        onOpenLiveCollab={() => setIsLiveCollabModalOpen(true)}
        collabStatus={collabStatus}
        collabPeersCount={collaborators.size}
        collabRoomId={collabRoomId}
        onStartCollab={startCollabHosting}
        onJoinCollab={(roomId) => joinCollabSession(roomId)}
        onLeaveCollab={leaveCollabSession}
        myProfile={collabProfile}
        setMyProfile={setCollabProfile}
        collaborators={collaborators}
        chatMessages={collabChatMessages}
        onOpenLiveChat={() => setIsLiveChatOpen(true)}
        sendChatMessage={sendCollabChatMessage}
        onFollowCollaborator={handleFollowCollaborator}
      /></Suspense>}

      {/* Native Library Sidebar */}
      <LibrarySidebar
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        doodleAPI={doodleAPI}
        theme={effectiveTheme}
      />

      {/* Smart Template Library */}
      {isTemplateLibraryOpen && <Suspense fallback={null}><TemplateLibraryModal
        isOpen={isTemplateLibraryOpen}
        onClose={() => setIsTemplateLibraryOpen(false)}
        doodleAPI={doodleAPI}
      /></Suspense>}

      {/* Interactive Presentation Mode */}
      {isPresentationActive && <Suspense fallback={null}><PresentationMode
        isActive={isPresentationActive}
        onClose={() => setIsPresentationActive(false)}
        doodleAPI={doodleAPI}
      /></Suspense>}

      {/* Preferences Modal */}
      {isPreferencesOpen && <Suspense fallback={null}><PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        currentTheme={themeSetting}
        onThemeChange={changeTheme}
      /></Suspense>}

      {/* Unsaved Changes Confirmation Dialog */}
      {showUnsavedModal && <Suspense fallback={null}><UnsavedChangesModal
        isOpen={showUnsavedModal}
        fileName={currentFileName}
        onSave={() => resolveUnsavedModal('save')}
        onDiscard={() => resolveUnsavedModal('discard')}
        onCancel={() => resolveUnsavedModal('cancel')}
      /></Suspense>}

      {/* Recovery Session Prompt Dialog */}
      {hasRecoverySession && <Suspense fallback={null}><RecoveryPrompt
        isOpen={hasRecoverySession}
        meta={recoveryMeta}
        onRestore={restoreRecovery}
        onDiscard={clearRecovery}
      /></Suspense>}


      <BucketFillOverlay isActive={isBucketActive} doodleAPI={doodleAPI} />

      {/* Freeform Lasso Selection Overlay */}
      <LassoSelectionOverlay
        isActive={isLassoActive}
        doodleAPI={doodleAPI}
        onComplete={() => setIsLassoActive(false)}
      />

      {/* Sticky Notes & Quick Cards Modal */}
      {isStickyNotesOpen && <Suspense fallback={null}><StickyNotesModal
        isOpen={isStickyNotesOpen}
        onClose={() => setIsStickyNotesOpen(false)}
        doodleAPI={doodleAPI}
      /></Suspense>}

      {/* Precision Ruler & Compass Guide Overlay */}
      <PrecisionRulerOverlay
        isActive={isRulerActive}
        onClose={() => setIsRulerActive(false)}
      />

      {/* Curated Color Palette Studio Modal */}
      {isColorPaletteOpen && <Suspense fallback={null}><ColorPaletteStudioModal
        isOpen={isColorPaletteOpen}
        onClose={() => setIsColorPaletteOpen(false)}
        doodleAPI={doodleAPI}
      /></Suspense>}

      {/* Workspace Management System Modal */}
      {isWorkspaceModalOpen && <Suspense fallback={null}><WorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        activeFileId={activeFileId}
        onSwitchWorkspace={switchWorkspace}
        onSelectWorkspace={switchWorkspace}
        onCreateWorkspace={createWorkspace}
        onUpdateWorkspace={updateWorkspaceMetadata}
        onUpdateWorkspaceMetadata={updateWorkspaceMetadata}
        onDuplicateWorkspace={duplicateWorkspace}
        onDeleteWorkspace={deleteWorkspace}
        onExportWorkspace={exportWorkspace}
        onImportWorkspace={importWorkspace}
        onCreateFile={(wsId) => createFile(wsId || activeWorkspaceId)}
        onSwitchFile={(fileId, wsId) => switchFile(fileId, wsId || activeWorkspaceId)}
        onRenameFile={(fileId, name, wsId) => renameFile(fileId, name, wsId || activeWorkspaceId)}
        onDuplicateFile={(fileId, wsId) => duplicateFile(fileId, wsId || activeWorkspaceId)}
        onDeleteFile={(fileId, wsId) => deleteFile(fileId, wsId || activeWorkspaceId)}
        theme={effectiveTheme}
      /></Suspense>}

      {/* Live Collaboration Peer-to-Peer System Modal */}
      {isLiveCollabModalOpen && <Suspense fallback={null}><LiveCollabModal
        isOpen={isLiveCollabModalOpen}
        onClose={() => setIsLiveCollabModalOpen(false)}
        status={collabStatus}
        connectionError={collabConnectionError}
        roomId={collabRoomId}
        myProfile={collabProfile}
        setMyProfile={setCollabProfile}
        collaborators={collaborators}
        chatMessages={collabChatMessages}
        startHosting={startCollabHosting}
        joinSession={joinCollabSession}
        leaveSession={leaveCollabSession}
        sendChatMessage={sendCollabChatMessage}
        onFollowCollaborator={handleFollowCollaborator}
        theme={effectiveTheme}
      /></Suspense>}

      {/* Help & Keyboard Shortcuts Modal */}
      {isHelpModalOpen && (
        <Suspense fallback={null}>
          <HelpModal
            isOpen={isHelpModalOpen}
            onClose={() => setIsHelpModalOpen(false)}
            theme={effectiveTheme}
          />
        </Suspense>
      )}

      {/* Mermaid to Doodle Modal */}
      {isMermaidModalOpen && (
        <Suspense fallback={null}>
          <MermaidToDoodleModal
            isOpen={isMermaidModalOpen}
            onClose={() => setIsMermaidModalOpen(false)}
            doodleAPI={doodleAPI}
            theme={effectiveTheme}
          />
        </Suspense>
      )}

      {/* Global Themed Alert & Dialog */}
      {globalDialog && (
        <ThemedConfirmDialog
          isOpen={!!globalDialog}
          title={globalDialog.title || 'Doodle Desk'}
          subtitle={globalDialog.subtitle || 'Notice'}
          message={globalDialog.message}
          confirmText={globalDialog.confirmText || 'OK'}
          cancelText={globalDialog.cancelText || 'Cancel'}
          danger={globalDialog.danger || false}
          isAlert={globalDialog.isAlert !== false}
          onConfirm={() => {
            globalDialog.onConfirm?.();
            setGlobalDialog(null);
          }}
          onCancel={() => {
            globalDialog.onCancel?.();
            setGlobalDialog(null);
          }}
        />
      )}
    </div>
  );
}
