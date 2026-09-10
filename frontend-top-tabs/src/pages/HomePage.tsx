import { Link } from "react-router-dom";

import type { Place, SavedPost, VisitDetail } from "../api";
import { locationLine, postsOfCategory } from "../display";
import { recipesFromPosts } from "../recipes";
import { aggregateMovies } from "../movies";
import { PageHeading } from "../components/Shell";

const PORTALS = [
  { to: "/posts", key: "posts", icon: "▦", label: "Posts" },
  { to: "/travel", key: "travel", icon: "⌖", label: "Travel" },
  { to: "/food", key: "food", icon: "◒", label: "Food" },
  { to: "/movies", key: "movies", icon: "▶", label: "Movies" },
  { to: "/history", key: "history", icon: "◷", label: "History" },
] as const;

export function HomePage({
  posts,
  places,
  visits,
}: {
  posts: SavedPost[];
  places: Place[];
  visits: VisitDetail[];
}) {
  const food = recipesFromPosts(postsOfCategory(posts, "food"));
  const movies = aggregateMovies(postsOfCategory(posts, "movies"));
  const continuePlace = places[0];
  const counts = {
    posts: posts.length,
    travel: places.length,
    food: food.length,
    movies: movies.length,
    history: visits.length,
  };

  return (
    <>
      <PageHeading
        kicker="Your library"
        title="Everything you saved, ready when you are."
        lede="Start from a category. Each one now has its own predictable page and URL."
      />
      {continuePlace ? (
        <section className="home-hero">
          <div>
            <p className="eyebrow">Continue planning</p>
            <h2>{continuePlace.display_name}</h2>
            <p>
              {locationLine(continuePlace)}
              {continuePlace.source_post_ids.length
                ? ` · ${continuePlace.source_post_ids.length} saves`
                : ""}
            </p>
            <Link to={`/travel/${continuePlace.place_id}`}>Open travel page →</Link>
          </div>
        </section>
      ) : null}
      <section className="portal-grid">
        {PORTALS.map((item) => (
          <Link key={item.key} to={item.to}>
            <span>{item.icon}</span>
            <b>{item.label}</b>
            <small>
              {counts[item.key]} {item.key === "history" ? "visits" : "saves"}
            </small>
            <em>Open page →</em>
          </Link>
        ))}
      </section>
    </>
  );
}
