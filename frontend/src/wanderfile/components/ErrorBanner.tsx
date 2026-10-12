import React from "react";

interface ErrorBannerProps {
  message: string;
  subtext?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  style?: React.CSSProperties;
}

export function ErrorBanner({
  message,
  subtext,
  onRetry,
  onDismiss,
  style,
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        flexWrap: "wrap",
        padding: "16px 20px",
        background: "#FFFFFF",
        border: "1px solid #E6E3DC",
        borderRadius: "20px",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "12px",
          background: "#FBE6EE",
          color: "#8A2B57",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16.5v.01" />
        </svg>
      </span>

      <div style={{ flex: "1", minWidth: "220px" }}>
        <div style={{ fontWeight: 700, fontSize: "15px", color: "#1B1D1F" }}>
          {message}
        </div>
        {subtext && (
          <div style={{ fontSize: "13px", color: "#6B6F73", marginTop: "2px" }}>
            {subtext}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{
              height: "38px",
              padding: "0 18px",
              borderRadius: "999px",
              border: "1px solid #D9D5CB",
              background: "#FFFFFF",
              fontFamily: "inherit",
              fontSize: "14px",
              fontWeight: 700,
              color: "#1B1D1F",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            style={{
              height: "38px",
              padding: "0 14px",
              borderRadius: "999px",
              border: 0,
              background: "transparent",
              fontFamily: "inherit",
              fontSize: "13px",
              fontWeight: 600,
              color: "#6B6F73",
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
