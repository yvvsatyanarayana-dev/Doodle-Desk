// Undo/Redo & Time Machine history management
// Stores snapshots of the element array with timestamp metadata

const MAX_HISTORY = 120;

export class HistoryManager {
  constructor() {
    this._undo = []; // Array of { snapshot: string, timestamp: number, count: number }
    this._redo = []; // Array of { snapshot: string, timestamp: number, count: number }
    this._lastCommit = null;
    this._lastElementsRef = null;
  }

  // Record current state (call after every committed action)
  record(elements) {
    if (this._lastElementsRef && this._lastElementsRef === elements) return;
    this._lastElementsRef = elements;
    const snapshot = JSON.stringify(elements);
    if (snapshot === this._lastCommit) return;
    this._lastCommit = snapshot;
    const entry = {
      snapshot,
      timestamp: Date.now(),
      count: Array.isArray(elements) ? elements.filter(el => !el.isDeleted).length : 0,
    };
    this._undo.push(entry);
    if (this._undo.length > MAX_HISTORY) this._undo.shift();
    this._redo = []; // clear redo stack on new action
  }

  undo(currentElements) {
    if (this._undo.length === 0) return null;
    const current = JSON.stringify(currentElements);
    this._redo.push({
      snapshot: current,
      timestamp: Date.now(),
      count: Array.isArray(currentElements) ? currentElements.filter(el => !el.isDeleted).length : 0,
    });
    const prev = this._undo.pop();
    this._lastCommit = prev.snapshot;
    return JSON.parse(prev.snapshot);
  }

  redo(currentElements) {
    if (this._redo.length === 0) return null;
    const current = JSON.stringify(currentElements);
    this._undo.push({
      snapshot: current,
      timestamp: Date.now(),
      count: Array.isArray(currentElements) ? currentElements.filter(el => !el.isDeleted).length : 0,
    });
    const next = this._redo.pop();
    this._lastCommit = next.snapshot;
    return JSON.parse(next.snapshot);
  }

  canUndo() { return this._undo.length > 0; }
  canRedo() { return this._redo.length > 0; }

  clear() {
    this._undo = [];
    this._redo = [];
    this._lastCommit = null;
  }

  // ── Time Machine Support ──
  getTimeline(currentElements) {
    const timeline = [];
    // Previous states
    for (let i = 0; i < this._undo.length; i++) {
      const item = this._undo[i];
      timeline.push({
        index: i,
        timestamp: item.timestamp,
        count: item.count,
        isCurrent: false,
      });
    }

    // Current state
    const currentIndex = timeline.length;
    timeline.push({
      index: currentIndex,
      timestamp: Date.now(),
      count: Array.isArray(currentElements) ? currentElements.filter(el => !el.isDeleted).length : 0,
      isCurrent: true,
    });

    // Future redo states
    for (let i = this._redo.length - 1; i >= 0; i--) {
      const item = this._redo[i];
      timeline.push({
        index: timeline.length,
        timestamp: item.timestamp,
        count: item.count,
        isCurrent: false,
      });
    }

    return {
      steps: timeline,
      currentIndex,
    };
  }

  // Get elements for preview at a specific step without altering undo/redo permanently
  peekSnapshot(index, currentElements) {
    if (index < 0) return null;
    if (index < this._undo.length) {
      return JSON.parse(this._undo[index].snapshot);
    }
    if (index === this._undo.length) {
      return currentElements;
    }
    const redoIndex = this._redo.length - 1 - (index - this._undo.length - 1);
    if (redoIndex >= 0 && redoIndex < this._redo.length) {
      return JSON.parse(this._redo[redoIndex].snapshot);
    }
    return null;
  }

  // Restore history state to a given timeline index
  restoreTo(index, currentElements) {
    const target = this.peekSnapshot(index, currentElements);
    if (!target) return null;

    // Flatten all states into a single sequential list up to index
    const all = [...this._undo];
    all.push({
      snapshot: JSON.stringify(currentElements),
      timestamp: Date.now(),
      count: Array.isArray(currentElements) ? currentElements.filter(el => !el.isDeleted).length : 0,
    });
    for (let i = this._redo.length - 1; i >= 0; i--) {
      all.push(this._redo[i]);
    }

    const clampedIndex = Math.max(0, Math.min(index, all.length - 1));
    this._undo = all.slice(0, clampedIndex);
    this._redo = all.slice(clampedIndex + 1).reverse();
    this._lastCommit = JSON.stringify(target);

    return target;
  }
}
