import { useNavigate } from "react-router-dom";

import { nativePostId, postRouteParts, type SavedPost } from "../../api";
import { RecipeLibrary } from "../../components/food/RecipeLibrary";
import { PageHeading } from "../components/Shell";
import { useLabTheme } from "../theme";

export function FoodPage({
  posts,
  onPostUpdated,
}: {
  posts: SavedPost[];
  onPostUpdated: (post: SavedPost) => void;
}) {
  const navigate = useNavigate();
  const { basePath } = useLabTheme();

  return (
    <div className="food-library">
      <PageHeading
        kicker="Recipes from your saves"
        title="Food worth making"
        lede="Find a dish, check the ingredients, and cook from the post that inspired you."
        action={{ label: "Add inspiration", onClick: () => navigate(`${basePath}/add`) }}
      />
      <RecipeLibrary
        posts={posts}
        onPostUpdated={onPostUpdated}
        onSelectPost={(post) => {
          const { platform, nativeId } = postRouteParts(post.platform, nativePostId(post));
          navigate(`/posts/${platform}/${nativeId}`);
        }}
      />
    </div>
  );
}
