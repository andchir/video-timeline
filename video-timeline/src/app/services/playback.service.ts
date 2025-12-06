import { Injectable, signal, computed } from '@angular/core';
import { MediaItem, MediaType, Track } from '../models/timeline.models';

/**
 * Represents an active media element being played
 */
export interface ActiveMedia {
  item: MediaItem;
  element: HTMLVideoElement | HTMLAudioElement | HTMLImageElement;
  trackOrder: number; // For layering: higher order = rendered first (bottom layer)
}

/**
 * Service responsible for managing real media playback.
 * Handles synchronization of media elements with timeline playhead position.
 */
@Injectable({
  providedIn: 'root'
})
export class PlaybackService {
  // Playback state
  private _isPlaying = signal<boolean>(false);
  private _playheadPosition = signal<number>(0);
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;

  // Active media elements
  private activeMediaMap = new Map<string, ActiveMedia>();

  // Canvas reference for rendering
  private canvas: HTMLCanvasElement | null = null;
  private canvasContext: CanvasRenderingContext2D | null = null;

  // Exposed signals
  readonly isPlaying = this._isPlaying.asReadonly();
  readonly playheadPosition = this._playheadPosition.asReadonly();

  // Computed: current active media items for rendering
  readonly activeMediaItems = computed(() => {
    return Array.from(this.activeMediaMap.values())
      .sort((a, b) => b.trackOrder - a.trackOrder);
  });

  constructor() {}

  /**
   * Set the canvas element for rendering video/image preview
   */
  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.canvasContext = canvas.getContext('2d');
  }

  /**
   * Update playhead position (called from timeline component)
   */
  setPlayheadPosition(position: number): void {
    this._playheadPosition.set(position);
  }

  /**
   * Start playback
   */
  play(tracks: Track[], totalDuration: number): void {
    if (this._isPlaying()) return;

    this._isPlaying.set(true);

    // Start playing any already-loaded media elements
    for (const activeMedia of this.activeMediaMap.values()) {
      if (activeMedia.element instanceof HTMLVideoElement) {
        const videoElement = activeMedia.element as HTMLVideoElement;
        videoElement.play().catch(() => {
          // Autoplay may be blocked, try muted
          videoElement.muted = true;
          videoElement.play().catch(() => {});
        });
      } else if (activeMedia.element instanceof HTMLAudioElement) {
        activeMedia.element.play().catch(() => {});
      }
    }

    this.lastFrameTime = performance.now();
    this.startPlaybackLoop(tracks, totalDuration);
  }

  /**
   * Pause playback
   */
  pause(): void {
    this._isPlaying.set(false);
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Pause all active media
    for (const activeMedia of this.activeMediaMap.values()) {
      if (activeMedia.element instanceof HTMLVideoElement ||
          activeMedia.element instanceof HTMLAudioElement) {
        activeMedia.element.pause();
      }
    }
  }

  /**
   * Stop playback and reset position
   */
  stop(): void {
    this.pause();
    this._playheadPosition.set(0);
    this.cleanupAllMedia();
  }

  /**
   * Main playback loop - advances playhead and synchronizes media
   */
  private startPlaybackLoop(tracks: Track[], totalDuration: number): void {
    const animate = (currentTime: number) => {
      if (!this._isPlaying()) return;

      // Calculate delta time
      const deltaTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;

      // Update playhead position
      let newPosition = this._playheadPosition() + deltaTime;

      // Check if we've reached the end
      if (newPosition >= totalDuration) {
        newPosition = totalDuration;
        this.pause();
      }

      this._playheadPosition.set(newPosition);

      // Synchronize media with new position
      this.synchronizeMedia(tracks, newPosition);

      // Render to canvas
      this.renderToCanvas();

      // Continue animation loop
      if (this._isPlaying()) {
        this.animationFrameId = requestAnimationFrame(animate);
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Synchronize media elements with the current playhead position.
   * Start/stop media as playhead enters/exits their time range.
   */
  private synchronizeMedia(tracks: Track[], playheadTime: number): void {
    // Collect all items that should be active at current time
    const shouldBeActive = new Map<string, { item: MediaItem; trackOrder: number }>();

    for (const track of tracks) {
      for (const item of track.items) {
        const itemEnd = item.startTime + item.duration;

        // Check if playhead is within item's time range
        if (playheadTime >= item.startTime && playheadTime < itemEnd) {
          // Skip placeholders without URL
          if (item.isPlaceholder || !item.url) continue;

          shouldBeActive.set(item.id, { item, trackOrder: track.order });
        }
      }
    }

    // Stop media that should no longer be active
    for (const [id, activeMedia] of this.activeMediaMap.entries()) {
      if (!shouldBeActive.has(id)) {
        this.stopMedia(activeMedia);
        this.activeMediaMap.delete(id);
      }
    }

    // Start or update media that should be active
    for (const [id, { item, trackOrder }] of shouldBeActive.entries()) {
      if (!this.activeMediaMap.has(id)) {
        // Start new media
        this.startMedia(item, trackOrder, playheadTime);
      } else {
        // Update existing media position if needed
        this.updateMediaPosition(this.activeMediaMap.get(id)!, playheadTime);
      }
    }
  }

  /**
   * Start playing a media item
   */
  private startMedia(item: MediaItem, trackOrder: number, playheadTime: number): void {
    if (!item.url) return;

    const mediaStartTime = item.mediaStartTime || 0;
    const offsetInItem = playheadTime - item.startTime;
    const mediaTime = (mediaStartTime + offsetInItem) / 1000; // Convert to seconds

    let element: HTMLVideoElement | HTMLAudioElement | HTMLImageElement;

    switch (item.type) {
      case MediaType.VIDEO:
        element = document.createElement('video');
        (element as HTMLVideoElement).src = item.url;
        (element as HTMLVideoElement).currentTime = mediaTime;
        (element as HTMLVideoElement).muted = false;
        // Only play if playback is active
        if (this._isPlaying()) {
          (element as HTMLVideoElement).play().catch(() => {
            // Autoplay may be blocked, try muted
            (element as HTMLVideoElement).muted = true;
            (element as HTMLVideoElement).play().catch(() => {});
          });
        }
        break;

      case MediaType.AUDIO:
        element = document.createElement('audio');
        (element as HTMLAudioElement).src = item.url;
        (element as HTMLAudioElement).currentTime = mediaTime;
        // Only play if playback is active
        if (this._isPlaying()) {
          (element as HTMLAudioElement).play().catch(() => {});
        }
        break;

      case MediaType.IMAGE:
        element = document.createElement('img');
        (element as HTMLImageElement).src = item.url;
        (element as HTMLImageElement).crossOrigin = 'anonymous';
        break;

      default:
        return;
    }

    // For video, also set crossOrigin for canvas rendering
    if (element instanceof HTMLVideoElement) {
      element.crossOrigin = 'anonymous';
    }

    this.activeMediaMap.set(item.id, { item, element, trackOrder });
  }

  /**
   * Stop and cleanup a media element
   */
  private stopMedia(activeMedia: ActiveMedia): void {
    const { element } = activeMedia;

    if (element instanceof HTMLVideoElement || element instanceof HTMLAudioElement) {
      element.pause();
      element.src = '';
      element.load();
    }
  }

  /**
   * Update media playback position if it's out of sync
   */
  private updateMediaPosition(activeMedia: ActiveMedia, playheadTime: number): void {
    const { item, element } = activeMedia;

    if (element instanceof HTMLVideoElement || element instanceof HTMLAudioElement) {
      const mediaStartTime = item.mediaStartTime || 0;
      const offsetInItem = playheadTime - item.startTime;
      const expectedMediaTime = (mediaStartTime + offsetInItem) / 1000;
      const currentMediaTime = element.currentTime;

      // If more than 0.3 seconds out of sync, seek to correct position
      if (Math.abs(currentMediaTime - expectedMediaTime) > 0.3) {
        element.currentTime = expectedMediaTime;
      }
    }
  }

  /**
   * Render active media to canvas with proper layering
   */
  private renderToCanvas(): void {
    if (!this.canvas || !this.canvasContext) return;

    const ctx = this.canvasContext;
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Get active media sorted by track order (higher order = bottom layer)
    const sortedMedia = Array.from(this.activeMediaMap.values())
      .sort((a, b) => b.trackOrder - a.trackOrder);

    // Render each media item
    for (const activeMedia of sortedMedia) {
      this.renderMediaItem(activeMedia, ctx, canvasWidth, canvasHeight);
    }
  }

  /**
   * Render a single media item to canvas with proper scaling
   */
  private renderMediaItem(
    activeMedia: ActiveMedia,
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    const { element, item } = activeMedia;

    // Only render video and image types
    if (item.type === MediaType.AUDIO) return;

    let source: CanvasImageSource | null = null;
    let sourceWidth = 0;
    let sourceHeight = 0;

    if (element instanceof HTMLVideoElement) {
      // Check if video has loaded enough to render
      if (element.readyState < 2) return;
      source = element;
      sourceWidth = element.videoWidth;
      sourceHeight = element.videoHeight;
    } else if (element instanceof HTMLImageElement) {
      // Check if image is loaded
      if (!element.complete || element.naturalWidth === 0) return;
      source = element;
      sourceWidth = element.naturalWidth;
      sourceHeight = element.naturalHeight;
    }

    if (!source || sourceWidth === 0 || sourceHeight === 0) return;

    // Calculate scaled dimensions maintaining aspect ratio
    const { width, height, x, y } = this.calculateScaledDimensions(
      sourceWidth,
      sourceHeight,
      canvasWidth,
      canvasHeight
    );

    // Draw the media
    ctx.drawImage(source, x, y, width, height);
  }

  /**
   * Calculate dimensions for media that fit within canvas while preserving aspect ratio
   */
  private calculateScaledDimensions(
    sourceWidth: number,
    sourceHeight: number,
    canvasWidth: number,
    canvasHeight: number
  ): { width: number; height: number; x: number; y: number } {
    const sourceAspect = sourceWidth / sourceHeight;
    const canvasAspect = canvasWidth / canvasHeight;

    let width: number;
    let height: number;

    if (sourceAspect > canvasAspect) {
      // Source is wider - fit to width
      width = canvasWidth;
      height = canvasWidth / sourceAspect;
    } else {
      // Source is taller - fit to height
      height = canvasHeight;
      width = canvasHeight * sourceAspect;
    }

    // Center the media
    const x = (canvasWidth - width) / 2;
    const y = (canvasHeight - height) / 2;

    return { width, height, x, y };
  }

  /**
   * Cleanup all active media
   */
  private cleanupAllMedia(): void {
    for (const activeMedia of this.activeMediaMap.values()) {
      this.stopMedia(activeMedia);
    }
    this.activeMediaMap.clear();
  }

  /**
   * Seek to a specific position and update media accordingly
   */
  seek(tracks: Track[], position: number): void {
    this._playheadPosition.set(position);

    // Update all active media positions
    for (const activeMedia of this.activeMediaMap.values()) {
      const { item, element } = activeMedia;
      const itemEnd = item.startTime + item.duration;

      // Check if media should still be active at new position
      if (position < item.startTime || position >= itemEnd) {
        // Media should no longer be active
        this.stopMedia(activeMedia);
        this.activeMediaMap.delete(item.id);
      } else if (element instanceof HTMLVideoElement || element instanceof HTMLAudioElement) {
        // Seek to correct position in media
        const mediaStartTime = item.mediaStartTime || 0;
        const offsetInItem = position - item.startTime;
        element.currentTime = (mediaStartTime + offsetInItem) / 1000;
      }
    }

    // Synchronize to add any new media that should be active
    this.synchronizeMedia(tracks, position);

    // Render current frame
    this.renderToCanvas();
  }

  /**
   * Force render the current state to canvas (useful when paused)
   */
  renderCurrentFrame(): void {
    this.renderToCanvas();
  }
}
