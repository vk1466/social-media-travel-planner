import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSavePipeline } from "../state/SavePipelineContext";

export function SaveSheet() {
  const { isSaveSheetOpen, closeSaveSheet, resetActiveSave, saveUrl, activeSave, changeSavedCategory } = useSavePipeline();
  const [inputText, setInputText] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSaveSheetOpen) {
      setInputText("");
      resetActiveSave();
    }
  }, [isSaveSheetOpen, resetActiveSave]);

  if (!isSaveSheetOpen) return null;

  const isInstagram = inputText.includes("instagram.com");
  const isTikTokOrYouTube = inputText.includes("tiktok.com") || inputText.includes("youtube.com") || inputText.includes("youtu.be");

  const stage = !activeSave
    ? 0
    : activeSave.status === "done"
    ? 2
    : activeSave.status === "error"
    ? 3
    : 1;

  const handleSave = async () => {
    if (!inputText.trim()) return;
    await saveUrl(inputText);
  };

  const handleSaveAnother = () => {
    resetActiveSave();
    setInputText("");
  };

  const categories = [
    { key: "place", label: "Place" },
    { key: "recipe", label: "Recipe" },
    { key: "movie", label: "Title" },
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
              Paste any Instagram reel, recipe, movie recommendation, or place. We'll read and categorize it automatically.
            </p>

            <textarea
              aria-label="Paste link here"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste a link from Instagram, TikTok or YouTube"
              style={{
                width: "100%",
                height: "100px",
                padding: "16px",
                borderRadius: "18px",
                border: "1px solid #D9D5CB",
                background: "#F6F5F1",
                fontFamily: "inherit",
                fontSize: "15px",
                color: "#1B1D1F",
                resize: "none",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "14px", fontSize: "14px", color: "#4A4E52" }}>
              {isInstagram ? (
                <>
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
                  Instagram reel detected
                </>
              ) : isTikTokOrYouTube ? (
                <span style={{ color: "#6B6F73" }}>TikTok and YouTube reading is currently in early preview</span>
              ) : (
                <span style={{ color: "#6B6F73" }}>Supports Instagram reels, restaurants, recipes, movies</span>
              )}
              <span style={{ flex: 1 }} />
              <span style={{ color: "#6B6F73", fontSize: "13px" }}>Paste several links, one per line</span>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={!inputText.trim()}
              style={{
                width: "100%",
                height: "52px",
                marginTop: "24px",
                borderRadius: "999px",
                border: 0,
                background: inputText.trim() ? "#1B1D1F" : "#ECECEA",
                fontFamily: "inherit",
                fontSize: "16px",
                fontWeight: 700,
                color: inputText.trim() ? "#FFFFFF" : "#8A8E92",
                cursor: inputText.trim() ? "pointer" : "not-allowed",
              }}
            >
              Save
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
                }}
              />
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: "26px", letterSpacing: "-0.03em", fontWeight: 800 }}>
                  Reading your post
                </h2>
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
                      width: `${activeSave?.progressPercent || 50}%`,
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
                        background: "#E3F4EA",
                        color: "#1F7A4D",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                    </span>
                    Fetched the post
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
                    Read caption and on-screen text
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", fontWeight: 700 }}>
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
                  background: "#E3F4EA",
                  color: "#1F7A4D",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
              </span>
              <h2 style={{ flex: 1, margin: 0, fontSize: "26px", letterSpacing: "-0.03em", fontWeight: 800 }}>
                Saved to your library
              </h2>
            </div>

            <div style={{ display: "flex", gap: "20px", marginTop: "24px", padding: "16px", borderRadius: "22px", background: "#F6F5F1" }}>
              <div
                aria-hidden="true"
                style={{
                  flex: "none",
                  width: "100px",
                  height: "140px",
                  borderRadius: "16px",
                  background: "linear-gradient(160deg, #8CC3D6, #2D6A82)",
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "17px", lineHeight: 1.3, fontWeight: 700 }}>
                  {activeSave?.title || "Saved social link"}
                </div>
                <div style={{ fontSize: "14px", color: "#6B6F73", marginTop: "4px" }}>
                  {activeSave?.author || "@creator"} · Instagram reel
                </div>
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
                  navigate("/library");
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
                View in Library
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
