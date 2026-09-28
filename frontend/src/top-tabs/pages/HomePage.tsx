import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { Place, SavedPost, VisitDetail } from "../../api";
import { placeMatchesPlatform, postsForPlatforms, useLibraryPlatform } from "../../libraryPlatform";
import { locationLine } from "../display";
import { PageHeading } from "../../components/PageHeading";
import { useLabTheme } from "../theme";
import { PostDetail, PostMediaCard } from "./PostsPage";
import "../../home-page.css";

function recency(post: SavedPost): number {
  const raw = post.fetched_at ?? post.posted_at;
  if (!raw) return 0;
  const time = Date.parse(raw);
  return Number.isNaN(time) ? 0 : time;
}

export function HomePage({
  posts,
  places,
  onDeleted,
}: {
  posts: SavedPost[];
  places: Place[];
  visits: VisitDetail[];
  onDeleted: () => void;
}) {
  const { basePath } = useLabTheme();
  const { platforms } = useLibraryPlatform();
  const scopedPosts = useMemo(
    () => postsForPlatforms(posts, platforms),
    [posts, platforms],
  );
  const scopedPlaces = useMemo(
    () =>
      places.filter((place) =>
        placeMatchesPlatform(place.source_post_ids, posts, platforms),
      ),
    [places, posts, platforms],
  );
  const continuePlace = scopedPlaces[0];
  const continuePlaceImage = continuePlace
    ? scopedPosts.find((post) =>
        post.place_ids?.includes(continuePlace.place_id) && post.thumbnail_url,
      )?.thumbnail_url
    : null;
  const [selected, setSelected] = useState<SavedPost | null>(null);
  const recentPosts = useMemo(
    () => [...scopedPosts].sort((a, b) => recency(b) - recency(a)).slice(0, 8),
    [scopedPosts],
  );
  const placeNames = useMemo(
    () => Object.fromEntries(places.map((place) => [place.place_id, place.display_name])),
    [places],
  );

  return (
    <div className="top-home-page">
      <PageHeading
        kicker="YOUR SECOND MEMORY ✳"
        title="Good ideas, beautifully kept."
        lede="A home for all the places, recipes, films, and ideas you want to come back to."
        count={{ value: scopedPosts.length, label: "saves" }}
      />
      {continuePlace ? (
        <section className="home-hero">
          {continuePlaceImage ? <img className="home-hero-image" src={continuePlaceImage} alt="" /> : null}
          <div>
            <p className="eyebrow">YOUR NEXT PLACE TO GO</p>
            <h2>{continuePlace.display_name}</h2>
            <p>
              {locationLine(continuePlace)}
              {continuePlace.source_post_ids.length
                ? ` · ${continuePlace.source_post_ids.length} saves`
                : ""}
            </p>
            <Link className="home-next-action" to={`${basePath}/travel/${continuePlace.place_id}`}>
              Explore this place <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
      ) : (
        <section className="home-start" aria-labelledby="home-start-title">
          <div>
            <p className="eyebrow">EVERY LIBRARY STARTS SOMEWHERE</p>
            <h2 id="home-start-title">Found something worth keeping?</h2>
            <p>Drop in a post, video, or article. We’ll make a place for it here.</p>
          </div>
          <Link className="home-next-action" to={`${basePath}/add`}>Save your first link <span aria-hidden="true">↗</span></Link>
        </section>
      )}
      {recentPosts.length > 0 ? (
        <section className="library-panel slim-panel home-recent">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">FRESHLY FILED</p>
              <h2>Recently saved</h2>
            </div>
            <Link to={`${basePath}/posts`}>See all →</Link>
          </div>
          <div className="cover-grid cover-rail">
            {recentPosts.map((post) => (
              <PostMediaCard key={post.post_id} post={post} onOpen={setSelected} />
            ))}
          </div>
        </section>
      ) : null}
      {selected ? (
        <PostDetail
          post={selected}
          placeNames={placeNames}
          onClose={() => setSelected(null)}
          onDeleted={() => {
            setSelected(null);
            onDeleted();
          }}
        />
      ) : null}
    </div>
  );
}
