import { useNavigate } from "react-router-dom";

import { nativePostId, postRouteParts, type SavedPost } from "../../api";
import { MovieLibrary } from "../../components/movies/MovieLibrary";
import { PageHeading } from "../components/Shell";
import { useLabTheme } from "../theme";

export function MoviesPage({ posts }: { posts: SavedPost[] }) {
  const navigate = useNavigate();
  const { basePath } = useLabTheme();

  return (
    <div className="movie-library">
      <PageHeading
        kicker="Your watchlist"
        title="Movies"
        lede="A cinematic page foregrounds title, year, genre, and filming destinations."
        action={{ label: "Add links", onClick: () => navigate(`${basePath}/add`) }}
      />
      <MovieLibrary
        posts={posts}
        onSelectPost={(post) => {
          const { platform, nativeId } = postRouteParts(post.platform, nativePostId(post));
          navigate(`/posts/${platform}/${nativeId}`);
        }}
      />
    </div>
  );
}
