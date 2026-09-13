# Travel detail organization audit

## What is going wrong today

The current place detail treats unlike information as a single stream:

1. related activities and child places;
2. objective facts;
3. highlights, guide recommendations, and caveats;
4. generic details and creator tips;
5. source posts;
6. the map.

This makes every section look equally important even though each answers a different
question. The map arrives after the user has lost spatial context, while the broad
`Facts` heading contains both sourced facts and editorial guidance. Web and native mobile
also expose different subsets and orders, so the same place does not tell the same story
on both surfaces.

There are two additional implementation risks worth addressing with the redesign:

- The place hero uses the first source post's thumbnail. It may be low quality or not
  depict the place itself.
- Several background declarations in `post-flip-modal.css` contain trailing characters
  after a CSS variable, so browsers can discard them and leave surfaces transparent.

## Recommended content model

Keep six semantic groups consistent across web and native app:

| Group | User question | Current data |
| --- | --- | --- |
| Identity | What is this place? | name, location, category, attributes, aliases |
| At a glance | Is it relevant to my trip? | hours, price, season, accessibility, status |
| Why go | What makes it worthwhile? | highlights and short summary |
| Know before you go | What changes my plan? | caveats, access, guide recommendations |
| Creator note | Who suggested this, and what did they say? | tips, details, source post/author |
| Location and plan | Where is it and what can I do next? | Google Maps URL, child places, directions, visited |

Do not merge these into a generic `Facts` or `Details` bucket. A claim should retain its
kind and provenance: official/source-backed, guide/editorial, creator, community, or
inferred. Volatile facts should also show when they were checked.

## Ten directions in the prototype

1. **Decision stack — recommended.** A calm mobile stack becomes a two-column desktop
   decision surface. It is the smallest production change that fixes the hierarchy.
2. **Pocket chapters.** Overview, Advice, and Sources become explicit destinations: a
   desktop chapter rail and short mobile cards.
3. **Travel bento.** Unequal modules establish priority on desktop; horizontal fact and
   advice modules keep the mobile version thumb-friendly.
4. **Arrival briefing.** Before, Arrive, and Return form a horizontal desktop sequence and
   a vertical mobile timeline.
5. **Evidence ledger.** Every claim foregrounds source type and freshness, using a dense
   desktop ledger and stacked mobile evidence cards.
6. **Save or skip.** A verdict and fixed comparison rows support quick itinerary choices;
   mobile compresses the evidence behind disclosure.
7. **Creator story.** The saved reel is a desktop media panel and a mobile story opener,
   while practical information remains visually separate.
8. **Quiet accordion.** Desktop uses a fixed identity/action rail; mobile uses a concise
   summary with expandable semantic groups.
9. **Trip card.** Desktop resembles an itinerary worksheet; mobile becomes a readiness
   checklist with horizontally scrollable facts.
10. **Field companion.** Desktop shows three working columns while native mobile favors
    large, glanceable, offline-friendly controls.

Every direction is shown with the same content in Mobile web, Native app, and Desktop
frames. No embedded map is used. Location is a clear action that opens Google Maps. The
comparison is about hierarchy and adaptation, not different data.

## Research signals

- Google Maps separates operational place information and actions from user-contributed
  reviews and media.
- Apple Maps Guides preserve publisher identity, and saved places can carry private notes.
- Airbnb exposes review topics and distinguishes generated highlights from individual
  reviews.
- AllTrails couples map pins, compact result cards, and full detail through progressive
  disclosure.
- Wanderlog keeps recommendations close to itinerary actions such as adding a place to a
  day.

These products support the same overall conclusion: operational facts, attributable
advice, and location/planning actions should be connected, but should not be flattened
into one undifferentiated feed. For this product, an external Google Maps action provides
the necessary location affordance without making an embedded map compete with the guide.

## Sources

- [Google Maps basics](https://support.google.com/maps/answer/144349?hl=en)
- [Google Maps consumer information](https://support.google.com/maps/answer/7576020?hl=en)
- [Apple Maps publisher Guides](https://support.apple.com/guide/iphone/explore-places-with-guides-iph4c213d62d/26/ios/26)
- [Apple Maps saved places and notes](https://support.apple.com/en-gb/guide/iphone/iph6838243e8/ios)
- [Airbnb review tags and highlights](https://www.airbnb.com/help/article/2658)
- [AllTrails map search](https://support.alltrails.com/hc/en-us/articles/360034969432-How-to-use-map-view-to-search-for-trails)
- [Wanderlog product overview](https://wanderlog.com/plan-a-trip)
