# Lumora

Light. Tone. Precision.

A personal photo editor for iPhone that runs in Safari: JPG and HEIC, light and colour adjustments, looks (presets), crop, export. No account, no cloud: photos and edits stay on the device.

Live: https://whitemex956.github.io/Lumora/ (open in Safari, Share > Add to Home Screen).

## 2.0

- Full-screen editor with floating glass controls, four tabs: Light, Color, Looks, Crop.
- Gestures: pinch and double-tap to zoom, drag to pan, touch and hold to compare, swipe across the photo for the next tool. Each has a visible button too (compare, zoom chip, tool row).
- Precision ruler: snap to zero, fine mode (5x slower), double-tap or reset button to zero, edited span.
- Library: favourites, "Continue editing", filters, multi-select (favourite, paste adjustments, delete).
- Export sheet with live preview, output resolution, quality, real file size and Share / Save to Photos.
- Spanish and English, light and dark, Reduce Motion and Reduce Transparency respected.

Storage is unchanged and backward compatible: IndexedDB database `revelado` (v2) with `photos`, `edits` and `presets`. 2.0 only adds an optional `favorite` field to photo records.
