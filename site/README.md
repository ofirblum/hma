# HMA

Astro static website with Alpine.js interactions. The design specification and original artwork live one directory above this project and are not modified.

## Run

Use Node.js 22.12+ (or 24+) and npm:

Your supplied portable runtime is in a nested distribution folder. In a new PowerShell terminal, make it available for that terminal session and enter the site directory:

```powershell
$env:Path = "$env:USERPROFILE\DevWorks\node-v25.9.0-win-x64\node-v25.9.0-win-x64;$env:Path"
Set-Location HMA-Website/site
```

```powershell
npm install
npm run prepare:assets
npm run dev
```

The development URL is printed by Astro. To validate and build:

```powershell
npm test
npm run build
npm run preview
```

Asset preparation copies the original PNG/JPG masters and PDF, generates same-dimension WebP/AVIF derivatives without cropping, and obtains Nimbus Sans Bold from the [official Artifex URW base35 source](https://github.com/ArtifexSoftware/urw-base35-fonts/tree/3c0ba3b5687632dfc66526544a4e811fe0ec0cd9). Its upstream AGPL-3.0 LICENSE and COPYING accompany the unmodified self-hosted font in `public/fonts`. Asset preparation requires network access on the first run for the font; subsequent runs reuse it. Run asset preparation before the tests, which verify master integrity and derivative dimensions.

## Current State

`src/lib/current-state.mjs` owns the replaceable Ardennes layer, responsive image focal positions, work copy, and practical details. Set `practical.email` once the actual address is supplied; no address is invented.

La Chasse uses the supplied `Assets/works_/la-chasse-loop.mp4` (6.34 seconds), copied unchanged during asset preparation. It loops in desktop and mobile encounters, attempts sound, and falls back to muted playback when browser autoplay policy blocks sound. Tiny Infiltration remains a still until its excerpt is supplied. Information states continue to use stills, and reduced-motion visitors retain the static encounter frame.

To supply another excerpt, place the authored MP4/WebM in the parent `Assets/works_` directory and set that work's `excerpt` URL in `src/lib/current-state.mjs` to `/assets/works/filename.mp4` (or `.webm`). Asset preparation copies configured excerpts without altering them. The supplied La Chasse loop is slightly longer than the specification's 3-6 second starting range; it is preserved rather than automatically trimmed.

`src/lib/counter.mjs` provides an absolute-time, seeded variable-rate counter with an exact positive integral. Its `counterProvider` interface can be replaced with a future data provider without changing the UI. The initial reference value is anchored to 2026-10-04 UTC. No backend or local reset is involved.

Mobile fragments appear after an irregular resting interval and disappear after a short encounter. HMA information offers persistent direct access to each work. Dialogs support Escape, focus containment, and focus restoration; desktop encounter zones also reveal on keyboard focus.

## Python Environment

The requested `.venv` is separate from the Node runtime used by Astro. No Python packages are required by this website.

VS Code selects this interpreter automatically. New workspace terminals receive the venv's `VIRTUAL_ENV` and `PATH` directly, without running an activation script. The default `HMA PowerShell (venv)` profile uses `-NoProfile` to avoid the startup script blocked by the existing execution policy. System execution policy is unchanged.

After changing these workspace settings, close old terminals and open a new one. Outside VS Code, activation from this site directory is available in Command Prompt:

```bat
.venv\Scripts\activate.bat
```