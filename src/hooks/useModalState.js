import { useState, useCallback, useRef, useEffect, startTransition } from 'react';

// Centralized modal state management - reduces 80+ useState hooks in App.jsx
const MODAL_NAMES = {
  // Primary modals
  preferences: 'preferences',
  help: 'help',
  templateLibrary: 'templateLibrary',
  commandPalette: 'commandPalette',
  library: 'library',
  boardSearch: 'boardSearch',
  mermaid: 'mermaid',
  timeMachine: 'timeMachine',
  autoLayout: 'autoLayout',
  diagramHealthCheck: 'diagramHealthCheck',
  prototypeLinks: 'prototypeLinks',
  focusModeOverlay: 'focusModeOverlay',
  scenarioWalkthrough: 'scenarioWalkthrough',
  smartBoardSearch: 'smartBoardSearch',
  librarySidebar: 'librarySidebar',
  bucketFill: 'bucketFill',
  lassoSelection: 'lassoSelection',
  precisionRuler: 'precisionRuler',
  wireframeToCode: 'wireframeToCode',
  insertDocument: 'insertDocument',
  ambientSoundStudio: 'ambientSoundStudio',
  interactiveTableFlashcards: 'interactiveTableFlashcards',
  whiteboardAnimationStudio: 'whiteboardAnimationStudio',
  neuralKnowledgeConstellation: 'neuralKnowledgeConstellation',
  napkinToVectorScanner: 'napkinToVectorScanner',
  themedConfirmDialog: 'themedConfirmDialog',
  networkTrafficSimulator: 'networkTrafficSimulator',
  spatial3DHoloCanvas: 'spatial3DHoloCanvas',
  freehandMathRecognizer: 'freehandMathRecognizer',
  interactivePrototypePlayer: 'interactivePrototypePlayer',
  localAiCopilot: 'localAiCopilot',
  canvasQueryBar: 'canvasQueryBar',
  canvasMultiView: 'canvasMultiView',
  formalSpecs: 'formalSpecs',
  simulationCenter: 'simulationCenter',
  semanticCheckpoints: 'semanticCheckpoints',
  focusModeSwitcher: 'focusModeSwitcher',
  pluginsManager: 'pluginsManager',
  localSyncConfig: 'localSyncConfig',
  languageLearningStudio: 'languageLearningStudio',
  stickyNotes: 'stickyNotes',
  colorPaletteStudio: 'colorPaletteStudio',
  workspace: 'workspace',
  liveCollab: 'liveCollab',
  presentation: 'presentation',
  recoveryPrompt: 'recoveryPrompt',
  unsavedChanges: 'unsavedChanges',
  globalDialog: 'globalDialog',

  // Tool states (not modals but toggled like them)
  drawToShape: 'drawToShape',
  bucket: 'bucket',
  lasso: 'lasso',
  laser: 'laser',
  ruler: 'ruler',
  isPrototypeActive: 'isPrototypeActive',
  isFocusModeActive: 'isFocusModeActive',
  isMiniMapOpen: 'isMiniMapOpen',
  isLiveChatOpen: 'isLiveChatOpen',
  isPresentationActive: 'isPresentationActive',
  isTimeMachineOpen: 'isTimeMachineOpen',
  isAutoLayoutOpen: 'isAutoLayoutOpen',
  isDiagramHealthCheckOpen: 'isDiagramHealthCheckOpen',
  isPrototypeLinksOpen: 'isPrototypeLinksOpen',
  isFocusModeOverlayOpen: 'isFocusModeOverlayOpen',
  isSmartBoardSearchOpen: 'isSmartBoardSearchOpen',
  isLibraryOpen: 'isLibraryOpen',
  isBucketActive: 'isBucketActive',
  isLassoActive: 'isLassoActive',
  isLaserActive: 'isLaserActive',
  isRulerActive: 'isRulerActive',
  isDrawToShapeActive: 'isDrawToShapeActive',
  isSoundStudioOpen: 'isSoundStudioOpen',
  isAnimationStudioOpen: 'isAnimationStudioOpen',
  isKnowledgeConstellationOpen: 'isKnowledgeConstellationOpen',
  isNapkinScannerOpen: 'isNapkinScannerOpen',
  isTrafficSimulatorOpen: 'isTrafficSimulatorOpen',
  isSpatial3DHoloActive: 'isSpatial3DHoloActive',
  isFreehandMathOpen: 'isFreehandMathOpen',
  isPrototypePlayerOpen: 'isPrototypePlayerOpen',
  isLocalAiCopilotOpen: 'isLocalAiCopilotOpen',
  isCanvasQueryBarOpen: 'isCanvasQueryBarOpen',
  isMultiViewOpen: 'isMultiViewOpen',
  isFormalSpecsOpen: 'isFormalSpecsOpen',
  isSimulationCenterOpen: 'isSimulationCenterOpen',
  isCheckpointsOpen: 'isCheckpointsOpen',
  isFocusModeSwitcherOpen: 'isFocusModeSwitcherOpen',
  isPluginsManagerOpen: 'isPluginsManagerOpen',
  isLocalSyncConfigOpen: 'isLocalSyncConfigOpen',
  isLanguageStudioOpen: 'isLanguageStudioOpen',
  isStickyNotesOpen: 'isStickyNotesOpen',
  isColorPaletteOpen: 'isColorPaletteOpen',
  isTemplateLibraryOpen: 'isTemplateLibraryOpen',
  isWorkspaceModalOpen: 'isWorkspaceModalOpen',
  isLiveCollabModalOpen: 'isLiveCollabModalOpen',
  isHelpModalOpen: 'isHelpModalOpen',
  isMermaidModalOpen: 'isMermaidModalOpen',
  isCommandPaletteOpen: 'isCommandPaletteOpen',
  isBoardSearchOpen: 'isBoardSearchOpen',
  isPreferencesOpen: 'isPreferencesOpen',
};

// Modal groups for batch operations
const MODAL_GROUPS = {
  allModals: Object.values(MODAL_NAMES),
  drawingTools: ['drawToShape', 'bucket', 'lasso', 'laser', 'ruler'],
  collaborationModals: ['liveCollab', 'liveChat'],
  panelModals: ['library', 'miniMap', 'commandPalette', 'templates', 'colorPalette', 'stickyNotes', 'templates'],
  advancedModals: ['localAiCopilot', 'canvasQueryBar', 'multiView', 'formalSpecs', 'simulationCenter', 'semanticCheckpoints', 'focusModeSwitcher', 'pluginsManager', 'localSyncConfig', 'languageStudio'],
};

const initialModalState = Object.fromEntries(
  Object.values(MODAL_NAMES).map(k => [k, false])
);

export function useModalState() {
  const [modalState, setModalState] = useState(initialModalState);
  const prevModalStateRef = useRef(modalState);
  prevModalStateRef.current = modalState;

  // Single setter for all modal states
  const setModal = useCallback((name, value) => {
    setModalState(prev => ({
      ...prev,
      [name]: typeof value === 'function' ? value(prev[name]) : value
    }));
  }, []);

  // Batch setter for multiple modals
  const setModals = useCallback((updates) => {
    setModalState(prev => ({ ...prev, ...updates }));
  }, []);

  // Toggle a modal
  const toggleModal = useCallback((name) => {
    setModalState(prev => ({ ...prev, [name]: !prev[name] }));
  }, []);

  // Close all modals in a group
  const closeGroup = useCallback((groupName) => {
    const group = MODAL_GROUPS[groupName];
    if (!group) return;
    setModalState(prev => {
      const next = { ...prev };
      group.forEach(name => { next[name] = false; });
      return next;
    });
  }, []);

  // Close all modals except specified
  const closeAllExcept = useCallback((except) => {
    const exceptSet = new Set(except);
    setModalState(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (!exceptSet.has(key)) next[key] = false;
      });
      return next;
    });
  }, []);

  // Close all modals
  const closeAll = useCallback(() => {
    setModalState(initialModalState);
  }, []);

  // Open a modal with startTransition for non-blocking UI
  const openModal = useCallback((name, options) => {
    const { transition = true, closeOthers = false } = options || {};
    const action = () => {
      if (closeOthers) {
        const except = Array.isArray(closeOthers) ? closeOthers : [];
        setModalState(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(key => {
            if (!except.includes(key)) next[key] = false;
          });
          next[name] = true;
          return next;
        });
      } else {
        setModalState(prev => ({ ...prev, [name]: true }));
      }
    };
    if (transition) startTransition(action);
    else action();
  }, []);

  // Get modal state
  const isOpen = useCallback((name) => modalState[name], [modalState]);

  // Get multiple modal states
  const getModals = useCallback((names) => {
    return names.reduce((acc, name) => ({ ...acc, [name]: modalState[name] }), {});
  }, [modalState]);

  return {
    modalState,
    setModal,
    setModals,
    toggleModal,
    openModal,
    closeGroup,
    closeAllExcept,
    closeAll,
    isOpen,
    getModals,
    MODAL_NAMES,
  };
}