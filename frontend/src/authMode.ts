/** Clerk publishable key baked in at Vite build time. */
export const clerkPublishableKey = (
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? ""
).trim();

export const clerkEnabled = Boolean(clerkPublishableKey);

/**
 * Fake "Local user" bypass for `vite` without a Clerk key.
 * Production and preview builds always require Clerk — never this path.
 */
export const useLocalDevAuth = import.meta.env.DEV && !clerkEnabled;
