/**
 * Experiment to verify that issue #114 is fixed:
 * Audio and video should NOT auto-play when added to timeline.
 * They should only play when the Play button is pressed.
 *
 * This test verifies:
 * 1. When media is added (via seek), it should NOT call .play()
 * 2. When Play button is pressed, it SHOULD call .play() on loaded media
 * 3. When paused, media should call .pause()
 */

describe('Issue 114: Media should not auto-play', () => {
  let playbackService: any;
  let mockTracks: any[];
  let mockVideoElement: any;
  let mockAudioElement: any;

  beforeEach(() => {
    // Mock media elements
    mockVideoElement = {
      play: jasmine.createSpy('play').and.returnValue(Promise.resolve()),
      pause: jasmine.createSpy('pause'),
      src: '',
      currentTime: 0,
      muted: false,
      readyState: 4,
      videoWidth: 1920,
      videoHeight: 1080,
      crossOrigin: ''
    };

    mockAudioElement = {
      play: jasmine.createSpy('play').and.returnValue(Promise.resolve()),
      pause: jasmine.createSpy('pause'),
      src: '',
      currentTime: 0
    };

    // Mock document.createElement
    spyOn(document, 'createElement').and.callFake((tagName: string) => {
      if (tagName === 'video') {
        return { ...mockVideoElement };
      } else if (tagName === 'audio') {
        return { ...mockAudioElement };
      }
      return document.createElement(tagName);
    });

    // Setup mock tracks with media items
    mockTracks = [
      {
        id: '1',
        name: 'Track 1',
        order: 0,
        items: [
          {
            id: 'video1',
            type: 'video',
            startTime: 0,
            duration: 5000,
            trackId: '1',
            name: 'Test Video',
            url: 'test-video.mp4',
            isPlaceholder: false
          },
          {
            id: 'audio1',
            type: 'audio',
            startTime: 5000,
            duration: 3000,
            trackId: '1',
            name: 'Test Audio',
            url: 'test-audio.mp3',
            isPlaceholder: false
          }
        ]
      }
    ];
  });

  it('should NOT auto-play video when seeking (simulating media addition)', () => {
    // When media is added to timeline, seek is called to update preview
    // This should load the media but NOT play it
    playbackService.seek(mockTracks, 1000); // Seek to 1 second (within video range)

    // Verify video element was created but play() was NOT called
    expect(document.createElement).toHaveBeenCalledWith('video');
    expect(mockVideoElement.play).not.toHaveBeenCalled();
  });

  it('should NOT auto-play audio when seeking', () => {
    playbackService.seek(mockTracks, 6000); // Seek to 6 seconds (within audio range)

    expect(document.createElement).toHaveBeenCalledWith('audio');
    expect(mockAudioElement.play).not.toHaveBeenCalled();
  });

  it('should play video when Play button is pressed', () => {
    // First, load the media by seeking (without playing)
    playbackService.seek(mockTracks, 1000);
    expect(mockVideoElement.play).not.toHaveBeenCalled();

    // Now press Play button
    playbackService.play(mockTracks, 120000);

    // Verify play() was called
    expect(mockVideoElement.play).toHaveBeenCalled();
  });

  it('should play audio when Play button is pressed', () => {
    playbackService.seek(mockTracks, 6000);
    expect(mockAudioElement.play).not.toHaveBeenCalled();

    playbackService.play(mockTracks, 120000);
    expect(mockAudioElement.play).toHaveBeenCalled();
  });

  it('should pause media when Pause button is pressed', () => {
    // Start playback
    playbackService.play(mockTracks, 120000);

    // Pause
    playbackService.pause();

    // Verify pause was called
    expect(mockVideoElement.pause).toHaveBeenCalled();
  });

  it('should auto-play newly loaded media during playback', () => {
    // Start playback at position before video
    playbackService.play(mockTracks, 120000);

    // Now seek into video range while playing (simulates playhead reaching video)
    // This should load AND play the video since playback is active
    playbackService.seek(mockTracks, 1000);

    // In this case, play() should be called because isPlaying is true
    expect(mockVideoElement.play).toHaveBeenCalled();
  });
});

console.log('Issue 114 verification test created.');
console.log('This test ensures media does NOT auto-play when added to timeline.');
console.log('Media should only play when the Play button is pressed.');
