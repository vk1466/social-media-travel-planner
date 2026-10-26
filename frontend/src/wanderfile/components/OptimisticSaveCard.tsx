import { Sparkles, AlertCircle, RotateCcw, Trash2 } from "lucide-react";
import type { InFlightSave } from "../state/SavePipelineContext";

interface OptimisticSaveCardProps {
  save: InFlightSave;
  onRetry?: () => void;
  onRemove?: () => void;
}

export function OptimisticSaveCard({ save, onRetry, onRemove }: OptimisticSaveCardProps) {
  const isError = save.status === "error";

  return (
    <div
      style={{
        borderRadius: "var(--wf-radius-card)",
        background: isError ? "var(--wf-alert-tint)" : "var(--wf-surface)",
        border: isError ? "1px solid var(--wf-danger)" : "1px solid var(--wf-border)",
        boxShadow: "var(--wf-shadow-card)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      {/* Thumbnail area / Skeleton */}
      <div
        style={{
          width: "100%",
          aspectRatio: "4 / 5",
          background: "var(--wf-surface-2)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isError ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", color: "var(--wf-danger)" }}>
            <AlertCircle size={32} strokeWidth={1.75} />
            <span style={{ fontSize: "13px", fontWeight: 600 }}>Save failed</span>
          </div>
        ) : (
          <div
            className="wf-skeleton"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Sparkles size={28} strokeWidth={1.75} color="var(--wf-primary)" style={{ animation: "spin 3s linear infinite" }} />
            <span style={{ fontSize: "12px", color: "var(--wf-text-muted)", fontWeight: 600 }}>
              {save.stepMessage || "Extracting…"}
            </span>
          </div>
        )}

        {/* Top-left pill */}
        <div
          style={{
            position: "absolute",
            left: "10px",
            top: "10px",
            fontSize: "12px",
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: "var(--wf-radius-pill)",
            background: isError ? "rgba(180, 35, 24, 0.9)" : "rgba(15, 118, 110, 0.9)",
            color: "#FFFFFF",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            zIndex: 2,
          }}
        >
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#FFFFFF" }} />
          {isError ? "Error" : "Extracting…"}
        </div>
      </div>

      {/* Info area */}
      <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
        <div
          style={{
            fontSize: "14px",
            fontWeight: 600,
            lineHeight: "18px",
            color: isError ? "var(--wf-danger)" : "var(--wf-text)",
            wordBreak: "break-word",
          }}
        >
          {isError
            ? save.errorMessage || "Could not read this reel"
            : save.title || "Instagram reel"}
        </div>

        {isError && (
          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                style={{
                  flex: 1,
                  height: "36px",
                  borderRadius: "var(--wf-radius-control)",
                  border: "1px solid var(--wf-border)",
                  background: "var(--wf-surface)",
                  color: "var(--wf-text)",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={14} strokeWidth={2} />
                <span>Retry</span>
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                aria-label="Remove"
                onClick={onRemove}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "var(--wf-radius-control)",
                  border: "1px solid var(--wf-border)",
                  background: "var(--wf-surface)",
                  color: "var(--wf-danger)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Trash2 size={15} strokeWidth={2} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
