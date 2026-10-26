import { useNavigate } from "react-router-dom";
import { Compass, Home, ArrowLeft } from "lucide-react";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <main
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "80px 16px",
        width: "100%",
        boxSizing: "border-box",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "72px",
          height: "72px",
          borderRadius: "50%",
          background: "var(--wf-surface-2)",
          color: "var(--wf-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
        }}
      >
        <Compass size={36} strokeWidth={1.75} />
      </div>

      <h1 className="wf-type-display" style={{ margin: "0 0 12px" }}>
        Page not found
      </h1>
      <p style={{ margin: "0 0 32px", fontSize: "16px", color: "var(--wf-text-muted)" }}>
        We couldn't find the spot you were looking for. It may have moved or been unpinned.
      </p>

      <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            height: "44px",
            padding: "0 20px",
            borderRadius: "var(--wf-radius-control)",
            background: "var(--wf-primary)",
            color: "var(--wf-on-primary)",
            border: "none",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Home size={16} strokeWidth={2} />
          <span>Back to Home</span>
        </button>

        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            height: "44px",
            padding: "0 20px",
            borderRadius: "var(--wf-radius-control)",
            background: "var(--wf-surface)",
            color: "var(--wf-text)",
            border: "1px solid var(--wf-border)",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <ArrowLeft size={16} strokeWidth={2} />
          <span>Go back</span>
        </button>
      </div>
    </main>
  );
}
