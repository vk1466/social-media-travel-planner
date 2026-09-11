import { useNavigate } from "react-router-dom";

import { nativePostId, postRouteParts, type SavedPost } from "../../api";
import { RecipeLibrary } from "../../components/food/RecipeLibrary";
import { postsForPlatforms, useLibraryPlatform } from "../../libraryPlatform";
import { PageHeading } from "../../components/PageHeading";

export function FoodPage({
  posts,
  onPostUpdated,
}: {
  posts: SavedPost[];
  onPostUpdated: (post: SavedPost) => void;
}) {
  const navigate = useNavigate();
  const { platforms } = useLibraryPlatform();
  const scopedPosts = postsForPlatforms(posts, platforms);

  return (
    <div className="food-library">
      <PageHeading
        kicker="Recipes from your saves"
        title="Food worth making"
        lede="Find a dish, check the ingredients, and cook from the post that inspired you."
        count={{ value: scopedPosts.length, label: "recipes" }}
      />
      <RecipeLibrary
        posts={scopedPosts}
        onPostUpdated={onPostUpdated}
        onSelectPost={(post) => {
          const { platform, nativeId } = postRouteParts(post.platform, nativePostId(post));
          navigate(`/posts/${platform}/${nativeId}`);
        }}
      />
    </div>
  );
}
