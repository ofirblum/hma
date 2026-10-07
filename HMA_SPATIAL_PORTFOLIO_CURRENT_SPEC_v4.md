# HMA Spatial Portfolio --- Current Implementation Brief v4

**Status:** Current agent brief. This supersedes earlier implementation
notes where they conflict.

## 1. Purpose

The first run successfully demonstrated that the Penpot composition can
be reconstructed in the browser. **Do not redo that work from scratch.**

The next task is architectural: convert the current result from **an A1
reconstruction placed inside a larger pink canvas** into **one
continuous spatial world whose initial arrangement comes from the A1
composition**.

> **The A1 is the coordinate system for the initial authored
> constellation, not a container, clipping region, background image,
> page, or world boundary.**

The original `3179 × 2245` coordinates can remain the basis for initial
positions, but `x=0`, `y=0`, `x=3179`, and `y=2245` must have no special
visual or navigational meaning.

## 2. Current problem

The current implementation still exposes the reconstructed A1 as a
finite region. Outside it there is extended pink space, but the
background features stop at the A1 boundary, producing a
visible/conceptual seam.

This was a useful fidelity milestone, but it is not the intended final
world model.

## 3. Required world model

There must be **no A1 rectangle in the finished world**.

-   Preserve the authored initial constellation.
-   Remove the A1 as a clipping/background/container boundary.
-   Allow objects to occupy negative coordinates and coordinates beyond
    the former board dimensions.
-   Crossing a former A1 edge must cause no special visual or technical
    event.

## 4. Critical: recover content currently clipped by the Penpot board

Some images/objects reach the A1 edge. In Penpot, their underlying
geometry/source image may continue outside the board even though that
portion was not visible on the board.

The web reconstruction must **not assume that the visible A1 crop is the
complete object**.

For every element intersecting a former A1 edge:

1.  Use the `.penpot` source data and original Penpot media asset as
    authoritative.
2.  Recover actual object bounds, dimensions, transforms, image
    crop/fill information, masks and source asset where available.
3.  Do **not** use the board-exported SVG or flattened A1 appearance as
    authoritative for overflow; these may already be clipped to the
    board.
4.  If the Penpot object extends outside the board, render its complete
    object geometry in world space.
5.  Remove clipping caused solely by the A1 board/frame.
6.  Preserve intentional object-level masks, cutouts and crops.

**Board clipping must be removed. Intentional clipping must remain.**

Do not invent missing image content. Continuation must come from the
actual source asset and stored Penpot geometry/transform. If the source
contains no additional content, leave it as-is.

## 5. Background treatment

The pink base colour must be a genuinely continuous world background.

Do **not** implement:

`flat pink world + A1-sized layer containing pink/background imagery/lines`

That still creates a seam.

Instead treat these as independent world layers:

-   continuous pink base;
-   bunker/interior/background imagery;
-   lines/traces/vectors;
-   raster images;
-   cutouts/masks;
-   live text;
-   other independent content.

Visual material currently functioning as the A1 background must become
independent world content rather than an A1-sized background rectangle.

The Penpot source contains a group named approximately
`BACKGROUND interior bunker infinite`. Previously observed geometry
extended substantially beyond the nominal A1 (approximately `x=-2142`,
`y=44`, `width=5667`, `height=3542`). Read exact geometry from the
source rather than relying on these approximate values.

## 6. Preserve the successful reconstruction

Keep the existing reconstruction as a visual/fidelity reference while
restructuring the world.

The goal is:

**same authored initial constellation + no A1 ontology**

This is not a request for a new composition.

## 7. Camera/navigation

Keep camera/navigation separate from world/content representation:

`input → camera (x/y/zoom) → unbounded world → independent positioned content`

Pan remains unrestricted horizontally, vertically and diagonally. No
bounce or return at former A1 coordinates.

### Zoom-out limit

The current prototype appears to allow more zoom-out than intended.

The empirical target is:

> **The widest allowed view should correspond approximately to seeing
> 75% of the original A1 width across the viewport.**

This is a **camera constraint**, not a world boundary. The visitor
should not be able to zoom out far enough to perceive the original A1 as
a complete finite sheet surrounded by empty world.

Normalize appropriately for viewport aspect ratio; do not treat `75%` as
an arbitrary CSS scale value.

## 8. Do not implement yet

Keep this run focused. Do **not** yet implement:

-   recurrence/repetition of constellations;
-   whole-A1 repetition;
-   procedural infinite-content generation;
-   randomized placement;
-   final inertia/friction tuning;
-   video activation;
-   zoom-triggered media states;
-   PDF/print export;
-   major visual redesign.

Inertia/friction can be added later because it belongs to the camera
layer.

## 9. Recurrence is later

Eventually finite source material may recur as the visitor travels
through the continuous world. Do not solve that now.

Do not repeat all content at exact multiples of `3179 × 2245`; that
would merely recreate A1 tiling without visible page borders.

First establish a world in which the original A1 boundary genuinely no
longer exists.

## 10. Acceptance tests

The run succeeds when:

1.  **Initial fidelity:** the entry composition still corresponds
    closely to Penpot.
2.  **No A1 container:** no A1-sized clipped/background container
    defines the artwork.
3.  **Former edge crossing:** panning across left/right/top/bottom
    former A1 boundaries causes no seam, clipping event, colour change
    or container-edge event.
4.  **Overflow recovery:** objects that extended outside the Penpot
    board show their real continuation where `.penpot` data/assets
    support it. Nothing is fabricated.
5.  **Continuous base:** pink remains continuous across the world.
6.  **Independent background:** bunker/interior imagery, lines and other
    background features are not trapped inside an A1-sized rectangle.
7.  **Zoom:** zoom-out stops at approximately the agreed 75%-of-A1-width
    view and cannot expose the complete A1 as a finite sheet.
8.  **Architecture:** camera/navigation remains separate from
    world/content so inertia and recurrence can be added later without
    reconstructing the artwork again.

## 11. Source hierarchy

When sources disagree, use this priority:

1.  `.penpot` project data --- geometry, hierarchy, bounds, transforms,
    masks and media references.
2.  Original media assets extracted from `.penpot` --- full raster
    content.
3.  1× SVG --- useful for vector/text reference, but beware board
    clipping and generated IDs.
4.  Existing web reconstruction --- fidelity/reference implementation.
5.  Flattened PNG/A1 exports --- visual reference only; never infer from
    them that an object ends at the A1 edge.

The Penpot master remains the compositional source of truth.

## 12. Scope summary

**Before:** A1 reconstruction inside a larger pink canvas.

**After:** continuous spatial world whose initial constellation was
authored on an A1.

Do not solve the next phase until this distinction is genuinely present
in the implementation.
