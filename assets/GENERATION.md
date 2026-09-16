# Generated artwork

Tool: built-in `image_gen.imagegen`, reference-guided edits. Original input: `source.png`, supplied by the user. Generated files were copied into this repository without changing the source.

## cloud-bank.png

Use case: background-extraction. Make a transparent PNG texture layer of ONLY the dramatic towering cumulus CLOUD BANKS from reference. Remove all sky, field, grass, ground. True transparent empty sky ABOVE AND BETWEEN cloud masses. Wide 3:1 panorama. Preserve painterly halftone/stipple brushwork and cloud volume, peach gold cream highlights on left transitioning lavender to deep cobalt navy shadows on right. Dense cloud bank fills lower half, uneven dramatic towers reach 90% height, some transparent gaps between towers. Bottom is cloud haze only. No rectangle backdrop, no checkerboard pattern, no text. This will be wrapped on a rotating Three.js cylinder in FRONT of a separate sky gradient, so transparency above silhouette is essential.

## grass-a.png

Use case: background-extraction. Asset: foreground grass texture wind animation frame A for Three.js. Extract and reinterpret a wide low strip of meadow grass in the exact hand-painted halftone brush texture of reference. True transparent background above individual blades; bottom filled with dense grass. Olive green and sunlit ochre yellow blades, deep blue teal shadows, light from left. All roots at lower edge, no sky, hills, horizon, objects, text, or checkerboard. Wide 3:1 composition, grass occupies lower 70% with natural uneven top silhouette. Fine dense natural small blades, NOT isolated large cartoon tufts. Slight breeze leaning left. Save image.

## grass-b.png

Input: grass-a.png. Use case: precise-object-edit. This is wind animation frame A. Make frame B of the SAME grass strip, preserving exact canvas size, root positions, palette, transparency, lighting, painting marks and composition. Only gently bend upper grass tips toward RIGHT by roughly 1-2 percent of image width; bases and lower third remain perfectly stationary. True transparent background stays transparent. No new objects, no sky, no text. This will crossfade slowly with frame A. Preserve individual blade identity as much as possible. Wide 3:1.

The final rendering uses a procedural clear sky and samples the source painting directly for the terrain and field. An earlier opaque sky generation was discarded from the app after separating the clouds from the sky.
