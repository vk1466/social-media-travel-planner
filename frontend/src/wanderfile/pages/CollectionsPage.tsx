import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { SavedPost, Place } from "../../api";
import { CANONICAL_CATEGORIES, getCategoryVisual, type CategoryVisual } from "../categoryVisuals";
import { proxiedMediaUrl, getPlaceBestImageUrl } from "../../postDisplayUtils";

interface CollectionsPageProps {
  posts: SavedPost[];
  places: Place[];
}

interface CollectionItem {
  id: string;
  title: string;
  subtitle: string;
  type: "city" | "category" | "creator" | "custom";
  count: number;
  thumbnails: string[];
  link: string;
  visual?: CategoryVisual;
}

function getCollectionGradient(title: string, type?: string): { gradient: string; glyph: string; badge: string } {
  const lower = title.toLowerCase().trim();
  if (lower.includes("food") || lower.includes("restaurant") || lower.includes("eats")) {
    return {
      gradient: "linear-gradient(135deg, #FF5E3A 0%, #FF9500 100%)",
      glyph: "🍴",
      badge: "Food & Dining",
    };
  }
  if (lower.includes("shop") || lower.includes("market") || lower.includes("boutique")) {
    return {
      gradient: "linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)",
      glyph: "🛍️",
      badge: "Shopping & Markets",
    };
  }
  if (lower.includes("nature") || lower.includes("park") || lower.includes("outdoor") || lower.includes("hike")) {
    return {
      gradient: "linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)",
      glyph: "🌲",
      badge: "Nature & Outdoors",
    };
  }
  if (lower.includes("cafe") || lower.includes("coffee")) {
    return {
      gradient: "linear-gradient(135deg, #92400E 0%, #D97706 100%)",
      glyph: "☕",
      badge: "Coffee & Cafes",
    };
  }
  if (lower.includes("taito")) {
    return {
      gradient: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%)",
      glyph: "🏮",
      badge: "Taito, Tokyo",
    };
  }
  if (lower.includes("rome")) {
    return {
      gradient: "linear-gradient(135deg, #C2410C 0%, #EA580C 50%, #F59E0B 100%)",
      glyph: "🏛️",
      badge: "Rome, Italy",
    };
  }
  if (lower.includes("vila velha")) {
    return {
      gradient: "linear-gradient(135deg, #0284C7 0%, #06B6D4 100%)",
      glyph: "🌊",
      badge: "Vila Velha, Brazil",
    };
  }
  if (lower.includes("anywhere_we_roam")) {
    return {
      gradient: "linear-gradient(135deg, #4338CA 0%, #6366F1 50%, #8B5CF6 100%)",
      glyph: "🧭",
      badge: "@anywhere_we_roam",
    };
  }
  if (lower.includes("marissa.daily")) {
    return {
      gradient: "linear-gradient(135deg, #DB2777 0%, #F43F5E 50%, #FB7185 100%)",
      glyph: "✨",
      badge: "@marissa.daily",
    };
  }
  if (lower.includes("hotelsantorinivv") || lower.includes("santorini")) {
    return {
      gradient: "linear-gradient(135deg, #0284C7 0%, #2563EB 50%, #4F46E5 100%)",
      glyph: "🏛️",
      badge: "@hotelsantorinivv",
    };
  }
  if (type === "creator" || title.startsWith("@")) {
    return {
      gradient: "linear-gradient(135deg, #7C3AED 0%, #A855F7 50%, #EC4899 100%)",
      glyph: "📸",
      badge: "Creator Collection",
    };
  }
  return {
    gradient: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
    glyph: "📍",
    badge: title,
  };
}

function CollectionMosaic({
  thumbnails,
  title,
  visual,
  type,
}: {
  thumbnails: string[];
  title: string;
  visual?: CategoryVisual;
  type?: string;
}) {
  const vis = visual || getCategoryVisual(title);
  const distinct = useMemo(() => {
    const set = new Set<string>();
    const res: string[] = [];
    for (const t of thumbnails) {
      if (t && !set.has(t)) {
        set.add(t);
        res.push(t);
      }
    }
    return res;
  }, [thumbnails]);

  const [failedIndices, setFailedIndices] = useState<Set<number>>(new Set());

  const validThumbs = distinct.filter((_, idx) => !failedIndices.has(idx));

  if (validThumbs.length === 0) {
    const theme = getCollectionGradient(title, type || visual?.name);
    return (
      <div
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: "14px",
          overflow: "hidden",
          background: theme.gradient,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          color: "#FFFFFF",
          padding: "16px",
          boxSizing: "border-box",
          position: "relative",
          boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.22)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(255, 255, 255, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          {theme.glyph}
        </div>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF", textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
            {title}
          </span>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {theme.badge}
          </span>
        </div>
      </div>
    );
  }

  if (validThumbs.length === 1) {
    return (
      <div
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: "14px",
          overflow: "hidden",
          position: "relative",
          background: vis.tint,
        }}
      >
        <img
          src={proxiedMediaUrl(validThumbs[0]) ?? undefined}
          alt=""
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={() => setFailedIndices((prev) => new Set([...prev, 0]))}
        />
      </div>
    );
  }

  if (validThumbs.length === 2) {
    return (
      <div
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: "14px",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "3px",
          background: vis.tint,
        }}
      >
        {validThumbs.slice(0, 2).map((thumb, idx) => (
          <div key={idx} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
            <img
              src={proxiedMediaUrl(thumb) ?? undefined}
              alt=""
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={() => setFailedIndices((prev) => new Set([...prev, idx]))}
            />
          </div>
        ))}
      </div>
    );
  }

  if (validThumbs.length === 3) {
    return (
      <div
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: "14px",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1.2fr 1fr",
          gap: "3px",
          background: vis.tint,
        }}
      >
        <div style={{ gridColumn: "1 / -1", position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
          <img
            src={proxiedMediaUrl(validThumbs[0]) ?? undefined}
            alt=""
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={() => setFailedIndices((prev) => new Set([...prev, 0]))}
          />
        </div>
        {validThumbs.slice(1, 3).map((thumb, idx) => (
          <div key={idx} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
            <img
              src={proxiedMediaUrl(thumb) ?? undefined}
              alt=""
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={() => setFailedIndices((prev) => new Set([...prev, idx + 1]))}
            />
          </div>
        ))}
      </div>
    );
  }

  // 4 or more distinct images -> 2x2 grid
  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "1 / 1",
        borderRadius: "14px",
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: "3px",
        background: vis.tint,
      }}
    >
      {validThumbs.slice(0, 4).map((thumb, idx) => (
        <div key={idx} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
          <img
            src={proxiedMediaUrl(thumb) ?? undefined}
            alt=""
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={() => setFailedIndices((prev) => new Set([...prev, idx]))}
          />
        </div>
      ))}
    </div>
  );
}

export function CollectionsPage({ posts, places }: CollectionsPageProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | "city" | "category" | "creator">("all");

  const { cityCollections, categoryCollections, creatorCollections } = useMemo(() => {
    const usedThumbs = new Set<string>();

    // 1. City collections
    const cityMap = new Map<string, { count: number; places: typeof places }>();
    for (const place of places) {
      const city = place.location?.city;
      if (!city) continue;
      const data = cityMap.get(city) || { count: 0, places: [] };
      data.count += 1;
      data.places.push(place);
      cityMap.set(city, data);
    }
    const sortedCities = Array.from(cityMap.entries()).sort((a, b) => b[1].count - a[1].count);

    const cities: CollectionItem[] = sortedCities.map(([city, data]) => {
      const thumbs: string[] = [];
      // Pick images not yet used in previous collection covers
      for (const place of data.places) {
        if (thumbs.length >= 4) break;
        const img = getPlaceBestImageUrl(place, posts);
        if (img && !usedThumbs.has(img) && !thumbs.includes(img)) {
          thumbs.push(img);
          usedThumbs.add(img);
        }
      }
      // Search matching posts if needed
      if (thumbs.length < 4) {
        for (const post of posts) {
          if (thumbs.length >= 4) break;
          const matches = post.place_ids?.some(
            (pid) => places.find((pl) => pl.place_id === pid)?.location?.city === city
          );
          if (matches && post.thumbnail_url && !usedThumbs.has(post.thumbnail_url) && !thumbs.includes(post.thumbnail_url)) {
            thumbs.push(post.thumbnail_url);
            usedThumbs.add(post.thumbnail_url);
          }
        }
      }
      // Never allow reused images! If 0 images, fallback to designed gradient cover
      return {
        id: `city-${city}`,
        title: city,
        subtitle: "City collection",
        type: "city" as const,
        count: data.count,
        thumbnails: thumbs,
        link: `/library?city=${encodeURIComponent(city)}&tab=places`,
      };
    });

    // 2. Category collections
    const categories: CollectionItem[] = CANONICAL_CATEGORIES.map((cat) => {
      const vis = getCategoryVisual(cat);
      const catPlaces = places.filter((p) => getCategoryVisual(p.category).name === cat);
      const thumbs: string[] = [];
      for (const p of catPlaces) {
        if (thumbs.length >= 4) break;
        const img = getPlaceBestImageUrl(p, posts);
        if (img && !thumbs.includes(img)) {
          thumbs.push(img);
        }
      }
      return {
        id: `cat-${cat}`,
        title: cat,
        subtitle: "Category collection",
        type: "category" as const,
        count: catPlaces.length,
        thumbnails: thumbs,
        visual: vis,
        link: `/library?category=${encodeURIComponent(cat)}&tab=places`,
      };
    }).filter((c) => c.count > 0);

    // 3. Creator collections
    const creatorMap = new Map<string, { count: number; thumbs: string[] }>();
    for (const post of posts) {
      const creator = post.author_handle;
      if (!creator) continue;
      const data = creatorMap.get(creator) || { count: 0, thumbs: [] };
      data.count += (post.place_ids?.length || 1);
      if (post.thumbnail_url && data.thumbs.length < 4 && !data.thumbs.includes(post.thumbnail_url)) {
        data.thumbs.push(post.thumbnail_url);
      }
      for (const pid of post.place_ids || []) {
        if (data.thumbs.length >= 4) break;
        const pl = places.find((p) => p.place_id === pid);
        if (pl) {
          const img = getPlaceBestImageUrl(pl, posts);
          if (img && !data.thumbs.includes(img)) {
            data.thumbs.push(img);
          }
        }
      }
      creatorMap.set(creator, data);
    }
    const creators: CollectionItem[] = Array.from(creatorMap.entries())
      .map(([creator, data]) => ({
        id: `creator-${creator}`,
        title: `@${creator}`,
        subtitle: "Creator guides",
        type: "creator" as const,
        count: data.count,
        thumbnails: data.thumbs,
        link: `/library?q=${encodeURIComponent(creator)}`,
      }))
      .filter((c) => c.count > 1)
      .sort((a, b) => b.count - a.count);

    return { cityCollections: cities, categoryCollections: categories, creatorCollections: creators };
  }, [places, posts]);

  const allAutoCollections = useMemo(() => {
    if (activeFilter === "city") return cityCollections;
    if (activeFilter === "category") return categoryCollections;
    if (activeFilter === "creator") return creatorCollections;
    return [...cityCollections.slice(0, 4), ...categoryCollections.slice(0, 4), ...creatorCollections.slice(0, 4)];
  }, [activeFilter, cityCollections, categoryCollections, creatorCollections]);

  return (
    <main
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "clamp(20px, 4vw, 36px) clamp(16px, 4vw, 32px) 80px",
        display: "flex",
        flexDirection: "column",
        gap: "32px",
        width: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink, #16181B)" }}>
            Collections
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "14px", color: "var(--ink-2, #5E636B)" }}>
            Auto-grouped from your saved reels and custom trip boards
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
          {(["all", "city", "category", "creator"] as const).map((key) => {
            const isSelected = activeFilter === key;
            const label = key === "all" ? "All" : key === "city" ? "By City" : key === "category" ? "By Category" : "By Creator";
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveFilter(key)}
                style={{
                  height: "32px",
                  padding: "0 14px",
                  borderRadius: "999px",
                  border: isSelected ? "1px solid var(--ink, #16181B)" : "1px solid var(--line, #E7E6E3)",
                  background: isSelected ? "var(--ink, #16181B)" : "var(--surface-2, #F3F3F1)",
                  color: isSelected ? "var(--bg, #FAFAF9)" : "var(--ink-2, #5E636B)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Adaptive Thumbnail Mosaic Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "24px",
        }}
      >
        {allAutoCollections.map((col) => (
          <Link
            key={col.id}
            to={col.link}
            style={{
              textDecoration: "none",
              color: "inherit",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              background: "var(--surface, #FFFFFF)",
              border: "1px solid var(--line, #E7E6E3)",
              borderRadius: "20px",
              padding: "16px",
              boxShadow: "var(--shadow-sm, 0 1px 2px rgba(16,24,40,.06))",
              transition: "transform 0.18s ease, box-shadow 0.18s ease",
            }}
            className="wf-card-hover"
          >
            {/* Adaptive Thumbnail Mosaic */}
            <CollectionMosaic thumbnails={col.thumbnails} title={col.title} visual={col.visual} type={col.type} />

            {/* Collection Metadata */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "var(--ink, #16181B)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.title}
                </h2>
                <span style={{ fontSize: "12px", color: "var(--ink-2, #5E636B)", flexShrink: 0 }}>
                  {col.count} {col.count === 1 ? "place" : "places"}
                </span>
              </div>
              <span style={{ fontSize: "12px", color: "var(--ink-2, #5E636B)" }}>
                {col.subtitle}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
