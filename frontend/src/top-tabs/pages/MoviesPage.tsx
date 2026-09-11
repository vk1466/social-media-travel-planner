import { useNavigate } from "react-router-dom";

import { nativePostId, postRouteParts, type SavedPost } from "../../api";
import { MovieLibrary } from "../../components/movies/MovieLibrary";
import { postsForPlatforms, useLibraryPlatform } from "../../libraryPlatform";
import { PageHeading } from "../../components/PageHeading";
import { aggregateMovies } from "../movies";

export function MoviesPage({ posts }: { posts: SavedPost[] }) {
  const navigate = useNavigate();
  const { platforms } = useLibraryPlatform();
  const scopedPosts = postsForPlatforms(posts, platforms);

  return (
    <div className="movie-library">
      <PageHeading
        kicker="Titles from your saves"
        title="What to watch next"
        lede="Keep films, series, and documentaries together, with streaming details and filming places when available."
        count={{ value: aggregateMovies(scopedPosts).length, label: "titles" }}
      />
      <MovieLibrary
        posts={scopedPosts}
        onSelectPost={(post) => {
          const { platform, nativeId } = postRouteParts(post.platform, nativePostId(post));
          navigate(`/posts/${platform}/${nativeId}`);
        }}
      />
    </div>
  );
}
