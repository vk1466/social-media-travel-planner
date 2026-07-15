let authTokenGetter: (() => Promise<string | null>) | null = null;

/** API origin (TravelPlanner-dev/prod ApiEndpoint). Required for local Vite and Vercel. */
export const API_BASE_URL = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ""
).replace(/\/$/, "");

/** Register a function that returns the current Clerk (or dev) bearer token. */
export function setAuthTokenGetter(getter: (() => Promise<string | null>) | null): void {
  authTokenGetter = getter;
}

async function authHeaders(): Promise<Record<string, string>> {
  if (!authTokenGetter) {
    return { "X-User-Id": "local-dev-user" };
  }
  const token = await authTokenGetter();
  if (!token) {
    return { "X-User-Id": "local-dev-user" };
  }
  if (token.startsWith("dev:")) {
    return {
      Authorization: `Bearer ${token}`,
      "X-User-Id": token.slice(4) || "local-dev-user",
    };
  }
  return { Authorization: `Bearer ${token}` };
}

export interface PlatformPlace {
  place_name: string;
  city?: string | null;
  country?: string | null;
  state_province?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ExtractedPlace {
  place_name: string;
  city?: string | null;
  country?: string | null;
  state_province?: string | null;
  details?: string | null;
  tips: string[];
  category?: string | null;
  attributes: string[];
  parent_place_name?: string | null;
  parent_category?: string | null;
}

export interface SavedPost {
  /** Globally unique primary key: `{platform}:{native_id}`. */
  post_id: string;
  post_url: string;
  platform: string;
  media_kind: string;
  caption: string;
  hashtags: string[];
  author_handle?: string | null;
  posted_at?: string | null;
  like_count?: number | null;
  comment_count?: number | null;
  top_comments: string[];
  places: PlatformPlace[];
  extracted_places: ExtractedPlace[];
  /** Foreign keys → Place.place_id */
  place_ids: string[];
  thumbnail_url?: string | null;
  fetched_at?: string | null;
  reel_summary?: string | null;
}

/** Split a global post_id (`platform:native`) for API routes and navigation. */
export function parsePostId(postId: string): { platform: string; nativeId: string } {
  const separator = postId.indexOf(":");
  if (separator <= 0 || separator === postId.length - 1) {
    throw new Error(`Invalid post_id (expected platform:native): ${postId}`);
  }
  return {
    platform: postId.slice(0, separator),
    nativeId: postId.slice(separator + 1),
  };
}

/**
 * Resolve `/posts/{platform}/{nativeId}` segments from one source of truth.
 * A global post_id owns both platform and native id; otherwise use the
 * explicit platform with the native postId.
 */
export function postRouteParts(
  platform: string,
  postId: string,
): { platform: string; nativeId: string } {
  if (postId.includes(":")) {
    return parsePostId(postId);
  }
  return { platform, nativeId: postId };
}

/** Native id segment used in `/api/posts/{platform}/{nativeId}` URLs. */
export function nativePostId(post: Pick<SavedPost, "post_id" | "platform">): string {
  try {
    const parsed = parsePostId(post.post_id);
    return parsed.nativeId;
  } catch {
    return post.post_id;
  }
}

export interface PlaceLocation {
  display_name: string;
  continent?: string | null;
  country?: string | null;
  country_code?: string | null;
  state_province?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  provider_place_id?: string | null;
  osm_class?: string | null;
  osm_type?: string | null;
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

export interface JobCounts {
  pending: number;
  fetching: number;
  saved: number;
  linked: number;
  skipped: number;
  unsupported: number;
  error: number;
}

export interface Job {
  job_id: string;
  status: "running" | "done";
  refresh: boolean;
  counts: JobCounts;
  links: JobLink[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const auth = await authHeaders();
  for (const [key, value] of Object.entries(auth)) {
    headers.set(key, value);
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
      // keep default detail
    }
    throw new Error(detail);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
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

export async function fetchPosts(platform?: string): Promise<SavedPost[]> {
  const query = platform ? `?platform=${encodeURIComponent(platform)}` : "";
  return request<SavedPost[]>(`/api/posts${query}`);
}

export async function fetchPost(platform: string, postId: string): Promise<SavedPost> {
  return request<SavedPost>(`/api/posts/${platform}/${postId}`);
}

export async function deletePost(platform: string, postId: string): Promise<void> {
  await request<void>(`/api/posts/${platform}/${postId}`, { method: "DELETE" });
}

export interface PlaceFilters {
  continent?: string;
  country?: string;
  state_province?: string;
  city?: string;
  category?: string;
  roots_only?: boolean;
  parent_place_id?: string;
}

export async function fetchPlaces(filters: PlaceFilters = {}): Promise<Place[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === false || value === "") {
      continue;
    }
    params.set(key, String(value));
  }
  const query = params.toString();
  return request<Place[]>(`/api/places${query ? `?${query}` : ""}`);
}

export async function fetchPlaceDetail(placeId: string): Promise<PlaceDetail> {
  return request<PlaceDetail>(`/api/places/${placeId}`);
}

export async function fetchCategories(): Promise<string[]> {
  return request<string[]>("/api/categories");
}

export interface Visit {
  visit_id: string;
  place_id: string;
  place_name: string;
  visited_from: string;
  visited_to?: string | null;
  notes?: string | null;
  created_at?: string | null;
  user_id?: string | null;
}

export interface VisitDetail {
  visit: Visit;
  place?: Place | null;
}

export interface VisitCreateInput {
  visited_from: string;
  visited_to?: string | null;
  notes?: string | null;
  place_id?: string | null;
  place_query?: string | null;
  city?: string | null;
  country?: string | null;
}

export async function fetchVisits(): Promise<VisitDetail[]> {
  return request<VisitDetail[]>("/api/visits");
}

export async function fetchVisitedPlaceIds(): Promise<string[]> {
  return request<string[]>("/api/visits/place-ids");
}

export async function createVisit(input: VisitCreateInput): Promise<VisitDetail> {
  return request<VisitDetail>("/api/visits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function deleteVisit(visitId: string): Promise<void> {
  await request<void>(`/api/visits/${visitId}`, { method: "DELETE" });
}

export interface MaintenanceResult {
  posts_deleted?: number | null;
  places_deleted?: number | null;
  visits_deleted?: number | null;
}

export async function reprocessPlaces(): Promise<MaintenanceResult> {
  return request<MaintenanceResult>("/api/places/reprocess", { method: "POST" });
}

export async function cleanupData(): Promise<MaintenanceResult> {
  return request<MaintenanceResult>("/api/data/cleanup", { method: "POST" });
}

export interface AdminMe {
  is_admin: boolean;
}

export interface LocateDebugInput {
  place_name: string;
  city?: string | null;
  state_province?: string | null;
  country?: string | null;
  parent_place_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface LocateDebugSide {
  status: string;
  location: PlaceLocation | null;
  queries_tried: string[];
  notes: string[];
  match_confidence?: number | null;
  category?: string | null;
  provider?: string | null;
}

export interface LocateDebugResult {
  query: LocateDebugInput;
  result: LocateDebugSide;
}

export async function fetchAdminMe(): Promise<AdminMe> {
  return request<AdminMe>("/api/admin/me");
}

export async function debugLocate(input: LocateDebugInput): Promise<LocateDebugResult> {
  return request<LocateDebugResult>("/api/admin/places/locate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export interface PlaceCandidateHints {
  place_name: string;
  city?: string | null;
  country?: string | null;
  state_province?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  details?: string | null;
  tips: string[];
  category?: string | null;
  attributes: string[];
  parent_place_name?: string | null;
}

export interface PlaceCandidate {
  candidate_id: string;
  source_post_id: string;
  place_name: string;
  status: string;
  hints: PlaceCandidateHints;
  last_tried_at?: string | null;
  resolved_place_id?: string | null;
}

export interface PlaceCandidateList {
  candidates: PlaceCandidate[];
  count: number;
}

export type PlaceCandidateStatusFilter = "unresolved" | "low_confidence" | "open";

export async function fetchPlaceCandidates(options?: {
  status?: PlaceCandidateStatusFilter;
  source_post_id?: string | null;
}): Promise<PlaceCandidateList> {
  const params = new URLSearchParams();
  if (options?.status) {
    params.set("status", options.status);
  }
  if (options?.source_post_id?.trim()) {
    params.set("source_post_id", options.source_post_id.trim());
  }
  const query = params.toString();
  return request<PlaceCandidateList>(
    `/api/admin/places/candidates${query ? `?${query}` : ""}`,
  );
}
