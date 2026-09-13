/**
 * Shared view model for atlas browse — region or type grouping with rolled-up counts.
 */

import type { Place, SavedPost } from "./api";
import { categoryLabel, categoryTone } from "./categoryLabels";
import { proxiedMediaUrl } from "./postDisplayUtils";

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

const CHILD_LEVEL: Record<AtlasLevel, AtlasLevel> = {
  world: "continent",
  type: "continent",
  continent: "country",
  country: "state",
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

export function buildAtlas(places: AtlasPlace[], grouping: AtlasGrouping = "region"): Atlas {
  const root = makeNode("world", "World", "world", 0, null, []);
  const index = new Map<string, AtlasNode>([[root.key, root]]);

  for (const place of places) {
    const rungs: { name: string; level: AtlasLevel }[] = [];
    if (grouping === "type") {
      rungs.push({ name: place.categoryLabel, level: "type" });
    }
    rungs.push(
      { name: place.continent, level: "continent" },
      { name: place.country, level: "country" },
    );
    if (place.state) {
      rungs.push({ name: place.state, level: "state" });
    }
    if (place.city) {
      rungs.push({ name: place.city, level: "city" });
    }

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
  sortTree(root);
  return { root, index, places };
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

export function toAtlasPlace(
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
  };
}

export function toAtlasPlaces(
  apiPlaces: Place[],
  visitedIds: Set<string>,
  options: { posts?: SavedPost[] } = {},
): AtlasPlace[] {
  const thumbnailByPostId = new Map(
    (options.posts ?? [])
      .filter((post): post is SavedPost & { thumbnail_url: string } => Boolean(post.thumbnail_url))
      .map((post) => {
        const url = proxiedMediaUrl(post.thumbnail_url) ?? post.thumbnail_url;
        return [post.post_id, url];
      }),
  );
  return apiPlaces.map((place) => toAtlasPlace(place, visitedIds, thumbnailByPostId));
}
