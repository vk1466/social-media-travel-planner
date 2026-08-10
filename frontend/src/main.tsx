import { StrictMode, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  useAuth,
} from "@clerk/react";

import "@fontsource-variable/dm-sans";
import "@fontsource-variable/fraunces";
import "@fontsource/instrument-serif/400.css";
import "@fontsource-variable/source-sans-3";
import "@fontsource-variable/literata";
import "@fontsource-variable/newsreader";
import "open-props/normalize.min.css";
import "open-props/style";

import App from "./App";
import { setAuthTokenGetter } from "./api";
import { wanderfileClerkAppearance } from "./clerkAppearance";
import { useBrandVersion } from "./hooks/useBrandVersion";
import {
  applyBrandLab,
  readBrandLabState,
  readBrandMode,
  seedBrandThemes,
} from "./themeColor";
import "./wf-tokens.css";
import "./tw.css";
import "./styles.css";
import "./post-card.css";
import "./post-flip-modal.css";
import "./place-browse.css";
import "./detail-modal.css";
import "./visit-form.css";
import "./admin-tools.css";
import "./category-chip.css";
import "./site-chrome.css";

// Seed shipped themes, then apply stored/default brand before first paint.
seedBrandThemes();
applyBrandLab(readBrandLabState());

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

function AuthTokenBridge({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  // Register during render (not only in an effect) so child mounts that fire
  // API calls in the same tick already have a bearer token.
  if (isLoaded && isSignedIn) {
    setAuthTokenGetter(async () => getToken());
  } else if (isLoaded) {
    setAuthTokenGetter(null);
  }

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    if (!isSignedIn) {
      setAuthTokenGetter(null);
      return;
    }
    setAuthTokenGetter(async () => getToken());
  }, [getToken, isLoaded, isSignedIn]);

  return <>{children}</>;
}

function DevAuthBridge({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    setAuthTokenGetter(async () => "dev:local-dev-user");
  }, []);
  return <>{children}</>;
}

function SignedOutGate() {
  const tone = readBrandMode();
  return (
    <div className="wf-site app-page" data-tone={tone}>
      <main className="app-shell" style={{ maxWidth: 480, margin: "4rem auto", textAlign: "center" }}>
        <h1 className="hero-title">Wanderfile</h1>
        <p className="hero-subtitle">Sign in to save posts, places, and trips to your library.</p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <SignInButton mode="modal">
            <button type="button" className="primary-button">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button type="button" className="secondary-button">
              Sign up
            </button>
          </SignUpButton>
        </div>
      </main>
    </div>
  );
}

function ThemedClerkProvider({ children }: { children: React.ReactNode }) {
  const brandVersion = useBrandVersion();
  const appearance = useMemo(
    () => wanderfileClerkAppearance(readBrandMode()),
    [brandVersion],
  );

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey!}
      afterSignOutUrl="/"
      appearance={appearance}
    >
      {children}
    </ClerkProvider>
  );
}

function Root() {
  if (!clerkPublishableKey) {
    return (
      <DevAuthBridge>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </DevAuthBridge>
    );
  }

  return (
    <ThemedClerkProvider>
      <AuthTokenBridge>
        <BrowserRouter>
          <Show when="signed-out">
            <SignedOutGate />
          </Show>
          <Show when="signed-in">
            <App />
          </Show>
        </BrowserRouter>
      </AuthTokenBridge>
    </ThemedClerkProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
