/**
 * Shared view model for Places browse.
 *
 * Board path is World → Country → City → Place (type grouping inserts a type
 * rung under World). Continent is metadata, not a click. State is only a
 * folder for large federal countries. A region with fewer than
 * NEST_MIN_PLACES is shown as places, not another folder.
 *
 * Missing city/state still collapse out of that place's path, so children
 * can mix levels. Counts roll up so layouts can size a region without walking
 * the subtree. Filtering rebuilds the tree from the filtered place list.
 */

import type { Place, SavedPost } from "./api";
import { categoryLabel, categoryTone } from "./categoryLabels";
import { ATLAS_SEED } from "./placeAtlasDemoData";

export type AtlasLevel =
  | "world"
  | "type"
  | "continent"
  | "country"
  | "state"
  | "city"
  | "place";

/** Top rung of the tree: geography first, or place type first. */
export type AtlasGrouping = "region" | "type";

/** Below this many real places the demos fall back to the sample atlas. */
export const SAMPLE_ATLAS_THRESHOLD = 40;

/** Folders only when a region has at least this many places. */
export const NEST_MIN_PLACES = 10;

/** ISO codes where state/province is a useful browse rung. */
const STATE_COUNTRY_CODES = new Set(["US", "CA", "AU", "IN"]);

/** Town/neighborhood saves — folders, not sibling cards next to their venues. */
const AREA_CATEGORIES = new Set(["city", "neighborhood"]);

/** Attach a city-less venue to a nearby saved town. */
const CITY_INHERIT_KM = 25;

const CHILD_LEVEL: Record<AtlasLevel, AtlasLevel> = {
  world: "country",
  type: "country",
  continent: "country",
  country: "city",
  state: "city",
  city: "place",
  place: "place",
};

const LEVEL_LABELS: Record<AtlasLevel, [string, string]> = {
  world: ["World", "World"],
  type: ["Type", "Types"],
  continent: ["Continent", "Continents"],
  country: ["Country", "Countries"],
  state: ["Region", "Regions"],
  city: ["City", "Cities"],
  place: ["Place", "Places"],
};

export interface AtlasPlace {
  placeId: string;
  name: string;
  continent: string;
  country: string;
  countryCode: string | null;
  state: string | null;
  city: string | null;
  category: string | null;
  categoryLabel: string;
  categoryTone: string;
  visited: boolean;
  /** How many saved posts point at this place. */
  saves: number;
  lat: number | null;
  lng: number | null;
  /** Ancestor names, continent first, excluding the place itself. */
  trail: string[];
  details: string[];
  tips: string[];
  attributes: string[];
  bestTimeToVisit: string | null;
  imageUrl: string | null;
  sourcePostIds: string[];
  parentPlaceId: string | null;
}

export interface AtlasNode {
  key: string;
  name: string;
  level: AtlasLevel;
  depth: number;
  parentKey: string | null;
  children: AtlasNode[];
  /** Leaf places anywhere beneath this node. */
  total: number;
  visited: number;
  inspiration: number;
  saves: number;
  lat: number | null;
  lng: number | null;
  /** Set only on leaves. */
  place: AtlasPlace | null;
  trail: string[];
}

export interface Atlas {
  root: AtlasNode;
  index: Map<string, AtlasNode>;
  places: AtlasPlace[];
}

export function levelLabel(level: AtlasLevel, plural = false): string {
  return LEVEL_LABELS[level][plural ? 1 : 0];
}

/** Label for what sits *inside* a node — "Countries", "Places", … */
export function childLevelLabel(node: AtlasNode): string {
  const child = node.children[0];
  if (!child) {
    return levelLabel(CHILD_LEVEL[node.level], true);
  }
  const mixed = node.children.some((entry) => entry.level !== child.level);
  return mixed ? "Destinations" : levelLabel(child.level, true);
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "x";
}

function isAreaPlace(place: AtlasPlace): boolean {
  return AREA_CATEGORIES.has(place.category ?? "");
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * City-category saves use their name as the city rung. Venues missing a city
 * inherit from a parent place or a nearby saved town, so Glacier Inn sits in
 * Hyder instead of beside it.
 */
function resolveBrowseCities(places: AtlasPlace[]): AtlasPlace[] {
  const withAreaCity = places.map((place) => {
    if (place.city || !isAreaPlace(place)) {
      return place;
    }
    return { ...place, city: place.name };
  });
  const byId = new Map(withAreaCity.map((place) => [place.placeId, place]));
  const withParent = withAreaCity.map((place) => {
    if (place.city || !place.parentPlaceId) {
      return place;
    }
    const parent = byId.get(place.parentPlaceId);
    if (!parent?.city) {
      return place;
    }
    return { ...place, city: parent.city };
  });
  return withParent.map((place) => {
    if (place.city || place.lat === null || place.lng === null) {
      return place;
    }
    let nearest: AtlasPlace | null = null;
    let nearestKm = CITY_INHERIT_KM;
    for (const area of withParent) {
      if (!isAreaPlace(area) || area.lat === null || area.lng === null) {
        continue;
      }
      if (area.country !== place.country) {
        continue;
      }
      if (area.state && place.state && area.state !== place.state) {
        continue;
      }
      const km = haversineKm(place.lat, place.lng, area.lat, area.lng);
      if (km < nearestKm) {
        nearestKm = km;
        nearest = area;
      }
    }
    if (!nearest) {
      return place;
    }
    return { ...place, city: nearest.city || nearest.name };
  });
}

/** Stable pseudo-random save count so sample places feel unevenly loved. */
function seededSaves(name: string): number {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 100000;
  }
  return 1 + (hash % 9);
}

function makeNode(
  key: string,
  name: string,
  level: AtlasLevel,
  depth: number,
  parentKey: string | null,
  trail: string[],
): AtlasNode {
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

function usesAdminState(place: AtlasPlace): boolean {
  const code = place.countryCode?.trim().toUpperCase();
  return Boolean(code && STATE_COUNTRY_CODES.has(code));
}

function geographyRungs(place: AtlasPlace): { name: string; level: AtlasLevel }[] {
  const rungs: { name: string; level: AtlasLevel }[] = [{ name: place.country, level: "country" }];
  if (place.state && usesAdminState(place)) {
    rungs.push({ name: place.state, level: "state" });
  }
  if (place.city) {
    rungs.push({ name: place.city, level: "city" });
  }
  return rungs;
}

function leafNodes(node: AtlasNode): AtlasNode[] {
  if (node.place) {
    return [node];
  }
  return node.children.flatMap(leafNodes);
}

function dropFromIndex(node: AtlasNode, index: Map<string, AtlasNode>, keep: Set<string>): void {
  if (!keep.has(node.key)) {
    index.delete(node.key);
  }
  for (const child of node.children) {
    dropFromIndex(child, index, keep);
  }
}

function attachLeaves(parent: AtlasNode, leaves: AtlasNode[], index: Map<string, AtlasNode>): void {
  for (const leaf of leaves) {
    leaf.parentKey = parent.key;
    leaf.depth = parent.depth + 1;
    index.set(leaf.key, leaf);
  }
}

function flattenToLeaves(node: AtlasNode, index: Map<string, AtlasNode>): void {
  const leaves = leafNodes(node);
  const keep = new Set([node.key, ...leaves.map((leaf) => leaf.key)]);
  for (const child of node.children) {
    dropFromIndex(child, index, keep);
  }
  attachLeaves(node, leaves, index);
  node.children = leaves;
}

/** Skip folders that are not worth a click. World still lists countries/types. */
function collapseSparseFolders(node: AtlasNode, index: Map<string, AtlasNode>): void {
  for (const child of node.children) {
    collapseSparseFolders(child, index);
  }
  if (node.level === "place") {
    return;
  }

  const hasFolderChild = node.children.some((child) => child.level !== "place");
  if (node.total > 0 && node.total < NEST_MIN_PLACES && hasFolderChild) {
    flattenToLeaves(node, index);
    return;
  }

  if (node.level === "world") {
    return;
  }

  const next: AtlasNode[] = [];
  for (const child of node.children) {
    if (child.level === "place" || child.total >= NEST_MIN_PLACES) {
      next.push(child);
      continue;
    }
    const leaves = leafNodes(child);
    const keep = new Set(leaves.map((leaf) => leaf.key));
    dropFromIndex(child, index, keep);
    attachLeaves(node, leaves, index);
    next.push(...leaves);
  }
  node.children = next;
}

function dropRedundantAreaLeaves(node: AtlasNode, index: Map<string, AtlasNode>): void {
  for (const child of node.children) {
    dropRedundantAreaLeaves(child, index);
  }
  const venueCities = new Set<string>();
  const folderCities = new Set<string>();
  for (const child of node.children) {
    if (child.level === "city") {
      folderCities.add(slug(child.name));
    }
    if (child.place && !isAreaPlace(child.place) && child.place.city) {
      venueCities.add(slug(child.place.city));
    }
  }
  node.children = node.children.filter((child) => {
    if (!child.place || !isAreaPlace(child.place)) {
      return true;
    }
    const cityKey = slug(child.place.city || child.place.name);
    if (venueCities.has(cityKey) || folderCities.has(cityKey)) {
      index.delete(child.key);
      return false;
    }
    return true;
  });
}

function pruneEmptyFolders(node: AtlasNode, index: Map<string, AtlasNode>): void {
  for (const child of node.children) {
    pruneEmptyFolders(child, index);
  }
  node.children = node.children.filter((child) => {
    if (child.level === "place" || child.children.length > 0) {
      return true;
    }
    index.delete(child.key);
    return false;
  });
}

function tidyAtlas(root: AtlasNode, index: Map<string, AtlasNode>): void {
  dropRedundantAreaLeaves(root, index);
  pruneEmptyFolders(root, index);
  rollUp(root);
}

export function buildAtlas(places: AtlasPlace[], grouping: AtlasGrouping = "region"): Atlas {
  const located = resolveBrowseCities(places);
  const root = makeNode("world", "World", "world", 0, null, []);
  const index = new Map<string, AtlasNode>([[root.key, root]]);

  for (const place of located) {
    const rungs: { name: string; level: AtlasLevel }[] = [];
    if (grouping === "type") {
      rungs.push({ name: place.categoryLabel, level: "type" });
    }
    rungs.push(...geographyRungs(place));

    let parent = root;
    let keyPath = "world";
    const trail: string[] = [];

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
  tidyAtlas(root, index);
  collapseSparseFolders(root, index);
  tidyAtlas(root, index);
  sortTree(root);
  return { root, index, places: located };
}

function rollUp(node: AtlasNode): void {
  if (node.level === "place") {
    return;
  }
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

function sortTree(node: AtlasNode): void {
  node.children.sort((a, b) => {
    if (a.level !== b.level) {
      return a.level === "place" ? 1 : -1;
    }
    if (a.level === "place") {
      return a.name.localeCompare(b.name);
    }
    return b.total - a.total || a.name.localeCompare(b.name);
  });
  for (const child of node.children) {
    sortTree(child);
  }
}

/**
 * Nearest surviving node for a key. Filtering can empty out the region you
 * were standing in, so fall back up the path instead of dumping you at World.
 */
export function resolveScopeKey(atlas: Atlas, key: string): string {
  const segments = key.split("/");
  while (segments.length > 0) {
    const candidate = segments.join("/");
    if (atlas.index.has(candidate)) {
      return candidate;
    }
    segments.pop();
  }
  return atlas.root.key;
}

/** Root → node, inclusive. Empty when the key is unknown. */
export function atlasTrail(atlas: Atlas, key: string): AtlasNode[] {
  const node = atlas.index.get(key);
  if (!node) {
    return [];
  }
  const chain: AtlasNode[] = [node];
  let cursor = node.parentKey;
  while (cursor) {
    const parent = atlas.index.get(cursor);
    if (!parent) {
      break;
    }
    chain.unshift(parent);
    cursor = parent.parentKey;
  }
  return chain;
}

export function leafPlaces(node: AtlasNode): AtlasPlace[] {
  if (node.place) {
    return [node.place];
  }
  const collected: AtlasPlace[] = [];
  for (const child of node.children) {
    collected.push(...leafPlaces(child));
  }
  return collected;
}

/** Every region node at a given level, sorted by size. */
export function nodesAtLevel(root: AtlasNode, level: AtlasLevel): AtlasNode[] {
  const found: AtlasNode[] = [];
  const walk = (node: AtlasNode) => {
    if (node.level === level) {
      found.push(node);
      return;
    }
    for (const child of node.children) {
      walk(child);
    }
  };
  walk(root);
  return found.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

export function searchAtlas(atlas: Atlas, query: string, limit = 24): AtlasNode[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return [];
  }
  const hits: { node: AtlasNode; score: number }[] = [];
  for (const node of atlas.index.values()) {
    if (node.level === "world") {
      continue;
    }
    const name = node.name.toLowerCase();
    const at = name.indexOf(needle);
    if (at < 0) {
      continue;
    }
    hits.push({ node, score: at * 10 + (node.level === "place" ? 1 : 0) });
  }
  return hits
    .sort((a, b) => a.score - b.score || b.node.total - a.node.total)
    .slice(0, limit)
    .map((hit) => hit.node);
}

export function countByCategory(places: AtlasPlace[]): { category: string; label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const place of places) {
    const key = place.category ?? "other";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, label: categoryLabel(category), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function visitedRatio(node: AtlasNode): number {
  return node.total === 0 ? 0 : node.visited / node.total;
}

function toAtlasPlace(
  place: Place,
  visitedIds: Set<string>,
  thumbnailByPostId: ReadonlyMap<string, string>,
): AtlasPlace {
  const { continent, country, state_province: stateProvince, city, latitude, longitude } =
    place.location;
  const trail = [
    continent?.trim() || "Elsewhere",
    country?.trim() || "Unmapped",
    stateProvince?.trim() || null,
    city?.trim() || null,
  ].filter((value): value is string => Boolean(value));

  return {
    placeId: place.place_id,
    name: place.display_name,
    continent: continent?.trim() || "Elsewhere",
    country: country?.trim() || "Unmapped",
    countryCode: place.location.country_code ?? null,
    state: stateProvince?.trim() || null,
    city: city?.trim() || null,
    category: place.category ?? null,
    categoryLabel: categoryLabel(place.category),
    categoryTone: categoryTone(place.category),
    visited: visitedIds.has(place.place_id),
    saves: place.source_post_ids.length || 1,
    lat: latitude ?? null,
    lng: longitude ?? null,
    trail,
    details: place.details,
    tips: place.tips,
    attributes: place.attributes,
    bestTimeToVisit: place.facts?.best_time_to_visit ?? null,
    imageUrl:
      place.source_post_ids.map((postId) => thumbnailByPostId.get(postId)).find(Boolean) ?? null,
    sourcePostIds: place.source_post_ids,
    parentPlaceId: place.parent_place_id ?? null,
  };
}

let sampleCache: AtlasPlace[] | null = null;

export function sampleAtlasPlaces(): AtlasPlace[] {
  if (sampleCache) {
    return sampleCache;
  }
  const places: AtlasPlace[] = [];
  for (const country of ATLAS_SEED) {
    for (const city of country.cities) {
      city.places.forEach((entry, index) => {
        const [name, category, visitedFlag] = entry.split("|");
        const jitter = (index + 1) * 0.012;
        places.push({
          placeId: `sample:${slug(country.country)}:${slug(city.city)}:${slug(name)}`,
          name,
          continent: country.continent,
          country: country.country,
          countryCode: country.countryCode,
          state: city.state ?? null,
          city: city.city,
          category: category ?? null,
          categoryLabel: categoryLabel(category),
          categoryTone: categoryTone(category),
          visited: visitedFlag === "v",
          saves: seededSaves(name),
          lat: city.lat + jitter,
          lng: city.lng - jitter,
          trail: [country.continent, country.country, city.state, city.city].filter(
            (value): value is string => Boolean(value),
          ),
          details: [],
          tips: [],
          attributes: [],
          bestTimeToVisit: null,
          imageUrl: null,
          sourcePostIds: [],
          parentPlaceId: null,
        });
      });
    }
  }
  sampleCache = places;
  return places;
}

export function toAtlasPlaces(
  apiPlaces: Place[],
  visitedIds: Set<string>,
  options: { allowSample?: boolean; posts?: SavedPost[] } = {},
): { places: AtlasPlace[]; usingSampleData: boolean } {
  const allowSample = options.allowSample !== false;
  if (allowSample && apiPlaces.length < SAMPLE_ATLAS_THRESHOLD) {
    return { places: sampleAtlasPlaces(), usingSampleData: true };
  }
  const thumbnailByPostId = new Map(
    (options.posts ?? [])
      .filter((post): post is SavedPost & { thumbnail_url: string } => Boolean(post.thumbnail_url))
      .map((post) => [post.post_id, post.thumbnail_url]),
  );
  return {
    places: apiPlaces.map((place) => toAtlasPlace(place, visitedIds, thumbnailByPostId)),
    usingSampleData: false,
  };
}
