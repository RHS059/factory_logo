# First-pass verification

Checked 2026-09-15 using the Codex in-app Chromium browser and a local HTTP server under `/factory_logo/` (matching the GitHub Pages project prefix).

| Check | Result |
| --- | --- |
| JavaScript syntax | `node --check scene.js` passed |
| Desktop | 1280 × 720, full viewport, no default controls |
| Portrait | 390 × 844, composition crops correctly without scrollbars |
| Wide layout | 1920 × 800 viewport override, full coverage |
| Shader compilation / console | Fresh final-preview tab returned no errors or warnings |
| Cloud motion | `?t=0` versus `?t=60` visibly moves cloud landmarks left while terrain stays fixed |
| Sky separation | Disabling Clouds leaves the clear gradient sky, terrain, field, and grass intact |
| Field separation | Disabling Grass layers leaves the original projected field visible |
| Depth | Debug camera-X translation exposes foreground/terrain perspective separation |
| Normal playback | Debug elapsed time advances during playback |

Three.js and every runtime asset are local relative-path files. Generated cloud and grass PNGs retain actual transparency. The original image is retained intact.

Reduced-motion and background-tab pause behavior are implemented using `matchMedia` and `visibilitychange`; OS-level reduced-motion emulation was not part of this manual browser check. Mobile sizing was verified in desktop Chromium, not on physical mobile hardware. GitHub Pages availability depends on the repository owner's Pages configuration.
