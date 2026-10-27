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

## 2.2

- Tone Curve (Light › Curve): RGB and per-channel curves, edited over the photo with its histogram behind.
- Histogram: a live RGB histogram in the corner of the photo (••• › Show Histogram, or H).
- Sharper zoom: past 1.6x the photo is reloaded at up to 4096 px; back to 2048 px at fit.
- Faster: Remove applies only the new fix, brush masks redraw only the stroke being painted, and the blurred copies some effects need are made on first use.
- Tests: `node tests/run.js` runs the browser test suites (see tests/README.md).

## 2.1: premium tools, all on the device

- Effects: clarity, texture, dehaze, vignette, grain, sharpening, noise reduction, lens corrections (distortion, vignetting, chromatic aberration) and Lens Blur with a focus area set on the photo.
- Color: an 8-colour mixer (hue, saturation, luminance) and 3-way colour grading.
- Masks: brush, linear and radial (up to 4 per photo), each with its own light and colour adjustments. Remove: paint over a spot and Lumora fills it from a matching patch nearby.
- 154 looks in 13 categories, Recommended looks picked from the photo's light and colour, and one-tap Quick Actions.
- Backup and restore: one `.lumora` file with photos, edits, favourites and looks, saved wherever you choose.

No account, no cloud, no AI service: everything runs in Safari on the device. Not included: cloud sync, video, RAW and generative fill.

Storage is unchanged and backward compatible: IndexedDB database `revelado` (v2) with `photos`, `edits` and `presets`. 2.0 only adds an optional `favorite` field to photo records.
