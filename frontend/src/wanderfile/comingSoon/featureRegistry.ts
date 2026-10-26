export interface FeatureDefinition {
  id: string;
  name: string;
  sentence: string;
  bullets: string[];
  tint?: string;
  ink?: string;
  iconPath?: string;
}

export const FEATURE_REGISTRY: Record<string, FeatureDefinition> = {
  trips: {
    id: "trips",
    name: "Trips",
    sentence: "Turn saved places into a plan. This is the shared page every unfinished feature opens, with its own name and sentence.",
    bullets: [
      "Save any place to a trip from its page or the map",
      "See every stop on one map, in order",
      "Share the plan with a friend",
    ],
    tint: "#E3F0F4",
    ink: "#1B5E78",
    iconPath: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z M9 4v14 M15 6v14",
  },
  "grocery-list": {
    id: "grocery-list",
    name: "Grocery lists",
    sentence: "Turn ingredients from saved recipes into a clean checklist organized by grocery aisle.",
    bullets: [
      "Group items automatically by supermarket aisle",
      "Check off items as you shop",
      "Scale amounts with your recipe servings",
    ],
    tint: "#FBEBDD",
    ink: "#9A4513",
    iconPath: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",
  },
  "cook-mode": {
    id: "cook-mode",
    name: "Cook mode",
    sentence: "Step-by-step hands-free cooking view with big text and built-in timers.",
    bullets: [
      "Full-screen step progression",
      "Active step timers with sound alerts",
      "Screen stays awake while you cook",
    ],
    tint: "#FBEBDD",
    ink: "#9A4513",
    iconPath: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.5h-2v-2h2zm0-4.5h-2V7h2z",
  },
  "suggested-collections": {
    id: "suggested-collections",
    name: "Suggested collections",
    sentence: "Smart suggestions grouping your saves into collections when enough similar saves are found.",
    bullets: [
      "Detects common themes like weekend getaways or pasta nights",
      "One-click collection creation",
      "Configurable threshold to keep suggestions focused",
    ],
    tint: "#E4F2E7",
    ink: "#25623A",
    iconPath: "M12 5v14M5 12h14",
  },
  "new-kits": {
    id: "new-kits",
    name: "New kits (workouts, skincare, product)",
    sentence: "Specialized kits for routines, workout plans, and skincare regimens.",
    bullets: [
      "Custom fields tailored to each new topic",
      "Structured step and ingredient breakdown",
      "Dedicated collection templates",
    ],
    tint: "#E4F2E7",
    ink: "#25623A",
    iconPath: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  },
  "mobile-share": {
    id: "mobile-share",
    name: "Share a post to Wanderfile",
    sentence: "Share a post straight from Instagram on your phone.",
    bullets: [
      "Native iOS and Android share extension",
      "Instant background saving without switching apps",
      "Push notification when filed",
    ],
    tint: "#ECECEA",
    ink: "#4A4E52",
    iconPath: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8 M16 6l-4-4-4 4 M12 2v13",
  },
  "account-settings": {
    id: "account-settings",
    name: "Account settings",
    sentence: "Manage your profile, connected sources, and replay the onboarding tour anytime.",
    bullets: [
      "Personalize preferred categories",
      "Replay the first-time tour",
      "Manage authentication and data exports",
    ],
    tint: "#ECECEA",
    ink: "#4A4E52",
    iconPath: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  },
  "collection-export": {
    id: "collection-export",
    name: "Export and sharing",
    sentence: "Share your collections with friends or export your library.",
    bullets: [
      "Collaborative collections with family and friends",
      "Export to CSV or JSON",
      "Public read-only shareable links",
    ],
    tint: "#ECE8F7",
    ink: "#4B3C8C",
    iconPath: "M18 8a3 3 0 1 0-2.83-4H8.83a3 3 0 1 0 0 4h6.34A3 3 0 0 0 18 8z M6 15a3 3 0 1 0 2.83 4h6.34a3 3 0 1 0 0-4H8.83A3 3 0 0 0 6 15z",
  },
};

// Default feature flags as specified in SPEC.md
const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {
  trips: false,
  "grocery-list": false,
  "cook-mode": false,
  "watch-providers": true,
  directions: true,
  "visit-tracking": true,
  "make-collection": true,
  "suggested-collections": false,
  "new-kits": false,
  "mobile-share": false,
  "account-settings": false,
  "collection-export": false,
};

export class FeatureFlags {
  private static flags: Record<string, boolean> = { ...DEFAULT_FEATURE_FLAGS };

  public static isEnabled(featureId: string): boolean {
    if (featureId in this.flags) {
      return this.flags[featureId];
    }
    return false;
  }

  public static set(featureId: string, enabled: boolean): void {
    this.flags[featureId] = enabled;
  }

  public static getAll(): Record<string, boolean> {
    return { ...this.flags };
  }
}
