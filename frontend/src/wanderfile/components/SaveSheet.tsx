import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useSavePipeline } from "../state/SavePipelineContext";
import { useToast } from "../state/ToastContext";
import { fetchLinkPreview, type LinkPreview } from "../../api";
import { proxiedMediaUrl } from "../../postDisplayUtils";

export function validateSaveInput(input: string): {
  isValid: boolean;
  platform?: "instagram" | "other";
  message?: string;
  isError?: boolean;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { isValid: false };
  }

  const lines = trimmed.split(/[\n\s]+/).filter(Boolean);
  for (const line of lines) {
    const lowered = line.toLowerCase();
    const hasProtocol = lowered.startsWith("http://") || lowered.startsWith("https://");
    const hasDomainDot = lowered.includes(".");

    if (!hasProtocol && !hasDomainDot) {
      return {
        isValid: false,
        isError: true,
        message: "Please enter a valid web link (e.g. https://...)",
      };
    }

    const isInstagram = lowered.includes("instagram.com");
    const isTikTok = lowered.includes("tiktok.com");
    const isYouTube = lowered.includes("youtube.com") || lowered.includes("youtu.be");

    if (isTikTok || isYouTube) {
      return {
        isValid: false,
        isError: true,
        message: "Only Instagram links are supported right now",
      };
    }

    if (!isInstagram) {
      return {
        isValid: false,
        isError: true,
        message: "Only Instagram links are supported right now",
      };
    }
  }

  return { isValid: true, platform: "instagram" };
}

function isInputLikelyComplete(val: string): boolean {
  const trimmed = val.trim();
  if (!trimmed) return false;
  // If user is just typing standard url prefixes like "http", "https", "https://", etc.
  if (/^https?:?\/?\/?(?:www\.?)?$/i.test(trimmed)) {
    return false;
  }
  if (trimmed.includes(" ") || trimmed.includes("\n")) return true;
  if (trimmed.includes(".") && (trimmed.includes("/") || trimmed.length > 15)) return true;
  return trimmed.length > 20;
}

export function SaveSheet() {
  const {
    isSaveSheetOpen,
    closeSaveSheet,
    resetActiveSave,
    saveUrl,
    activeSave,
    changeSavedCategory,
    prefillUrl,
  } = useSavePipeline();
  const { showToast } = useToast();
  const [inputText, setInputText] = useState("");
  const [showValidationError, setShowValidationError] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<LinkPreview | null>(null);
  const [selectedCollection, setSelectedCollection] = useState("unsorted");
  const navigate = useNavigate();

  useEffect(() => {
    if (isSaveSheetOpen && prefillUrl) {
      setInputText(prefillUrl);
      setShowValidationError(false);
    }
  }, [isSaveSheetOpen, prefillUrl]);

  useEffect(() => {
    if (!isSaveSheetOpen) {
      setInputText("");
      setShowValidationError(false);
      setPreviewData(null);
      setPreviewLoading(false);
      setSelectedCollection("unsorted");
      resetActiveSave();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    }
  }, [isSaveSheetOpen, resetActiveSave]);

  useEffect(() => {
    if (!isSaveSheetOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeSaveSheet();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaveSheetOpen, closeSaveSheet]);

  const validation = validateSaveInput(inputText);

  const handleInputChange = (val: string) => {
    setInputText(val);
    const nextVal = validateSaveInput(val);
    if (nextVal.isValid || !val.trim()) {
      setShowValidationError(false);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      return;
    }
    // Don't show red error while actively typing incomplete prefixes
    setShowValidationError(false);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (isInputLikelyComplete(val)) {
      debounceTimerRef.current = setTimeout(() => {
        setShowValidationError(true);
      }, 800);
    }
  };

  const handleInputBlur = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (inputText.trim() && !validation.isValid) {
      setShowValidationError(true);
    }
  };

  const handleInputPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData("text");
    setTimeout(() => {
      const nextVal = validateSaveInput(pasted);
      if (!nextVal.isValid && pasted.trim()) {
        setShowValidationError(true);
      } else {
        setShowValidationError(false);
      }
    }, 0);
  };

  useEffect(() => {
    if (!validation.isValid) {
      setPreviewLoading(false);
      setPreviewData(null);
      return;
    }

    const firstUrl = inputText.trim().split(/[\n\s]+/)[0];
    if (!firstUrl) return;

    let cancelled = false;
    setPreviewLoading(true);

    const timer = setTimeout(async () => {
      try {
        const data = await fetchLinkPreview(firstUrl);
        if (!cancelled) {
          setPreviewData(data);
          setPreviewLoading(false);
        }
      } catch {
        if (!cancelled) {
          setPreviewData({
            url: firstUrl,
            platform: "instagram",
            is_available: true,
            status: "unknown",
            title: "Instagram Reel",
          });
          setPreviewLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inputText, validation.isValid]);

  if (!isSaveSheetOpen) return null;

  const stage = !activeSave
    ? 0
    : activeSave.status === "done"
    ? 2
    : activeSave.status === "error"
    ? 3
    : 1;

  const handleSave = async () => {
    if (!validation.isValid) return;
    const urlToSave = inputText;
    closeSaveSheet();
    showToast("Saved", { label: "View", onClick: () => navigate("/library") }, 4000);
    await saveUrl(urlToSave);
  };

  const handleSaveAnother = () => {
    resetActiveSave();
    setInputText("");
  };

  const categories = [
    { key: "place", label: "Place" },
    { key: "recipe", label: "Recipe" },
    { key: "movie", label: "Watch" },
    { key: "fashion", label: "Fashion" },
    { key: "hairstyle", label: "Hairstyle" },
    { key: "other", label: "Other" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="wf-save-sheet-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeSaveSheet();
      }}
    >
      <div className="wf-save-sheet-modal">
        <button
          type="button"
          aria-label="Close"
          onClick={closeSaveSheet}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            border: "1px solid var(--wf-border)",
            background: "var(--wf-surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--wf-text-muted)",
            zIndex: 5,
          }}
        >
          <X size={20} strokeWidth={1.75} />
        </button>

        {stage === 0 && (
          <div>
            <h2 style={{ margin: "0 0 16px", fontSize: "28px", letterSpacing: "-0.03em", fontWeight: 800 }}>
              Save a link
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: "15px", color: "var(--wf-text-muted)", lineHeight: 1.5 }}>
              Paste an Instagram reel. We'll read and categorize it automatically.
            </p>

            <textarea
              aria-label="Paste link here"
              value={inputText}
              onChange={(e) => handleInputChange(e.target.value)}
              onBlur={handleInputBlur}
              onPaste={handleInputPaste}
              placeholder="Paste an Instagram reel link"
              style={{
                width: "100%",
                height: "100px",
                padding: "16px",
                borderRadius: "18px",
                border: showValidationError && validation.isError ? "1.5px solid var(--accent, #D93829)" : "1px solid var(--wf-border)",
                background: "var(--wf-surface-2)",
                fontFamily: "inherit",
                fontSize: "15px",
                color: "var(--wf-text)",
                resize: "none",
                outline: "none",
                boxSizing: "border-box",
                wordBreak: "break-all",
                overflowWrap: "anywhere",
                whiteSpace: "pre-wrap",
                overflowY: "auto",
              }}
            />

            <div style={{ marginTop: "14px", fontSize: "14px" }}>
              {showValidationError && validation.isError ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--accent, #C53B27)", fontWeight: 600 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {validation.message}
                </div>
              ) : validation.isValid ? (
                <div>
                  {previewLoading && (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--wf-text-muted)", fontWeight: 600 }}>
                      <span
                        aria-hidden="true"
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background: "var(--wf-surface-2)",
                          color: "var(--wf-text-muted)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="9" strokeDasharray="30" strokeDashoffset="10" />
                        </svg>
                      </span>
                      Checking Instagram reel…
                    </div>
                  )}

                  {!previewLoading && previewData && previewData.status === "available" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#1F7A4D", fontWeight: 600 }}>
                      <span
                        aria-hidden="true"
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background: "#E3F4EA",
                          color: "#1F7A4D",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="m5 12.5 4.5 4.5L19 7.5" />
                        </svg>
                      </span>
                      Ready to save Instagram reel
                    </div>
                  )}

                  {!previewLoading && previewData && previewData.status === "unknown" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--wf-text-muted)", fontWeight: 600 }}>
                      <span
                        aria-hidden="true"
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background: "var(--wf-surface-2)",
                          color: "var(--wf-text-muted)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="16" x2="12" y2="12" />
                          <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                      </span>
                      Couldn't verify yet, you can still save
                    </div>
                  )}

                  {/* Preview State: Skeleton loading */}
                  {previewLoading && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "12px 14px",
                        borderRadius: "16px",
                        border: "1px solid var(--wf-border)",
                        background: "var(--wf-surface)",
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: "72px",
                          height: "96px",
                          borderRadius: "12px",
                          background: "var(--wf-surface-2)",
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ height: "14px", width: "40%", background: "var(--wf-surface-2)", borderRadius: "4px" }} />
                        <div style={{ height: "12px", width: "75%", background: "var(--wf-border)", borderRadius: "4px" }} />
                      </div>
                    </div>
                  )}

                  {/* Preview State: Deleted or Private Post Warning */}
                  {!previewLoading && previewData && (previewData.status === "unavailable" || !previewData.is_available) && (() => {
                    const errMsg = previewData.error_message || "";
                    const isPrivateOrRemoved = /private|deleted|removed/i.test(errMsg) || !errMsg;
                    const title = isPrivateOrRemoved ? (errMsg || "Private or deleted post") : errMsg;
                    const subtitle = isPrivateOrRemoved
                      ? "This post cannot be viewed or saved because it is private or has been removed."
                      : "Check the link format and try again.";

                    return (
                      <div
                        style={{
                          marginTop: "12px",
                          padding: "12px 16px",
                          borderRadius: "16px",
                          border: "1.5px solid var(--accent, #F8D7DA)",
                          background: "var(--wf-surface-2)",
                          display: "flex",
                          gap: "12px",
                          alignItems: "center",
                          color: "var(--accent, #C53B27)",
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "14px" }}>
                            {title}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--wf-text-muted)", marginTop: "2px" }}>
                            {subtitle}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Preview State: Available Preview Card */}
                  {!previewLoading && previewData && previewData.is_available && previewData.status !== "unavailable" && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "12px 14px",
                        borderRadius: "16px",
                        border: "1px solid var(--wf-border)",
                        background: "var(--wf-surface)",
                        boxShadow: "var(--wf-shadow-card)",
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: "72px",
                          height: "96px",
                          borderRadius: "12px",
                          overflow: "hidden",
                          background: "var(--wf-surface-2)",
                          border: "1px solid var(--wf-border)",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--wf-text)",
                          position: "relative",
                        }}
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}>
                          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                        </svg>
                        {previewData.thumbnail_url ? (
                          <img
                            src={proxiedMediaUrl(previewData.thumbnail_url) || previewData.thumbnail_url}
                            alt="Preview thumbnail"
                            style={{
                              position: "absolute",
                              inset: 0,
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                            onError={(e) => {
                              // On error, hide image to reveal fallback SVG
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 800,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              color: "#C13584",
                              background: "rgba(193, 53, 132, 0.12)",
                              padding: "2px 8px",
                              borderRadius: "999px",
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}
                          >
                            Reel
                          </span>
                          {previewData.author && (
                            <span
                              style={{
                                fontSize: "13px",
                                fontWeight: 700,
                                color: "var(--wf-text)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                minWidth: 0,
                              }}
                            >
                              @{previewData.author.replace(/^@/, "")}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "14px",
                            color: "var(--wf-text)",
                            fontWeight: 500,
                            lineHeight: 1.35,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {((previewData.title || previewData.caption || "").split("\n")[0].trim()) || "Ready to save"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: "var(--wf-text-muted)" }}>
                  Instagram reels are supported across food, travel, culture, and more
                </div>
              )}
            </div>

            {/* Collection Picker (defaults to Unsorted per spec) */}
            <div style={{ marginTop: "16px" }}>
              <label
                htmlFor="save-collection-select"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--wf-text-muted)",
                  marginBottom: "6px",
                }}
              >
                Collection
              </label>
              <select
                id="save-collection-select"
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                style={{
                  width: "100%",
                  height: "44px",
                  padding: "0 14px",
                  borderRadius: "var(--wf-radius-control)",
                  border: "1px solid var(--wf-border)",
                  background: "var(--wf-surface-2)",
                  color: "var(--wf-text)",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                <option value="unsorted">Unsorted (default)</option>
                <option value="favorites">Favorites</option>
                <option value="trips">Trips</option>
                <option value="places">Places</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={
                !validation.isValid ||
                previewLoading ||
                Boolean(previewData && (previewData.status === "unavailable" || !previewData.is_available))
              }
              style={{
                width: "100%",
                height: "48px",
                marginTop: "20px",
                borderRadius: "var(--wf-radius-control)",
                border: 0,
                background:
                  validation.isValid &&
                  !previewLoading &&
                  (!previewData || (previewData.is_available && previewData.status !== "unavailable"))
                    ? "var(--wf-primary)"
                    : "var(--wf-surface-2)",
                fontFamily: "inherit",
                fontSize: "16px",
                fontWeight: 600,
                color:
                  validation.isValid &&
                  !previewLoading &&
                  (!previewData || (previewData.is_available && previewData.status !== "unavailable"))
                    ? "var(--wf-on-primary)"
                    : "var(--wf-text-muted)",
                cursor:
                  validation.isValid &&
                  !previewLoading &&
                  (!previewData || (previewData.is_available && previewData.status !== "unavailable"))
                    ? "pointer"
                    : "not-allowed",
                transition: "background-color 0.15s ease",
              }}
            >
              {previewData && !previewData.is_available ? "Cannot save private reel" : "Save"}
            </button>
          </div>
        )}

        {stage === 1 && (
          <div>
            <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
              <div
                aria-hidden="true"
                style={{
                  flex: "none",
                  width: "110px",
                  height: "150px",
                  borderRadius: "16px",
                  background: "var(--wf-surface-2)",
                  border: "1px solid var(--wf-border)",
                  overflow: "hidden",
                }}
              >
                {activeSave?.thumbnailUrl ? (
                  <img
                    src={activeSave.thumbnailUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : null}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: "24px", letterSpacing: "-0.03em", fontWeight: 800 }}>
                  {activeSave?.title || "Reading your post"}
                </h2>
                {activeSave?.author && (
                  <div style={{ margin: "4px 0 0", fontSize: "14px", color: "var(--wf-text-muted)", fontWeight: 600 }}>
                    {activeSave.author} · Instagram reel
                  </div>
                )}
                <div
                  style={{
                    height: "8px",
                    borderRadius: "999px",
                    background: "var(--wf-surface-2)",
                    margin: "16px 0 20px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${activeSave?.progressPercent || 30}%`,
                      height: "100%",
                      borderRadius: "999px",
                      background: "var(--wf-text)",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "15px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        background: (activeSave?.progressPercent || 0) >= 25 ? "#E3F4EA" : "var(--wf-surface-2)",
                        color: (activeSave?.progressPercent || 0) >= 25 ? "#1F7A4D" : "var(--wf-text-muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {(activeSave?.progressPercent || 0) >= 25 ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="m5 12.5 4.5 4.5L19 7.5" />
                        </svg>
                      ) : (
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--wf-text-muted)" }} />
                      )}
                    </span>
                    Connecting to link
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        background: (activeSave?.progressPercent || 0) >= 60 ? "#E3F4EA" : "var(--wf-surface-2)",
                        color: (activeSave?.progressPercent || 0) >= 60 ? "#1F7A4D" : "var(--wf-text-muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {(activeSave?.progressPercent || 0) >= 60 ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="m5 12.5 4.5 4.5L19 7.5" />
                        </svg>
                      ) : (
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--wf-text-muted)" }} />
                      )}
                    </span>
                    Reading post content & caption
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", fontWeight: (activeSave?.progressPercent || 0) >= 60 ? 700 : 400 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        border: "3px solid var(--wf-border)",
                        borderTopColor: "var(--wf-text)",
                        animation: "wf-skeleton-pulse 1s linear infinite",
                      }}
                    />
                    Finding places and details
                  </div>
                </div>
              </div>
            </div>

            <p style={{ margin: "24px 0 0", fontSize: "14px", color: "var(--wf-text-muted)" }}>
              You can close this. We'll keep going in the background and tell you if a link needs help.
            </p>
          </div>
        )}

        {stage === 2 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span
                aria-hidden="true"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: activeSave?.isDuplicate ? "var(--wf-surface-2)" : "#E3F4EA",
                  color: activeSave?.isDuplicate ? "var(--wf-text)" : "#1F7A4D",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
              </span>
              <div>
                <h2 style={{ margin: 0, fontSize: "26px", letterSpacing: "-0.03em", fontWeight: 800 }}>
                  {activeSave?.isDuplicate ? "Already saved" : "Saved to your library"}
                </h2>
                {activeSave?.isDuplicate && (
                  <p style={{ margin: "4px 0 0", fontSize: "14px", color: "var(--wf-text-muted)" }}>
                    This post is already in your library.
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: "20px", marginTop: "24px", padding: "16px", borderRadius: "22px", background: "var(--wf-surface-2)" }}>
              <div
                style={{
                  flex: "none",
                  width: "100px",
                  height: "140px",
                  borderRadius: "16px",
                  overflow: "hidden",
                  background: "var(--wf-surface-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--wf-text-muted)",
                }}
              >
                {activeSave?.thumbnailUrl ? (
                  <img
                    src={activeSave.thumbnailUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontSize: "28px" }}>🎬</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "17px", lineHeight: 1.3, fontWeight: 700 }}>
                  {activeSave?.title || "Saved link"}
                </div>
                <div style={{ fontSize: "14px", color: "var(--wf-text-muted)", marginTop: "4px" }}>
                  {[activeSave?.author, "Instagram reel"].filter(Boolean).join(" · ")}
                </div>
                {!activeSave?.isDuplicate && (
                  <>
                    <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--wf-text-muted)", margin: "14px 0 8px" }}>
                      Filed as
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {categories.map((c) => {
                        const isSelected = (activeSave?.category || "place") === c.key;
                        return (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() => activeSave && changeSavedCategory(activeSave.id, c.key)}
                            style={{
                              height: "34px",
                              padding: "0 14px",
                              borderRadius: "999px",
                              fontFamily: "inherit",
                              fontSize: "13px",
                              fontWeight: 700,
                              cursor: "pointer",
                              border: isSelected ? "0" : "1px solid var(--wf-border)",
                              background: isSelected ? "var(--wf-primary, var(--wf-text))" : "var(--wf-surface)",
                              color: isSelected ? "var(--wf-on-primary, var(--wf-bg))" : "var(--wf-text)",
                            }}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button
                type="button"
                onClick={handleSaveAnother}
                style={{
                  flex: 1,
                  height: "50px",
                  borderRadius: "999px",
                  border: "1px solid #D9D5CB",
                  background: "#FFFFFF",
                  fontFamily: "inherit",
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#1B1D1F",
                  cursor: "pointer",
                }}
              >
                Save another
              </button>
              <button
                type="button"
                onClick={() => {
                  closeSaveSheet();
                  if (activeSave?.postId) {
                    navigate(`/post/${activeSave.postId}`);
                  } else {
                    navigate("/library");
                  }
                }}
                style={{
                  flex: 1,
                  height: "50px",
                  borderRadius: "999px",
                  border: 0,
                  background: "#1B1D1F",
                  fontFamily: "inherit",
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#FFFFFF",
                  cursor: "pointer",
                }}
              >
                {activeSave?.isDuplicate ? "View existing item" : "View in Library"}
              </button>
            </div>
          </div>
        )}

        {stage === 3 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span
                aria-hidden="true"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "#FCE8E6",
                  color: "#D93829",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </span>
              <div>
                <h2 style={{ margin: 0, fontSize: "24px", letterSpacing: "-0.03em", fontWeight: 800 }}>
                  Save needs attention
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#6B6F73" }}>
                  {activeSave?.errorMessage || "We could not read this link. It might be private or unavailable."}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "28px" }}>
              <button
                type="button"
                onClick={handleSaveAnother}
                style={{
                  flex: 1,
                  height: "50px",
                  borderRadius: "999px",
                  border: 0,
                  background: "#1B1D1F",
                  fontFamily: "inherit",
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#FFFFFF",
                  cursor: "pointer",
                }}
              >
                Try another link
              </button>
              <button
                type="button"
                onClick={closeSaveSheet}
                style={{
                  height: "50px",
                  padding: "0 24px",
                  borderRadius: "999px",
                  border: "1px solid #D9D5CB",
                  background: "#FFFFFF",
                  fontFamily: "inherit",
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#1B1D1F",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
