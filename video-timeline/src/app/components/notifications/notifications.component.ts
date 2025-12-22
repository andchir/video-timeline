import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

/** Tracks progress bar state for a notification */
interface NotificationTimerState {
  timer: ReturnType<typeof setTimeout> | null;
  startTime: number;
  remainingTime: number;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css'
})
export class NotificationsComponent {
  private readonly AUTO_DISMISS_DELAY = 4000; // 4 seconds

  // Internal state
  readonly notifications = signal<Notification[]>([]);

  // Track timers and progress for each notification
  private timerStates = new Map<string, NotificationTimerState>();

  // Track paused state for progress bar CSS animation
  readonly pausedNotifications = signal<Set<string>>(new Set());

  // Track progress percentage for each notification (0-100)
  readonly progressMap = signal<Map<string, number>>(new Map());

  /**
   * Show a notification that auto-dismisses after 4 seconds.
   * Timer pauses on hover and continues from remaining time when cursor leaves.
   */
  showNotification(message: string, type: Notification['type'] = 'info'): void {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const notification: Notification = { id, message, type };

    // Initialize timer state with full duration
    this.timerStates.set(id, {
      timer: null,
      startTime: Date.now(),
      remainingTime: this.AUTO_DISMISS_DELAY
    });

    // Initialize progress at 100%
    this.progressMap.update(map => {
      const newMap = new Map(map);
      newMap.set(id, 100);
      return newMap;
    });

    this.notifications.update(list => [...list, notification]);
    this.startDismissTimer(id);
  }

  /**
   * Remove a notification by ID
   */
  dismissNotification(id: string): void {
    this.clearDismissTimer(id);
    this.timerStates.delete(id);
    this.notifications.update(list => list.filter(n => n.id !== id));

    // Clean up progress map
    this.progressMap.update(map => {
      const newMap = new Map(map);
      newMap.delete(id);
      return newMap;
    });

    // Clean up paused state
    this.pausedNotifications.update(set => {
      const newSet = new Set(set);
      newSet.delete(id);
      return newSet;
    });
  }

  /**
   * Called when mouse enters the notification - pause the timer and progress bar
   */
  onNotificationMouseEnter(id: string): void {
    const state = this.timerStates.get(id);
    if (state) {
      // Calculate remaining time
      const elapsed = Date.now() - state.startTime;
      state.remainingTime = Math.max(0, state.remainingTime - elapsed);

      // Update progress percentage based on remaining time
      const progressPercent = (state.remainingTime / this.AUTO_DISMISS_DELAY) * 100;
      this.progressMap.update(map => {
        const newMap = new Map(map);
        newMap.set(id, progressPercent);
        return newMap;
      });
    }

    // Clear the timer
    this.clearDismissTimer(id);

    // Mark as paused for CSS animation
    this.pausedNotifications.update(set => {
      const newSet = new Set(set);
      newSet.add(id);
      return newSet;
    });
  }

  /**
   * Called when mouse leaves the notification - continue the timer from remaining time
   */
  onNotificationMouseLeave(id: string): void {
    // Unmark as paused
    this.pausedNotifications.update(set => {
      const newSet = new Set(set);
      newSet.delete(id);
      return newSet;
    });

    this.startDismissTimer(id);
  }

  /**
   * Get the icon class for a notification type
   */
  getNotificationIcon(type: Notification['type']): string {
    switch (type) {
      case 'success':
        return 'bi-check-circle-fill';
      case 'warning':
        return 'bi-exclamation-triangle-fill';
      case 'error':
        return 'bi-x-circle-fill';
      case 'info':
      default:
        return 'bi-info-circle-fill';
    }
  }

  /**
   * Get the progress bar color based on notification type
   */
  getProgressColor(type: Notification['type']): string {
    switch (type) {
      case 'success':
        return '#22c55e';
      case 'warning':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      case 'info':
      default:
        return '#3b82f6';
    }
  }

  /**
   * Check if a notification progress bar is paused
   */
  isNotificationPaused(id: string): boolean {
    return this.pausedNotifications().has(id);
  }

  /**
   * Get progress percentage for a notification
   */
  getProgress(id: string): number {
    return this.progressMap().get(id) ?? 100;
  }

  /**
   * Get animation duration based on remaining time (for CSS)
   */
  getAnimationDuration(id: string): number {
    const state = this.timerStates.get(id);
    return state ? state.remainingTime : this.AUTO_DISMISS_DELAY;
  }

  private startDismissTimer(id: string): void {
    this.clearDismissTimer(id);

    const state = this.timerStates.get(id);
    if (!state) return;

    // Update start time for this run
    state.startTime = Date.now();

    // Set timer for remaining time
    const timer = setTimeout(() => {
      this.dismissNotification(id);
    }, state.remainingTime);

    state.timer = timer;
  }

  private clearDismissTimer(id: string): void {
    const state = this.timerStates.get(id);
    if (state?.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
  }
}
