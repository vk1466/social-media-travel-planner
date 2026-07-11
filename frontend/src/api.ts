export interface Place {
  place_name: string;
  city?: string | null;
  country?: string | null;
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
  tags: string[];
  parent_place_name?: string | null;
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
  like_count?: number | null;
  comment_count?: number | null;
  top_comments: string[];
  places: Place[];
  extracted_places: ExtractedPlace[];
  place_ids: string[];
  thumbnail_url?: string | null;
  fetched_at?: string | null;
  reel_summary?: string | null;
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

export interface CanonicalPlace {
  place_id: string;
  display_name: string;
  location: PlaceLocation;
  aliases: string[];
  tags: string[];
  details: string[];
  tips: string[];
  source_post_ids: string[];
  parent_place_id?: string | null;
}

export interface PlaceDetail {
  place: CanonicalPlace;
  source_posts: SavedPost[];
  parent?: CanonicalPlace | null;
  children: CanonicalPlace[];
}

export type LinkStatus =
  | "pending"
  | "fetching"
  | "saved"
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
  const response = await fetch(path, init);
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
  tag?: string;
  roots_only?: boolean;
  parent_place_id?: string;
}

export async function fetchPlaces(filters: PlaceFilters = {}): Promise<CanonicalPlace[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === false || value === "") {
      continue;
    }
    params.set(key, String(value));
  }
  const query = params.toString();
  return request<CanonicalPlace[]>(`/api/places${query ? `?${query}` : ""}`);
}

export async function fetchPlaceDetail(placeId: string): Promise<PlaceDetail> {
  return request<PlaceDetail>(`/api/places/${placeId}`);
}

export async function fetchTags(): Promise<string[]> {
  return request<string[]>("/api/tags");
}

export interface Visit {
  visit_id: string;
  place_id: string;
  place_name: string;
  visited_from: string;
  visited_to?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

export interface VisitDetail {
  visit: Visit;
  place?: CanonicalPlace | null;
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
