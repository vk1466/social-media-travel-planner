/**
 * Design-lab data layer: TravelPlanner-dev via Vite `/api` proxy + Clerk session.
 * Falls back to WF_MOCK when unsigned or the request fails.
 */

const PLATFORMS = ["all", "instagram", "youtube", "tiktok", "web"];

let clerkPromise = null;

function decodeFrontendApi(publishableKey) {
  try {
    const encoded = publishableKey.replace(/^pk_(test|live)_/, "");
    const decoded = atob(encoded);
    return decoded.replace(/\$$/, "");
  } catch {
    return null;
  }
}

function loadScript(src, attrs = {}) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing && window.Clerk) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    for (const [key, value] of Object.entries(attrs)) {
      script.setAttribute(key, value);
    }
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureClerk() {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return null;
  }
  if (!clerkPromise) {
    clerkPromise = (async () => {
      const frontendApi = decodeFrontendApi(publishableKey);
      if (!frontendApi) {
        return null;
      }
      const src = `https://${frontendApi}/npm/@clerk/clerk-js@5/dist/clerk.browser.js`;
      await Promise.race([
        loadScript(src, { "data-clerk-publishable-key": publishableKey }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Clerk script timeout")), 4000),
        ),
      ]);
      const ClerkCtor = window.Clerk;
      if (!ClerkCtor) {
        return null;
      }
      const clerk = typeof ClerkCtor === "function" ? new ClerkCtor(publishableKey) : ClerkCtor;
      if (typeof clerk.load === "function") {
        await Promise.race([
          clerk.load(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Clerk load timeout")), 4000),
          ),
        ]);
      }
      return clerk;
    })().catch((err) => {
      console.warn("[design-lab] Clerk unavailable", err);
      clerkPromise = null;
      return null;
    });
  }
  return clerkPromise;
}

async function authHeaders() {
  const clerk = await ensureClerk();
  const token = clerk?.session ? await clerk.session.getToken() : null;
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return null;
}

async function apiGet(path) {
  const headers = await authHeaders();
  if (!headers) {
    return null;
  }
  const response = await fetch(path, { headers });
  if (!response.ok) {
    throw new Error(`${path} → ${response.status}`);
  }
  return response.json();
}

function proxiedThumb(url) {
  const trimmed = (url || "").trim();
  if (!trimmed) {
    return null;
  }
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    const needsProxy =
      host === "instagram.com" ||
      host.endsWith(".instagram.com") ||
      host === "cdninstagram.com" ||
      host.endsWith(".cdninstagram.com") ||
      host === "fbcdn.net" ||
      host.endsWith(".fbcdn.net");
    if (needsProxy) {
      return `/api/media/proxy?url=${encodeURIComponent(trimmed)}`;
    }
  } catch {
    /* keep raw */
  }
  return trimmed;
}

function timeParts(iso) {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return {
      dayKey: "unknown",
      monthKey: "unknown",
      monthLabel: "Undated",
      timestamp: 0,
      dateLabel: "—",
    };
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return {
    dayKey: `${year}-${month}-${day}`,
    monthKey: `${year}-${month}`,
    monthLabel: date.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    timestamp: date.getTime(),
    dateLabel: date.toLocaleDateString(),
  };
}

function platformLabel(platform) {
  if (platform === "instagram") return "INSTAGRAM";
  if (platform === "web") return "WEB · travel";
  return String(platform || "").toUpperCase();
}

function titleFromCaption(caption, author) {
  const text = (caption || "").trim();
  if (!text) {
    return author ? `@${author}` : "Untitled post";
  }
  const first = text.split("\n")[0]?.trim() || text;
  if (first.length <= 80) return first;
  return `${text.slice(0, 77)}…`;
}

function descriptionFromCaption(caption) {
  const text = (caption || "").trim();
  if (!text) return "No description available.";
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) {
    return text.length > 160 ? `${text.slice(0, 157)}…` : text;
  }
  const body = lines.slice(1).join(" ");
  return body.length > 160 ? `${body.slice(0, 157)}…` : body;
}

function fromApiPost(post, placeNamesById) {
  const time = timeParts(post.posted_at || post.fetched_at);
  const placeIds = post.place_ids || [];
  const namedFromIds = placeIds
    .map((id) => ({ placeId: id, name: placeNamesById[id] }))
    .filter((entry) => entry.name);
  const fromExtracted = [
    ...(post.extracted_places || []).map((p) => p.place_name),
    ...(post.places || []).map((p) => p.place_name),
  ].filter(Boolean);
  const placeNames = Array.from(
    new Set(
      namedFromIds.length
        ? namedFromIds.map((entry) => entry.name)
        : fromExtracted,
    ),
  );
  return {
    key: post.post_id,
    platform: post.platform,
    platformLabel: platformLabel(post.platform),
    title: titleFromCaption(post.caption, post.author_handle),
    description: descriptionFromCaption(post.caption),
    placeNames,
    placeIds: namedFromIds.length ? namedFromIds.map((e) => e.placeId) : placeIds,
    placeCount: placeNames.length || placeIds.length,
    tags: (post.hashtags || []).map((t) => t.replace(/^#/, "").toLowerCase()).slice(0, 4),
    thumbnailUrl: proxiedThumb(post.thumbnail_url),
    author: post.author_handle || null,
    postUrl: post.post_url,
    ...time,
  };
}

/** Invent stable ISO dates for mock rows so month eras still group. */
function mockPostedAt(index) {
  const now = new Date();
  // Cluster ~4 posts per month so the timeline feels like production.
  const monthsBack = Math.floor(index / 4);
  const day = 6 + (index % 4) * 5;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, day)).toISOString();
}

function fromMock(mock) {
  const placeNamesById = Object.fromEntries((mock.places || []).map((p) => [p.id, p.name]));
  const posts = (mock.posts || []).map((post, index) => {
    const time = timeParts(mockPostedAt(index));
    const placeNames = (post.places || []).map((id) => placeNamesById[id]).filter(Boolean);
    return {
      key: post.id,
      platform: post.platform,
      platformLabel: platformLabel(post.platform),
      title: post.title,
      description: post.excerpt || post.title,
      placeNames,
      placeIds: post.places || [],
      placeCount: placeNames.length,
      tags: post.tags || [],
      thumbnailUrl: post.cover || null,
      author: post.author || null,
      postUrl: `post.html?id=${encodeURIComponent(post.id)}`,
      ...time,
      dateLabel: post.posted || time.dateLabel,
    };
  });
  const places = (mock.places || []).map((p) => ({
    place_id: p.id,
    display_name: p.name,
  }));
  return { posts, places, usingLiveData: false };
}

export { PLATFORMS };

export async function openClerkSignIn() {
  const clerk = await ensureClerk();
  if (!clerk) {
    window.alert("Clerk is not configured. Add VITE_CLERK_PUBLISHABLE_KEY to frontend/.env.local.");
    return;
  }
  if (typeof clerk.openSignIn === "function") {
    await clerk.openSignIn({});
    return;
  }
  window.alert("Sign in on http://localhost:5173 first, then refresh this page.");
}

/**
 * Load browse posts + places. Prefers the signed-in TravelPlanner-dev library.
 */
export async function loadLibrary(mock = window.WF_MOCK) {
  try {
    const headers = await authHeaders();
    if (!headers) {
      return { ...fromMock(mock), authState: "signed-out" };
    }
    const [postsRaw, placesRaw] = await Promise.all([
      apiGet("/api/posts"),
      apiGet("/api/places"),
    ]);
    if (!Array.isArray(postsRaw)) {
      return { ...fromMock(mock), authState: "error" };
    }
    const places = (placesRaw || []).map((p) => ({
      place_id: p.place_id,
      display_name: p.display_name || p.location?.display_name || p.place_id,
    }));
    const placeNamesById = Object.fromEntries(places.map((p) => [p.place_id, p.display_name]));
    const posts = postsRaw
      .map((p) => fromApiPost(p, placeNamesById))
      .sort((a, b) => b.timestamp - a.timestamp || a.title.localeCompare(b.title));
    return {
      posts,
      places,
      usingLiveData: true,
      authState: "signed-in",
    };
  } catch (err) {
    console.warn("[design-lab] Falling back to mock library", err);
    return { ...fromMock(mock), authState: "error" };
  }
}

/**
 * Load atlas places (+ visit set). Falls back to WF_MOCK destinations.
 */
export async function loadPlacesLibrary(mock = window.WF_MOCK) {
  const { atlasPlacesFromApi, atlasPlacesFromMock } = await import("./place-atlas.js");
  try {
    const headers = await authHeaders();
    if (!headers) {
      return {
        places: atlasPlacesFromMock(mock),
        usingLiveData: false,
        authState: "signed-out",
      };
    }
    const [placesRaw, visitedRaw] = await Promise.all([
      apiGet("/api/places"),
      apiGet("/api/visits/place-ids"),
    ]);
    if (!Array.isArray(placesRaw)) {
      return {
        places: atlasPlacesFromMock(mock),
        usingLiveData: false,
        authState: "error",
      };
    }
    const visitedIds = new Set(Array.isArray(visitedRaw) ? visitedRaw : []);
    return {
      places: atlasPlacesFromApi(placesRaw, visitedIds),
      usingLiveData: true,
      authState: "signed-in",
    };
  } catch (err) {
    console.warn("[design-lab] Falling back to mock places", err);
    return {
      places: atlasPlacesFromMock(mock),
      usingLiveData: false,
      authState: "error",
    };
  }
}
