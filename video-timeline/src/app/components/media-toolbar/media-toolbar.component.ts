import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-media-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './media-toolbar.component.html',
  styleUrl: './media-toolbar.component.css'
})
export class MediaToolbarComponent {
  // Input: whether a media item is selected
  readonly isVisible = input<boolean>(false);

  // Output events for toolbar actions
  readonly trimMedia = output<void>();

  onTrimClick(): void {
    this.trimMedia.emit();
  }
}
