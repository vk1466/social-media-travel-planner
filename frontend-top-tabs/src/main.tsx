import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider, useAuth } from "@clerk/react";

import App from "./App";
import { setAuthTokenGetter } from "./api";
import { clerkPublishableKey, useLocalDevAuth } from "./auth";
import "./styles.css";

function AuthTokenBridge({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) {
    setAuthTokenGetter(async () => getToken({ skipCache: false }));
  } else if (isLoaded) {
    setAuthTokenGetter(null);
  }

  useEffect(() => {
    if (!isLoaded) return;
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
    return (
      <div className="signed-out">
        <h1>Clerk is not configured.</h1>
        <p>
          Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in <code>.env.local</code>.
        </p>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl="/">
      <AuthTokenBridge>
        <BrowserRouter>
          <App />
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
