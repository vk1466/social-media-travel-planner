/**
 * Place atlas tree — port of frontend/src/placeAtlasModel.ts for design-lab.
 */

const CATEGORY_LABELS = {
  hike: "Hike",
  viewpoint: "Viewpoint",
  waterfall: "Waterfall",
  lake: "Lake",
  beach: "Beach",
  park: "Park",
  city: "City",
  landmark: "Landmark",
  museum: "Museum",
  market: "Market",
  restaurant: "Restaurant",
  cafe: "Café",
  bar: "Bar",
  hotel: "Hotel",
  neighborhood: "Neighborhood",
  outdoors: "Outdoors",
  coast: "Coast",
  wellness: "Wellness",
  culture: "Culture",
  food: "Food",
};

const CHILD_LEVEL = {
  world: "continent",
  type: "continent",
  continent: "country",
  country: "state",
  state: "city",
  city: "place",
  place: "place",
};

const LEVEL_LABELS = {
  world: ["World", "World"],
  type: ["Type", "Types"],
  continent: ["Continent", "Continents"],
  country: ["Country", "Countries"],
  state: ["Region", "Regions"],
  city: ["City", "Cities"],
  place: ["Place", "Places"],
};

export function categoryLabel(category) {
  if (!category) return "Uncategorized";
  return (
    CATEGORY_LABELS[category] ||
    category.charAt(0).toUpperCase() + category.slice(1)
  );
}

export function levelLabel(level, plural = false) {
  return (LEVEL_LABELS[level] || ["Node", "Nodes"])[plural ? 1 : 0];
}

export function childLevelLabel(node) {
  const child = node.children[0];
  if (!child) return levelLabel(CHILD_LEVEL[node.level], true);
  const mixed = node.children.some((entry) => entry.level !== child.level);
  return mixed ? "Destinations" : levelLabel(child.level, true);
}

function slug(value) {
  return (
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "x"
  );
}

function makeNode(key, name, level, depth, parentKey, trail) {
  return {
    key,
    name,
    level,
    depth,
    parentKey,
    children: [],
    total: 0,
    visited: 0,
    inspiration: 0,
    saves: 0,
    lat: null,
    lng: null,
    place: null,
    trail,
  };
}

function rollUp(node) {
  if (node.level === "place") return;
  let total = 0;
  let visited = 0;
  let saves = 0;
  let latSum = 0;
  let lngSum = 0;
  let coords = 0;
  for (const child of node.children) {
    rollUp(child);
    total += child.total;
    visited += child.visited;
    saves += child.saves;
    if (child.lat !== null && child.lng !== null) {
      latSum += child.lat;
      lngSum += child.lng;
      coords += 1;
    }
  }
  node.total = total;
  node.visited = visited;
  node.inspiration = total - visited;
  node.saves = saves;
  node.lat = coords ? latSum / coords : null;
  node.lng = coords ? lngSum / coords : null;
}

function sortTree(node) {
  node.children.sort((a, b) => {
    if (a.level !== b.level) return a.level === "place" ? 1 : -1;
    if (a.level === "place") return a.name.localeCompare(b.name);
    return b.total - a.total || a.name.localeCompare(b.name);
  });
  for (const child of node.children) sortTree(child);
}

export function buildAtlas(places, grouping = "region") {
  const root = makeNode("world", "World", "world", 0, null, []);
  const index = new Map([[root.key, root]]);

  for (const place of places) {
    const rungs = [];
    if (grouping === "type") {
      rungs.push({ name: place.categoryLabel, level: "type" });
    }
    rungs.push(
      { name: place.continent, level: "continent" },
      { name: place.country, level: "country" },
    );
    if (place.state) rungs.push({ name: place.state, level: "state" });
    if (place.city && place.city !== place.name) {
      rungs.push({ name: place.city, level: "city" });
    }

    let parent = root;
    let keyPath = "world";
    const trail = [];

    for (const rung of rungs) {
      keyPath = `${keyPath}/${slug(rung.name)}`;
      let node = index.get(keyPath);
      if (!node) {
        node = makeNode(keyPath, rung.name, rung.level, parent.depth + 1, parent.key, [...trail]);
        index.set(keyPath, node);
        parent.children.push(node);
      }
      trail.push(rung.name);
      parent = node;
    }

    const leafKey = `${keyPath}/${slug(place.name)}~${slug(place.placeId)}`;
    const leaf = makeNode(leafKey, place.name, "place", parent.depth + 1, parent.key, [...trail]);
    leaf.place = place;
    leaf.total = 1;
    leaf.visited = place.visited ? 1 : 0;
    leaf.inspiration = place.visited ? 0 : 1;
    leaf.saves = place.saves;
    leaf.lat = place.lat;
    leaf.lng = place.lng;
    index.set(leafKey, leaf);
    parent.children.push(leaf);
  }

  rollUp(root);
  sortTree(root);
  return { root, index, places };
}

export function resolveScopeKey(atlas, key) {
  const segments = key.split("/");
  while (segments.length > 0) {
    const candidate = segments.join("/");
    if (atlas.index.has(candidate)) return candidate;
    segments.pop();
  }
  return atlas.root.key;
}

export function atlasTrail(atlas, key) {
  const node = atlas.index.get(key);
  if (!node) return [];
  const chain = [node];
  let cursor = node.parentKey;
  while (cursor) {
    const parent = atlas.index.get(cursor);
    if (!parent) break;
    chain.unshift(parent);
    cursor = parent.parentKey;
  }
  return chain;
}

export function leafPlaces(node) {
  if (node.place) return [node.place];
  const collected = [];
  for (const child of node.children) collected.push(...leafPlaces(child));
  return collected;
}

export function searchAtlas(atlas, query, limit = 40) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const hits = [];
  for (const node of atlas.index.values()) {
    if (node.level === "world") continue;
    const name = node.name.toLowerCase();
    const at = name.indexOf(needle);
    if (at < 0) continue;
    hits.push({ node, score: at * 10 + (node.level === "place" ? 1 : 0) });
  }
  return hits
    .sort((a, b) => a.score - b.score || b.node.total - a.node.total)
    .slice(0, limit)
    .map((hit) => hit.node);
}

export function countByCategory(places) {
  const counts = new Map();
  for (const place of places) {
    const key = place.category || "other";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([category, count]) => ({
      category,
      label: categoryLabel(category === "other" ? null : category),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function atlasPlacesFromMock(mock) {
  return (mock.places || []).map((p) => {
    const continent = p.continent || "Elsewhere";
    const country = p.country || "Unmapped";
    const state = p.region || null;
    return {
      placeId: p.id,
      name: p.name,
      continent,
      country,
      countryCode: null,
      state,
      city: null,
      category: p.category || null,
      categoryLabel: categoryLabel(p.category),
      visited: Boolean(p.visited),
      saves: p.postCount || 1,
      lat: p.lat ?? null,
      lng: p.lng ?? null,
      trail: [continent, country, state].filter(Boolean),
      hero: p.hero || null,
    };
  });
}

export function atlasPlacesFromApi(apiPlaces, visitedIds) {
  return (apiPlaces || []).map((place) => {
    const loc = place.location || {};
    const continent = (loc.continent || "").trim() || "Elsewhere";
    const country = (loc.country || "").trim() || "Unmapped";
    const state = (loc.state_province || "").trim() || null;
    const city = (loc.city || "").trim() || null;
    return {
      placeId: place.place_id,
      name: place.display_name || loc.display_name || place.place_id,
      continent,
      country,
      countryCode: loc.country_code || null,
      state,
      city,
      category: place.category || null,
      categoryLabel: categoryLabel(place.category),
      visited: visitedIds.has(place.place_id),
      saves: (place.source_post_ids || []).length || 1,
      lat: loc.latitude ?? null,
      lng: loc.longitude ?? null,
      trail: [continent, country, state, city].filter(Boolean),
      hero: null,
    };
  });
}
