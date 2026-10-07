# HMA Spatial Portfolio Viewer --- Implementation Specification

## 0. Context --- read this first

This specification describes **one new feature inside an existing HMA
website**.

The HMA website already exists.

**Do not build a new website. Do not redesign, replace, or restructure
the existing website.**

The new feature begins when the visitor clicks the website's existing
**Portfolio** button.

``` text
EXISTING HMA WEBSITE
        │
        │ click existing "Portfolio" button
        ▼
SPATIAL PORTFOLIO VIEWER
        │
        └── temporary prototype content:
            HMA_map_prototype_01.png
```

The spatial viewer is still experimental. Its behaviour will be refined
after it can actually be tested.

Implement it as a reasonably self-contained feature within the existing
website so that its interaction and content model can evolve without
requiring the rest of the site to be rebuilt.

The accompanying prototype image is:

`HMA_map_prototype_01.png`

------------------------------------------------------------------------

# 1. First inspect the existing project

Before changing code, inspect the repository and determine:

1.  Which framework/build system the existing website uses.
2.  Which file/component renders the existing landing page.
3.  Where the existing **Portfolio** button is implemented.
4.  How routes/views/navigation are currently handled.
5.  Which global styles, fonts and layout behaviour are already
    established.

Then implement the portfolio viewer **inside the existing
architecture**.

Do not create a separate app or project unless there is a genuine
technical reason.

Do not alter unrelated existing functionality.

------------------------------------------------------------------------

# 2. Required website flow

The required flow is:

1.  Visitor arrives at the existing HMA website exactly as they do now.
2.  Existing landing experience remains unchanged unless a minimal
    technical change is needed to wire the Portfolio button.
3.  Visitor clicks the existing **Portfolio** button.
4.  The new spatial portfolio viewer opens.
5.  The viewer occupies the available browser viewport.
6.  The visitor navigates the portfolio spatially.
7.  There is a minimal, appropriate way to leave the portfolio and
    return to the existing website.

Do not invent a large new navigation system for this.

------------------------------------------------------------------------

# 3. What this development phase is testing

This is a **behavioural prototype inside the real website**.

We are testing whether the portfolio can behave as a continuous spatial
field rather than as:

-   a PDF;
-   a sequence of pages;
-   a conventional project gallery;
-   a finite poster shown inside a browser.

The source composition is finite, but the interaction should not
abruptly terminate when the visitor reaches the physical boundary of the
current source image.

This prototype will be reviewed and changed after it can actually be
used.

Therefore:

> **Prioritise a simple, working and editable implementation over an
> elaborate final solution.**

------------------------------------------------------------------------

# 4. Critical architectural point: the PNG is temporary

`HMA_map_prototype_01.png` is being used **only as a temporary proxy for
the spatial composition**.

It is **not intended to be the final portfolio content format**.

Do not architect the portfolio as an "infinite image viewer".

The final portfolio is expected to reconstruct the Penpot composition
using independently positioned media, potentially including:

-   raster photographs;
-   image cut-outs;
-   drawings;
-   SVG/vector material;
-   live HTML typography;
-   video;
-   audio;
-   other media where appropriate.

Therefore the navigation system must operate on a generic
**world/content container**, not directly on assumptions specific to one
raster image.

For Phase 1, think of the structure as:

``` text
SpatialPortfolioViewer
│
├── Camera / interaction system
│   ├── pan
│   ├── inertia
│   ├── zoom
│   └── continuous-field / topology logic
│
└── World
    └── HMA_map_prototype_01.png   ← TEMPORARY
```

Later, without replacing the camera/navigation system:

``` text
SpatialPortfolioViewer
│
├── Camera / interaction system
│
└── World
    ├── raster image
    ├── raster image
    ├── live text
    ├── SVG / drawing
    ├── video
    ├── audio
    └── ...
```

The PNG dimensions can be used as the **temporary world
dimensions/reference coordinate system**, but they must not become a
permanent architectural constraint.

Any recurrence/wrapping logic developed now should be separated from
image rendering as much as reasonably possible.

The goal is:

``` text
replace content later
        ≠
rewrite navigation later
```

------------------------------------------------------------------------

# 5. What NOT to reconstruct yet

For the current prototype, use:

`HMA_map_prototype_01.png`

as one flattened visual surface.

Do **not** yet:

-   extract individual images;
-   recreate typography in HTML;
-   rebuild the Penpot layers;
-   convert drawings to SVG;
-   add films;
-   add sound;
-   add hotspots;
-   make individual works clickable;
-   manually recreate the A1 composition.

Those belong to later development.

The PNG exists specifically so that spatial behaviour can be tested
before the final content architecture is built.

------------------------------------------------------------------------

# 6. No predefined portfolio entry points

An earlier concept used five designed entry frames.

**That concept has been abandoned. Do not implement it.**

There is:

-   no fixed portfolio opening;
-   no portfolio cover inside this viewer;
-   no "first work";
-   no sequence of five entry positions;
-   no carousel;
-   no privileged reading direction.

When the visitor opens Portfolio, show a partial frame somewhere within
the field.

It is acceptable --- and desirable --- for the viewport to cut through
images, drawings, text or other material.

The opening frame does not need to be a perfect composition.

Avoid only positions that are overwhelmingly empty.

For the prototype, use either:

-   a semi-random position inside a broad safe region; or
-   another simple method that prevents obviously unusable empty starts.

Do not spend development time manually designing opening crops.

------------------------------------------------------------------------

# PHASE 1 --- BUILD THIS FIRST

# 7. Portfolio route/view

Create or adapt a route/view within the existing site for the spatial
portfolio.

The existing **Portfolio** control should open this view using the
navigation conventions already present in the project.

The viewer should occupy the browser viewport.

Requirements:

``` css
width: 100vw;
height: 100vh;
overflow: hidden;
```

The browser document itself should not scroll while the visitor is
manipulating the spatial field.

Do not place the portfolio inside a conventional content column or page
layout.

The viewport is a **frame onto the field**, not a page showing the
entire field.

------------------------------------------------------------------------

# 8. Camera/world model

Implement navigation using a camera/world model rather than by treating
the PNG itself as the application.

A simple conceptual camera state:

``` js
camera = {
  x,
  y,
  scale,
  vx,
  vy
}
```

The camera determines which part of the world is visible.

The content currently happens to be one PNG.

Later, the same camera should be able to view many independently
positioned media elements.

Keep this separation clear in the code.

------------------------------------------------------------------------

# 9. Pan interaction

Implement direct pointer/touch dragging.

## Pointer down

-   stop existing inertia immediately;
-   capture the pointer;
-   record current pointer coordinates;
-   record current camera/world position;
-   `grab` / `grabbing` cursor is acceptable.

## Pointer move

Move the field directly with the pointer.

Track recent pointer positions/timestamps so release velocity can be
calculated.

Movement must work freely:

-   horizontally;
-   vertically;
-   diagonally.

There is no preferred axis.

## Pointer release

Calculate velocity from the final portion of the drag gesture.

Continue movement briefly using inertia.

Decay velocity smoothly through friction.

Use `requestAnimationFrame` for motion.

------------------------------------------------------------------------

# 10. Desired movement quality

The field should feel as though it has some **material weight**.

A slow deliberate drag:

``` text
drag → release → almost immediate stop
```

A faster gesture:

``` text
drag → release → modest continuation → smooth deceleration → stop
```

The visitor must be able to grab the field while it is moving and stop
inertia immediately.

Do not make the field:

-   frictionless;
-   extremely slippery;
-   springy;
-   bouncy;
-   elastic;
-   carousel-like.

Possible starting friction values may be tested, for example:

``` js
frictionPerFrame ≈ 0.92–0.96
```

This is only a starting point. Tune by feel.

------------------------------------------------------------------------

# 11. Central experiment: the field should not terminate at the PNG boundary

This is the most important new behaviour.

The unwanted experience is:

``` text
explore
→ movement becomes interesting
→ reach edge of PNG
→ abrupt stop
```

We want to test:

``` text
explore
→ continue
→ continue in another direction
→ possibly encounter familiar material again
→ no moment where the document simply ends
```

Therefore **do not clamp camera movement to the source PNG dimensions**.

Do not implement:

``` js
x = clamp(x, 0, imageWidth)
y = clamp(y, 0, imageHeight)
```

The visitor must be able to continue beyond those coordinates.

------------------------------------------------------------------------

# 12. Phase 1 continuous-field implementation

For the first prototype, it is acceptable to use repeated neighbouring
instances of the temporary PNG.

A simple conceptual arrangement is:

``` text
┌───────┬───────┬───────┐
│ copy  │ copy  │ copy  │
├───────┼───────┼───────┤
│ copy  │ main  │ copy  │
├───────┼───────┼───────┤
│ copy  │ copy  │ copy  │
└───────┴───────┴───────┘
```

As the camera moves, recycle/reposition copies so image material
continues beyond the viewport.

Possible implementations include:

-   Canvas rendering; or
-   a small controlled number of absolutely positioned image instances.

Choose whichever fits the existing project best.

Do not create hundreds of DOM nodes.

### Important

This repeating-PNG implementation is a **temporary test mechanism**, not
the assumed final topology of the portfolio.

Do not tightly couple the camera implementation to this tiling
technique.

------------------------------------------------------------------------

# 13. Preserve movement through underlying wraps

If internal coordinates are normalised when crossing one temporary world
width/height, the viewer must not perceive that technical event.

There should be:

-   no jump;
-   no pause;
-   no fade;
-   no reset;
-   no change of velocity;
-   no transition animation;
-   no message announcing a loop.

Translation should simply continue.

------------------------------------------------------------------------

# 14. The PNG is not a seamless tile

`HMA_map_prototype_01.png` was **not designed as repeating wallpaper**.

Phase 1 may therefore reveal visible discontinuities where opposite
edges meet.

That is acceptable as a test result.

Do **not** hide those seams by automatically adding:

-   mirrored artwork;
-   random rotations;
-   blur;
-   generated filler;
-   AI image extension;
-   procedural textures;
-   decorative transitions;
-   kaleidoscopic effects.

First determine whether the **continuous navigation principle itself**
is valuable.

If obvious repetition or seams damage the experience, that becomes a
subsequent design/development problem.

------------------------------------------------------------------------

# 15. Do not make the recurrence read as a carousel

Even if the first technical implementation repeats the same temporary
PNG, the experience must not announce:

> "You reached the end and are now back at the beginning."

Do not add:

-   page numbers;
-   dots;
-   slides;
-   snapping;
-   next/previous controls;
-   direction locks;
-   reset points.

The visitor can travel:

``` text
← → ↑ ↓ ↖ ↗ ↘ ↙
```

Continuously.

The longer-term ambition is that familiar material may eventually be
encountered from another direction or spatial relationship, rather than
merely by reversing the previous movement.

Phase 1 only needs to establish the basic continuous behaviour.

------------------------------------------------------------------------

# 16. Zoom

Implement user-controlled zoom.

Desktop:

-   mouse wheel / trackpad;
-   zoom around the pointer position where practical.

Touch:

-   pinch around gesture centre if touch support is included in this
    phase.

Zoom should be continuous rather than a small number of discrete levels.

When zoom begins, stop translational inertia.

------------------------------------------------------------------------

# 17. Zoom limits

The visitor should **not be able to zoom out until the complete A1
composition is visible at once**.

Calculate the scale required to fit the entire current source world
inside the viewport.

Set the minimum allowed scale meaningfully above that value.

Do not simply hard-code a scale without considering:

-   source dimensions;
-   browser dimensions;
-   aspect ratio.

Allow generous zoom-in so that small text, drawings and image details
can be inspected.

This rule concerns the experience, not the PNG specifically. When native
media replaces the PNG, the same principle should remain: there should
be no privileged "see everything" overview.

------------------------------------------------------------------------

# 18. Starting scale

For initial desktop tuning, use:

``` text
reference viewport: 1440 × 900 CSS px
```

Initially test a scale at which approximately:

``` text
30–38% of the current source-map width
```

is visible across the viewport.

This range is **not a final design rule**.

It is simply a starting point.

Once the prototype can actually be navigated, the starting scale will be
judged by feel.

------------------------------------------------------------------------

# 19. Initial position

Do not use a fixed authored entry frame.

For Phase 1, a simple implementation is sufficient:

``` js
startX = random position within safe horizontal bounds
startY = random position within safe vertical bounds
```

Avoid only an opening dominated almost entirely by empty pink field.

Do not build an elaborate image-analysis system.

A manually defined broad safe region is sufficient.

------------------------------------------------------------------------

# 20. Browser resize

If the browser window changes size:

-   preserve the visitor's current world location as much as possible;
-   preserve current zoom;
-   recalculate visible copies/tiles;
-   do not reset to the initial position.

------------------------------------------------------------------------

# 21. Performance

The PNG may be large.

Prioritise:

-   smooth dragging;
-   smooth inertia;
-   no flickering when temporary copies are recycled;
-   no visible loading during ordinary navigation;
-   reasonable memory use.

Preload the source image.

Use `requestAnimationFrame`.

Render only enough temporary repeated instances to cover the viewport
plus reasonable overscan.

------------------------------------------------------------------------

# 22. Leaving the portfolio

Because this viewer is a feature of the existing website, the visitor
must be able to return to the existing site.

Use the existing site's navigation language where possible.

Do not invent a large toolbar.

A minimal existing-style back/close mechanism is sufficient if the
current site does not already provide one naturally.

This control must not dominate the spatial field.

------------------------------------------------------------------------

# PHASE 1 --- ACCEPTANCE CHECKLIST

The first version is ready for review when:

-   [ ] The existing HMA website still works as before.
-   [ ] The existing **Portfolio** button opens the spatial portfolio
    viewer.
-   [ ] No unrelated part of the website has been redesigned.
-   [ ] `HMA_map_prototype_01.png` is used as temporary content only.
-   [ ] The navigation/camera system is structurally separate from the
    PNG content.
-   [ ] The implementation is not architected as a permanent "infinite
    image viewer".
-   [ ] The viewer occupies the browser viewport.
-   [ ] The browser page itself does not scroll while navigating the
    field.
-   [ ] Dragging works horizontally.
-   [ ] Dragging works vertically.
-   [ ] Dragging works diagonally.
-   [ ] Slow release produces little/no inertia.
-   [ ] Faster release produces modest smooth inertia.
-   [ ] Grabbing during inertia stops movement immediately.
-   [ ] The visitor does not hit a hard PNG boundary.
-   [ ] Continuous travel works horizontally.
-   [ ] Continuous travel works vertically.
-   [ ] Underlying coordinate recycling does not create a movement jump.
-   [ ] Zoom works.
-   [ ] Zoom is centred around pointer/gesture position where practical.
-   [ ] Zoom stops translation inertia.
-   [ ] The entire A1 cannot be revealed through maximum zoom-out.
-   [ ] There are no five predefined entry points.
-   [ ] Reopening/reloading is not dependent on one fixed opening crop.
-   [ ] There is no minimap.
-   [ ] There is no fit-to-screen control.
-   [ ] There is no carousel/page navigation.
-   [ ] There is a minimal way to return from Portfolio to the existing
    website.
-   [ ] The visual content of the PNG has not been altered.
-   [ ] Replacing the PNG later will not require rewriting the basic
    camera/navigation system.

------------------------------------------------------------------------

# PHASE 2 --- ONLY AFTER PHASE 1 IS TESTED

Do not solve the following problems before the first version can
actually be used.

# 23. Less recognisable recurrence

The eventual goal is more subtle than looping one rectangular image
forever.

Once the content is native rather than flattened, the continuation
**does not necessarily need to repeat an entire rectangular A1 at all**.

We may explore a field in which different constellations recur or
reconnect spatially in ways that are impossible with a single PNG.

The conceptual aim is:

> A visitor can continue travelling and later recognise material already
> encountered, but does not immediately understand the space as one
> short repeating rectangle.

Possible future approaches might include:

-   spatial offsets;
-   authored continuation regions;
-   a larger super-field;
-   different recurrence relationships between constellations;
-   non-trivial wrapping topology;
-   other approaches proposed after testing.

Do not commit the architecture to any one of these yet.

The Phase 1 PNG loop is only a test.

------------------------------------------------------------------------

# 24. Experimental scale drift --- later test only

There is also an idea to test **very gradual scale change over extended
navigation**.

Do not implement this in Phase 1.

If tested later, it must never feel like:

``` text
cross boundary → sudden zoom
```

There should be no abrupt passage.

Instead, over prolonged movement the scale might drift only slightly.

The visitor might eventually recognise something encountered before, but
now from a subtly different scale or relation.

The effect should be almost imperceptible while occurring.

Manual zoom remains under the visitor's control and must be much more
immediate than any automatic drift.

------------------------------------------------------------------------

# PHASE 3 --- NATIVE CONTENT RECONSTRUCTION

# 25. Replace the flattened PNG progressively

If the interaction succeeds, progressively replace the single PNG with
native media.

Potential final content includes:

-   raster images;
-   cut-outs with transparency;
-   drawings;
-   SVG/vector material;
-   live typography;
-   video;
-   sound.

At this point the structure becomes:

``` text
SpatialPortfolioViewer
│
├── existing Camera / interaction system
│
└── World
    ├── element
    ├── element
    ├── element
    ├── element
    └── ...
```

The camera/navigation behaviour developed earlier remains.

Only the representation of the world changes.

------------------------------------------------------------------------

# 26. Penpot is the compositional master

The final native map should **not** be reconstructed by manually
guessing coordinates from the PNG.

The Penpot A1 composition is the spatial master/reference.

When native reconstruction begins:

1.  derive positions, dimensions and transforms from Penpot/SVG wherever
    possible;
2.  convert those values into one common web/world coordinate system;
3.  temporarily place `HMA_map_prototype_01.png` underneath the native
    reconstruction as an alignment reference;
4.  compare native elements against the reference;
5.  correct discrepancies;
6.  remove the reference PNG when alignment is satisfactory.

Conceptually:

``` js
world = {
  width: SOURCE_WIDTH,
  height: SOURCE_HEIGHT
}

item = {
  x,
  y,
  width,
  height,
  rotation,
  zIndex
}
```

This preserves the spatial relationships already established in Penpot.

------------------------------------------------------------------------

# 27. Why this architecture matters

The development sequence should be understood as:

``` text
1. TEST BODY / CAMERA BEHAVIOUR
   using temporary flattened PNG

                ↓

2. TEST CONTINUITY / RECURRENCE
   refine topology after actually using it

                ↓

3. RECONSTRUCT THE TERRITORY NATIVELY
   separate images / text / drawings / film / sound

                ↓

4. DEVELOP MORE COMPLEX TOPOLOGY IF USEFUL
   without throwing away the camera/navigation work
```

Do not reverse this sequence.

In particular, do not spend substantial time perfecting a PNG-specific
infinite tiling system as though that were the final portfolio
architecture.

------------------------------------------------------------------------

# 28. Explicitly do NOT add

Unless requested after testing, do not add:

-   parallax;
-   cursor trails;
-   hover enlargement;
-   hover reveals;
-   generic hotspots;
-   project popups;
-   animated paths;
-   animated gradients;
-   automatic tours;
-   automatic camera movement;
-   automatic zoom;
-   decorative physics;
-   bounce effects;
-   minimap;
-   fit-to-screen;
-   full-map overview;
-   conventional project navigation inside the field;
-   AI/generative visual effects;
-   explanatory interface text describing the concept.

Do not make the feature "more interactive" beyond the behaviours
specified here.

------------------------------------------------------------------------

# 29. Immediate development question

Do not attempt to finish the portfolio website.

Do not attempt to solve every future topology problem.

Do not rebuild the A1 from individual assets yet.

The immediate question is:

> **When Portfolio is clicked on the existing HMA website, can this
> finite temporary PNG become a convincing spatial field that the
> visitor can move through without the experience abruptly ending at the
> edge of the document --- while keeping the underlying viewer
> architecture ready for the PNG to disappear later?**

Build the simplest robust version that lets us answer that question.

The result will then be tested and developed further.

------------------------------------------------------------------------

# Core principle

**The source material is finite, but the encounter should not be
terminated by that finitude.**

Material resistance should come from movement --- weight, friction,
acceleration and deceleration --- rather than from reaching the end of
the document.

And technically:

**the PNG is a prototype content layer, not the portfolio
architecture.**
