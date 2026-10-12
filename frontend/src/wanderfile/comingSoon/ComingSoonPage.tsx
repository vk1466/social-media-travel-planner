import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import { FEATURE_REGISTRY } from "./featureRegistry";

export function ComingSoonPage() {
  const { feature } = useParams<{ feature: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const featureId = feature || "trips";
  const feat = FEATURE_REGISTRY[featureId] || {
    id: featureId,
    name: featureId.charAt(0).toUpperCase() + featureId.slice(1).replace(/-/g, " "),
    sentence: "This feature is coming soon to Wanderfile. We're actively building it.",
    bullets: [
      "Seamless integration with your saved library",
      "Fast, privacy-conscious workflow",
      "Designed to match all your devices",
    ],
    tint: "#E3F0F4",
    ink: "#1B5E78",
    iconPath: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z M12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  };

  const storageKey = `wf_interest_${featureId}`;
  const [notified, setNotified] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Record page open event as specified in SPEC.md
    window.dispatchEvent(
      new CustomEvent("coming_soon_viewed", { detail: { featureId } })
    );
  }, [featureId]);

  const handleNotify = () => {
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      // ignore storage errors
    }
    setNotified(true);
  };

  const backUrl = (location.state as { from?: string } | null)?.from;

  return (
    <main
      style={{
        maxWidth: "640px",
        margin: "0 auto",
        padding: "80px 24px",
        textAlign: "center",
        fontFamily: "'Figtree', system-ui, sans-serif",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: "72px",
          height: "72px",
          borderRadius: "24px",
          background: feat.tint || "#E3F0F4",
          color: feat.ink || "#1B5E78",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {feat.iconPath ? (
            <path d={feat.iconPath} />
          ) : (
            <>
              <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </>
          )}
        </svg>
      </span>

      <div
        style={{
          marginTop: "20px",
          display: "inline-block",
          fontSize: "11px",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          padding: "4px 10px",
          borderRadius: "999px",
          background: "#ECECEA",
          color: "#6B6F73",
        }}
      >
        Soon
      </div>

      <h1
        style={{
          margin: "14px 0 0",
          fontSize: "44px",
          lineHeight: 1.05,
          letterSpacing: "-0.035em",
          fontWeight: 800,
          color: "#1B1D1F",
        }}
      >
        {feat.name} {feat.name.toLowerCase().endsWith("coming soon") ? "" : "is coming soon"}
      </h1>

      <p
        style={{
          margin: "14px 0 0",
          fontSize: "18px",
          lineHeight: 1.55,
          color: "#4A4E52",
        }}
      >
        {feat.sentence}
      </p>

      {feat.bullets && feat.bullets.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            margin: "28px auto 0",
            padding: 0,
            maxWidth: "440px",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {feat.bullets.map((bullet, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
                fontSize: "15px",
                lineHeight: 1.45,
                color: "#1B1D1F",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  flex: "none",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#1B1D1F",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m5 12 5 5 9-10" />
                </svg>
              </span>
              {bullet}
            </li>
          ))}
        </ul>
      )}

      <div
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "center",
          marginTop: "32px",
          flexWrap: "wrap",
        }}
      >
        {!notified ? (
          <button
            type="button"
            onClick={handleNotify}
            style={{
              height: "52px",
              padding: "0 28px",
              borderRadius: "999px",
              border: 0,
              background: "#1B1D1F",
              fontFamily: "inherit",
              fontSize: "16px",
              fontWeight: 700,
              color: "#FFFFFF",
              cursor: "pointer",
            }}
          >
            Tell me when it's ready
          </button>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: "52px",
              padding: "0 28px",
              borderRadius: "999px",
              background: "#E4F2E7",
              fontSize: "16px",
              fontWeight: 700,
              color: "#25623A",
            }}
          >
            We'll let you know
          </div>
        )}

        {backUrl ? (
          <Link
            to={backUrl}
            style={{
              display: "flex",
              alignItems: "center",
              height: "52px",
              padding: "0 28px",
              borderRadius: "999px",
              border: "1px solid #D9D5CB",
              background: "#FFFFFF",
              fontSize: "16px",
              fontWeight: 700,
              color: "#1B1D1F",
              textDecoration: "none",
            }}
          >
            Go back
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              display: "flex",
              alignItems: "center",
              height: "52px",
              padding: "0 28px",
              borderRadius: "999px",
              border: "1px solid #D9D5CB",
              background: "#FFFFFF",
              fontSize: "16px",
              fontWeight: 700,
              color: "#1B1D1F",
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            Go back
          </button>
        )}
      </div>
    </main>
  );
}
