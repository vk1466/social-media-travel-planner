# Wanderfile UX/UI Spec (for Antigravity)
These rules apply to all three surfaces: the native app (`mobile/`), mobile web and desktop. Build shared tokens first, then build each screen to match.

## Sources
- Apple HIG, Sheets: https://developer.apple.com/design/human-interface-guidelines/sheets
- Apple HIG, Playing haptics: https://developer.apple.com/design/human-interface-guidelines/playing-haptics
- Material 3, Bottom sheets: https://m3.material.io/components/bottom-sheets/overview
- Material 3, Chips: https://m3.material.io/components/chips/overview
- Material 3, Snackbar: https://m3.material.io/components/snackbar/overview
- NN/g, Skeleton screens: https://www.nngroup.com/articles/skeleton-screens/
- NN/g, Empty states: https://www.nngroup.com/articles/empty-state-interface-design/
- NN/g, Confirmation vs undo: https://www.nngroup.com/articles/confirmation-dialog/
- WCAG 2.2, Contrast (1.4.3): https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum
- WCAG 2.2, Target size (2.5.8): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- Map clustering (Supercluster): https://github.com/mapbox/supercluster
- Keyless tiles (OpenFreeMap): https://openfreemap.org
- Reference apps: Wanderlog (https://wanderlog.com), Mindtrip (https://mindtrip.ai), Airbnb map + sheet, Google Maps saved lists, Pinterest boards, mymind (https://mymind.com), and patterns on Mobbin (https://mobbin.com)

## 1. Visual system
**Type** (Inter on web, system font in native): Display 32/38 semibold · H1 24/30 semibold · H2 20/26 semibold · Body 16/24 · Callout 14/20 · Caption 12/16 medium. Body text is never smaller than 16px on mobile, which also stops iOS from zooming into inputs.

**Spacing** uses a 4pt base: 4, 8, 12, 16, 24, 32, 48. Screen gutters are 16px on mobile, 24px on tablet and 32px on desktop.

**Radius:** chips are full pills, inputs and buttons 12, cards 16, sheets and modals 24 on the top corners.

**Shadows:** cards use `0 1px 2px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.06)` and sheets use `0 -8px 24px rgba(0,0,0,.12)`. In dark mode, show depth with a lighter surface instead of a shadow.

**Color tokens (light / dark):**
- `bg` #FAFAF7 / #0E0F11
- `surface` #FFFFFF / #17191C
- `surface-2` #F2F2EE / #202328
- `text` #14161A / #F2F2F0
- `text-muted` #5B616B / #A3A9B3 (both meet AA on bg)
- `border` #E4E4DF / #2A2E34
- `primary` #0F766E / #2DD4BF (teal, travel feel)
- `on-primary` #FFFFFF / #04201D
- `danger` #B42318 / #F97066
- `success` #067647 / #47CD89

Category accents are used only on chip dots and pins: Places teal, Food #C2410C, Watch #6D28D9, Fashion #BE185D, Hair #A16207.

Follow `prefers-color-scheme` on web and `useColorScheme` in native, with a manual override in Settings.

**Icons:** use Lucide on web and lucide-react-native, 1.75px stroke, 20px inline and 24px in nav. Use no emoji in the UI chrome.

**Imagery:** always show the real reel thumbnail or the place photo. When no image exists, show a neutral `surface-2` tile with the category icon instead of a gradient. Use a 4:5 ratio for posts and 16:9 for place heroes, `object-fit: cover`, with a blur-up placeholder.

## 2. Key screens
**Home:** a greeting, a "Paste a reel link" bar fixed at the top (it auto-reads the clipboard when it holds an instagram.com URL and shows a "Paste link from clipboard" chip), a "Recently saved" row of 5 cards, a "Near you" row (ask for location permission only here), and a "Your trips" row.

**Library grid:** a sticky row of filter chips (All, Places, Food, Watch, Fashion, Hair), each with a count and single-select, plus sort (Recent, A–Z) and search. Use 2 columns at 360 and 390, 3 at 768, 4 at 1024 and 5 at 1440, with an 8px gap on mobile and 16px on desktop. Each card shows the thumbnail, a category pill top-left, a 2-line title, and a caption line such as "3 places · Lisbon". Long-press (native) or the ⋯ menu (web) offers Add to collection, Edit and Delete.

**Save flow:** a bottom sheet on mobile and a 480px modal on desktop. Paste a link, check it instantly ("Only Instagram links are supported"), then show a live preview card with the thumbnail, author and caption within about 1s. The card then fills in the detected places and items progressively, with a skeleton for each row. Before saving, the user picks a collection; it defaults to Unsorted. The primary button reads "Save". After tapping it, close the sheet, add the card to the library right away, and show "Saved · View" in a toast.

**Post detail:** the media hero with an "Open in Instagram" link, the title and author, then extracted items grouped by type. Each place row shows its name, area and a "Map" chip. Users can rename or remove any item inline and use "+ Add missing place". Show the caption in a collapsible section.

**Place detail:** a 16:9 hero, then the name with an H1 that may wrap but must never break mid-word (`overflow-wrap: anywhere` is not allowed; use `break-word` and `hyphens: auto`). Below that: category, area, rating if known, an action row (Directions with Google/Apple, Add to trip, Share), a mini map, "Saved from" reels and About & Tips. Cards are max-width 100% with no clipping.

**Map:** full-bleed MapLibre with OpenFreeMap tiles (no API key). Cluster pins with Supercluster, and tapping a cluster zooms in. Fit all pins on load. Use category-colored pins with a 44px hit area.
- **Mobile:** a draggable bottom sheet with three detents (peek 96px with a count and filter chips, half 50%, full) that lists the places in view and syncs with the pins.
- **Desktop:** a 380px left list panel next to the map. Hovering a row highlights its pin, and tapping a pin scrolls to and expands its row.
- Add a "Search this area" button after the user pans.

**Collections and trips:** a Pinterest-style board grid with a 2×2 thumbnail mosaic cover, name and count. Inside a board, offer Grid / Map / Days tabs; Days lets users drag places into Day 1, Day 2 and so on, like Wanderlog. Add a Share link with view-only access.

**Onboarding (3 steps max):**
1. Value: "Save reels. Get a map of every spot."
2. Paste your first reel, using a sample link button.
3. Optional location permission for "Near you".
Users can skip at any step. Never discard saves made during onboarding.

**Empty states:** an illustration-free icon, a one-line explanation and one primary CTA. For example: Library "Nothing saved yet · Paste a reel"; Map "Save a place to see it here"; Collection "Add saves from your library".

**Error states:** inline and human, with Retry. Use specific reasons such as "This reel is private or deleted" or "Instagram is busy, retrying in 30s". Never show raw backend text. Failed links live in an "Needs attention" inbox that shows a badge.

## 3. Interaction patterns
- **Optimistic save:** insert a card in a skeleton/"Extracting…" state right away and update it in place. If the save fails, turn it into an error card with Retry and Remove.
- **Delete:** delete without a confirmation dialog, then show a toast "Deleted · Undo" for 5s and commit only after the toast expires. Deleting fully removes the saved edits.
- **Toasts:** bottom-center on mobile, placed above the tab bar; bottom-left on desktop. Show one at a time, with at most one action.
- **Swipe (native and mobile web list views):** swipe left to Delete and right to Add to collection. Always provide a menu alternative.
- **Pull to refresh** on Library, Map list and Collections.
- **Skeletons:** use them for any load over 300ms and match the final layout. Never use a full-screen spinner.
- **Haptics (native, expo-haptics):** light impact on save, success notification when extraction finishes, warning on error, and selection on chip change and sheet detent snap.
- **Motion:** 150–250ms with standard easing. Honor `prefers-reduced-motion` and the platform's reduce-motion setting.

## 4. Responsive rules
- **360px:** 2-column grid, 16px gutter. Titles clamp to 2 lines. Bottom tab bar has 5 tabs (Home, Library, Save in the center as a FAB-style button, Map, Trips). Nothing scrolls horizontally except chip rows.
- **390px:** same as 360, with larger hero images.
- **768px:** 3 columns. The Save flow becomes a centered modal. The map sheet is capped at 420px wide and floats on the left.
- **1024px:** the bottom nav is replaced by a left sidebar (240px, which collapses to 72px icons). Use 4 columns and put the map list panel on the left.
- **1440px:** content max-width 1280px, centered, with 5 columns.
- **Test matrix:** every screen at all five widths plus the native app on an iPhone SE and a Pixel 7.

## 5. Accessibility
- Text contrast meets WCAG AA (4.5:1, or 3:1 for large text and UI borders) in both themes. Check `text-muted` and the banners.
- Tap targets are at least 44×44pt (native) and 44px (web), with 8px between targets.
- Focus uses a visible `:focus-visible` 2px `primary` ring with a 2px offset. Use semantic `<a>` for navigation and `<button>` for actions. Modals and sheets trap focus and close on Esc.
- Every icon-only button has an aria-label or accessibilityLabel. Toasts use `aria-live="polite"`.
- The map list is a keyboard-usable alternative to the pins.
- Support Dynamic Type and font scaling up to 200% without clipping.

## 6. Prioritized checklist
**P0 (this week, polish):**
1. Shared tokens (color, type, spacing, radius) on web and native, with dark mode.
2. Real thumbnails and the neutral fallback, with no gradients.
3. Library chips with counts, a responsive grid and skeletons.
4. Save sheet with a live preview card and optimistic insert.
5. Delete with an Undo toast and specific human error messages.
6. Fix the place title wrapping and the clipped About card, and remove horizontal overflow.
7. 44px targets, focus rings and an AA contrast pass.
8. Map: OpenFreeMap tiles, fit-all-pins, clustering.

**P1:**
1. Map bottom sheet with 3 detents on mobile and a list panel on desktop.
2. Collections as boards with mosaic covers, and Add to trip from anywhere.
3. 3-step onboarding with a sample reel.
4. Swipe actions, pull to refresh and haptics.
5. "Needs attention" inbox and "+ Add missing place".

**P2:**
1. Trip Days planner with drag and drop.
2. Shareable read-only trip links.
3. "Near you" ranking and "Search this area".
4. Share-sheet extension (iOS/Android) to save straight from Instagram.
5. Collaborative boards.
