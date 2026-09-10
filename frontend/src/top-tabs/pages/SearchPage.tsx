import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import type { Place, SavedPost } from "../../api";
import { postTitle } from "../display";
import { recipesFromPosts } from "../recipes";
import { aggregateMovies } from "../movies";
import { FilterBar } from "../../components/library";
import { PageHeading } from "../components/Shell";
import { useLabTheme } from "../theme";

export function SearchPage({ posts, places }: { posts: SavedPost[]; places: Place[] }) {
  const navigate = useNavigate();
  const { basePath } = useLabTheme();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const recipes = recipesFromPosts(posts);
  const movies = aggregateMovies(posts);

  const results = useMemo(() => {
    if (!q) return [];
    const hits: { to: string; label: string; meta: string }[] = [];
    for (const post of posts) {
      if (`${postTitle(post)} ${post.caption}`.toLowerCase().includes(q)) {
        hits.push({ to: `${basePath}/posts`, label: postTitle(post), meta: "Post" });
      }
    }
    for (const place of places) {
      if (place.display_name.toLowerCase().includes(q)) {
        hits.push({ to: `${basePath}/travel/${place.place_id}`, label: place.display_name, meta: "Place" });
      }
    }
    for (const recipe of recipes) {
      if ((recipe.recipe.title ?? "").toLowerCase().includes(q)) {
        hits.push({ to: `${basePath}/food`, label: recipe.recipe.title ?? "Recipe", meta: "Recipe" });
      }
    }
    for (const movie of movies) {
      if (movie.title.toLowerCase().includes(q)) {
        hits.push({ to: `${basePath}/movies`, label: movie.title, meta: "Movie" });
      }
    }
    return hits.slice(0, 30);
  }, [q, posts, places, recipes, movies, basePath]);

  return (
    <>
      <PageHeading kicker="Jump" title="Search" lede="Find a post, place, recipe, or title without leaving the library." />
      <FilterBar
        placeholder="Search or jump to a page"
        query={query}
        onQuery={setQuery}
        autoFocus
        onSearchKeyDown={(event) => {
          if (event.key === "Enter" && results[0]) navigate(results[0].to);
        }}
      />
      <nav className="jump-links">
        <Link to={`${basePath}/posts`}>Posts</Link>
        <Link to={`${basePath}/travel`}>Travel</Link>
        <Link to={`${basePath}/food`}>Food</Link>
        <Link to={`${basePath}/movies`}>Movies</Link>
        <Link to={`${basePath}/history`}>History</Link>
      </nav>
      <ul className="sheet-list">
        {results.map((hit) => (
          <li key={`${hit.to}-${hit.label}`}>
            <Link to={hit.to}>
              {hit.label} <small>{hit.meta}</small>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
