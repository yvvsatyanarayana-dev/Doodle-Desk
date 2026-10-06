// Undo/Redo history management
// Stores snapshots of the element array

const MAX_HISTORY = 100;

export class HistoryManager {
  constructor() {
    this._undo = [];
    this._redo = [];
    this._lastCommit = null;
  }

  // Record current state (call after every committed action)
  record(elements) {
    const snapshot = JSON.stringify(elements);
    if (snapshot === this._lastCommit) return;
    this._lastCommit = snapshot;
    this._undo.push(snapshot);
    if (this._undo.length > MAX_HISTORY) this._undo.shift();
    this._redo = []; // clear redo stack on new action
  }

  undo(currentElements) {
    if (this._undo.length === 0) return null;
    const current = JSON.stringify(currentElements);
    this._redo.push(current);
    const prev = this._undo.pop();
    this._lastCommit = prev;
    return JSON.parse(prev);
  }

  redo(currentElements) {
    if (this._redo.length === 0) return null;
    const current = JSON.stringify(currentElements);
    this._undo.push(current);
    const next = this._redo.pop();
    this._lastCommit = next;
    return JSON.parse(next);
  }

  canUndo() { return this._undo.length > 0; }
  canRedo() { return this._redo.length > 0; }
  clear() { this._undo = []; this._redo = []; this._lastCommit = null; }
}
