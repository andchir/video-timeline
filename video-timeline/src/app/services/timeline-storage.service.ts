import { Injectable } from '@angular/core';
import { TimelineState } from '../models/timeline.models';

@Injectable({
  providedIn: 'root'
})
export class TimelineStorageService {
  private readonly STORAGE_KEY = 'video-timeline-state';

  /**
   * Save timeline state to LocalStorage
   */
  saveState(state: TimelineState): void {
    try {
      const serialized = JSON.stringify(state);
      localStorage.setItem(this.STORAGE_KEY, serialized);
    } catch (error) {
      console.error('Failed to save timeline state to LocalStorage:', error);
    }
  }

  /**
   * Load timeline state from LocalStorage
   * Returns null if no saved state exists or if loading fails
   */
  loadState(): TimelineState | null {
    try {
      const serialized = localStorage.getItem(this.STORAGE_KEY);
      if (serialized) {
        return JSON.parse(serialized) as TimelineState;
      }
      return null;
    } catch (error) {
      console.error('Failed to load timeline state from LocalStorage:', error);
      return null;
    }
  }

  /**
   * Clear timeline state from LocalStorage
   */
  clearState(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear timeline state from LocalStorage:', error);
    }
  }

  /**
   * Check if saved state exists
   */
  hasSavedState(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) !== null;
  }
}
