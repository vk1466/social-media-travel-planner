import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSavePipeline } from "../state/SavePipelineContext";
import { fetchLinkPreview, type LinkPreview } from "../../api";
import { proxiedMediaUrl } from "../../postDisplayUtils";

export function validateSaveInput(input: string): {
  isValid: boolean;
  platform?: "instagram" | "tiktok" | "youtube" | "other";
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
        message: "TikTok and YouTube aren't supported yet - only Instagram reels are currently supported",
      };
    }

    if (!isInstagram) {
      return {
        isValid: false,
        isError: true,
        message: "Only Instagram reels are currently supported (restaurants, recipes, travel, movies)",
      };
    }
  }

  return { isValid: true, platform: "instagram" };
}

export function SaveSheet() {
  const { isSaveSheetOpen, closeSaveSheet, resetActiveSave, saveUrl, activeSave, changeSavedCategory } = useSavePipeline();
  const [inputText, setInputText] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<LinkPreview | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSaveSheetOpen) {
      setInputText("");
      setPreviewData(null);
      setPreviewLoading(false);
      resetActiveSave();
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
    await saveUrl(inputText);
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
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeSaveSheet();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "620px",
          background: "#FFFFFF",
          borderRadius: "28px",
          border: "1px solid #E6E3DC",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.15)",
          padding: "32px",
          position: "relative",
          boxSizing: "border-box",
          fontFamily: "'Figtree', system-ui, sans-serif",
          color: "#1B1D1F",
        }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={closeSaveSheet}
          style={{
            position: "absolute",
            top: "24px",
            right: "24px",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: "1px solid #E6E3DC",
            background: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#6B6F73",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {stage === 0 && (
          <div>
            <h2 style={{ margin: "0 0 16px", fontSize: "28px", letterSpacing: "-0.03em", fontWeight: 800 }}>
              Save a link
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: "15px", color: "#6B6F73", lineHeight: 1.5 }}>
              Paste an Instagram reel. We'll read and categorize it automatically.
            </p>

            <textarea
              aria-label="Paste link here"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste an Instagram reel link"
              style={{
                width: "100%",
                height: "100px",
                padding: "16px",
                borderRadius: "18px",
                border: validation.isError ? "1.5px solid #D93829" : "1px solid #D9D5CB",
                background: "#F6F5F1",
                fontFamily: "inherit",
                fontSize: "15px",
                color: "#1B1D1F",
                resize: "none",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            <div style={{ marginTop: "14px", fontSize: "14px" }}>
              {validation.isError ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#C53B27", fontWeight: 600 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {validation.message}
                </div>
              ) : validation.isValid ? (
                <div>
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

                  {/* Preview State: Skeleton loading */}
                  {previewLoading && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "12px 14px",
                        borderRadius: "16px",
                        border: "1px solid #E6E3DC",
                        background: "#FAFAF9",
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: "56px",
                          height: "56px",
                          borderRadius: "12px",
                          background: "#E6E3DC",
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ height: "14px", width: "40%", background: "#E6E3DC", borderRadius: "4px" }} />
                        <div style={{ height: "12px", width: "75%", background: "#EBE8E1", borderRadius: "4px" }} />
                      </div>
                    </div>
                  )}

                  {/* Preview State: Deleted or Private Post Warning */}
                  {!previewLoading && previewData && !previewData.is_available && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "12px 16px",
                        borderRadius: "16px",
                        border: "1.5px solid #F8D7DA",
                        background: "#FFF5F5",
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                        color: "#C53B27",
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "14px" }}>
                          {previewData.error_message || "Private or deleted post"}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6B6F73", marginTop: "2px" }}>
                          This post cannot be viewed or saved because it is private or has been removed.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preview State: Available Preview Card */}
                  {!previewLoading && previewData && previewData.is_available && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "12px 14px",
                        borderRadius: "16px",
                        border: "1px solid #E6E3DC",
                        background: "#FFFFFF",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: "56px",
                          height: "56px",
                          borderRadius: "12px",
                          overflow: "hidden",
                          background: previewData.thumbnail_url
                            ? `url(${proxiedMediaUrl(previewData.thumbnail_url)}) center/cover no-repeat`
                            : "linear-gradient(135deg, #F58529, #DD2A7B, #8134AF)",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#FFFFFF",
                        }}
                      >
                        {!previewData.thumbnail_url && (
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                          </svg>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 800,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              color: "#C13584",
                              background: "#FDF0F5",
                              padding: "2px 8px",
                              borderRadius: "999px",
                            }}
                          >
                            Instagram Reel
                          </span>
                          {previewData.author && (
                            <span style={{ fontSize: "13px", fontWeight: 700, color: "#1B1D1F" }}>
                              @{previewData.author.replace(/^@/, "")}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "14px",
                            color: "#1B1D1F",
                            fontWeight: 500,
                            lineHeight: 1.35,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {previewData.title || previewData.caption || "Ready to save"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: "#6B6F73" }}>
                  Instagram reels are currently supported (restaurants, recipes, travel, movies)
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={!validation.isValid || previewLoading || Boolean(previewData && !previewData.is_available)}
              style={{
                width: "100%",
                height: "52px",
                marginTop: "24px",
                borderRadius: "999px",
                border: 0,
                background:
                  validation.isValid && !previewLoading && (!previewData || previewData.is_available)
                    ? "#1B1D1F"
                    : "#ECECEA",
                fontFamily: "inherit",
                fontSize: "16px",
                fontWeight: 700,
                color:
                  validation.isValid && !previewLoading && (!previewData || previewData.is_available)
                    ? "#FFFFFF"
                    : "#8A8E92",
                cursor:
                  validation.isValid && !previewLoading && (!previewData || previewData.is_available)
                    ? "pointer"
                    : "not-allowed",
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
                  borderRadius: "18px",
                  background: "linear-gradient(160deg, #8CC3D6, #2D6A82)",
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
                  <div style={{ margin: "4px 0 0", fontSize: "14px", color: "#6B6F73", fontWeight: 600 }}>
                    {activeSave.author} · Instagram reel
                  </div>
                )}
                <div
                  style={{
                    height: "8px",
                    borderRadius: "999px",
                    background: "#ECEAE4",
                    margin: "16px 0 20px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${activeSave?.progressPercent || 30}%`,
                      height: "100%",
                      borderRadius: "999px",
                      background: "#1B1D1F",
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
                        background: (activeSave?.progressPercent || 0) >= 25 ? "#E3F4EA" : "#ECECEA",
                        color: (activeSave?.progressPercent || 0) >= 25 ? "#1F7A4D" : "#6B6F73",
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
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#6B6F73" }} />
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
                        background: (activeSave?.progressPercent || 0) >= 60 ? "#E3F4EA" : "#ECECEA",
                        color: (activeSave?.progressPercent || 0) >= 60 ? "#1F7A4D" : "#6B6F73",
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
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#6B6F73" }} />
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
                        border: "3px solid #D9D5CB",
                        borderTopColor: "#1B1D1F",
                        animation: "wf-skeleton-pulse 1s linear infinite",
                      }}
                    />
                    Finding places and details
                  </div>
                </div>
              </div>
            </div>

            <p style={{ margin: "24px 0 0", fontSize: "14px", color: "#6B6F73" }}>
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
                  background: activeSave?.isDuplicate ? "#EBF1F5" : "#E3F4EA",
                  color: activeSave?.isDuplicate ? "#1B5E78" : "#1F7A4D",
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
                  <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#6B6F73" }}>
                    This post is already in your library.
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: "20px", marginTop: "24px", padding: "16px", borderRadius: "22px", background: "#F6F5F1" }}>
              <div
                style={{
                  flex: "none",
                  width: "100px",
                  height: "140px",
                  borderRadius: "16px",
                  overflow: "hidden",
                  background: "linear-gradient(160deg, #8CC3D6, #2D6A82)",
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
                <div style={{ fontSize: "17px", lineHeight: 1.3, fontWeight: 700 }}>
                  {activeSave?.title || "Saved link"}
                </div>
                <div style={{ fontSize: "14px", color: "#6B6F73", marginTop: "4px" }}>
                  {[activeSave?.author, "Instagram reel"].filter(Boolean).join(" · ")}
                </div>
                {!activeSave?.isDuplicate && (
                  <>
                    <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B6F73", margin: "14px 0 8px" }}>
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
                              border: isSelected ? "0" : "1px solid #D9D5CB",
                              background: isSelected ? "#1B1D1F" : "#FFFFFF",
                              color: isSelected ? "#FFFFFF" : "#1B1D1F",
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
