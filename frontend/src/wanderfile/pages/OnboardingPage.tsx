import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSavePipeline } from "../state/SavePipelineContext";

export function OnboardingPage() {
  const navigate = useNavigate();
  const { saveUrl } = useSavePipeline();
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<Record<string, boolean>>({
    travel: true,
    food: true,
  });
  const [pasteLink, setPasteLink] = useState("");

  const markCompleted = () => {
    try {
      localStorage.setItem("wf_onboarding_completed", new Date().toISOString());
    } catch {
      // ignore storage error
    }
    navigate("/");
  };

  const categories = [
    { key: "travel", label: "Travel", soon: false },
    { key: "movies", label: "Movies", soon: false },
    { key: "food", label: "Food", soon: false },
    { key: "fashion", label: "Fashion", soon: false },
    { key: "hairstyle", label: "Hairstyle", soon: false },
    { key: "other", label: "Other", soon: false },
    { key: "workouts", label: "Workouts", soon: true },
    { key: "skincare", label: "Skincare", soon: true },
  ];

  const handleSaveFirstLink = async () => {
    if (pasteLink.trim()) {
      await saveUrl(pasteLink.trim());
    }
    setStep(3);
  };

  const pickedCount = Object.values(picks).filter(Boolean).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F6F5F1",
        fontFamily: "'Figtree', system-ui, sans-serif",
        color: "#1B1D1F",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          padding: "14px 40px",
          background: "#FFFFFF",
          borderBottom: "1px solid #E6E3DC",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontWeight: 800,
            fontSize: "20px",
            letterSpacing: "-0.03em",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "10px",
              background: "#1B1D1F",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </span>
          Wanderfile
        </div>
      </header>

      <main
        style={{
          maxWidth: "680px",
          margin: "0 auto",
          padding: "60px 24px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {/* Progress dots & label */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "32px" }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: "8px",
                borderRadius: "999px",
                width: i === step ? "28px" : "8px",
                background: i === step ? "#1B1D1F" : "#D9D5CB",
                transition: "all 0.25s ease",
              }}
            />
          ))}
          <span style={{ marginLeft: "8px", fontSize: "13px", fontWeight: 700, color: "#6B6F73" }}>
            Step {step + 1} of 4
          </span>
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "46px",
                lineHeight: 1.05,
                letterSpacing: "-0.035em",
                fontWeight: 800,
              }}
            >
              Wanderfile files your saves for you.
            </h1>
            <p style={{ margin: "14px 0 0", fontSize: "17px", lineHeight: 1.55, color: "#4A4E52" }}>
              Paste a link from Instagram, TikTok or YouTube. We read the post, pull out what matters, and file it under
              travel, movies, food, fashion or hairstyle.
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginTop: "24px",
                padding: "16px",
                borderRadius: "20px",
                background: "#FFFFFF",
                border: "1px solid #E6E3DC",
              }}
            >
              <span
                style={{
                  flex: "none",
                  height: "44px",
                  padding: "0 14px",
                  borderRadius: "999px",
                  background: "#F6F5F1",
                  border: "1px solid #E6E3DC",
                  display: "flex",
                  alignItems: "center",
                  fontSize: "13px",
                  color: "#6B6F73",
                }}
              >
                instagram.com/reel/...
              </span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B6F73" strokeWidth="2">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
              <span
                style={{
                  flex: 1,
                  height: "44px",
                  borderRadius: "14px",
                  background: "#E3F0F4",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 14px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#1B5E78",
                }}
              >
                A place card, filed under travel
              </span>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "32px", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  height: "52px",
                  padding: "0 28px",
                  borderRadius: "999px",
                  fontFamily: "inherit",
                  fontSize: "16px",
                  fontWeight: 700,
                  border: 0,
                  background: "#1B1D1F",
                  color: "#FFFFFF",
                  cursor: "pointer",
                }}
              >
                Continue
              </button>
              <button
                type="button"
                onClick={markCompleted}
                style={{
                  border: 0,
                  background: "transparent",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#6B6F73",
                  cursor: "pointer",
                  padding: "0 14px",
                }}
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Step 1: What do you save? */}
        {step === 1 && (
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "46px",
                lineHeight: 1.05,
                letterSpacing: "-0.035em",
                fontWeight: 800,
              }}
            >
              What do you save?
            </h1>
            <p style={{ margin: "14px 0 0", fontSize: "17px", lineHeight: 1.55, color: "#4A4E52" }}>
              Pick any that fit. This only orders your collections. Posts get filed either way.
            </p>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "24px" }}>
              {categories.map((c) => {
                const isSelected = !!picks[c.key];
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      if (c.soon) return;
                      setPicks((prev) => ({ ...prev, [c.key]: !prev[c.key] }));
                    }}
                    style={{
                      height: "48px",
                      padding: "0 20px",
                      borderRadius: "999px",
                      fontFamily: "inherit",
                      fontSize: "15px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: c.soon ? "default" : "pointer",
                      border: c.soon
                        ? "2px dashed #D9D5CB"
                        : isSelected
                        ? "2px solid #1B1D1F"
                        : "2px solid #D9D5CB",
                      background: c.soon ? "#FBFAF7" : isSelected ? "#1B1D1F" : "#FFFFFF",
                      color: c.soon ? "#8A8E92" : isSelected ? "#FFFFFF" : "#1B1D1F",
                    }}
                  >
                    {c.label}
                    {c.soon && (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: "999px",
                          background: "#ECECEA",
                          color: "#6B6F73",
                        }}
                      >
                        Soon
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: "14px", fontSize: "13px", color: "#6B6F73" }}>
              {pickedCount === 0
                ? "Nothing picked. That is fine, we will file posts anyway."
                : `${pickedCount} picked. You can change this later.`}
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "32px", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setStep(0)}
                style={{
                  height: "52px",
                  padding: "0 28px",
                  borderRadius: "999px",
                  fontFamily: "inherit",
                  fontSize: "16px",
                  fontWeight: 700,
                  border: "1px solid #D9D5CB",
                  background: "#FFFFFF",
                  color: "#1B1D1F",
                  cursor: "pointer",
                }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{
                  height: "52px",
                  padding: "0 28px",
                  borderRadius: "999px",
                  fontFamily: "inherit",
                  fontSize: "16px",
                  fontWeight: 700,
                  border: 0,
                  background: "#1B1D1F",
                  color: "#FFFFFF",
                  cursor: "pointer",
                }}
              >
                Continue
              </button>
              <button
                type="button"
                onClick={markCompleted}
                style={{
                  border: 0,
                  background: "transparent",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#6B6F73",
                  cursor: "pointer",
                  padding: "0 14px",
                }}
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Save your first link */}
        {step === 2 && (
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "46px",
                lineHeight: 1.05,
                letterSpacing: "-0.035em",
                fontWeight: 800,
              }}
            >
              Save your first link.
            </h1>
            <p style={{ margin: "14px 0 0", fontSize: "17px", lineHeight: 1.55, color: "#4A4E52" }}>
              Paste it below. It is read in the background, so you can keep exploring while it works.
            </p>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                height: "56px",
                marginTop: "24px",
                padding: "0 16px",
                borderRadius: "999px",
                background: "#FFFFFF",
                border: "1px solid #D9D5CB",
                color: "#6B6F73",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
                <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
              </svg>
              <input
                aria-label="Paste a link"
                placeholder="Paste an Instagram reel link"
                value={pasteLink}
                onChange={(e) => setPasteLink(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: 0,
                  background: "transparent",
                  fontFamily: "inherit",
                  fontSize: "16px",
                  color: "#1B1D1F",
                  outline: "none",
                }}
              />
            </label>

            <Link
              to="/coming-soon/mobile-share"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "14px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#4A4E52",
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: "#ECECEA",
                  color: "#6B6F73",
                }}
              >
                Soon
              </span>
              Share a post straight from Instagram, TikTok or YouTube
            </Link>

            <div style={{ display: "flex", gap: "12px", marginTop: "32px", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  height: "52px",
                  padding: "0 28px",
                  borderRadius: "999px",
                  fontFamily: "inherit",
                  fontSize: "16px",
                  fontWeight: 700,
                  border: "1px solid #D9D5CB",
                  background: "#FFFFFF",
                  color: "#1B1D1F",
                  cursor: "pointer",
                }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSaveFirstLink}
                disabled={!pasteLink.trim()}
                style={{
                  height: "52px",
                  padding: "0 28px",
                  borderRadius: "999px",
                  fontFamily: "inherit",
                  fontSize: "16px",
                  fontWeight: 700,
                  border: 0,
                  background: pasteLink.trim() ? "#1B1D1F" : "#ECECEA",
                  color: pasteLink.trim() ? "#FFFFFF" : "#8A8E92",
                  cursor: pasteLink.trim() ? "pointer" : "default",
                }}
              >
                Save link
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                style={{
                  border: 0,
                  background: "transparent",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#6B6F73",
                  cursor: "pointer",
                  padding: "0 14px",
                }}
              >
                I'll do it later
              </button>
            </div>
          </div>
        )}

        {/* Step 3: You're in */}
        {step === 3 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 700, color: "#1F7A4D" }}>
              <span
                aria-hidden="true"
                style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#2F9E6B" }}
              />
              Saving 1
            </div>
            <h1
              style={{
                margin: "10px 0 0",
                fontSize: "46px",
                lineHeight: 1.05,
                letterSpacing: "-0.035em",
                fontWeight: 800,
              }}
            >
              You're in.
            </h1>
            <p style={{ margin: "14px 0 0", fontSize: "17px", lineHeight: 1.55, color: "#4A4E52" }}>
              Your link is being read. Head to Home. We'll show it there as soon as it is filed.
            </p>

            <div
              style={{
                marginTop: "20px",
                padding: "16px 18px",
                borderRadius: "20px",
                border: "2px dashed #C9C5BA",
                background: "#FBFAF7",
                fontSize: "14px",
                lineHeight: 1.5,
                color: "#4A4E52",
              }}
            >
              If a link can't be read, it waits in your Home inbox with a Retry button. Nothing is lost.
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "32px", alignItems: "center" }}>
              <button
                type="button"
                onClick={markCompleted}
                style={{
                  height: "52px",
                  padding: "0 28px",
                  borderRadius: "999px",
                  border: 0,
                  background: "#1B1D1F",
                  color: "#FFFFFF",
                  fontFamily: "inherit",
                  fontSize: "16px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Go to Home
              </button>
              <button
                type="button"
                onClick={() => setStep(0)}
                style={{
                  height: "52px",
                  padding: "0 28px",
                  borderRadius: "999px",
                  border: "1px solid #D9D5CB",
                  background: "#FFFFFF",
                  fontFamily: "inherit",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#1B1D1F",
                  cursor: "pointer",
                }}
              >
                Replay intro
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
