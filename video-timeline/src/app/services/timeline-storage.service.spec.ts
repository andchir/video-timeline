import { TestBed } from '@angular/core/testing';
import { TimelineStorageService } from './timeline-storage.service';
import { TimelineState } from '../models/timeline.models';

describe('TimelineStorageService', () => {
  let service: TimelineStorageService;
  const mockState: TimelineState = {
    tracks: [
      { id: '1', name: 'Track 1', order: 0, items: [] }
    ],
    playheadPosition: 5000,
    zoomLevel: 50,
    totalDuration: 120000,
    selectedItemId: null
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TimelineStorageService);
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should save state to localStorage', () => {
    service.saveState(mockState);
    const saved = localStorage.getItem('video-timeline-state');
    expect(saved).toBeTruthy();
    expect(JSON.parse(saved!)).toEqual(mockState);
  });

  it('should load state from localStorage', () => {
    localStorage.setItem('video-timeline-state', JSON.stringify(mockState));
    const loaded = service.loadState();
    expect(loaded).toEqual(mockState);
  });

  it('should return null when no saved state exists', () => {
    const loaded = service.loadState();
    expect(loaded).toBeNull();
  });

  it('should clear state from localStorage', () => {
    service.saveState(mockState);
    expect(localStorage.getItem('video-timeline-state')).toBeTruthy();

    service.clearState();
    expect(localStorage.getItem('video-timeline-state')).toBeNull();
  });

  it('should check if saved state exists', () => {
    expect(service.hasSavedState()).toBeFalse();

    service.saveState(mockState);
    expect(service.hasSavedState()).toBeTrue();

    service.clearState();
    expect(service.hasSavedState()).toBeFalse();
  });

  it('should handle errors gracefully when localStorage is unavailable', () => {
    // Mock localStorage to throw an error
    spyOn(localStorage, 'setItem').and.throwError('Storage unavailable');
    spyOn(console, 'error');

    // Should not throw, just log error
    expect(() => service.saveState(mockState)).not.toThrow();
    expect(console.error).toHaveBeenCalled();
  });
});
