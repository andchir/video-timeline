import { Component, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaType } from '../../models/timeline.models';

export interface MediaLibraryItem {
  id: string;
  name: string;
  type: MediaType;
  duration: number; // milliseconds
  url?: string; // URL to the actual media file
  thumbnail?: string;
}

@Component({
  selector: 'app-media-library',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './media-library.component.html',
  styleUrl: './media-library.component.css'
})
export class MediaLibraryComponent {
  // Events
  readonly closeModal = output<void>();
  readonly selectMedia = output<MediaLibraryItem>();

  // State
  readonly selectedFilter = signal<MediaType | 'all'>('all');

  // Static media library data
  private readonly allMediaItems: MediaLibraryItem[] = [
    // Videos
    {
      id: 'video-1',
      name: 'video.mp4',
      type: MediaType.VIDEO,
      duration: 12000, // 12 seconds
      url: 'https://andchir.github.io/video-timeline/video.mp4'
    },
    // Audio
    {
      id: 'audio-1',
      name: 'audio.mp3',
      type: MediaType.AUDIO,
      duration: 88000, // 1 minute 28 seconds
      url: 'https://andchir.github.io/video-timeline/audio.mp3'
    },
    // Images
    {
      id: 'image-1',
      name: 'image.jpg',
      type: MediaType.IMAGE,
      duration: 5000, // 5 seconds default
      url: 'https://andchir.github.io/video-timeline/image.jpg'
    }
  ];

  // Computed filtered media items
  readonly filteredMediaItems = computed(() => {
    const filter = this.selectedFilter();
    if (filter === 'all') {
      return this.allMediaItems;
    }
    return this.allMediaItems.filter(item => item.type === filter);
  });

  // Expose MediaType enum to template
  readonly MediaType = MediaType;

  // Filter methods
  setFilter(filter: MediaType | 'all'): void {
    this.selectedFilter.set(filter);
  }

  // Action methods
  onSelectMedia(item: MediaLibraryItem): void {
    this.selectMedia.emit(item);
  }

  onClose(): void {
    this.closeModal.emit();
  }

  // Helper method to format duration
  formatTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Helper method to get icon class for media type
  getMediaIcon(type: MediaType): string {
    switch (type) {
      case MediaType.VIDEO:
        return 'bi-camera-video-fill';
      case MediaType.AUDIO:
        return 'bi-volume-up-fill';
      case MediaType.IMAGE:
        return 'bi-image-fill';
      default:
        return 'bi-file-earmark';
    }
  }
}
