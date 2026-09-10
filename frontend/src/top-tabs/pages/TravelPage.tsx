import { useNavigate } from "react-router-dom";

import { postRouteParts, type Place, type SavedPost } from "../../api";
import { LibraryShell } from "../../components/LibraryShell";
import { useLabTheme } from "../theme";

export function TravelPage({
  authReady,
  posts,
  places,
  loadingPosts,
  onDeleted,
}: {
  authReady: boolean;
  posts: SavedPost[];
  places: Place[];
  loadingPosts: boolean;
  onDeleted: () => void;
}) {
  const navigate = useNavigate();
  const { basePath } = useLabTheme();
  const travelPath = `${basePath}/travel`;

  return (
    <LibraryShell
      mode="places"
      authReady={authReady}
      posts={posts}
      places={places}
      loadingPosts={loadingPosts}
      onDeleted={onDeleted}
      placeBasePath={travelPath}
      placeListPath={travelPath}
      onNavigateToPlace={(placeId) => navigate(`${travelPath}/${placeId}`)}
      onNavigateToPost={(platform, postId) => {
        const { platform: routePlatform, nativeId } = postRouteParts(platform, postId);
        navigate(`/posts/${routePlatform}/${nativeId}`);
      }}
    />
  );
}
