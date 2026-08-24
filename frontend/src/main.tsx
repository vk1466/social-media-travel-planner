import { StrictMode, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider, Show, useAuth } from "@clerk/react";

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
import { clerkPublishableKey, useLocalDevAuth } from "./authMode";
import { wanderfileClerkAppearance } from "./clerkAppearance";
import { SignedOutGate } from "./components/SignedOutGate";
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
import "./signed-out-gate.css";
import "./post-card.css";
import "./post-flip-modal.css";
import "./post-card-layouts.css";
import "./place-browse.css";
import "./detail-modal.css";
import "./visit-form.css";
import "./admin-tools.css";
import "./category-chip.css";
import "./site-chrome.css";

// Seed shipped themes, then apply stored/default brand before first paint.
seedBrandThemes();
applyBrandLab(readBrandLabState());

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

function MissingClerkKey() {
  return (
    <div className="signed-out-gate">
      <main className="signed-out-copy">
        <div className="signed-out-brand">
          <span className="signed-out-mark" aria-hidden="true">
            W
          </span>
          Wanderfile
        </div>
        <h1 className="signed-out-title">Clerk is not configured.</h1>
        <p className="signed-out-sub">
          Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> for this build, then redeploy.
        </p>
      </main>
    </div>
  );
}

function Root() {
  if (useLocalDevAuth) {
    return (
      <DevAuthBridge>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </DevAuthBridge>
    );
  }

  if (!clerkPublishableKey) {
    return <MissingClerkKey />;
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
