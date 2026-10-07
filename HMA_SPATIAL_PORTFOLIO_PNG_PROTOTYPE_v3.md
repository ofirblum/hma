# HMA Spatial Portfolio Viewer --- PNG Prototype Specification v3

## 0. Purpose of this version

This is a **limited interaction prototype inside the existing HMA
website**.

The HMA website already exists. Do not redesign or replace it.

The required flow is:

``` text
existing HMA website
        ↓
click existing Portfolio button
        ↓
spatial portfolio viewer
        ↓
temporary content: HMA_map_prototype_01.png
```

This version specifically tests scale, partial viewing, pan, inertia,
zoom, and the feeling of travelling through the composition.

It is **not** intended to solve the final continuity/topology of the
portfolio.

The PNG is temporary. The final portfolio will later be reconstructed
from separately positioned media using the Penpot composition as the
spatial reference.

## 1. Inspect and preserve the existing website

Before changing code, inspect the existing repository and identify the
framework/build system, existing landing page, existing Portfolio
button, current routing/navigation, and existing global styles.

Integrate the spatial viewer into the existing site. Do not create a
separate website. Do not redesign unrelated parts of the site.

The existing Portfolio button should open this viewer. There should also
be a minimal way to return to the existing website, using the site's
existing navigation language where possible.

## 2. The PNG is temporary

Use `HMA_map_prototype_01.png` as one flattened visual surface for this
prototype.

Do not architect the feature as a permanent "infinite image viewer".

The intended structure is:

``` text
SpatialPortfolioViewer
├── Camera / navigation
│   ├── pan
│   ├── inertia
│   └── zoom
└── World / content
    └── HMA_map_prototype_01.png   ← temporary
```

Later:

``` text
SpatialPortfolioViewer
├── same Camera / navigation
└── World / content
    ├── raster images
    ├── transparent cut-outs
    ├── live text
    ├── SVG / drawings
    ├── video
    ├── audio
    └── other positioned material
```

Keep camera/navigation logic reasonably independent from the PNG so
replacing the PNG later does not require rebuilding the interaction
system.

## 3. IMPORTANT: do not solve seamless recurrence now

The current A1 PNG was **not authored as a seamless tile**.

If copies are placed directly beside each other, there will be a visual
seam where one A1 edge meets another.

For this phase, **this is acceptable**.

The requirement is only that there is **no empty gap** between
neighbouring copies.

Do not spend developer time trying to make the artwork visually
seamless. Do not hide the seam using AI extension, generated content,
mirrored copies, blur, fades, random rotation, decorative transitions,
procedural textures, or automatic image manipulation.

A genuinely seamless continuation cannot simply be inferred from this
finite composition without changing or reconstructing the artwork. That
problem will be addressed later when the composition exists as
independently positioned elements with known coordinates.

``` text
NO EMPTY GAP = required
VISIBLE EDGE/SEAM = accepted prototype limitation
SEAMLESS ARTWORK = not part of this phase
```

Do not optimise around the seam.

## 4. CRITICAL zoom restriction

The previous prototype allowed excessive zoom-out. That undermines the
test because it reveals the A1 rectangle and may show multiple repeated
A1 sheets simultaneously.

This must be corrected.

### Hard rule

**At maximum zoom-out, no more than approximately 60% of the width of
one A1 composition may be visible across the viewport.**

``` text
visible source width <= 0.60 × source/A1 width
```

The visitor must never be able to zoom out far enough to see one
complete A1 composition, the complete rectangular boundary of an A1, or
multiple complete A1 copies.

If the source PNG width is `SOURCE_WIDTH`, then at maximum zoom-out the
viewport should correspond to no more than:

``` text
0.60 × SOURCE_WIDTH
```

in source/world units horizontally.

Derive the actual minimum camera scale from source image width and
current viewport width. Conceptually:

``` js
maxVisibleWorldWidth = sourceWidth * 0.60
minimumScale = viewportWidth / maxVisibleWorldWidth
```

Adapt this correctly to the transform convention used by the
implementation. Do not use a fixed CSS scale that only works at one
screen size.

### Portrait/mobile

The purpose of the 60% rule is to prevent recognition of the **whole A1
object**.

On unusual viewport aspect ratios, especially portrait/mobile, also
ensure that the full A1 cannot become visible vertically.

The central experiential rule is:

> The visitor is always inside a partial view of the territory. There is
> no zoom level from which the A1 becomes a complete object.

## 5. Starting scale

Do not start at maximum zoom-out.

For initial desktop testing, use a starting scale where roughly
**30--40% of the A1/source width** is visible across the viewport.

This is a tuning value, not a permanent rule.

The hard maximum zoom-out remains approximately **60% of the A1 width**.

Allow substantial zoom-in for reading small text and inspecting details.

## 6. No overview controls

Do not add fit-to-screen, reset-to-whole-map, minimap, overview mode,
thumbnail of the complete A1, or zoom-to-entire-document.

The complete A1 should not become the visitor's navigational reference.

## 7. Pan and inertia

Implement direct dragging horizontally, vertically and diagonally.

On pointer down, stop inertia immediately, capture the pointer and
record current position.

During drag, move the world directly with the pointer and collect recent
pointer positions/timestamps.

On release, calculate recent velocity, continue briefly with inertia,
and decay smoothly through friction. Use `requestAnimationFrame`.

The field should have some material weight:

``` text
slow drag → release → almost immediate stop
faster drag → release → modest continuation → deceleration → stop
```

The visitor can grab the moving field to stop it immediately.

Avoid long frictionless gliding, bounce, springs, elastic edges and
carousel snapping.

## 8. Zoom behaviour

Implement continuous user-controlled zoom.

Desktop: mouse wheel / trackpad, centred around pointer position where
practical.

Touch, if supported in this phase: pinch around gesture centre.

When zoom begins, stop translational inertia.

Clamp zoom strictly to the limits described above.

The user must not be able to bypass the 60% maximum zoom-out through
wheel, trackpad, pinch, resize, or initial-state calculations.

## 9. Temporary continuation beyond the PNG

For this prototype only, neighbouring copies of the PNG may still be
used to prevent empty space appearing when the visitor moves beyond the
source boundary.

A small repeated arrangement or recycled tile system is sufficient.

Its purpose is only to **prevent the viewer from moving into blank
browser space**.

It is **not** intended to produce visually seamless artwork.

When crossing from one copy to another, there should be no empty gap,
movement jump, velocity reset, pause or transition animation.

The visual seam between A1 edges is accepted for now.

## 10. Do not make the repetition more elaborate

Do not spend time creating complex tiling algorithms, visual seam
correction, alternate mirrored A1s, rotated A1s, randomised A1s,
multiple authored PNG variants, or image blending.

The current question is not whether a repeated PNG can become the final
infinite world.

The question is whether the **camera behaviour and partial-view
experience** feel promising while native reconstruction is prepared.

## 11. No predefined entry points

Do not implement the earlier five-entry-point concept.

There is no portfolio cover inside the viewer, first work, five fixed
crops, sequence, or carousel.

Start somewhere within a broad usable region. Partial images and partial
text at viewport edges are desirable. Avoid only overwhelmingly empty
starts.

## 12. Viewer dimensions

The viewer should occupy the available browser viewport:

``` css
width: 100vw;
height: 100vh;
overflow: hidden;
```

The browser page should not scroll while manipulating the spatial field.

The viewport is a frame onto the composition, not a page containing the
A1.

## 13. Resize behaviour

On browser resize, preserve current world location as much as possible
and preserve zoom unless it would violate the minimum-scale constraint.

If necessary, increase scale so the 60% rule remains satisfied.

Never zoom out automatically to fit the composition and do not reset to
the opening position.

## 14. Performance

Prioritise smooth drag, restrained inertia, stable zoom, no flickering
between temporary copies, and reasonable memory use.

Preload the PNG. Render only enough neighbouring copies to prevent blank
space around the current viewport.

Do not optimise a final tiling system that will later be discarded.

## 15. Phase 1 acceptance checklist

-   [ ] Existing HMA website remains intact.
-   [ ] Existing Portfolio button opens the viewer.
-   [ ] Viewer fills the available browser viewport.
-   [ ] PNG is clearly implemented as temporary content.
-   [ ] Navigation/camera system is structurally separate from PNG
    content.
-   [ ] Pan works horizontally, vertically and diagonally.
-   [ ] Inertia feels restrained and controllable.
-   [ ] Grabbing during inertia stops it.
-   [ ] Zoom works around pointer/gesture position where practical.
-   [ ] Zoom stops translational inertia.
-   [ ] At maximum zoom-out, no more than approximately 60% of one
    A1/source width is visible.
-   [ ] A complete A1 can never be seen.
-   [ ] Multiple complete A1 copies can never be seen.
-   [ ] Portrait/mobile layouts also cannot reveal the complete A1.
-   [ ] No minimap exists.
-   [ ] No fit-to-screen exists.
-   [ ] No overview mode exists.
-   [ ] No five predefined entry positions exist.
-   [ ] Movement beyond the source boundary does not reveal empty
    browser space.
-   [ ] There is no physical gap between temporary neighbouring PNG
    copies.
-   [ ] A visible seam between PNG edges is accepted and has not been
    "solved" through image manipulation.
-   [ ] There is a minimal way back to the existing website.
-   [ ] Replacing the PNG later will not require rewriting the basic
    camera/navigation system.

## 16. Preparing native reconstruction in parallel

While this interaction prototype is tested, prepare the Penpot document
for native reconstruction.

The Penpot composition is the spatial source of truth.

Name major independent visual/technical units where useful, for example:

``` text
forest_cutout
lead_logo
concrete_globe
bergehalde_insert
soap_rock
runway_concrete
oo_sib_data
rocks_against_diamonds
hma_text
tiny_infiltration
concentric_circles
sonic_sketches
red_star_data
bunker_osm
sheep_fur
clay_balls
planter_proposition
```

Conceptual relationships do not need to be represented through the
Penpot group hierarchy.

Group according to useful visual/technical units. If a group will become
one web object, naming the group is enough. Name children only where
they are likely to become independent web elements later.

## 17. Later native reconstruction

Once the camera/interaction has been evaluated, the flattened PNG can
progressively disappear.

The final world may consist of independently positioned images,
transparent cut-outs, text, SVG/vector elements, drawings, video and
audio.

Use the Penpot composition and/or its SVG export to derive coordinates,
dimensions, transforms, clipping and layering.

Do not reconstruct the layout by eye.

The PNG may temporarily sit underneath native elements as a registration
reference during reconstruction and then be removed.

## 18. Continuity is a later design problem

Once the composition consists of independent elements with known
coordinates, investigate how the world should continue beyond the
original A1 territory.

At that stage it becomes meaningful to explore recurrence of individual
elements or constellations, spatial offsets, alternative continuation
zones, different relationships between recurring material, larger world
structures, or other topology.

That is when the visible A1-edge problem should be addressed.

Do not attempt to solve it by manipulating the flattened PNG now.

## 19. Do not add

Unless explicitly requested after testing, do not add parallax, hover
enlargement, project popups, generic hotspots, animated paths, cursor
trails, automatic tours, automatic camera movement, automatic zoom,
decorative physics, minimap, fit-to-screen, full-map overview,
conventional project navigation inside the field, AI/generative visual
effects, or seam-hiding effects.

## Immediate question

This prototype should answer only:

> **What does the HMA portfolio feel like when the visitor is always
> inside a partial view of the composition, can pan and zoom through it
> with material resistance, and is never allowed to retreat to a
> position from which the A1 document becomes visible as a whole?**

The visible seam in the temporary repeated PNG is **not being evaluated
as a final solution**. It is an accepted limitation until native
reconstruction gives us the coordinates and independent material needed
to develop continuity properly.

## Core principles

**The source material is finite, but the visitor should not be given the
detached overview position from which that finitude becomes the primary
experience.**

For this prototype:

**maximum zoom-out = approximately 60% of one A1 width.**

And:

**no gap between temporary copies does not mean seamless artwork. The
seam is accepted for now.**
