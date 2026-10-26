export interface FeatureDefinition {
  id: string;
  name: string;
  sentence: string;
  bullets: string[];
  tint?: string;
  ink?: string;
  iconPath?: string;
}

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
