# Living Meadow

A static Three.js meadow with layered, animated grass and transparent rotating clouds.

## View and deploy

Site: https://rhs059.github.io/factory_logo/

GitHub Actions deploys every push to main using .github/workflows/deploy-pages.yml. The workflow also supports manual dispatch. The entry point is index.html. No build or external CDN is required; Three.js 0.180.0 is bundled with its MIT license.

For local preview, serve the repository over HTTP (for example, python -m http.server 8000).

## Layers and movement

- A stationary clear-sky enclosure sits behind transparent generated clouds.
- Two cloud cylinders rotate independently so the clouds drift right to left. The main bank is framed to show the generated alpha silhouette. Mirrored wrapping makes the panorama continuous.
- The source painting is used only for the distant terrain silhouette and the loading/error fallback.
- All meadow grass uses grass-a.png and grass-b.png. There is no original painted grass underlay. The flat ground blends these generated frames, and 22 staggered depth groups add upright grass patches with independently phased tip bending.
- Moving the mouse beyond a central dead zone smoothly translates the camera. Travel is capped at 0.45 world units horizontally and 0.2 vertically. Camera orientation stays fixed. Leaving the scene recenters the view.
- Reduced-motion preferences disable automatic motion and mouse parallax. Rendering pauses when the tab is hidden.

## Debugging

Add ?debug for layer toggles, an animation toggle, time/draw counts, and a camera-X depth slider. Debug mode overrides mouse movement. Add ?t=0 or ?t=2 for fixed animation snapshots.

The generated assets and exact prompts are recorded in assets/GENERATION.md. This is a painted 2.5D scene intended for this bounded viewing area, rather than free-camera exploration.
