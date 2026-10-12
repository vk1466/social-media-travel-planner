import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FeatureFlags } from "./featureRegistry";

interface SoonBadgeProps {
  style?: React.CSSProperties;
  className?: string;
}

export function SoonBadge({ style, className }: SoonBadgeProps) {
  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        fontSize: "11px",
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: "2px 8px",
        borderRadius: "999px",
        background: "#ECECEA",
        color: "#6B6F73",
        lineHeight: "1.4",
        ...style,
      }}
    >
      Soon
    </span>
  );
}

interface ComingSoonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  featureId: string;
  showBadge?: boolean;
  children: React.ReactNode;
}

export function ComingSoonButton({
  featureId,
  showBadge = true,
  onClick,
  children,
  style,
  ...props
}: ComingSoonButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const enabled = FeatureFlags.isEnabled(featureId);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!enabled) {
      e.preventDefault();
      navigate(`/coming-soon/${featureId}`, { state: { from: location.pathname } });
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      {...props}
      onClick={handleClick}
      style={{
        ...style,
      }}
    >
      {children}
      {!enabled && showBadge && <SoonBadge style={{ marginLeft: "6px" }} />}
    </button>
  );
}
