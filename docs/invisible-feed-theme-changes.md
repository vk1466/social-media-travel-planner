# Invisible Feed Changes

Here is a simple summary of what was built and changed for the Invisible Feed theme:

1. **Zero-Chrome Card Design & Clear Image Resting State**
   - Removed borders, solid card panels, and fixed-height boxes.
   - Shows full-bleed media edge-to-edge.
   - At rest, cards display **only the clear image** — all titles, creator handles, metadata badges, and gradient scrims are hidden until hover.

2. **Natural Media Masonry & Horizontal Place Cards**
   - Preserves natural dimensions: 9:16 for vertical reels/shorts, 4:5 for photos/food recipes, 2:3 for movie posters, and horizontal 16:9 for landscape places.
   - Place cards always render in horizontal 16:9 landscape format.
   - Dynamically balances column heights across 1 to 5 columns depending on screen size.

3. **Hover & Touch Disclosures**
   - Pure image at rest: text, badges, and dark gradient scrim smoothly fade and slide in strictly upon hovering or tapping.
   - Added a "Simulate Touch" toggle to test the mobile experience without needing a touch device.

4. **Immersive Detail Modal**
   - Fullscreen modal with blurred background for viewing a save in detail.
   - Side-by-side view on desktop (media on the left, details/actions on the right).
   - Shows place facts and maps for travel saves, ingredient lists for food saves, and movie overviews for films.
   - Supports keyboard navigation (Left/Right arrows to flip through items, Escape to close).

5. **Category Filter Chips & Search**
   - Category chips ("All Saves", "Reels & Videos", "Photos", "Travel & Places", "Food & Recipes", "Watch") with real-time save counts.
   - Instant search bar that filters across titles, creators, captions, and places as you type.

6. **Navigation & Dedicated Route**
   - Kept accessible on its own dedicated route at `/invisible-feed`.
   - Added a "✨ Invisible Feed" quick-access button in the top navigation bar.
