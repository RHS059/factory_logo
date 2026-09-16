# Living Meadow

A Three.js landscape made from separate image layers. The original painting controls the layout.

## Page and deployment

Site: https://rhs059.github.io/factory_logo/

Every push to main starts the GitHub Pages workflow. You can also start the workflow manually. The entry point is index.html. Three.js 0.180.0 is included in vendor with its MIT license. No build or external service is necessary.

To view the site locally, use an HTTP server in this directory. For example: python -m http.server 8000.

## Image layers

The built-in image generator made new layers from the original painting:

| Layer | Asset | Movement |
| --- | --- | --- |
| Clouds | assets/clouds-v3.png | Slow rotation around a cylinder |
| Hills | assets/terrain-v3.png | Camera parallax only |
| Tan field | assets/far-field-v3.png | Camera parallax only; no wind |
| Green grass | assets/meadow-a-v3.png and assets/meadow-b-v3.png | Wind frames and camera parallax |

Each asset uses the full reference canvas. Transparent areas keep the layer positions. The hill ridge, tan field, and diagonal grass shadows stay near their original locations. Small placement corrections align the generated field with the other layers.

The green meadow is separated into three overlapping depth layers. Each layer has its own wind phase. The tan field has no wind animation. A flat ground plane closes small gaps. It has no painted grass texture.

The cloud texture is projected onto the front of a cylindrical shell from the reference camera. This preserves its shape instead of stretching the texture across the height of the cylinder. The shell uses mirrored sections for a continuous wrap. A separate clear-sky enclosure remains stationary.

The original source.png is retained as the reference and the loading/error fallback. It is not used as an active grass or hill texture.

## Camera and controls

The view direction stays fixed. Move the pointer beyond the center dead zone to move the camera a small distance. Travel is limited to 0.32 world units horizontally and 0.14 vertically. The camera returns to center when the pointer leaves.

Reduced-motion preferences stop wind, cloud motion, and mouse parallax. Rendering stops while the tab is hidden.

Add ?debug for layer toggles, animation control, time, and a camera-X slider. Debug mode overrides mouse movement. Add ?t=0 or ?t=4 for fixed wind and cloud times.

This is a painted 2.5D scene for bounded camera movement. It is not a free-camera world.

## Asset record

See assets/GENERATION.md for the generation tool, exact prompts, and alignment notes. The current scene uses five regenerated image assets.

## Text panel

The Factory text panel stays fixed on the screen and does not take part in the landscape parallax. Its grey background has 25% opacity. Its text and layout come from the supplied HTML mockup. Archivo loads from Google Fonts, with Helvetica and Arial as fallbacks. The panel stacks on narrow screens and does not intercept pointer movement.

## Chrome logo

The supplied logo outline forms a beveled 3D mesh with eight openings. A shallow curved face gives the chrome varied reflections. The sculpture sits in front of the tan field and behind the near grass. A ground clipping plane hides the base below ground level.

Warm sunset light, cool blue fill light, and reflections affect only the logo. The painted landscape keeps its original colors. The text stays fixed on the screen around the sculpture.

Download assets/factory-logo.glb for the standalone model. The site builds the same geometry from assets/logo-contours.json through logo-geometry.js.
