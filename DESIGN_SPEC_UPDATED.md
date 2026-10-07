# HMA Website — Design & Interaction Specification

**Status:** implementation baseline for the first build  
**Primary identity:** HMA  
**Artist:** Olivia Joret  

This document is authoritative for the first implementation. Reference mockups are visual guidance; this specification governs behavior and intent. Do not “clean up,” normalize, conventionalize, or reinterpret intentional overlaps, tight typography, image crops, scarcity, or unusual interaction patterns.

## 1. Core principle

The website is **not an online portfolio** and not a conventional artist website. It is one evolving HMA surface. The current state is the Ardennes phase.

The visitor encounters fragments first and explanation second. The site should feel immediate, sparse, materially specific and slightly withholding—not mysterious through decorative effects.

Do not add conventional `WORK / ABOUT / CV / CONTACT` navigation, project grids, feeds, social icons, cards, decorative textures, fake archival effects, loading gimmicks, or explanatory UI.

## 2. Stable layer vs current layer

### LOCKED — stable layer
- `HMA` is the sole stable identity on the resting landing.
- HMA is large, central and behaves almost as a typographic object.
- HMA is tappable/clickable and opens the HMA information state.
- Typography system and interaction grammar are stable.
- Information states transform the existing landing rather than navigating to conventional pages.

### CURRENT — replaceable Ardennes layer
- Four authored bunker/reconstruction crops.
- Ardennes current-state sentence.
- Live `ARDENNES — [counter]` temporal index.
- Tiny Infiltration, La Chasse and Volume Reconstruction encounters.

Do **not** architect the four-image random system as permanent HMA identity. A future HMA state may use a single image, scan, drawing, film still, etc.

## 3. Source assets

Use source pixels unchanged. Never generatively reinterpret, extend, redraw or “improve” the works.

Expected ZIP asset paths:
- `assets/landing/hma-01.png`
- `assets/landing/hma-02.png`
- `assets/landing/hma-03.png`
- `assets/landing/hma-04.png`
- `assets/works/volume-reconstruction.jpg`
- `assets/works/tiny-infiltration-still.png`
- `assets/works/la-chasse-still.png`
- `assets/documents/Olivia_Joret_Portfolio_2026.pdf`

The four `hma-0X.png` files are the four authored bunker/reconstruction crops. Keep their source pixels and authored crops unchanged.

The two short film excerpt files are **not supplied in the initial handoff**. Until they are supplied, use:
- `tiny-infiltration-still.png`
- `la-chasse-still.png`

as static placeholders inside the already-defined encounter architecture. Do not invent motion, pan/zoom the stills, synthesize footage, or expose a full film. Later, the placeholder media must be replaceable by short MP4/WebM excerpts without changing layout or interaction logic.

For production, keep PNG/JPG masters and derive optimized WebP/AVIF copies without changing crop/composition. HMA and all text remain live HTML, never baked into images.

## 4. Landing image selection

On a new browser session, select one of the four authored crops randomly. Keep that crop fixed for the session. Do not slideshow or switch it during the visit.

Suggested implementation:

```js
const key = 'hma-landing-image';
let selected = sessionStorage.getItem(key);
if (!selected) {
  const images = ['hma-01.webp', 'hma-02.webp', 'hma-03.webp', 'hma-04.webp'];
  selected = images[Math.floor(Math.random() * images.length)];
  sessionStorage.setItem(key, selected);
}
```

Make this a replaceable configuration, not deeply embedded logic.

Landing media fills the viewport. Starting point:

```css
.landing-media {
  width: 100vw;
  height: 100svh;
  object-fit: cover;
}
```

Each crop may have its own responsive `object-position`. Further browser cropping is acceptable. Do not force the entire authored crop to remain visible at all aspect ratios.

## 5. Typography

### Working typeface — LOCKED for first build
**Nimbus Sans Bold / 700**.

Fallback:

```css
font-family: "Nimbus Sans", "Helvetica Neue", Arial, sans-serif;
```

Use a properly licensed/self-hosted webfont source. Do not download an arbitrary font file from an unknown site.

The desired character is blunt, dense and unprecious. Tight leading is intentional. Do not automatically expand line-height to standard web-body values such as 1.4–1.6.

Starting values, to be tuned against the reference mockups in-browser:

| Element | Desktop | Mobile | Weight | Line height |
|---|---:|---:|---:|---:|
| HMA | `clamp(150px, 18vw, 300px)` | `clamp(110px, 34vw, 165px)` | 700 | `0.78–0.82` |
| Ardennes/counter | 14–16px | 13–14px | 700 | `1` |
| Current-state sentence | 30–38px | 20–23px | 700 | `0.98–1.03` |
| Info large titles | 48–64px | 34–42px | 700 | `0.90–0.95` |
| Info body | 20–24px | 17–19px | 700 initially | `1.05–1.12` |
| Metadata | 14–16px | 13–14px | 700 | `1.05` |

Tracking is neutral by default. Slight negative tracking is allowed only for very large HMA/title text if needed to reproduce the references.

**INTENTIONAL:** HMA may intersect technical drawing lines. Do not move it into an empty area to improve readability.

## 6. Resting landing

### Desktop
- Full-viewport current crop.
- Huge `HMA`, visually central rather than a top-left logo.
- No `Olivia Joret` on the resting landing.
- Current-state sentence visible and bold.
- No visible work thumbnails, dots, crosses, labels or conventional navigation.
- Show the live `ARDENNES — [counter]` on desktop as part of the current landing composition. It is required in this build.

Exact current-state sentence:

> The High Mountains Archive extends into the Ardennes forest, where geological and living processes intersect with industrial residues and post-military infrastructures.

Current desktop visual reference: `references/desktop-landing.png`.

### Mobile
Use a more extreme vertical crop/focal point. The accepted composition has HMA intersecting the source technical line; preserve that collision.

Show:

`ARDENNES — 00381.627`

where the numeric portion is live (see section 7), followed by the exact current-state sentence above.

Reference: `references/mobile-landing.png`.

## 7. Ardennes temporal counter

### LOCKED behavior
Display format:

`ARDENNES — 00381.627`

The counter is intentionally unexplained. Do not add a unit, tooltip, legend, title, help icon or explanatory copy.

Current implementation is a **persistent variable-rate temporal counter**:
- Always moves forward; never decreases.
- It must visibly move while watched.
- Sometimes slow; sometimes much faster.
- Slow phases may advance roughly once every 10–20 seconds.
- Faster phases may advance several increments per second.
- Rate transitions should drift gradually, not jitter randomly every frame.
- Digits simply change. No rolling-number effect, blinking, glow, pulse or stopwatch styling.
- It must not reset on reload.
- Different visitors at approximately the same real-world moment should obtain approximately the same value.
- Do not make its rate respond to pointer/touch interaction.

### Implementation requirement
For now, use a deterministic pseudo-random rate function derived from absolute time. Do not require a backend. It should feel organic while remaining reproducible from time.

Architect the rate provider behind a small interface/function so it can later be replaced by hydrological data (e.g. Fontaine aux Suzias discharge/recharge model) without changing the UI component.

The counter is currently an artistic temporal device, not a claimed hydrological measurement. Do not expose an explanation in the interface.

## 8. Desktop secondary encounters

There are three secondary encounter zones:
1. Tiny Infiltration — moving film excerpt + sound.
2. La Chasse — moving film excerpt + sound.
3. Volume Reconstruction — static and silent.

Resting state has **no visible markers**. Use generous invisible hover zones and normal pointer cursor feedback.

### Film hover
For the initial build, because the excerpt files are not yet supplied, show the corresponding still in the exact intended film frame/position. Keep the component ready for a later video source.

When excerpt files are supplied:
- Enter zone → framed excerpt appears immediately.
- Play a manually authored 3–6 second excerpt in a continuous loop for exactly as long as the cursor remains in the zone.
- Sound should play while hovered when browser policy permits.
- No fade required by default.
- Re-entry may restart excerpt from beginning.
- Only one film fragment active at once.
- No controls, play icon, progress bar, title or label.
- Mouse leave → image and sound stop/disappear.
- If autoplay-with-sound is blocked, preserve the visual loop rather than failing.

### Reconstruction hover
- Same encounter grammar but static and silent.
- Show small framed thumbnail of the complete reconstruction.
- Do not animate it.

### Frame
Medium black border only. No white/grey mount, shadow, rounded corners or UI chrome.

Starting relationships from Crop 4 reference:
- Tiny: x ≈ 11.5vw, y ≈ 33.5vh, width ≈ 24.5vw.
- La Chasse: x ≈ 68.5vw, y ≈ 7.5vh, width ≈ 24.5vw.
- Reconstruction: x ≈ 34.5vw, y ≈ 63.5vh, width ≈ 27.5vw.
- Border ≈ 0.45vw.

Current visual references:
- `references/desktop-hover-tiny-infiltration.png`
- `references/desktop-hover-la-chasse.png`
- `references/desktop-hover-reconstruction.png`

The coordinates above are proportional starting relationships, not fixed pixel coordinates. Tune against the current reference images rather than older hover tests.

## 9. Mobile secondary encounters

Do not use invisible tap zones as the sole discovery mechanism.

The HMA information state provides direct text links to all three works. On the resting landing, secondary fragments additionally **surface autonomously and occasionally**.

### Surfacing behavior
- After a resting period, one encounter may surface.
- This is not a carousel and should not feel scheduled/predictable.
- Keep the landing dominant; interruptions are occasional.
- When an encounter surfaces, apply a **75% white veil** to the entire underlying landing layer (image + live landing typography).
- Surfaced media remains full contrast.
- Medium black-only frame.
- Film encounter appears relatively high on screen, around the accepted Tiny test position (~25.5% screen height), so it does not primarily cover the current-state copy.
- Film width starting point ≈ 76% screen width.

### Mobile film
For the initial build, surface the supplied still as the temporary media placeholder using the same frame, veil and tap behavior. Do not fake movement.

When excerpt files are supplied:
- 3–6 second selected excerpt loops immediately when surfaced.
- Sound should start immediately when browser policy permits.
- If sound is blocked until first user interaction, continue visual loop silently; after a qualifying interaction, future surfaced films should use sound.
- Tap surfaced film → open its information state.
- No controls or labels.

### Mobile reconstruction
- Same 75% veil and surfacing grammar.
- Static and silent.
- Tap → reconstruction information state.

Current visual references:
- `references/mobile-encounter-tiny-infiltration.png`
- `references/mobile-encounter-la-chasse.png`
- `references/mobile-encounter-reconstruction.png`.

## 10. HMA information state

Click/tap HMA directly. Do not insert an intermediate menu.

Transform the current landing rather than navigating to a conventional About page.

Desktop: underlying current crop remains visible under a strong white veil (~80% / alpha ≈205 of 255 as starting point). Mobile accepted information state uses a similarly strong veil.

Show large:

`HIGH MOUNTAINS`  
`ARCHIVE`

### LOCKED HMA text

> **High Mountains Archive is an affective and situated research developed by Olivia Joret.**
>
> It began with Hoge Bergen — “High Mountains” — a site and neighbourhood in Belgium with a long history of extraction and non-ferrous industry. **The former industrial site is now a nature park. There are no mountains, but deep clay pits.**
>
> **Its mountains are entangled with excavation, accumulation, material transformation, living processes and structures of power.**
>
> **The archive has since developed through partial encounters with materials, traces, histories and transformations, across different places and temporalities.**

Do not rewrite `an affective and situated research` into more conventional English.

### Olivia/practical block — LOCKED

> **Olivia Joret works in Belgium, between a shared workspace with the Level Five collective in Brussels and a studio in the Ardennes.**

Then:
- `PORTFOLIO 2026 ↓`
- actual email when supplied

No contact form, social links, CV, education/exhibition list or Works navigation.

### Mobile HMA information state additionally includes
- `ARDENNES — [live counter]`
- current-state sentence
- restrained direct textual entries:
  - `VOLUME RECONSTRUCTION →`
  - `TINY INFILTRATION →`
  - `LA CHASSE →`

Current visual references:
- Desktop: `references/desktop-info-hma.png`
- Mobile: `references/mobile-info-hma.png`

## 11. Volume Reconstruction information state

Same transformed-surface grammar. Underlying Crop 4 + strong white veil (~85%, alpha ≈218 starting point).

Use `assets/works/volume-reconstruction.jpg` **uncropped**, large left on desktop (~57vw starting point), natural aspect ratio, medium black frame. Sparse information at right. Minimal `×` upper-right.

Heading:
`HIGH MOUNTAINS ARCHIVE #4`

Title:
`METABOLIC SUBLIME`

Label:
`Volume reconstruction`

Text — LOCKED:

> The inaccessible interior volumes of a hollowed-out post-military bunker complex in the forest are apprehended through partial information. Processes of sensing through form, scale, material and activation bring these volumes into an affective and bodily relation, allowing some of their loads (historical, political, economic, ecological and others) to be approached and partially processed.

Do not add NATO to this short state. Do not crop/reinterpret the reconstruction.

Current visual references:
- Desktop: `references/desktop-info-reconstruction.png`
- Mobile: `references/mobile-info-reconstruction.png`

## 12. Tiny Infiltration information state

Heading:
`HIGH MOUNTAINS ARCHIVE #4`

Title:
`TINY`  
`INFILTRATION`

Metadata:
`Film, ~2 min, 2026`

Replace approximate duration when exact duration is supplied.

Description:

> Tiny Infiltration follows the sound of water entering a hollowed-out high-security storage complex in the forest.

Context:

> Developed for MOVING ASSEMBLY, a four-hour performance with Level Five at KOMPLOT, Brussels, November 2026, in which works move between storage, display and activation.

Use `assets/works/tiny-infiltration-still.png`, unchanged.

Current visual references:
- Desktop: `references/desktop-info-tiny-infiltration.png`
- Mobile: `references/mobile-info-tiny-infiltration.png`

## 13. La Chasse information state

Heading:
`HIGH MOUNTAINS ARCHIVE #4`

Title:
`LA CHASSE`

Subtitle:
`(Field notes on a missing film)`

Metadata:
`Film, 2’13’’, 2026`

Description — use exactly:

> La Chasse engages with references to a film with the same name (1950-1960), attributed to A. Cauvin, whose origin and status remain uncertain. The work displaces these references across forest and interior spaces, treating sites as constructed and unstable. Taking its cue from the title, it unsettles the logic of the hunt as a structure of pursuit and capture, while speculating on a form of objectivity that cannot be secured.

Presentation history:

> **Presented in Level Five’s HomeScreen programme during Open Studio Days, Brussels, 2026.**

Use `assets/works/la-chasse-still.png`, unchanged.

Current visual references:
- Desktop: `references/desktop-info-la-chasse.png`
- Mobile: `references/mobile-info-la-chasse.png`

## 14. Information-state navigation

- Minimal `×` in upper-right closes state and returns to the exact landing/session crop.
- `Escape` closes on desktop.
- Clicking/tapping outside content may close if it does not interfere with media interaction; test this rather than making it mandatory.
- Do not use browser-like modal cards or a dark modal backdrop.
- No full film playback is required in the first build. Work states show still + information.

## 15. Motion and transitions

Motion should come primarily from the works and counter, not interface decoration.

- Avoid ornamental easing, parallax, scale-on-hover, cursor trails, kinetic typography, page-transition effects.
- Veil transitions may be short and restrained; starting point 150–250ms.
- Desktop hover encounter should feel immediate rather than fade theatrically.
- Respect `prefers-reduced-motion`: keep states and navigation functional, suppress nonessential transitions, and provide a stable representative frame for autonomous film surfacing if required.

## 16. Accessibility without redesigning the work

- HMA must be a real button/link with a generous hit area extending beyond the glyphs.
- Invisible desktop encounter zones must be keyboard reachable through an unobtrusive logical tab order; do not expose permanent visual cards solely for accessibility.
- Provide meaningful alt text for work images.
- `×` must have an accessible name such as `Close`.
- Direct mobile links in the HMA information state ensure works are discoverable without relying on autonomous surfacing.
- Sound must not cause the experience to fail when autoplay is blocked.

## 17. Responsive intent

Do not merely scale desktop down.

Desktop emphasizes exploratory pointer encounters. Mobile emphasizes the large HMA entry point, direct work links inside HMA information, and occasional autonomous fragments.

Intentional collisions and cropping are part of the design. Do not apply generic “keep text away from image details” or “avoid overlap” heuristics.

## 18. Reference files

The `references/` folder contains **16 current visual references: 8 desktop + 8 mobile**. These are the only mockups the coding agent should use. Do not look for or infer design decisions from older exploratory mockups.

### Desktop
- `references/desktop-landing.png`
- `references/desktop-hover-tiny-infiltration.png`
- `references/desktop-hover-la-chasse.png`
- `references/desktop-hover-reconstruction.png`
- `references/desktop-info-hma.png`
- `references/desktop-info-tiny-infiltration.png`
- `references/desktop-info-la-chasse.png`
- `references/desktop-info-reconstruction.png`

### Mobile
- `references/mobile-landing.png`
- `references/mobile-encounter-tiny-infiltration.png`
- `references/mobile-encounter-la-chasse.png`
- `references/mobile-encounter-reconstruction.png`
- `references/mobile-info-hma.png`
- `references/mobile-info-tiny-infiltration.png`
- `references/mobile-info-la-chasse.png`
- `references/mobile-info-reconstruction.png`

The written specification is authoritative for behavior, exact copy and implementation rules. The 16 current references are authoritative for visual relationships and composition. If a minor raster/mockup artifact conflicts with the written specification, follow the written specification.

## 19. First-build acceptance checklist

The first implementation is successful if:
- HMA feels like the primary encounter, not a logo above a portfolio.
- The landing source imagery remains untouched.
- One authored crop is selected per session and remains stable.
- Typography is Nimbus Sans Bold, dense and deliberately tight.
- No Olivia name appears in the resting landing.
- The Ardennes counter visibly moves at a variable, persistent, always-forward rate and is unexplained.
- Desktop has three invisible encounter zones; films loop with sound where permitted; reconstruction is static.
- Mobile fragments surface occasionally against a 75% white veil; films loop and attempt sound immediately.
- HMA always provides a direct route to information and, on mobile, to all three works.
- All work information states use the transformed landing/veil language rather than conventional pages/modals.
- No AI-generated reinterpretation of artwork appears anywhere.
- No conventional portfolio grid/navigation has been introduced.

## 20. AI coding-agent instruction

When implementing this specification, **do not make autonomous aesthetic corrections**. If a requirement seems unusual (overlap, tight leading, invisible hover zone, extreme crop, sparse navigation, unexplained counter), assume it is intentional. Implement the stated baseline first. Any later visual refinement should be made by comparing the live browser output with the supplied reference images.
