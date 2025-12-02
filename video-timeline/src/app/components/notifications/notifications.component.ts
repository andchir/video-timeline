import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
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

  // Track timers for each notification
  private dismissTimers = new Map<string, ReturnType<typeof setTimeout>>();

  /**
   * Show a notification that auto-dismisses after 4 seconds.
   * Timer resets on hover and restarts when cursor leaves.
   */
  showNotification(message: string, type: Notification['type'] = 'info'): void {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const notification: Notification = { id, message, type };

    this.notifications.update(list => [...list, notification]);
    this.startDismissTimer(id);
  }

  /**
   * Remove a notification by ID
   */
  dismissNotification(id: string): void {
    this.clearDismissTimer(id);
    this.notifications.update(list => list.filter(n => n.id !== id));
  }

  /**
   * Called when mouse enters the notification - pause the timer
   */
  onNotificationMouseEnter(id: string): void {
    this.clearDismissTimer(id);
  }

  /**
   * Called when mouse leaves the notification - restart the timer from zero
   */
  onNotificationMouseLeave(id: string): void {
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

  private startDismissTimer(id: string): void {
    this.clearDismissTimer(id);
    const timer = setTimeout(() => {
      this.dismissNotification(id);
    }, this.AUTO_DISMISS_DELAY);
    this.dismissTimers.set(id, timer);
  }

  private clearDismissTimer(id: string): void {
    const timer = this.dismissTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.dismissTimers.delete(id);
    }
  }
}
