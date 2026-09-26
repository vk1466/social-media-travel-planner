export type CategoryNavKey = "home" | "posts" | "travel" | "food" | "movies" | "history";

export const CATEGORY_NAV_ITEMS: {
  key: CategoryNavKey;
  label: string;
  hint: string;
}[] = [
  { key: "home", label: "Home", hint: "Overview" },
  { key: "posts", label: "Posts", hint: "All saves" },
  { key: "travel", label: "Places", hint: "From your saves" },
  { key: "food", label: "Food", hint: "Recipes from saves" },
  { key: "movies", label: "Watch", hint: "Films and series" },
  { key: "history", label: "Visits", hint: "Places you’ve been" },
];
