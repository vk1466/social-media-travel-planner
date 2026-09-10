import { clerkEnabled } from "./auth";

let authTokenGetter: (() => Promise<string | null>) | null = null;

/** Empty in Vite dev so `/api` hits the local proxy; production uses the Function URL. */
export const API_BASE_URL = import.meta.env.DEV
  ? ""
  : (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export function setAuthTokenGetter(getter: (() => Promise<string | null>) | null): void {
  authTokenGetter = getter;
}

async function resolveToken(): Promise<string | null> {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const token = authTokenGetter ? await authTokenGetter() : null;
    if (token) {
      return token;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
  return authTokenGetter ? await authTokenGetter() : null;
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const token = await resolveToken();
  if (token?.startsWith("dev:")) {
    const userId = token.slice(4) || "local-dev-user";
    if (import.meta.env.DEV) {
      headers.Authorization = `Bearer ${token}`;
      headers["X-User-Id"] = userId;
    }
    return headers;
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    return headers;
  }
  // Only the no-Clerk local bypass may identify as a fake user. Against the
  // deployed API a missing bearer must not look like a successful empty library.
  if (!clerkEnabled && import.meta.env.DEV) {
    headers["X-User-Id"] = "local-dev-user";
  }
  return headers;
}

export interface PlatformPlace {
  place_name: string;
  city?: string | null;
  country?: string | null;
}

export interface ExtractedPlace {
  place_name: string;
  city?: string | null;
  country?: string | null;
  details?: string | null;
  tips: string[];
  category?: string | null;
  attributes: string[];
}

export interface ExtractedMovie {
  title: string;
  year?: number | null;
  details?: string | null;
  kind?: string | null;
}

export interface ResolvedMovie {
  tmdb_id: number;
  title: string;
  year?: number | null;
  runtime_minutes?: number | null;
  genres: string[];
  plot_summary?: string | null;
  imdb_rating?: number | null;
  rotten_tomatoes_percent?: number | null;
  review_summary?: string | null;
  kind?: string | null;
  number_of_seasons?: number | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
  trailer_youtube_key?: string | null;
  directors?: string[];
  cast?: string[];
  watch_providers?: string[];
}

export interface RecipeIngredient {
  name: string;
  amount?: string | null;
  amount_numeric?: number | null;
  unit?: string | null;
  note?: string | null;
}

export interface ExtractedRecipe {
  title?: string | null;
  summary?: string | null;
  ingredients: RecipeIngredient[];
  steps: string[];
  servings?: string | null;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  tags: string[];
  cuisine?: string | null;
  meal_type?: string | null;
  difficulty?: string | null;
  estimated_inferred?: boolean;
  tips?: string[];
  image_url?: string | null;
}

export interface SavedPost {
  post_id: string;
  post_url: string;
  platform: string;
  media_kind: string;
  caption: string;
  hashtags: string[];
  author_handle?: string | null;
  posted_at?: string | null;
  places: PlatformPlace[];
  extracted_places: ExtractedPlace[];
  extracted_movies?: ExtractedMovie[];
  resolved_movies?: ResolvedMovie[];
  extracted_recipe?: ExtractedRecipe | null;
  place_ids: string[];
  thumbnail_url?: string | null;
  fetched_at?: string | null;
  reel_summary?: string | null;
  content_category?: string | null;
}

export function parsePostId(postId: string): { platform: string; nativeId: string } {
  const separator = postId.indexOf(":");
  if (separator <= 0 || separator === postId.length - 1) {
    throw new Error(`Invalid post_id: ${postId}`);
  }
  return { platform: postId.slice(0, separator), nativeId: postId.slice(separator + 1) };
}

export function nativePostId(post: Pick<SavedPost, "post_id" | "platform">): string {
  try {
    return parsePostId(post.post_id).nativeId;
  } catch {
    return post.post_id;
  }
}

export interface PlaceLocation {
  display_name: string;
  continent?: string | null;
  country?: string | null;
  state_province?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Place {
  place_id: string;
  display_name: string;
  location: PlaceLocation;
  aliases: string[];
  category?: string | null;
  attributes: string[];
  details: string[];
  tips: string[];
  source_post_ids: string[];
  parent_place_id?: string | null;
  google_maps_url?: string | null;
}

export interface PlaceDetail {
  place: Place;
  source_posts: SavedPost[];
  parent?: Place | null;
  children: Place[];
}

export type LinkStatus =
  | "pending"
  | "fetching"
  | "saved"
  | "linked"
  | "skipped"
  | "unsupported"
  | "error";

export interface JobLink {
  post_url: string;
  status: LinkStatus;
  post_id?: string | null;
  error_message?: string | null;
}

export interface Job {
  job_id: string;
  status: "running" | "done";
  refresh: boolean;
  links: JobLink[];
}

export interface Visit {
  visit_id: string;
  place_id: string;
  place_name: string;
  visited_from?: string | null;
  visited_to?: string | null;
  notes?: string | null;
  created_at?: string | null;
  source?: string | null;
}

export interface VisitDetail {
  visit: Visit;
  place?: Place | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const auth = await authHeaders();
  for (const [key, value] of Object.entries(auth)) {
    headers.set(key, value);
  }
  if (clerkEnabled && !headers.get("Authorization")) {
    throw new Error("Signed in, but no API token yet. Refresh the page.");
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") {
        detail = body.detail;
      }
    } catch {
      // keep default
    }
    throw new Error(detail);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export async function fetchPosts(): Promise<SavedPost[]> {
  return request<SavedPost[]>("/api/posts");
}

export async function fetchPost(platform: string, postId: string): Promise<SavedPost> {
  return request<SavedPost>(`/api/posts/${platform}/${postId}`);
}

export async function deletePost(platform: string, postId: string): Promise<void> {
  await request<void>(`/api/posts/${platform}/${postId}`, { method: "DELETE" });
}

export async function reconstructRecipe(platform: string, postId: string): Promise<SavedPost> {
  return request<SavedPost>(`/api/posts/${platform}/${postId}/reconstruct-recipe`, {
    method: "POST",
  });
}

export async function fetchPlaces(): Promise<Place[]> {
  return request<Place[]>("/api/places");
}

export async function fetchPlaceDetail(placeId: string): Promise<PlaceDetail> {
  return request<PlaceDetail>(`/api/places/${placeId}`);
}

export async function fetchVisits(): Promise<VisitDetail[]> {
  return request<VisitDetail[]>("/api/visits");
}

export async function fetchVisitedPlaceIds(): Promise<string[]> {
  return request<string[]>("/api/visits/place-ids");
}

export async function markPlaceVisited(placeId: string): Promise<void> {
  await request(`/api/places/${placeId}/visited`, { method: "POST" });
}

export async function unmarkPlaceVisited(placeId: string): Promise<void> {
  await request(`/api/places/${placeId}/visited`, { method: "DELETE" });
}

export async function createVisit(input: {
  place_id?: string | null;
  place_query?: string | null;
  visited_from?: string | null;
  notes?: string | null;
}): Promise<VisitDetail> {
  return request<VisitDetail>("/api/visits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function startIngest(links: string[], refresh: boolean): Promise<string> {
  const body = await request<{ job_id: string }>("/api/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ links, refresh }),
  });
  return body.job_id;
}

export async function fetchJob(jobId: string): Promise<Job> {
  return request<Job>(`/api/jobs/${jobId}`);
}

export async function fetchActiveJob(): Promise<Job | null> {
  return request<Job | null>("/api/jobs/active");
}

export async function startInstagramImport(username: string): Promise<string> {
  const body = await request<{ job_id: string }>("/api/visits/import-instagram", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  return body.job_id;
}
