export const clerkPublishableKey = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? "").trim();
export const clerkEnabled = Boolean(clerkPublishableKey);
export const useLocalDevAuth = import.meta.env.DEV && !clerkEnabled;
