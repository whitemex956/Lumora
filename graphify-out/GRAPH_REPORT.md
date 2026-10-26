# Graph Report - Lumora  (2026-10-26)

## Corpus Check
- Corpus is ~36,014 words - fits in a single context window. You may not need a graph.

## Summary
- 247 nodes · 801 edges · 9 communities
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 70 edges (avg confidence: 0.88)
- Token cost: 217,960 input · 0 output

## Community Hubs (Navigation)
- Looks, Sheets & Backup
- Photo Library & Storage
- Library UI, Theme & i18n
- Masks UI & Painting
- GPU Render & Export
- Adjustments, Masks & Heal Data
- Editor Tabs & Recommended Looks
- Editor Stage & Zoom
- Crop Geometry

## God Nodes (most connected - your core abstractions)
1. `index.html (app script)` - 167 edges
2. `t()` - 37 edges
3. `openEditor()` - 29 edges
4. `syncControls()` - 27 edges
5. `requestDraw()` - 21 edges
6. `toast()` - 18 edges
7. `closeSheet()` - 16 edges
8. `layout()` - 16 edges
9. `openLookBrowser()` - 15 edges
10. `openQuickActions()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Zoom, pan, hold-to-compare and swipe gestures` --implements--> `Editor gestures (pinch, double-tap, pan, hold to compare, swipe)`  [INFERRED]
  index.html → README.md
- `Before/after split divider (#split)` --implements--> `Before/after split view`  [INFERRED]
  index.html → README.md
- `Export pipeline (JPG, size, quality, share)` --implements--> `Export sheet (preview, resolution, size estimate, quality, Share)`  [INFERRED]
  index.html → README.md
- `WebGL2 GPU editing pipeline (fragment shader)` --implements--> `Effects (clarity, texture, dehaze, vignette, grain, sharpening, noise, lens corrections, Lens Blur)`  [INFERRED]
  index.html → README.md
- `Backup .lumora file format (LUMORABK1)` --implements--> `Backup and restore (.lumora file)`  [INFERRED]
  index.html → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Edit to render flow: adjustment model + looks + masks feed the WebGL pipeline** — index_adjustment_model, index_looks_catalog, index_mask_system, index_heal_remove, index_gpu_pipeline, index_effective [EXTRACTED 1.00]
- **Glass design language for floating controls** — index_design_tokens, index_liquid_glass, index_aurora_gradient, index_editor_top_bar, index_tabbar, index_adjustment_panel, index_library_dock [EXTRACTED 1.00]
- **On-device persistence: storage, autosave, backup** — index_storage_layer, index_edit_history, index_backup_format, readme_storage, readme_on_device_privacy [INFERRED 0.85]

## Communities (9 total, 0 thin omitted)

### Community 0 - "Looks, Sheets & Backup"
Cohesion: 0.14
Nodes (42): actionSheet(), applyI18n(), Backup .lumora file format (LUMORABK1), buildPresetRow(), choosePreset(), closeSheet(), confirmDelete(), endSheetDrag() (+34 more)

### Community 1 - "Photo Library & Storage"
Cohesion: 0.09
Nodes (38): index.html (app script), ago(), all(), chromeIn(), closeEditorView(), commit(), Crop frame with handles (#cropFrame), del() (+30 more)

### Community 2 - "Library UI, Theme & i18n"
Cohesion: 0.08
Nodes (32): Adjustment panel (#panel: readout, ruler, tray), applyDrag(), applyTheme(), Aurora gradient (#A78BFA to #7DD3FC), Design tokens (Obsidian, Graphite, Pearl White, Aurora Violet, Icy Blue), detectLang(), drawRuler(), Library filters (All / Favorites / Edited) (+24 more)

### Community 3 - "Masks UI & Painting"
Cohesion: 0.13
Nodes (30): addMask(), adjLabel(), backToMasks(), buildMaskChips(), buildMaskTools(), crossfade(), editMask(), endPaint() (+22 more)

### Community 4 - "GPU Render & Export"
Cohesion: 0.17
Nodes (25): analyse(), Auto adjustment analysis, autoSettings(), blurCopy(), decode(), doExport(), effective(), ensureRenderer() (+17 more)

### Community 5 - "Adjustments, Masks & Heal Data"
Cohesion: 0.14
Nodes (23): Adjustment model (SLIDERS, DEFAULTS), applyHeal(), cleanHeal(), cleanMasks(), Copy and paste adjustments (clipboard), copyFrom(), drawStroke(), findHealSource() (+15 more)

### Community 6 - "Editor Tabs & Recommended Looks"
Cohesion: 0.16
Nodes (20): centerTool(), closeSub(), Color Grading pane, Editor keyboard shortcuts, lookIds(), Color Mixer pane, moveTabIndicator(), openSub() (+12 more)

### Community 7 - "Editor Stage & Zoom"
Cohesion: 0.22
Nodes (18): applyZoom(), clampZoom(), Editor screen (#editor), endStagePointer(), imgToStage(), layout(), Lens Blur focus ring (#focus), Mask paint canvas and handle SVG (#paintCv, #maskSvg) (+10 more)

### Community 8 - "Crop Geometry"
Cohesion: 0.36
Nodes (11): Crop geometry (rotate, straighten, flip, aspect), Crop tools (rotate, flip, aspect chips, reset), cropPx(), fitCrop(), furthest(), insideImage(), maxCentred(), setAngle() (+3 more)

## Knowledge Gaps
- **5 isolated node(s):** `Motion tokens (spring, bounce, reduced motion)`, `Icon system (24pt grid, 1.75 stroke, ICONS map)`, `Short-landscape side-column layout`, `Library large-title bar (#libBar)`, `Toast status element (#toast)`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 7 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `index.html (app script)` connect `Photo Library & Storage` to `Looks, Sheets & Backup`, `Library UI, Theme & i18n`, `Masks UI & Painting`, `GPU Render & Export`, `Adjustments, Masks & Heal Data`, `Editor Tabs & Recommended Looks`, `Editor Stage & Zoom`, `Crop Geometry`?**
  _High betweenness centrality (0.777) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `index.html (app script)` (e.g. with `applyDrag()` and `backToMasks()`) actually correct?**
  _`index.html (app script)` has 14 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Motion tokens (spring, bounce, reduced motion)`, `Icon system (24pt grid, 1.75 stroke, ICONS map)`, `Short-landscape side-column layout` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Looks, Sheets & Backup` be split into smaller, more focused modules?**
  _Cohesion score 0.13821138211382114 - nodes in this community are weakly interconnected._
- **Why does `onboarding()` connect `Library UI, Theme & i18n` to `Looks, Sheets & Backup`, `Photo Library & Storage`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `Photo Library & Storage` be split into smaller, more focused modules?**
  _Cohesion score 0.0931174089068826 - nodes in this community are weakly interconnected._
- **Why does `Lumora (private photo editor)` connect `Library UI, Theme & i18n` to `Adjustments, Masks & Heal Data`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._