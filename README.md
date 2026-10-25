# Lumora

Light. Tone. Precision.

A personal photo editor for iPhone that runs in Safari: JPG, PNG (converted to JPG on import, transparency on white) and HEIC in, JPG out, light and colour adjustments, looks (presets), crop, export. No account, no cloud: photos and edits stay on the device.

Live: https://whitemex956.github.io/Lumora/ (open in Safari, Share > Add to Home Screen).

## 2.0

- Full-screen editor with floating glass controls, four tabs: Light, Color, Looks, Crop.
- Gestures: pinch and double-tap to zoom, drag to pan, touch and hold to compare, swipe across the photo for the next tool. Each has a visible button too (compare, zoom chip, tool row).
- Precision ruler: snap to zero, fine mode (5x slower), double-tap or reset button to zero, edited span. Tap the number to type an exact value.
- Before/after split view with a draggable divider (compare button or B), drawn per pixel on the GPU.
- Keyboard (iPad, desktop): 1-4 tabs, [ ] previous/next tool, + - 0 zoom, B split view, hold Space for the original.
- Library: favourites, "Continue editing", filters, multi-select (favourite, paste adjustments, delete).
- Export sheet with live preview, output resolution, estimated then real file size, quality, and Share / Save to Photos.
- English by default on every device; Spanish can be chosen in Settings. Light and dark, Reduce Motion and Reduce Transparency respected.

Storage is unchanged and backward compatible: IndexedDB database `revelado` (v2) with `photos`, `edits` and `presets`. 2.0 only adds an optional `favorite` field to photo records.
