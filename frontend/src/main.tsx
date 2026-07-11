import { StrictMode, useEffect } from "react";
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
import "@fontsource/instrument-serif/400.css";
import "open-props/normalize.min.css";
import "open-props/style";

import App from "./App";
import { setAuthTokenGetter } from "./api";
import "./styles.css";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

function AuthTokenBridge({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

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
  return (
    <div className="app-page">
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
    <ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl="/">
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
    </ClerkProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
