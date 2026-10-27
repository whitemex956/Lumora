# Lumora tests

Browser tests that drive the real app in headless Chromium at iPhone sizes.

```sh
npm i -D playwright && npx playwright install chromium   # once
node tests/run.js                # every suite
node tests/run.js masks looks    # only some
```

| Suite | What it checks |
|---|---|
| engine | existing edits render pixel-identical to the 2.0 engine |
| main | library, editor, gestures, ruler, undo, crop, looks, export, upgrade from 1.x |
| effects | Effects tab, Lens Blur focus, Color Mixer, Color Grading, copy/paste |
| masks | linear, radial and brush masks, erase, invert, Remove |
| looks | catalogue, Recommended, Quick Actions |
| png | PNG import to JPG, transparency on white |
| large-png | 24 and 48 MP PNGs scaled under Safari's canvas limit |
| backup | backup file round trip, refusing other files |
| english | no Spanish on any screen with a Spanish browser |
| layout | no overflow or overlap at 375, 430 and iPad widths |

Screenshots and temporary files go to `tests/.out/`. The test photos in `fixtures/` are synthetic and
made for these tests; `lumora-1x.html` and `engine-2.0.js` are earlier versions of the app kept for the
upgrade and rendering checks. Not covered: Safari itself and real devices.
