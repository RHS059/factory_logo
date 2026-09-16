# Living Meadow

A first-pass Three.js landscape based on the supplied painting: golden light, blue cloud shadows, distant terrain, and wind moving through grass. The normal view has no controls or overlays.

## GitHub Pages

Entry point: **[`index.html`](./index.html)** at the repository root.

In **Settings → Pages**, choose **Deploy from a branch**, **main**, **/ (root)**, then save. The expected URL is **https://rhs059.github.io/factory_logo/**. Pages must be enabled before that URL serves the scene.

All imports and asset paths are relative, so the `/factory_logo/` project prefix works. No build, npm install, API key, server backend, or external CDN is needed. Three.js **0.180.0** is vendored with its MIT license in `vendor/`.

For local preview, serve this directory over HTTP (for example, `python -m http.server 8000`) and open `http://localhost:8000`. ES modules and texture loading require HTTP rather than opening `index.html` with `file://`.

## Scene construction

- **Sky:** stationary sky enclosure with a teal-to-blue gradient. There are no cloud pixels in the sky layer.
- **Clouds:** a generated transparent cloud-bank texture on full 360° cylinders at radii 600 and 780. The two shells rotate independently. Positive Y rotation carries cloud features in front of the camera toward screen left; the main speed is 0.0016 radians/second. Mirrored wrapping avoids a color discontinuity at the panorama ends.
- **Terrain:** a separate silhouette mesh at Z = -110 using the original painting's terrain pixels. Pixels above the traced skyline are excluded geometrically.
- **Field:** a genuinely flat horizontal plane at Y = 0. A locked reference projection maps the original painted field onto the ground without stretching the brushwork into a conventional tiled surface.
- **Grass:** staggered transparent patches in four depth groups around Z = -48, -24, -11, and 1. Two generated frames blend slowly while subdivided geometry bends the tips. Roots remain grounded; patch phase and depth vary.
- **Camera:** position and orientation are fixed during normal playback. This is a layered 3D scene, not an orbiting camera or mouse-following effect. True perspective separation can be inspected with the optional debug translation.

The renderer fills the viewport and crops the composition for portrait and ultrawide screens. Pixel ratio is capped at 1.75. Animation pauses while the page is hidden and respects `prefers-reduced-motion`. If WebGL or an asset fails, the original painting remains visible with a short error message.

## Debugging and verification

Append **`?debug`** to reveal animation/layer toggles, draw count, time, and a small camera-translation slider. The slider changes only X position, never viewing direction, and only in debug mode. Turn off clouds to inspect the independent sky. Turn off grass to inspect the field. Translate the camera to see foreground shift more than terrain.

Append **`?t=0`** or **`?t=60`** for deterministic time snapshots; combine with debug as `?debug&t=60`. Time snapshots intentionally remain fixed regardless of the Animate checkbox. Normal playback uses elapsed active time.

Browser verification covered the project-prefixed path, desktop and portrait rendering, cloud drift between time snapshots, separate layer toggles, debug depth translation, and console/shader errors. `node --check scene.js` verifies JavaScript syntax. See `VERIFICATION.md` for the checked sizes and results.

## Artwork and limitations

`assets/source.png` is the user's original artwork. `cloud-bank.png`, `grass-a.png`, and `grass-b.png` were produced with the built-in image generator using the supplied painting as reference. Prompts and provenance are recorded in `assets/GENERATION.md`.

This is a painted 2.5D first pass: the ground and layer positions are 3D, while clouds and grass use transparent artwork. It is intended for the fixed viewing direction. The reference-projected field and traced horizon are not designed for free exploration. The two grass frames are AI-generated approximations, blended with geometric wind; they are not a physically simulated meadow. The cloud wrap mirrors the artwork over a full revolution, rather than claiming a unique 360° panorama.
