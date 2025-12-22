import { Component, signal, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

/** Tracks progress bar state for a notification */
interface NotificationTimerState {
  animationFrameId: number | null;
  startTime: number;
  remainingTime: number;
  isPaused: boolean;
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
  private readonly ngZone = inject(NgZone);

  // Internal state
  readonly notifications = signal<Notification[]>([]);

  // Track timers and progress for each notification
  private timerStates = new Map<string, NotificationTimerState>();

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
      animationFrameId: null,
      startTime: Date.now(),
      remainingTime: this.AUTO_DISMISS_DELAY,
      isPaused: false
    });

    // Initialize progress at 100%
    this.progressMap.update(map => {
      const newMap = new Map(map);
      newMap.set(id, 100);
      return newMap;
    });

    this.notifications.update(list => [...list, notification]);
    this.startProgressAnimation(id);
  }

  /**
   * Remove a notification by ID
   */
  dismissNotification(id: string): void {
    this.stopProgressAnimation(id);
    this.timerStates.delete(id);
    this.notifications.update(list => list.filter(n => n.id !== id));

    // Clean up progress map
    this.progressMap.update(map => {
      const newMap = new Map(map);
      newMap.delete(id);
      return newMap;
    });

  }

  /**
   * Called when mouse enters the notification - pause the timer and progress bar
   */
  onNotificationMouseEnter(id: string): void {
    const state = this.timerStates.get(id);
    if (state && !state.isPaused) {
      // Calculate remaining time based on elapsed time since last start
      const elapsed = Date.now() - state.startTime;
      state.remainingTime = Math.max(0, state.remainingTime - elapsed);
      state.isPaused = true;

      // Stop the animation loop
      this.stopProgressAnimation(id);
    }
  }

  /**
   * Called when mouse leaves the notification - continue the timer from remaining time
   */
  onNotificationMouseLeave(id: string): void {
    const state = this.timerStates.get(id);
    if (state && state.isPaused) {
      state.isPaused = false;
      state.startTime = Date.now();

      // Resume the animation loop
      this.startProgressAnimation(id);
    }
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
   * Get progress percentage for a notification
   */
  getProgress(id: string): number {
    return this.progressMap().get(id) ?? 100;
  }

  /**
   * Start the progress bar animation using requestAnimationFrame.
   * This provides smooth animation and precise timing synchronization
   * between the visual progress bar and the dismiss timer.
   */
  private startProgressAnimation(id: string): void {
    const state = this.timerStates.get(id);
    if (!state) return;

    // Cancel any existing animation
    this.stopProgressAnimation(id);

    const animate = (): void => {
      const currentState = this.timerStates.get(id);
      if (!currentState || currentState.isPaused) return;

      const elapsed = Date.now() - currentState.startTime;
      const remaining = Math.max(0, currentState.remainingTime - elapsed);
      const progressPercent = (remaining / this.AUTO_DISMISS_DELAY) * 100;

      // Update progress in the map
      this.progressMap.update(map => {
        const newMap = new Map(map);
        newMap.set(id, progressPercent);
        return newMap;
      });

      // Dismiss when progress reaches 0
      if (remaining <= 0) {
        this.dismissNotification(id);
        return;
      }

      // Continue animation loop outside Angular zone for performance
      this.ngZone.runOutsideAngular(() => {
        currentState.animationFrameId = requestAnimationFrame(() => {
          this.ngZone.run(() => animate());
        });
      });
    };

    animate();
  }

  /**
   * Stop the progress bar animation
   */
  private stopProgressAnimation(id: string): void {
    const state = this.timerStates.get(id);
    if (state?.animationFrameId !== null && state?.animationFrameId !== undefined) {
      cancelAnimationFrame(state.animationFrameId);
      state.animationFrameId = null;
    }
  }
}
