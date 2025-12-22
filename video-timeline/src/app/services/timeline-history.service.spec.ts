import { TestBed } from '@angular/core/testing';
import { TimelineHistoryService } from './timeline-history.service';
import { TimelineState, MediaType } from '../models/timeline.models';

describe('TimelineHistoryService', () => {
  let service: TimelineHistoryService;

  // Helper function to create a sample timeline state
  const createSampleState = (tracks: number = 2, items: number = 0): TimelineState => ({
    tracks: Array.from({ length: tracks }, (_, i) => ({
      id: `track-${i + 1}`,
      name: `Track ${i + 1}`,
      order: i,
      items: Array.from({ length: items }, (_, j) => ({
        id: `item-${i}-${j}`,
        type: MediaType.VIDEO,
        startTime: j * 5000,
        duration: 3000,
        trackId: `track-${i + 1}`,
        name: `Video ${j + 1}`,
        isPlaceholder: false
      }))
    })),
    playheadPosition: 0,
    zoomLevel: 50,
    totalDuration: 120000,
    selectedItemId: null
  });

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TimelineHistoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initial state', () => {
    it('should start with empty undo stack', () => {
      expect(service.canUndo()).toBeFalse();
      expect(service.undoCount()).toBe(0);
    });

    it('should start with empty redo stack', () => {
      expect(service.canRedo()).toBeFalse();
      expect(service.redoCount()).toBe(0);
    });
  });

  describe('pushState', () => {
    it('should add state to undo stack', () => {
      const state = createSampleState();
      service.pushState(state);

      expect(service.canUndo()).toBeTrue();
      expect(service.undoCount()).toBe(1);
    });

    it('should clear redo stack when pushing new state', () => {
      const state1 = createSampleState();
      const state2 = createSampleState(3);
      const state3 = createSampleState(1);

      service.pushState(state1);
      service.pushState(state2);
      service.undo(state3); // Creates redo entry

      expect(service.canRedo()).toBeTrue();

      // Push new state should clear redo stack
      service.pushState(state3);
      expect(service.canRedo()).toBeFalse();
      expect(service.redoCount()).toBe(0);
    });

    it('should deep clone state to avoid reference issues', () => {
      const state = createSampleState(1, 1);
      service.pushState(state);

      // Modify original state
      state.tracks[0].items[0].startTime = 99999;

      // Undo should return original values
      const undoneState = service.undo(createSampleState());
      expect(undoneState).not.toBeNull();
      expect(undoneState!.tracks[0].items[0].startTime).toBe(0);
    });

    it('should limit history size to MAX_HISTORY_SIZE', () => {
      // Push more than 100 states
      for (let i = 0; i < 110; i++) {
        service.pushState(createSampleState(i + 1));
      }

      // Should only keep last 100
      expect(service.undoCount()).toBe(100);
    });
  });

  describe('undo', () => {
    it('should return null when no undo available', () => {
      const result = service.undo(createSampleState());
      expect(result).toBeNull();
    });

    it('should return previous state and add current to redo stack', () => {
      const state1 = createSampleState(1);
      const state2 = createSampleState(2);
      const state3 = createSampleState(3);

      service.pushState(state1);
      service.pushState(state2);

      const undoneState = service.undo(state3);

      expect(undoneState).not.toBeNull();
      expect(undoneState!.tracks.length).toBe(2);
      expect(service.undoCount()).toBe(1);
      expect(service.canRedo()).toBeTrue();
      expect(service.redoCount()).toBe(1);
    });

    it('should allow multiple undos', () => {
      const state1 = createSampleState(1);
      const state2 = createSampleState(2);
      const state3 = createSampleState(3);

      service.pushState(state1);
      service.pushState(state2);

      let currentState = state3;
      let undoneState = service.undo(currentState);
      expect(undoneState!.tracks.length).toBe(2);

      currentState = undoneState!;
      undoneState = service.undo(currentState);
      expect(undoneState!.tracks.length).toBe(1);

      expect(service.undoCount()).toBe(0);
      expect(service.redoCount()).toBe(2);
    });
  });

  describe('redo', () => {
    it('should return null when no redo available', () => {
      const result = service.redo(createSampleState());
      expect(result).toBeNull();
    });

    it('should return next state and add current to undo stack', () => {
      const state1 = createSampleState(1);
      const state2 = createSampleState(2);
      const state3 = createSampleState(3);

      service.pushState(state1);
      service.pushState(state2);

      // Undo once
      const undoneState = service.undo(state3);

      // Redo
      const redoneState = service.redo(undoneState!);

      expect(redoneState).not.toBeNull();
      expect(redoneState!.tracks.length).toBe(3);
      expect(service.canRedo()).toBeFalse();
      expect(service.undoCount()).toBe(2);
    });

    it('should allow multiple redos', () => {
      const state1 = createSampleState(1);
      const state2 = createSampleState(2);
      const state3 = createSampleState(3);

      service.pushState(state1);
      service.pushState(state2);

      // Undo twice
      let currentState = state3;
      currentState = service.undo(currentState)!;
      currentState = service.undo(currentState)!;

      expect(service.redoCount()).toBe(2);

      // Redo twice
      let redoneState = service.redo(currentState);
      expect(redoneState!.tracks.length).toBe(1);

      currentState = redoneState!;
      redoneState = service.redo(currentState);
      expect(redoneState!.tracks.length).toBe(2);

      expect(service.redoCount()).toBe(0);
    });
  });

  describe('clearHistory', () => {
    it('should clear both undo and redo stacks', () => {
      const state1 = createSampleState(1);
      const state2 = createSampleState(2);
      const state3 = createSampleState(3);

      service.pushState(state1);
      service.pushState(state2);
      service.undo(state3); // Creates redo entry

      expect(service.canUndo()).toBeTrue();
      expect(service.canRedo()).toBeTrue();

      service.clearHistory();

      expect(service.canUndo()).toBeFalse();
      expect(service.canRedo()).toBeFalse();
      expect(service.undoCount()).toBe(0);
      expect(service.redoCount()).toBe(0);
    });
  });

  describe('undo/redo workflow', () => {
    it('should support a typical editing workflow', () => {
      // Start with initial state
      let currentState = createSampleState(2, 0);

      // Action 1: Add a media item
      service.pushState(currentState);
      currentState = createSampleState(2, 1);
      expect(service.undoCount()).toBe(1);

      // Action 2: Move the item
      service.pushState(currentState);
      const modifiedState = createSampleState(2, 1);
      modifiedState.tracks[0].items[0].startTime = 10000;
      currentState = modifiedState;
      expect(service.undoCount()).toBe(2);

      // Undo the move
      const afterUndo1 = service.undo(currentState);
      expect(afterUndo1!.tracks[0].items[0].startTime).toBe(0);
      expect(service.undoCount()).toBe(1);
      expect(service.redoCount()).toBe(1);

      // Redo the move
      const afterRedo = service.redo(afterUndo1!);
      expect(afterRedo!.tracks[0].items[0].startTime).toBe(10000);
      expect(service.undoCount()).toBe(2);
      expect(service.redoCount()).toBe(0);
    });
  });
});
