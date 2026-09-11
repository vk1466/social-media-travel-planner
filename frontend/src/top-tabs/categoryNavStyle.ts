export type CategoryNavKey = "posts" | "travel" | "food" | "movies" | "history";

export const CATEGORY_NAV_ITEMS: {
  key: CategoryNavKey;
  label: string;
  hint: string;
}[] = [
  { key: "posts", label: "Posts", hint: "All saves" },
  { key: "travel", label: "Travel", hint: "Places to go" },
  { key: "food", label: "Food", hint: "Recipes from saves" },
  { key: "movies", label: "Watch", hint: "Films and series" },
  { key: "history", label: "History", hint: "Places you’ve been" },
];
