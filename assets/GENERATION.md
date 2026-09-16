# Registered image layers, revision 3

Tool: built-in image_gen.imagegen. Source: the user's original painting in source.png. All outputs retain PNG alpha.

## terrain-v3.png

Use case: background-extraction. EDIT the supplied painting into one registered compositing layer. Preserve the original 1376:768 aspect ratio and the EXACT full-canvas layout, scale, perspective, color placement, horizon height, and brushwork. Do not crop, zoom, reframe, enlarge objects, or redesign. Keep empty areas transparent, not black or checkerboard. The output will be stacked with other layers in precisely the original positions. Regenerate only the distant low mountain/hill ridge, in its original narrow band between 63% and 73% down the canvas. Its silhouette is nearly flat at left and gently rises to the right. Preserve the original olive ridges, ochre highlights, blue-green dark slopes, and halftone painterly marks. Remove ALL sky, clouds and ALL meadow grass; everything above the hills and below their base is transparent. Paint a small overlap extension below the hill base to allow parallax. The mountain band must stay small and distant, never fill the image.

## far-field-v3.png

Use case: background-extraction. EDIT the supplied painting into one registered compositing layer. Preserve the original 1376:768 aspect ratio and the EXACT full-canvas layout, scale, perspective, color placement, horizon height, and brushwork. Do not crop, zoom, reframe, enlarge objects, or redesign. Keep empty areas transparent, not black or checkerboard. The output will be stacked with other layers in precisely the original positions. Regenerate only the distant pale tan/yellow meadow, between 70% and 82% down the canvas, in its EXACT original position. Preserve the thin horizontal golden light bands, pale peach highlights on left, olive flecks, cool dark edging at right, and broad pale-yellow patch through the center. Remove mountains, sky, clouds and foreground green grass to transparency. Fill the entire width of this narrow landscape band, and add a small painted overlap at its lower edge. It is the flat distant meadow in front of the hills. Keep its uneven fine grass-textured lower silhouette, not a straight rectangular crop. Do not move this band up or down.

## meadow-a-v3.png

Use case: background-extraction. EDIT the supplied painting into one registered compositing layer. Preserve the original 1376:768 aspect ratio and the EXACT full-canvas layout, scale, perspective, color placement, horizon height, and brushwork. Do not crop, zoom, reframe, enlarge objects, or redesign. Keep empty areas transparent, not black or checkerboard. The output will be stacked with other layers in precisely the original positions. Regenerate ONLY all the green meadow grass in the bottom 25% of the original canvas. This is wind animation frame A. Keep the grass in the original positions and scale: fine small blades; sunlit olive and yellow green areas at left and center; deep navy/teal shadows at right and along the bottom; the EXACT broad diagonal blue shadow bands across the foreground. Keep original patch shapes and distances. Everything above the green grass (top 74% of canvas) is transparent. No mountains, clouds, sky or pale tan distant field. Natural fine blade tips at upper edge; fill down to the bottom edge. Slight breeze left. Extend grass subtly upward by 1% for overlap with the tan field. No large isolated tufts, no magnified blades, no repeating tiles.

## clouds-v3.png

Use case: background-extraction. Edit this original painting into a registered transparent CLOUDS layer for parallax compositing. Keep the EXACT 1376:768 full-canvas aspect ratio, scale, cloud silhouettes, positions, lighting, colors, and painterly halftone texture. Do not crop or zoom. Clouds must occupy their original positions from top edge down to 66% canvas height: luminous yellow gold peach cloud mass on the left, coral lavender towers in the middle, broad dark blue shadow clouds at upper right and lower right. Remove only the clear teal SKY gaps between cloud shapes to true alpha transparency; regenerate edges and occluded cloud bits subtly. Remove ALL mountains, field and grass (lower 34%) to transparency. Retain original broad cloud proportions, never tall skinny towers, never increase vertical scale. It must line up over the original canvas as a separated layer, not a new composition. No checkerboard, no backdrop, no labels.

## meadow-b-v3.png

Input: meadow-a-v3.png.

Use case: precise-object-edit. Create wind animation frame B from this exact full-canvas transparent meadow layer. Keep the SAME full image dimensions/aspect ratio, upper transparent space, grass region position, original blade scale, all broad green patches, the exact broad diagonal navy/teal shadow bands, all lighting and colors. Keep roots and the entire layout fixed. Change ONLY green grass blade tips: bend them gently toward the right, by about 4 to 8 image pixels. The tips were leaning left; this is the other wind phase. Do not slide or warp the whole field. No changes to dark shadow shapes, no crop, no zoom, no sky, no tan field, no mountains. Preserve true alpha transparency exactly above the meadow.

## Assembly

The complete generated canvases are used as registered textures. No crop is enlarged to fill the screen. The tan field uses a vertical scale of 0.68 and UV-space placement offset of 0.045 to correct the generator's band position. The clouds use a 0.91 vertical placement scale, anchored at the top, to match the original cloud height. The meadow keeps its full-canvas shadow positions and is separated into three overlapping depth layers with irregular boundaries. The original painting is used only as a reference and fallback, not as active grass or terrain.
