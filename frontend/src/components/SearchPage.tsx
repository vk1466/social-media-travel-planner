import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { nativePostId, type Place, type SavedPost } from "../api";
import { coverArt } from "../coverArt";
import {
  formatPostDate,
  getPlatformLabel,
  getPostTitle,
} from "../postDisplayUtils";
import { thumbStyle, type BrowsePost } from "../postBrowseModel";
import { PageHeader } from "./PageHeader";

import "../search-page.css";

export interface SearchPageProps {
  posts: SavedPost[];
  places: Place[];
}

const RESULT_CAP = 25;

function matchesQuery(haystack: string | null | undefined, query: string): boolean {
  if (!haystack) {
    return false;
  }
  return haystack.toLowerCase().includes(query);
}

function placeMatches(place: Place, query: string): boolean {
  if (matchesQuery(place.display_name, query)) {
    return true;
  }
  if (place.aliases.some((alias) => matchesQuery(alias, query))) {
    return true;
  }
  if (matchesQuery(place.location.city, query)) {
    return true;
  }
  if (matchesQuery(place.location.country, query)) {
    return true;
  }
  if (matchesQuery(place.category, query)) {
    return true;
  }
  return false;
}

function postPlaceNames(post: SavedPost): string[] {
  return [
    ...post.extracted_places.map((place) => place.place_name),
    ...post.places.map((place) => place.place_name),
  ].filter(Boolean);
}

function postMatches(post: SavedPost, query: string): boolean {
  if (matchesQuery(post.caption, query)) {
    return true;
  }
  if (post.hashtags.some((tag) => matchesQuery(tag, query) || matchesQuery(`#${tag}`, query))) {
    return true;
  }
  if (matchesQuery(post.author_handle, query)) {
    return true;
  }
  if (postPlaceNames(post).some((name) => matchesQuery(name, query))) {
    return true;
  }
  return false;
}

function placeTrail(place: Place): string {
  return [place.location.city, place.location.country].filter(Boolean).join(", ");
}

function toThumbBrowse(post: SavedPost): BrowsePost {
  return {
    key: post.post_id,
    platform: post.platform,
    platformLabel: getPlatformLabel(post),
    title: getPostTitle(post),
    description: "",
    placeNames: [],
    placeCount: 0,
    tags: [],
    dateLabel: "",
    dayKey: "",
    monthKey: "",
    monthLabel: "",
    timestamp: 0,
    thumbnailUrl: post.thumbnail_url ?? null,
    author: post.author_handle ?? null,
    postUrl: post.post_url,
    aspect: 1,
  };
}

export function SearchPage({ posts, places }: SearchPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryRaw = searchParams.get("q") ?? "";
  const query = queryRaw.trim().toLowerCase();

  const placeResults = useMemo(() => {
    if (!query) {
      return [];
    }
    return places.filter((place) => placeMatches(place, query)).slice(0, RESULT_CAP);
  }, [places, query]);

  const postResults = useMemo(() => {
    if (!query) {
      return [];
    }
    return posts.filter((post) => postMatches(post, query)).slice(0, RESULT_CAP);
  }, [posts, query]);

  const total = placeResults.length + postResults.length;

  return (
    <div className="wf-container wf-page-pad search-page">
      <PageHeader
        eyebrow="Your library"
        title="Search"
        lede="Look across every post you've saved and every place in your atlas."
      />

      <input
        className="search-field"
        type="search"
        placeholder="Search places and posts…"
        value={queryRaw}
        autoFocus
        onChange={(event) => {
          const next = event.target.value;
          if (next) {
            setSearchParams({ q: next }, { replace: true });
          } else {
            setSearchParams({}, { replace: true });
          }
        }}
      />

      {!query ? (
        <p className="wf-note">Start typing to search your saves and your atlas.</p>
      ) : total === 0 ? (
        <p className="wf-note">Nothing matched “{queryRaw.trim()}”.</p>
      ) : (
        <>
          <p className="search-count">
            {total} result{total === 1 ? "" : "s"} for “{queryRaw.trim()}”
          </p>

          {placeResults.length > 0 && (
            <section className="search-section">
              <h2 className="search-heading">Places</h2>
              {placeResults.map((place) => (
                <Link
                  key={place.place_id}
                  to={`/places/${place.place_id}`}
                  className="search-row"
                >
                  <span
                    className="search-swatch"
                    style={{ background: coverArt(place.display_name) }}
                    aria-hidden="true"
                  />
                  <span className="search-row-copy">
                    <span className="search-row-title">{place.display_name}</span>
                    {placeTrail(place) ? (
                      <span className="search-row-meta">{placeTrail(place)}</span>
                    ) : null}
                  </span>
                </Link>
              ))}
            </section>
          )}

          {postResults.length > 0 && (
            <section className="search-section">
              <h2 className="search-heading">Posts</h2>
              {postResults.map((post, index) => {
                const nativeId = nativePostId(post);
                const dateLabel = formatPostDate(post);
                const meta = [getPlatformLabel(post), dateLabel].filter(Boolean).join(" · ");
                return (
                  <Link
                    key={post.post_id}
                    to={`/posts/${post.platform}/${nativeId}`}
                    className="search-row"
                  >
                    <span
                      className="search-thumb"
                      style={thumbStyle(toThumbBrowse(post), index)}
                      aria-hidden="true"
                    />
                    <span className="search-row-copy">
                      <span className="search-row-title">{getPostTitle(post)}</span>
                      {meta ? <span className="search-row-meta">{meta}</span> : null}
                    </span>
                  </Link>
                );
              })}
            </section>
          )}
        </>
      )}
    </div>
  );
}
