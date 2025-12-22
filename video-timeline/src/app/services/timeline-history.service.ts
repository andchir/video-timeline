import { Injectable, signal, computed } from '@angular/core';
import { TimelineState } from '../models/timeline.models';

/**
 * Service for managing undo/redo history of timeline state.
 * Maintains a stack of state snapshots that can be navigated.
 */
@Injectable({
  providedIn: 'root'
})
export class TimelineHistoryService {
  // Maximum number of states to keep in history
  private readonly MAX_HISTORY_SIZE = 100;

  // Array of past states (for undo)
  private readonly undoStack = signal<TimelineState[]>([]);

  // Array of future states (for redo)
  private readonly redoStack = signal<TimelineState[]>([]);

  // Computed values for checking if undo/redo is available
  readonly canUndo = computed(() => this.undoStack().length > 0);
  readonly canRedo = computed(() => this.redoStack().length > 0);

  // Count of available undo/redo steps (useful for UI)
  readonly undoCount = computed(() => this.undoStack().length);
  readonly redoCount = computed(() => this.redoStack().length);

  /**
   * Push a state onto the history stack.
   * This should be called before making any change to the state.
   * Clears the redo stack since a new action invalidates future states.
   */
  pushState(state: TimelineState): void {
    // Deep clone the state to avoid reference issues
    const clonedState = this.cloneState(state);

    this.undoStack.update(stack => {
      const newStack = [...stack, clonedState];
      // Limit history size
      if (newStack.length > this.MAX_HISTORY_SIZE) {
        return newStack.slice(-this.MAX_HISTORY_SIZE);
      }
      return newStack;
    });

    // Clear redo stack when a new action is performed
    this.redoStack.set([]);
  }

  /**
   * Undo the last action.
   * Returns the previous state, or null if no undo is available.
   * The current state should be passed so it can be pushed onto the redo stack.
   */
  undo(currentState: TimelineState): TimelineState | null {
    const stack = this.undoStack();
    if (stack.length === 0) {
      return null;
    }

    // Get the last state from undo stack
    const previousState = stack[stack.length - 1];

    // Remove the last state from undo stack
    this.undoStack.update(s => s.slice(0, -1));

    // Push current state onto redo stack
    this.redoStack.update(s => [...s, this.cloneState(currentState)]);

    return this.cloneState(previousState);
  }

  /**
   * Redo the last undone action.
   * Returns the next state, or null if no redo is available.
   * The current state should be passed so it can be pushed back onto the undo stack.
   */
  redo(currentState: TimelineState): TimelineState | null {
    const stack = this.redoStack();
    if (stack.length === 0) {
      return null;
    }

    // Get the last state from redo stack
    const nextState = stack[stack.length - 1];

    // Remove the last state from redo stack
    this.redoStack.update(s => s.slice(0, -1));

    // Push current state onto undo stack
    this.undoStack.update(s => [...s, this.cloneState(currentState)]);

    return this.cloneState(nextState);
  }

  /**
   * Clear all history.
   * Useful when starting a new project or loading a different state.
   */
  clearHistory(): void {
    this.undoStack.set([]);
    this.redoStack.set([]);
  }

  /**
   * Deep clone the timeline state to prevent reference issues.
   */
  private cloneState(state: TimelineState): TimelineState {
    return JSON.parse(JSON.stringify(state));
  }
}
