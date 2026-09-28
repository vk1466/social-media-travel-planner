# Wanderfile UX guidelines

Use this document when designing or changing a user-facing feature in the web or mobile app. Start with the user task, choose only guidelines that improve it, and check the current review for known friction. The inventory and review describe the current code, including local changes; they are not claims of user testing. Design lab prototypes are excluded unless their behavior ships in the app.

For each feature:

1. Name the user goal and the main action; make it easy to find and complete.
2. Check the [design options](#design-guidelines-to-consider) and choose only those that help this flow.
3. Review [known app issues](#current-app-review) and [research-informed opportunities](#external-research-valuable-gaps) that touch the flow.
4. Walk through first use, returning use, loading, failure, empty content, keyboard access, and the relevant phone layouts. Verify that people can recover without losing work.

## Named laws and principles

| Law or principle | Application | Implementation |
| --- | --- | --- |
| **Fitts's Law** | The cover card bookmark has a larger intended touch area than its visible icon, reducing the precision needed to tap it. Other navigation and search controls use 44 px minimum sizes. | [`cover-card.css`](../../frontend/src/cover-card.css), [`category-nav.css`](../../frontend/src/top-tabs/category-nav.css), [`search-page.css`](../../frontend/src/search-page.css) |
| **Gestalt law of similarity** | Styling distinguishes the category label from the bookmark area. The default bookmark is decorative, so this intention is incomplete: it still suggests an action it does not perform. | [`cover-card.css`](../../frontend/src/cover-card.css), [`CoverCard.tsx`](../../frontend/src/components/CoverCard.tsx) |
| **Doherty Threshold / perceived responsiveness** | A masonry shaped skeleton appears during the initial fetch, giving immediate visual feedback while saves load. This addresses perceived wait time; it does not guarantee a response under 400 ms. | [`MasonryGrid.tsx`](../../frontend/src/components/MasonryGrid.tsx), [`LabPagesRoutes.tsx`](../../frontend/src/top-tabs/LabPagesRoutes.tsx), [`cover-card.css`](../../frontend/src/cover-card.css) |

## Interaction patterns

| Pattern | Application | Implementation |
| --- | --- | --- |
| **Progressive disclosure** | The Add page keeps the common link saving path visible and puts re-fetch behavior under “Advanced options.” Completed jobs sit in a collapsible History section. Desktop cards reveal details on hover or focus; actual touch devices keep details visible. | [`AddPage.tsx`](../../frontend/src/top-tabs/pages/AddPage.tsx), [`CoverCard.tsx`](../../frontend/src/components/CoverCard.tsx), [`cover-card.css`](../../frontend/src/cover-card.css) |
| **Visibility of system status** | The Add page shows pending counts, ongoing jobs, per-job progress, and changing button text. The feed shows the number of visible results. | [`AddPage.tsx`](../../frontend/src/top-tabs/pages/AddPage.tsx), [`IngestProgress.tsx`](../../frontend/src/components/IngestProgress.tsx), [`InvisibleFeedPage.tsx`](../../frontend/src/top-tabs/pages/InvisibleFeedPage.tsx) |
| **Error prevention and recovery** | Invalid URLs are flagged before submission and Save is disabled when no valid link is present. A failed library load has an alert and a Try again action; an empty search offers Clear Search. | [`AddPage.tsx`](../../frontend/src/top-tabs/pages/AddPage.tsx), [`TopTabsApp.tsx`](../../frontend/src/top-tabs/TopTabsApp.tsx), [`InvisibleFeedPage.tsx`](../../frontend/src/top-tabs/pages/InvisibleFeedPage.tsx) |
| **Recognition over recall** | Category navigation uses visible labels and counts. The feed shows active category and result count, so people can see their current scope without remembering a prior choice. | [`CategoryStrip.tsx`](../../frontend/src/top-tabs/components/CategoryStrip.tsx), [`InvisibleFeedPage.tsx`](../../frontend/src/top-tabs/pages/InvisibleFeedPage.tsx) |
| **Clear next action and empty states** | Home presents one featured place with an Explore action, or a Save your first link action when no place exists. The latter can be misleading when other saves exist; see the app review below. The sign-in page explains the save → organize → find flow in three steps. | [`HomePage.tsx`](../../frontend/src/top-tabs/pages/HomePage.tsx), [`SignedOutGate.tsx`](../../frontend/src/components/SignedOutGate.tsx) |
| **Consistent navigation and escape routes** | Shared page headings and category navigation repeat across the web library. The mobile Add screen supplies Close and Home actions, including a Home fallback when there is no back history. | [`PageHeading.tsx`](../../frontend/src/components/PageHeading.tsx), [`CategoryStrip.tsx`](../../frontend/src/top-tabs/components/CategoryStrip.tsx), [`ingest.tsx`](<../../mobile/app/(app)/ingest.tsx>) |
| **Visual hierarchy and grouping** | The editorial theme uses a shared palette, type scale, page heading, panels, and accent color to separate orientation, content, and actions. | [`wf-tokens.css`](../../frontend/src/wf-tokens.css), [`internal-editorial.css`](../../frontend/src/top-tabs/internal-editorial.css), [`home-page.css`](../../frontend/src/home-page.css) |

The law names describe design intent and observable UI choices. They are not claims that usability or timing has been measured with users.

## Design guidelines to consider

The following are options for future UI decisions, not a checklist or a claim that every item is implemented. Choose them when they help the task and the platform. Keep accessibility, clarity, and the consequences of an action in view.

### Cognitive load and familiarity

| Guideline | When to use it |
| --- | --- |
| **Progressive disclosure** | Show the common path first; reveal advanced controls when requested. |
| **Smart defaults** | Preselect a safe, useful choice when it is predictable, and make it easy to change. |
| **Chunking** | Divide long forms or dense explanations into small, meaningful steps or sections. |
| **Contextual help** | Put a short explanation beside a term or decision likely to cause confusion. |
| **Universal icons** | Prefer familiar symbols, such as a gear for settings and a magnifying glass for search; add labels when meaning could be unclear. |
| **Platform conventions** | Follow the navigation, gestures, and controls people expect on iOS, Android, and the web. |
| **Input masks** | Format structured input while typing when doing so helps more than it interrupts; preserve cursor position and accessible input. |

### Visual restraint and decluttering

| Guideline | When to use it |
| --- | --- |
| **Intentional whitespace** | Group related content with spacing before adding borders or boxes. |
| **Typographic hierarchy** | Use size, weight, and contrast to establish order and meaning. |
| **60-30-10 color rule** | Treat a mostly neutral base, supporting structure, and sparing accent as a palette heuristic, not a literal quota. |
| **Contextual menus** | Put infrequent actions behind a clearly labeled or recognizable overflow menu when immediate access is unnecessary. |
| **Swipe gestures** | Offer quick actions on touch surfaces when useful, with a visible alternative for discoverability and accessibility. |
| **Collapsible sections** | Let people expand long text or granular settings as needed. |
| **Search over navigation** | Make search prominent when people know what they want and browsing would take too many steps. |
| **Card-based layouts** | Keep an item's image, title, summary, and actions together when they form one browsable unit. |
| **Scanning patterns** | Place key content and calls to action where they are easy to notice in the page's reading flow; check the result across screen sizes and languages. |

### Affordances and system status

| Guideline | When to use it |
| --- | --- |
| **Skeleton screens** | Show a layout-shaped placeholder when content loading would otherwise leave a blank or shifting page. |
| **Micro-interactions** | Give immediate, brief feedback to taps and clicks; honor reduced-motion preferences. |
| **Non-blocking notifications** | Use temporary messages for low-risk feedback, with enough time and another way to recover important information. |
| **Progress indicators** | Show progress for longer actions when work can be measured; use an honest indeterminate state otherwise. |
| **Floating action buttons** | Reserve a persistent floating control for one frequent, high-priority action when it does not obscure content. |
| **Depth and shadows** | Use subtle depth to clarify elevation or interaction, while retaining visible focus and clear labels. |
| **Color as function** | Keep the strongest accent for actions and important state, while allowing color to serve other necessary meanings. |
| **Distinct button states** | Make default, hover, focus, pressed, loading, and disabled states recognizable. |

### Navigation and forgiveness

| Guideline | When to use it |
| --- | --- |
| **Bottom tab navigation** | Put a small set of primary mobile destinations within easy reach when tabs fit the app's structure. |
| **Sticky headers** | Keep navigation visible during long web scrolls when it earns the screen space. |
| **Breadcrumbs** | Show a navigable path in a hierarchy where people need to move back to a parent. |
| **The escape hatch** | Give every modal, form, and isolated view an obvious Close, Cancel, or Back action. |
| **Visual prioritization** | Make the primary action easy to identify without hiding or weakening the secondary escape action. |
| **Meaningful empty states** | Explain what is empty and offer a relevant first or recovery action. |
| **Inline validation** | Check input near the field as people type or leave it, when early feedback can help them correct it. |
| **Undo over confirmation** | For reversible, low-risk actions, consider immediate action with a time-limited Undo. Use stronger confirmation for irreversible or high-impact actions. |
| **Forgiving formats** | Accept reasonable variations in human input and normalize them without silently changing intent. |

## Current app review

These recommendations are based on implementation evidence. Confirm visual proportions and gesture behavior with a device walkthrough.

### Address first

#### 1. Preserve unfinished links and drafts

Quick add accepts valid lines and then clears the entire input, including invalid lines. Closing the sheet also unmounts its local draft. Someone can lose a link they intended to fix or accidentally dismiss a partially written submission.

Keep rejected lines in the input, as the full Add page already does. Preserve the draft when closing and reopening the sheet. Distinguish “Your links were accepted” from a subsequent failure to retrieve progress, so a status error does not encourage resubmitting accepted links.

Evidence: [AddLinkSheet](../../frontend/src/top-tabs/components/AddLinkSheet.tsx), [AddPage](../../frontend/src/top-tabs/pages/AddPage.tsx), [Shell](../../frontend/src/top-tabs/components/Shell.tsx).

#### 2. Make Home reflect the actual library

Home chooses its first-save prompt based on whether there is a place, rather than whether the library contains saves. A person with recipes or films can therefore see “Save your first link” above their existing saves. An active source filter can produce the same mismatch. The featured destination is simply the first place in the array, despite the label “Your next place to go.”

Use the full library state for onboarding. Show a separate recovery state when a filter hides content. Lead a returning user's Home with recent saves across topics; present a place as “From your saved places” unless there is a real recommendation signal.

Evidence: [HomePage](../../frontend/src/top-tabs/pages/HomePage.tsx).

#### 3. Let people recognize cards before opening them

Desktop cover cards hide titles and metadata until hover or focus. This makes locating a familiar save depend heavily on recognizing its thumbnail. The default bookmark glyph looks like an action but has no separate action; clicking it opens the card.

Keep the title and one useful context line visible. Reserve disclosure for secondary metadata. Remove the default decorative bookmark; show a bookmark control only when it performs a real action. Preserve the existing one-tap behavior and visible metadata on actual touch devices.

Evidence: [CoverCard](../../frontend/src/components/CoverCard.tsx), [card styles](../../frontend/src/cover-card.css).

#### 4. Keep primary destinations stable

Web category tabs disappear when counts become zero. Native tabs do the same, and the native layout redirects away from a tab that becomes empty. In particular, a new user cannot discover visit history through its tab until visits already exist.

Keep primary destinations in a stable order, with useful empty states and entry actions. Hide irrelevant filter values where appropriate, rather than making primary navigation depend on data. Keep explicit category navigation as the main control; reconsider page-wide swipe navigation if device testing shows accidental page changes.

Evidence: [CategoryStrip](../../frontend/src/top-tabs/components/CategoryStrip.tsx), [native tabs](<../../mobile/app/(app)/(tabs)/_layout.tsx>), [Shell](../../frontend/src/top-tabs/components/Shell.tsx).

#### 5. Make search complete and recoverable

Search collects posts before places, recipes, and movies, then truncates the combined list to 30. Thirty matching posts can hide every matching item of the other types. The displayed count is the truncated count, and Enter opens the first result immediately. Shared source filters also carry into search.

Group or rank results across types, provide a way to see more, and distinguish displayed results from the total. Make the active source scope explicit and offer “Search all sources.” Let Enter complete a search unless a result is deliberately selected. Add Clear filters to empty library views, rather than only saying that no posts match.

Evidence: [SearchPage](../../frontend/src/top-tabs/pages/SearchPage.tsx), [PostsPage](../../frontend/src/top-tabs/pages/PostsPage.tsx), [shared source filtering](../../frontend/src/libraryPlatform.tsx).

### Simplify next

| Change | Reason and suggested treatment | Evidence |
| --- | --- | --- |
| Remove “Simulate Touch” from the product UI. | This is a development control that changes how many taps opening a card takes. Keep it in the design lab. | [PostsPage](../../frontend/src/top-tabs/pages/PostsPage.tsx), [InvisibleFeedPage](../../frontend/src/top-tabs/pages/InvisibleFeedPage.tsx) |
| Consolidate the alternate feed. | “Invisible Feed” names a presentation style without explaining its purpose. If retained, expose it as a clearly named view within the library, such as Gallery. | [Shell](../../frontend/src/top-tabs/components/Shell.tsx) |
| Reduce mobile Home links. | The save screen has Home in the header, beside the title, and in a large banner. Keep Close and one “View library” action; show background saving as compact status text. | [mobile save screen](<../../mobile/app/(app)/ingest.tsx>) |
| Simplify saving language. | Prefer “Save links,” “Saving,” and “Already in your library” to “Save to queue,” raw status strings, and “linked.” Keep detailed processing history available on demand. | [AddLinkSheet](../../frontend/src/top-tabs/components/AddLinkSheet.tsx), [AddPage](../../frontend/src/top-tabs/pages/AddPage.tsx) |
| Reduce repeated introductory content. | Large boxed headings, slogans, and a destination hero delay access to recent saves. Use compact headings on working screens and reserve expansive storytelling for the signed-out page. Confirm the proportions on real screens. | [interior styles](../../frontend/src/top-tabs/internal-editorial.css), [Home styles](../../frontend/src/home-page.css) |
| Clarify source filtering. | The menu says “All connected apps,” although it filters saved content by platform. Use “Sources” and “All sources.” Make the Everything checkbox behavior understandable when clearing a final selection returns to all sources. | [PlatformMenu](../../frontend/src/components/library/PlatformMenu.tsx), [source state](../../frontend/src/libraryPlatform.tsx) |
| Match error wording to the failure. | A partial load failure is headed “Your library couldn’t load,” even when some content loaded successfully. Name the affected section, retain usable content, and keep technical error detail secondary. | [TopTabsApp](../../frontend/src/top-tabs/TopTabsApp.tsx), [App](../../frontend/src/App.tsx) |
| Complete keyboard access in the quick-add sheet. | The sheet moves focus to Close but has no focus trap or restoration, while its child also requests input focus. Choose one initial focus target, contain focus while open, restore it on close, and label the link input explicitly. | [DetailSheet](../../frontend/src/top-tabs/components/DetailSheet.tsx), [AddLinkSheet](../../frontend/src/top-tabs/components/AddLinkSheet.tsx) |

### How to use the guidelines here

Favor recognition, predictable navigation, draft preservation, clear labels, and useful recovery before adding more interaction patterns. Keep the existing skeletons, actual processing progress, native bottom tabs, reduced-motion support, and advanced-option disclosure.

Treat card boxes, shadows, FABs, overflow menus, and swipe actions as choices for a specific task. More of them will not automatically improve usability. Avoid hiding essential titles or primary actions under the banner of decluttering. Use persistent inline errors for problems requiring correction; reserve expiring notifications for feedback that can safely disappear. Keep the 60-30-10 palette and scanning patterns as loose design aids.

For the next walkthrough, use a first-time user, a recipe-only library, a filtered empty library, and a large mixed library. Try saving mixed valid and invalid links, dismissing and reopening quick add, finding a film among many matching posts, and deleting the last item in a category. These scenarios directly exercise the issues above.

## External research: valuable gaps

Reviewed September 28, 2026. The sources below combine established usability research with current product documentation. Competitor features demonstrate possible approaches; the priority and proposed scope for Wanderfile are our judgment, to validate with users.

### 1. Search what the user remembers

Readwise Reader searches document text, titles, and authors; Raindrop also searches saved content beyond titles and tags. These are useful precedents for a library people revisit from imperfect memory. [Readwise search](https://docs.readwise.io/reader/docs/faqs/searching), [Raindrop features](https://raindrop.io/).

**Wanderfile opportunity:** the API already exposes transcripts, image text, summaries, and structured recipe data, while global search mostly checks titles and captions. Start by searching those existing fields and showing a matching snippet. Someone should find a recipe by an ingredient mentioned in the video. Fix truncation and ranking at the same time. Evaluate semantic matching after this baseline works; do not require a chat conversation to retrieve a save.

This brings a useful slice of [roadmap Phase 4](../product-evolution-roadmap.md) forward. Evidence: [SavedPost fields](../../frontend/src/api.ts), [SearchPage](../../frontend/src/top-tabs/pages/SearchPage.tsx).

### 2. Give users control when AI is wrong

Microsoft's human-AI interaction guidance emphasizes correction, explanations, appropriate handling of uncertainty, and cautious changes over time. It explicitly treats these as design guidance requiring judgment. [Microsoft Research](https://www.microsoft.com/en-us/research/blog/guidelines-for-human-ai-interaction-design/).

**Wanderfile opportunity:** offer a small “Edit organization” action for labels and a “Wrong place?” correction path. Keep source content distinguishable from generated summaries and estimates. Reuse existing place evidence and retrieval dates to expose provenance where it helps a decision. Preserve user corrections across reprocessing. Personal organization changes must remain separate from shared source records and pipeline routing.

Corrections are already planned in [roadmap Phase 2](../product-evolution-roadmap.md); general library correction controls were not evident in the reviewed client API. Existing foundations include place evidence and recipe reconstruction labeling. Evidence: [API](../../frontend/src/api.ts), [RecipeDetailModal](../../frontend/src/components/food/RecipeDetailModal.tsx).

### 3. Make saving dependable before making it richer

Readwise offers capture directly from the browser and optional notes at save time. Nielsen Norman Group's heuristics support immediate status feedback, recovery, and user control. These support reducing uncertainty during capture. [Reader saving](https://docs.readwise.io/reader/docs/saving-content), [NN/g usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/).

**Wanderfile opportunity:** build on the existing native share flow. Persist pending links until accepted, distinguish “Waiting for connection” from “Saved; organizing,” expose failed items with Retry, and link to an existing save when a duplicate is detected. Let users return to the source app without waiting for enrichment. Add brief share-sheet setup guidance only where needed.

Pending shares currently live in React state, so they do not provide a durable outbox across process restarts. This is an extension of the draft-preservation finding above. Evidence: [PendingShareContext](../../mobile/src/context/PendingShareContext.tsx), [ShareIntentRoot](../../mobile/src/share/ShareIntentRoot.tsx).

### 4. Organize by purpose, with optional personal notes

Raindrop supports collections grouped by project or interest, including bulk moves. Readwise supports notes that record why something was saved or who recommended it. [Raindrop collections](https://help.raindrop.io/collections), [Reader saving](https://docs.readwise.io/reader/docs/saving-content).

**Wanderfile opportunity:** let someone keep “Japan in November,” “Dinner this week,” or “Watch with Sam” together, with an optional private note. Start with simple private collections and manual membership. A save should be usable in multiple purposes without duplicating its source data. Keep collection selection optional during capture and add bulk organization when libraries become large.

Collections are already [roadmap Phase 3](../product-evolution-roadmap.md). Personal save notes extend that plan; visit notes and creator tips do not serve the same purpose. Defer collaborative editing until private collections prove useful.

### 5. Make selected saves available without a connection

Reader documents offline access and an offline fallback for search. This establishes a practical precedent for accessing a personal library while disconnected. [Reader offline access](https://docs.readwise.io/reader/docs/faqs), [Reader search](https://docs.readwise.io/reader/docs/faqs/searching).

**Wanderfile opportunity:** start with explicit offline availability for selected recipes, place details, notes, and source links. Show what is downloaded and when it was updated. Keep video streaming and external maps clearly dependent on connectivity. Consider a small recent-items cache before attempting full-library synchronization.

The reviewed [mobile library provider](../../mobile/src/context/LibraryContext.tsx) fetches into memory and has no persisted library cache. Offline reading and durable pending saves are separate needs; prioritize the latter first.

### 6. Make the library feel owned and recoverable

Raindrop provides export and backup, moves deleted collection content to Trash, and offers broken-link and duplicate discovery. These are useful precedents for maintaining a library over time. [Export and backup](https://help.raindrop.io/export), [Collections and Trash](https://help.raindrop.io/collections), [Library maintenance features](https://raindrop.io/).

**Wanderfile opportunity:** offer a basic export of saved URLs and personal organization, followed by a recovery window for removal. If an original link stops working, retain available saved details and explain the source's status. Avoid promising permanent access to every social video. Library export and a general Trash surface were not evident in the reviewed client API; verify server retention behavior before designing restoration.

## Strengthen the existing usability work

Visible titles and clear context are supported by recognition-over-recall research. This reinforces the card recommendation above rather than justifying another navigation layer. [NN/g recognition and recall](https://www.nngroup.com/articles/recognition-and-recall/).

Expand device review to include keyboard navigation, enlarged text, focus visibility beneath sticky headers, and alternatives to dragging. WCAG 2.2 also distinguishes its 24 CSS px minimum target criterion, with exceptions, from larger touch-target design goals such as 44 px. A CSS comment or pseudo-element alone does not establish usable hit targets. [W3C WCAG 2.2 additions](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/), [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

Recommended sequence: fix capture loss and confusing states; improve retrieval and AI correction; introduce private collections and notes; then validate demand for selected offline access, export, and recovery. Keep broader category expansion, collaboration, and proactive reminders behind demonstrated user needs.

Measure value through completed saves, successful retrieval of an older item, time to correct an incorrect label, and whether a saved item leads to its intended action. Use these outcomes to choose among the options rather than counting features added.

## Related design references

- [Content and typography audit](content-system-audit.md): use consistent, plain labels and legible control text across categories.
- [Travel detail organization audit](travel-detail-organization-audit.md): separate identity, practical facts, guidance, creator notes, and location actions.
- [Product evolution roadmap](../product-evolution-roadmap.md): check planned organization, collections, and search work before adding new product structure.
- [Pipeline framework design](../pipeline-framework-design.md): keep AI organization and UI corrections compatible with ingest data contracts.
