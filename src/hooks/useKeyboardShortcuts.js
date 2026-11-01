import { useEffect, useCallback, useRef } from 'react';
import { findShortcutAction, getShortcutBindings } from '../engine/keyboardShortcuts.js';

// Centralized keyboard shortcut handler - consolidates all keyboard handling in App.jsx
export function useKeyboardShortcuts(actions, deps = []) {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const depsRef = useRef(deps);
  depsRef.current = deps;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isInputFocused =
        e.target?.tagName === 'INPUT' ||
        e.target?.tagName === 'TEXTAREA' ||
        e.target?.isContentEditable;

      // Check custom shortcuts first
      const action = findShortcutAction(e, getShortcutBindings());
      if (action && actionsRef.current[action]) {
        e.preventDefault();
        e.stopPropagation();
        actionsRef.current[action]();
        return;
      }

      // Built-in shortcuts (non-input only)
      if (!isInputFocused) {
        const currentActions = actionsRef.current;

        // Single key shortcuts (no modifiers)
        if (!isCtrlOrCmd && !e.shiftKey && !e.altKey) {
          switch (e.key.toLowerCase()) {
            case '?': currentActions.help?.(); break;
            case 'k': currentActions.laser?.(); break;
            case 'b': currentActions.bucket?.(); break;
            case 'm': currentActions.minimap?.(); break;
            case 'n': currentActions.stickyNotes?.(); break;
            case 'f': currentActions.focusMode?.(); break;
            case 'x': currentActions.drawToShape?.(); break;
            case 'r': currentActions.ruler?.(); break;
            case 'c': currentActions.colorPalette?.(); break;
            case 't': currentActions.timeMachine?.(); break;
            case 'a': currentActions.autoLayout?.(); break;
            case '3': currentActions.spatial3D?.(); break;
          }
        }

        // Shift + key shortcuts
        if (e.shiftKey && !isCtrlOrCmd && !e.altKey) {
          switch (e.key.toLowerCase()) {
            case 'x': currentActions.drawToShape?.(); break;
            case 'r': currentActions.ruler?.(); break;
            case 'c': currentActions.colorPalette?.(); break;
            case 'f': currentActions.focusMode?.(); break;
            case 'a': currentActions.autoLayout?.(); break;
            case 't': currentActions.timeMachine?.(); break;
            case 'm': currentActions.freehandMath?.(); break;
            case '3': currentActions.spatial3D?.(); break;
          }
        }

        // Ctrl/Cmd + key shortcuts
        if (isCtrlOrCmd && !e.altKey) {
          switch (e.key.toLowerCase()) {
            case 'k':
              if (!e.shiftKey) currentActions.commandPalette?.();
              break;
            case 'f':
              if (!e.shiftKey) currentActions.findReplace?.();
              break;
            case 's':
              if (e.shiftKey) currentActions.saveAs?.();
              else currentActions.save?.();
              break;
            case 'o': currentActions.open?.(); break;
            case 'n':
              if (!e.shiftKey) currentActions.newFile?.();
              break;
            case 'p':
              if (!e.shiftKey && !e.altKey) currentActions.print?.();
              break;
            case ',':
            case 'comma':
              currentActions.preferences?.(); break;
            case 'e':
              if (e.shiftKey) currentActions.exportPng?.(); break;
            case 'i':
              if (e.shiftKey) currentActions.iconLibrary?.(); break;
          }
        }

        // Ctrl/Cmd + Shift + key shortcuts
        if (isCtrlOrCmd && e.shiftKey && !e.altKey) {
          switch (e.key.toLowerCase()) {
            case 'a': currentActions.localAiCopilot?.(); break;
            case 'f': currentActions.canvasQueryBar?.(); break;
            case 'm': currentActions.multiView?.(); break;
            case 'd': currentActions.formalSpecs?.(); break;
            case 's': currentActions.simulationCenter?.(); break;
            case 'h': currentActions.checkpoints?.(); break;
            case 'l': currentActions.languageStudio?.(); break;
            case 'p': currentActions.boardSearch?.(); break;
          }
        }

        // Alt + key shortcuts
        if (e.altKey && !isCtrlOrCmd) {
          switch (e.key.toLowerCase()) {
            case 'p': currentActions.prototypePlayer?.(); break;
            case 's': currentActions.screenShare?.(); break;
            case 'm': currentActions.voiceMute?.(); break;
          }
        }

        // Ctrl/Cmd + Alt + key shortcuts
        if (isCtrlOrCmd && e.altKey) {
          switch (e.key.toLowerCase()) {
            case 'p': currentActions.presentation?.(); break;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

// Hook for managing global window properties (tool states)
export function useWindowGlobals(globals) {
  const globalsRef = useRef(globals);
  globalsRef.current = globals;

  useEffect(() => {
    Object.entries(globalsRef.current).forEach(([key, value]) => {
      window[key] = value;
    });
    return () => {
      Object.keys(globalsRef.current).forEach(key => {
        delete window[key];
      });
    };
  }, []);
}