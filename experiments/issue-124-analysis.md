# Issue 124 Analysis: Progress Bar Bugs in Notification Component

## Bug 1: Progress bar jump on hover

### Root Cause
The progress bar uses two separate timing systems that are not synchronized:
1. **CSS animation** - `@keyframes progress-shrink` animates width from 100% to 0%
2. **JavaScript timing** - Uses `Date.now()` to calculate elapsed/remaining time

When the mouse enters, the JavaScript calculates `progressPercent` based on elapsed time:
```typescript
const elapsed = Date.now() - state.startTime;
state.remainingTime = Math.max(0, state.remainingTime - elapsed);
const progressPercent = (state.remainingTime / this.AUTO_DISMISS_DELAY) * 100;
```

This sets `[style.width.%]` to the calculated value. However, the CSS animation was running independently and may have animated to a slightly different position. When `animation-play-state: paused` is applied, the CSS animation freezes at its current position, but then the inline `style.width` kicks in with a different value, causing a visual "jump".

### Solution
Remove CSS animation timing and use JavaScript to directly control the progress bar width. Update the width periodically using `requestAnimationFrame` or `setInterval`.

## Bug 2: Delayed notification dismissal (1-2 seconds after bar reaches end)

### Root Cause
After pausing and resuming:
1. The progress bar resumes from `progressPercent` (e.g., 50%)
2. CSS animation duration is set to `remainingTime` (e.g., 2000ms)
3. The animation goes from 50% → 0% in 2000ms
4. The timer also waits 2000ms before dismissing

The visual animation from 50% → 0% in 2000ms appears to complete in the correct time visually, BUT the CSS animation duration affects the entire 100% → 0% range, not just the remaining portion.

When you set `animation-duration: 2000ms` and `width: 50%`, the CSS animation `progress-shrink` starts from 100% (as defined in keyframes) and takes 2000ms to reach 0%. The inline `width: 50%` competes with the animation, causing unexpected behavior.

### Deeper Issue
The CSS `@keyframes progress-shrink` always animates from 100% to 0%. When you pause and resume with a new duration but starting from a different width, the animation behavior becomes unpredictable because:
- The keyframe still defines `from { width: 100% }`
- But the inline style says `width: 50%`
- These conflict and browser behavior varies

### Solution
Same as Bug 1 - use JavaScript to directly control width updates without relying on CSS animation. This gives precise control over timing and eliminates drift between visual state and timer state.
