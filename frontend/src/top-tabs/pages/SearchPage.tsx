import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { nativePostId, postRouteParts, type Place, type SavedPost } from "../../api";
import { postTitle } from "../display";
import { recipesFromPosts, type SavedRecipe } from "../recipes";
import { aggregateMovies, type AggregatedMovie } from "../movies";
import { FilterBar } from "../../components/library";
import { placeMatchesPlatform, postsForPlatforms, useLibraryPlatform } from "../../libraryPlatform";
import { PageHeading } from "../../components/PageHeading";
import { RecipeDetailModal } from "../../components/food/RecipeDetailModal";
import { GroceryListModal } from "../../components/food/GroceryListModal";
import { MovieDetailModal } from "../../components/movies/MovieDetailModal";
import { useLabTheme } from "../theme";
import "../../search-page.css";

export function SearchPage({ posts, places }: { posts: SavedPost[]; places: Place[] }) {
  const navigate = useNavigate();
  const { basePath } = useLabTheme();
  const { platforms } = useLibraryPlatform();
  const [query, setQuery] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<SavedRecipe | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<AggregatedMovie | null>(null);
  const [groceryRecipeKeys, setGroceryRecipeKeys] = useState<Set<string>>(new Set());
  const [groceryOpen, setGroceryOpen] = useState(false);
  const q = query.trim().toLowerCase();
  const scopedPosts = postsForPlatforms(posts, platforms);
  const recipes = recipesFromPosts(scopedPosts);
  const movies = aggregateMovies(scopedPosts);

  const results = useMemo(() => {
    if (!q) return [];
    const hits: { key: string; to?: string; label: string; meta: string; recipe?: SavedRecipe; movie?: AggregatedMovie }[] = [];
    for (const post of scopedPosts) {
      if (`${postTitle(post)} ${post.caption}`.toLowerCase().includes(q)) {
        const route = postRouteParts(post.platform, nativePostId(post));
        hits.push({ key: `post-${post.post_id}`, to: `${basePath}/posts/${route.platform}/${route.nativeId}`, label: postTitle(post), meta: "Post" });
      }
    }
    for (const place of places) {
      if (!placeMatchesPlatform(place.source_post_ids, posts, platforms)) continue;
      if (place.display_name.toLowerCase().includes(q)) {
        hits.push({ key: `place-${place.place_id}`, to: `${basePath}/travel/${place.place_id}`, label: place.display_name, meta: "Place" });
      }
    }
    for (const recipe of recipes) {
      if ((recipe.recipe.title ?? "").toLowerCase().includes(q)) {
        hits.push({ key: `recipe-${recipe.key}`, label: recipe.recipe.title ?? "Recipe", meta: "Recipe", recipe });
      }
    }
    for (const movie of movies) {
      if (movie.title.toLowerCase().includes(q)) {
        hits.push({ key: `movie-${movie.key}`, label: movie.title, meta: "Movie", movie });
      }
    }
    return hits.slice(0, 30);
  }, [q, scopedPosts, places, recipes, movies, basePath, posts, platforms]);

  return (
    <div className="top-search-page">
      <PageHeading
        backLink={{ to: "/", label: "Home" }}
        kicker="Search Wanderfile"
        title="Find anything you saved"
        lede="Search posts, places, recipes, and movies from one place."
        count={{ value: results.length, label: "results" }}
      />
      <FilterBar
        placeholder="Search saves"
        query={query}
        onQuery={setQuery}
        autoFocus
        onSearchKeyDown={(event) => {
          if (event.key === "Enter" && results[0]) openResult(results[0]);
        }}
      />
      {!q ? <nav className="jump-links" aria-label="Browse your library">
        <Link to={`${basePath || "/"}`}>Home</Link>
        <Link to={`${basePath}/posts`}>Posts</Link>
        <Link to={`${basePath}/travel`}>Places</Link>
        <Link to={`${basePath}/food`}>Food</Link>
        <Link to={`${basePath}/movies`}>Watch</Link>
        <Link to={`${basePath}/history`}>Visits</Link>
      </nav> : null}
      <ul className="sheet-list">
        {results.map((hit) => (
          <li key={hit.key}>
            {hit.to ? <Link to={hit.to}>{hit.label} <small>{hit.meta}</small></Link> :
              <button type="button" onClick={() => openResult(hit)}>{hit.label} <small>{hit.meta}</small></button>}
          </li>
        ))}
      </ul>
      {q && results.length === 0 ? <p className="empty-copy" role="status">No saved items match “{query.trim()}”.</p> : null}
      {selectedRecipe ? <RecipeDetailModal item={selectedRecipe} onClose={() => setSelectedRecipe(null)}
        onAddToGrocery={() => setGroceryRecipeKeys((keys) => new Set(keys).add(selectedRecipe.key))}
        isInGroceryList={groceryRecipeKeys.has(selectedRecipe.key)} onViewGrocery={() => setGroceryOpen(true)} /> : null}
      {groceryOpen ? <GroceryListModal recipes={recipes.filter((item) => groceryRecipeKeys.has(item.key))} onClose={() => setGroceryOpen(false)} /> : null}
      {selectedMovie ? <MovieDetailModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} /> : null}
    </div>
  );

  function openResult(hit: { to?: string; recipe?: SavedRecipe; movie?: AggregatedMovie }) {
    if (hit.to) navigate(hit.to);
    else if (hit.recipe) setSelectedRecipe(hit.recipe);
    else if (hit.movie) setSelectedMovie(hit.movie);
  }
}
