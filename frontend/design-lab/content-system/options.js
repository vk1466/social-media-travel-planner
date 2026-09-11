export const pages = [
  { key: "home", label: "Home" },
  { key: "posts", label: "Posts" },
  { key: "travel", label: "Travel" },
  { key: "food", label: "Food" },
  { key: "movies", label: "Movies" },
  { key: "history", label: "History" },
  { key: "add", label: "Add" },
  { key: "search", label: "Search" },
];

export const systems = [
  {
    id: "01", slug: "trail-guide", name: "Trail guide", verdict: "Recommended",
    summary: "Editorial warmth for inspiration, quiet utility for planning.",
    axis: "Newsreader + Source Sans 3 · 16px body · direct, encouraging copy",
    className: "trail-guide",
  },
  {
    id: "02", slug: "clear-compass", name: "Clear compass", verdict: "Most usable",
    summary: "A single sans family makes a broad product feel calm and predictable.",
    axis: "Manrope · 16px body · plain, task-first copy", className: "clear-compass",
  },
  {
    id: "03", slug: "field-notes", name: "Field notes", verdict: "Most Wanderfile",
    summary: "A personal travel journal with contemporary controls.",
    axis: "Fraunces + DM Sans · 16px body · reflective, personal copy", className: "field-notes",
  },
  {
    id: "04", slug: "atlas-index", name: "Atlas index", verdict: "Best for depth",
    summary: "A reference-book hierarchy built for places, filters, and dense metadata.",
    axis: "Literata + Source Sans 3 · 15px body · precise, geographic copy", className: "atlas-index",
  },
  {
    id: "05", slug: "social-native", name: "Social native", verdict: "Fastest",
    summary: "A familiar creator-app rhythm that makes saving feel immediate.",
    axis: "DM Sans · 16px body · short, energetic copy", className: "social-native",
  },
  {
    id: "06", slug: "quiet-escape", name: "Quiet escape", verdict: "Most premium",
    summary: "Large expressive titles balanced by restrained product language.",
    axis: "Instrument Serif + DM Sans · 17px body · spacious, evocative copy", className: "quiet-escape",
  },
  {
    id: "07", slug: "wayfinder", name: "Wayfinder", verdict: "Most product-led",
    summary: "Strong signposting and a crisp scale for repeat planning sessions.",
    axis: "Space Grotesk + Inter · 15px body · action-led copy", className: "wayfinder",
  },
  {
    id: "08", slug: "postcard-journal", name: "Postcard journal", verdict: "Most emotional",
    summary: "A memory-forward voice that connects future plans with past trips.",
    axis: "Cormorant Garamond + Libre Franklin · 17px body · story-led copy", className: "postcard-journal",
  },
  {
    id: "09", slug: "utility-ledger", name: "Utility ledger", verdict: "Most systematic",
    summary: "Compact, explicit labels for large libraries and serious filtering.",
    axis: "IBM Plex Sans + Mono · 15px body · concise, literal copy", className: "utility-ledger",
  },
  {
    id: "10", slug: "warm-human", name: "Warm human", verdict: "Most approachable",
    summary: "Friendly type and conversational prompts without becoming cute.",
    axis: "Lora + Nunito Sans · 17px body · helpful, conversational copy", className: "warm-human",
  },
];

const canonical = {
  home: {
    eyebrow: "Your travel library", title: "Save the spark. Plan the trip.",
    lede: "Turn reels, posts, and guides into places you can map, plan, and remember.",
    action: "Add inspiration", section: "Pick up where you left off", meta: "Kyoto · 18 saved places",
  },
  posts: {
    eyebrow: "Saved inspiration", title: "All saves",
    lede: "Everything you saved from social and the web, in one searchable library.",
    action: "Add links", section: "Recently saved", meta: "126 saves · newest first",
  },
  travel: {
    eyebrow: "Places from your saves", title: "Places to go",
    lede: "Browse every place we found, mark where you’ve been, and turn the rest into a trip.",
    action: "View map", section: "Saved around Kyoto", meta: "48 places · 12 visited",
  },
  food: {
    eyebrow: "Recipes from your saves", title: "Food worth making",
    lede: "Find a dish, check the ingredients, and cook from the post that inspired you.",
    action: "Build grocery list", section: "Ready for tonight", meta: "31 recipes · 8 under 30 min",
  },
  movies: {
    eyebrow: "Titles from your saves", title: "Movies worth watching",
    lede: "Keep every recommendation together, with streaming details and filming places when available.",
    action: "Find a movie", section: "Up next", meta: "17 movies · 6 streaming now",
  },
  history: {
    eyebrow: "Places you’ve been", title: "Travel history",
    lede: "Keep a personal record of past trips, then use it to shape what comes next.",
    action: "Log a visit", section: "Recent journeys", meta: "24 visits · 9 countries",
  },
  add: {
    eyebrow: "Add to Wanderfile", title: "Bring your inspiration together",
    lede: "Paste links from Instagram, TikTok, YouTube, or the web. Use one link per line.",
    action: "Save links", section: "Paste your links", meta: "We’ll find the posts and places for you",
  },
  search: {
    eyebrow: "Search Wanderfile", title: "Find anything you saved",
    lede: "Search posts, places, recipes, movies, and travel history from one place.",
    action: "Search", section: "Try a place, dish, or title", meta: "Kyoto, pasta, Perfect Days…",
  },
};

const voices = {
  "02": {
    home: ["Your library", "Plan from what you saved", "Keep posts, places, recipes, movies, and past trips organized in one place."],
    travel: ["Travel", "Saved places", "See places from your saves, filter them, and open them on the map."],
  },
  "03": {
    home: ["Your wanderfile", "Ideas become journeys here.", "Gather the moments that move you, then shape them into somewhere to go."],
    history: ["Your journeys", "Where you’ve wandered", "A living record of the places that became part of your story."],
  },
  "04": {
    travel: ["Personal atlas", "Places", "Explore resolved destinations by region, type, and visit status."],
    posts: ["Source archive", "Saved posts", "Browse the original posts behind every place and plan."],
  },
  "05": {
    home: ["Saved for later", "Your next trip starts here", "Drop in a link. We’ll pull out the places and keep the good part."],
    add: ["Quick save", "Paste it here", "Add links from your feed. We’ll organize what’s inside."],
  },
  "06": {
    home: ["The places calling", "A world worth returning to.", "Keep every spark of inspiration close until it becomes a journey."],
    travel: ["Your private atlas", "Somewhere, next", "The places you noticed, gathered into a map of possibility."],
  },
  "07": {
    home: ["Planning overview", "Turn saves into a trip", "Review new saves, resolve places, and continue your active plans."],
    add: ["Import", "Add source links", "Paste one supported URL per line to add it to your library."],
  },
  "08": {
    home: ["Notes for the road", "Keep the places you dream about.", "A home for chance discoveries, future journeys, and the routes you remember."],
    history: ["From the road", "The places that stayed with you", "Trace the journeys you took and the details you want to carry forward."],
  },
  "09": {
    home: ["LIBRARY / OVERVIEW", "Wanderfile", "126 saves · 48 places · 24 visits"],
    search: ["GLOBAL / SEARCH", "Search library", "Query all saved content and visit records."],
  },
  "10": {
    home: ["Good to see you", "Where do you want to go next?", "Your saved ideas are organized and ready whenever a plan starts to take shape."],
    add: ["Save something new", "Found a place you love?", "Paste the link and we’ll pull out the useful details for you."],
  },
};

export function pageCopy(systemId, pageKey) {
  const base = { ...canonical[pageKey] };
  const voice = voices[systemId]?.[pageKey];
  if (voice) [base.eyebrow, base.title, base.lede] = voice;
  return base;
}
