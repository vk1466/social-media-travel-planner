import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, RotateCcw, Trash2, ArrowLeft } from "lucide-react";
import { useSavePipeline } from "../state/SavePipelineContext";
import { useToast } from "../state/ToastContext";
import { EmptyState } from "../components/EmptyState";

export function NeedsAttentionPage() {
  const navigate = useNavigate();
  const { inboxFailures, retryFailedLink, removeFailedLink, retryAllFailed, dismissAllFailed } = useSavePipeline();
  const { showToast } = useToast();
  const [retryingAll, setRetryingAll] = useState(false);

  const handleRetryAll = async () => {
    setRetryingAll(true);
    try {
      await retryAllFailed();
      showToast("Retrying all links");
    } finally {
      setRetryingAll(false);
    }
  };

  return (
    <main
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "32px 16px 80px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "transparent",
            border: "none",
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--wf-text-muted)",
            cursor: "pointer",
            minHeight: "44px",
          }}
        >
          <ArrowLeft size={18} strokeWidth={2} />
          <span>Back</span>
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "12px", marginBottom: "8px" }}>
        <h1 className="wf-type-display" style={{ margin: 0 }}>
          Needs Attention
        </h1>
        {inboxFailures.length > 0 && (
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: "var(--wf-radius-pill)",
              background: "var(--wf-alert-tint)",
              color: "var(--wf-danger)",
            }}
          >
            {inboxFailures.length} issue{inboxFailures.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <p style={{ margin: "0 0 28px", fontSize: "15px", color: "var(--wf-text-muted)" }}>
        Links that could not be saved or categorized automatically. You can retry or dismiss them.
      </p>

      {inboxFailures.length === 0 ? (
        <EmptyState
          screenLabel="Needs attention"
          headline="All clear"
          description="None of your saved links need attention right now."
          primaryActionLabel="Back to Library"
          onPrimaryAction={() => navigate("/library")}
          iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          tint="var(--wf-surface-2)"
          ink="var(--wf-text)"
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Top Actions */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleRetryAll}
              disabled={retryingAll}
              style={{
                height: "40px",
                padding: "0 16px",
                borderRadius: "var(--wf-radius-control)",
                border: "1px solid var(--wf-border)",
                background: "var(--wf-surface)",
                color: "var(--wf-text)",
                fontSize: "14px",
                fontWeight: 600,
                cursor: retryingAll ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <RotateCcw size={15} strokeWidth={2} />
              <span>{retryingAll ? "Retrying…" : "Retry all"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                dismissAllFailed();
                showToast("Cleared all failed links");
              }}
              style={{
                height: "40px",
                padding: "0 16px",
                borderRadius: "var(--wf-radius-control)",
                border: "none",
                background: "var(--wf-surface-2)",
                color: "var(--wf-text-muted)",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Dismiss all
            </button>
          </div>

          {/* List of failed items */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {inboxFailures.map((item) => (
              <div
                key={item.url}
                style={{
                  background: "var(--wf-surface)",
                  border: "1px solid var(--wf-border)",
                  borderRadius: "var(--wf-radius-card)",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  flexWrap: "wrap",
                  boxShadow: "var(--wf-shadow-card)",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: 1, minWidth: "220px" }}>
                  <AlertCircle size={20} strokeWidth={2} color="var(--wf-danger)" style={{ marginTop: "2px", flexShrink: 0 }} />
                  <div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "var(--wf-text)",
                        wordBreak: "break-all",
                        marginBottom: "4px",
                      }}
                    >
                      {item.url}
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--wf-danger)", fontWeight: 500 }}>
                      {item.errorMessage || "Could not read link"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={async () => {
                      await retryFailedLink(item.url);
                      showToast("Retrying link");
                    }}
                    style={{
                      height: "38px",
                      padding: "0 14px",
                      borderRadius: "var(--wf-radius-control)",
                      border: "1px solid var(--wf-border)",
                      background: "var(--wf-surface-2)",
                      color: "var(--wf-text)",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <RotateCcw size={14} strokeWidth={2} />
                    <span>Retry</span>
                  </button>

                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() => {
                      removeFailedLink(item.url);
                      showToast("Link dismissed");
                    }}
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "var(--wf-radius-control)",
                      border: "none",
                      background: "var(--wf-surface-2)",
                      color: "var(--wf-danger)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Trash2 size={16} strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
