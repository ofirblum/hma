# HMA spatial portfolio — reconstruction handoff

## Source of truth

`New File 5.penpot` is the frozen compositional snapshot for this reconstruction round. The Penpot board named `Board` is 3179 × 2245 Penpot units. Its canvas origin is (219, 186). `world-data.json` also provides coordinates normalized to the board top-left (`x_board`, `y_board`). Negative and outside-board coordinates are intentional and must not be clamped.

## What is in this package

- `world-data.json` — full object inventory plus a filtered `named_units` list, hierarchy, geometry and media references.
- `named-units.csv` — quick human-readable list of the authored/named units.
- `asset-index.json` — Penpot media records mapped to extracted full raster files.
- `assets/` — raster assets extracted from the `.penpot` package.
- `source/New File 5.penpot` — untouched source snapshot.
- `source/Board.svg` — 1× SVG export for geometry/vector comparison.

## Important implementation findings from the PNG prototype

1. Maximum zoom-out should expose at most about **75% of the original A1/source width**. The complete A1 must never become visible as a detached document.
2. Do not continue development of the repeated-PNG seam. The flattened A1 was not authored as a seamless tile.
3. In the native reconstruction, the background should be continuous/edge-free rather than a repeated A1 rectangle.
4. The original Penpot coordinates establish the initial constellation, but the A1 rectangle should not become the technical boundary of the world.
5. Do not simply repeat the entire A1 contents at ± one board width/height. That would make recurrence immediately legible. Continuity/recurrence should be developed after the native elements exist. Buffers, spatial offsets or controlled recurrence of objects/constellations can then be tested. Avoid pure randomisation until its effect on authored relationships is understood.

## Architecture

Keep the existing HMA website intact. The existing Portfolio button opens `SpatialPortfolioViewer`. Separate camera/navigation from content.

```text
SpatialPortfolioViewer
├── Camera
│   ├── pan
│   ├── restrained inertia
│   └── zoom (max zoom-out = 75% source width visible)
└── World
    ├── continuous background
    └── positioned native content
        ├── raster assets
        ├── vector/SVG geometry
        ├── live text
        ├── video (later)
        └── audio (later)
```

## Reconstruction rules

- Treat Penpot as compositional source of truth. Do not reconstruct placement by eye.
- Preserve scale inequalities and overlaps. Do not tidy the composition into a grid.
- Preserve authored clipping/masks/transforms where present.
- Raster imagery stays raster unless there is a specific reason to replace it. In particular, the OSM/bunker trace is a raster image.
- Text should eventually become live HTML/CSS where practical, but use Penpot geometry as the registration reference.
- Vector drawings/lines/circles should remain vector where practical.
- The extracted asset is the Penpot-stored version. Request an external original only if a specific asset proves insufficient at required zoom.
- The Penpot source snapshot is read-only reference; do not modify it as part of web implementation.

## Camera behaviour retained from prototype

- direct pan in all directions;
- restrained inertia/friction;
- grabbing during inertia stops motion immediately;
- zoom is user controlled and stops translational inertia;
- no bounce, spring, snap, minimap, fit-to-screen, full overview or automatic tour;
- resizing must never reveal the whole source board;
- max zoom-out is derived responsively so no more than ~75% of source width is visible.

## Background and recurrence

`BACKGROUND interior bunker infinite` is present in the Penpot source as an oversized background element. Treat its visual role separately from the finite A1 board. The eventual world background should have no A1 edge.

Do **not** solve recurrence before native reconstruction. First reproduce the initial constellation faithfully. Then test how material can continue beyond the original territory without revealing a simple repeated board period.

## First developer milestone

Reconstruct the initial Penpot constellation from the manifest/assets while preserving the existing camera behaviour and the 75% zoom-out limit. Do not spend time yet on sophisticated infinite recurrence. Once the native reconstruction is visually registered against the Penpot source, continuity can be developed from the independent elements.
