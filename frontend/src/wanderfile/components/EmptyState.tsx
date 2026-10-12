import React from "react";

export interface EmptyStateProps {
  screenLabel?: string;
  headline: string;
  description: string;
  icon?: React.ReactNode;
  iconPath?: string;
  tint?: string;
  ink?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  style?: React.CSSProperties;
}

export function EmptyState({
  screenLabel,
  headline,
  description,
  icon,
  iconPath,
  tint = "#ECECEA",
  ink = "#4A4E52",
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  style,
}: EmptyStateProps) {
  return (
    <section
      style={{
        background: "#FFFFFF",
        border: "1px solid #E6E3DC",
        borderRadius: "24px",
        padding: "36px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "12px",
        minHeight: "280px",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {screenLabel && (
        <div
          style={{
            alignSelf: "stretch",
            textAlign: "left",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#8A8E92",
          }}
        >
          {screenLabel}
        </div>
      )}

      <span
        aria-hidden="true"
        style={{
          marginTop: screenLabel ? "4px" : "12px",
          width: "64px",
          height: "64px",
          borderRadius: "20px",
          background: tint,
          color: ink,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon ? (
          icon
        ) : (
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {iconPath ? (
              <path d={iconPath} />
            ) : (
              <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
            )}
          </svg>
        )}
      </span>

      <h2
        style={{
          margin: "4px 0 0",
          fontSize: "20px",
          letterSpacing: "-0.02em",
          fontWeight: 800,
          color: "#1B1D1F",
        }}
      >
        {headline}
      </h2>

      <p
        style={{
          margin: 0,
          fontSize: "14px",
          lineHeight: 1.5,
          color: "#6B6F73",
          maxWidth: "320px",
        }}
      >
        {description}
      </p>

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginTop: "auto",
          paddingTop: "12px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {primaryActionLabel && onPrimaryAction && (
          <button
            type="button"
            onClick={onPrimaryAction}
            style={{
              height: "44px",
              padding: "0 22px",
              borderRadius: "999px",
              border: 0,
              background: "#1B1D1F",
              fontFamily: "inherit",
              fontSize: "14px",
              fontWeight: 700,
              color: "#FFFFFF",
              cursor: "pointer",
            }}
          >
            {primaryActionLabel}
          </button>
        )}

        {secondaryActionLabel && onSecondaryAction && (
          <button
            type="button"
            onClick={onSecondaryAction}
            style={{
              height: "44px",
              padding: "0 22px",
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
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </section>
  );
}
