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
        kicker="Titles from your saves"
        title="Titles worth watching"
        lede="Keep films, series, and documentaries together, with streaming details and filming places when available."
        action={{ label: "Add inspiration", onClick: () => navigate(`${basePath}/add`) }}
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
