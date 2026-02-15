# PLAN: Fix Signature Screen Layout

## Problem
The SigningPhase in `app/sign/[leaseId].tsx` is broken on mobile web:
- Canvas doesn't track touches (browser scrolls instead of drawing)
- Buttons are off-screen / layout overflows
- Orientation unlock is unnecessary (portrait is better for web)

## Root Cause
1. Missing `touch-action: none` on the canvas container — mobile browsers intercept touches for scrolling
2. `justifyContent: 'center'` on sigInner causes content to overflow both top and bottom
3. Canvas height is calculated as `min(winH * 0.4, 420)` which can be too large or misaligned

## Solution

### Change 1: Add `touch-action: none` to canvas container
Apply `touch-action: 'none'` CSS style to the `sigCanvasOuter` wrapper. This tells mobile browsers to let the canvas handle all touch events instead of interpreting them as scroll/zoom gestures.

### Change 2: Portrait-only, remove orientation unlock
Remove the `useEffect` that calls `ScreenOrientation.unlockAsync()`. Remove the `expo-screen-orientation` import if unused elsewhere. Portrait layout is natural for both mobile and desktop web.

### Change 3: Parchment as background, transparent canvas
- Move parchment background styling (color, ruled lines) to the container `<div>`/`<View>`
- Set the actual `<SignatureCanvas>` background to `transparent`
- The ink looks like it's on the parchment paper, but the parchment doesn't interfere with touch/click events

### Change 4: Sticky bottom control bar
- Remove Clear/Complete buttons from the top header
- Add a sticky bottom bar with Clear (left) and Complete (right) buttons
- Use `useSafeAreaInsets()` for bottom padding
- Remove "Back" button entirely

### Change 5: Cancel (X) only — remove Back button
- Keep only the Cancel X button in the top-left corner
- Pressing X calls `onCancel` (router.back())
- Remove `onBack` prop from SigningPhase

### Change 6: Fix layout structure
New layout (top to bottom):
```
┌─────────────────────────┐
│ [X]    "Your Signature"  │  ← Top bar (cancel + title)
├─────────────────────────┤
│                         │
│  "I, {name}, hereby..." │  ← Label
│                         │
│  ┌───────────────────┐  │
│  │                   │  │
│  │  Parchment BG     │  │  ← Canvas container (flex: 1, touch-action: none)
│  │  + transparent    │  │     Parchment is CSS background on container
│  │    canvas on top  │  │     Canvas is transparent, fills container
│  │                   │  │
│  └───────────────────┘  │
│                         │
│  X ________________     │  ← Signature baseline
│                         │
├─────────────────────────┤
│  [Clear]    [Complete]  │  ← Sticky bottom bar
│         (safe area)     │
└─────────────────────────┘
```

## Files Changed
1. `app/sign/[leaseId].tsx` — SigningPhase component + styles

## Implementation Steps
1. Remove orientation unlock `useEffect` and `ScreenOrientation` import
2. Restructure SigningPhase layout: SafeAreaView → flex column → header / canvas area (flex:1) / bottom bar
3. Add `touch-action: 'none'` to canvas outer container style
4. Make canvas background transparent, parchment styling on container
5. Move Clear/Complete to bottom sticky bar with safe area padding
6. Remove Back button and `onBack` prop
7. Build and verify
