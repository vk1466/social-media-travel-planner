import { useEffect, useState, type JSX } from "react";
import type { SavedRecipe } from "./recipeUtils";
import "./recipe-library.css";

export interface CookModeModalProps {
  item: SavedRecipe;
  onClose: () => void;
}

function extractMinutesFromStep(step: string): number | null {
  const match = step.match(/\b(\d+)\s*(?:minutes?|mins?)\b/i);
  return match ? Number(match[1]) : null;
}

export function CookModeModal({ item, onClose }: CookModeModalProps): JSX.Element {
  const steps = item.recipe.steps.length > 0 ? item.recipe.steps : ["Watch the original reel for step instructions."];
  const [stepIndex, setStepIndex] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);

  const currentStep = steps[stepIndex] ?? "";
  const structuredSeconds = item.recipe.step_timers_seconds?.[stepIndex];
  const detectedMinutes = structuredSeconds ? Math.round(structuredSeconds / 60) : extractMinutesFromStep(currentStep);

  // Close on Escape, Arrow keys for step navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose();
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        setStepIndex((i) => Math.min(steps.length - 1, i + 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        setStepIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [onClose, steps.length]);

  // Reset timer when step changes
  useEffect(() => {
    setTimerSeconds(null);
    setTimerRunning(false);
  }, [stepIndex]);

  // Timer countdown
  useEffect(() => {
    if (!timerRunning || timerSeconds == null || timerSeconds <= 0) {
      if (timerSeconds === 0) {
        setTimerRunning(false);
      }
      return;
    }

    const intervalId = window.setInterval(() => {
      setTimerSeconds((prev) => (prev != null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [timerRunning, timerSeconds]);

  const handleStartTimer = (mins: number) => {
    setTimerSeconds(mins * 60);
    setTimerRunning(true);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div
      className="cook-mode-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Cook Mode"
    >
      <div className="cook-mode-top">
        <span className="cook-mode-step-badge">
          Cook Mode · {item.recipe.title ?? "Recipe"}
        </span>

        <button
          type="button"
          className="cook-mode-exit"
          onClick={onClose}
          aria-label="Exit Cook Mode"
        >
          ✕ Exit Cook Mode (Esc)
        </button>
      </div>

      <div className="cook-mode-stage">
        <div style={{ color: "#a1a1aa", fontSize: "1.1rem", fontWeight: 600 }}>
          Step {stepIndex + 1} of {steps.length}
        </div>

        <div className="cook-mode-step-text">
          {currentStep}
        </div>

        {detectedMinutes != null && (
          <div>
            {timerSeconds == null ? (
              <button
                type="button"
                className="cook-mode-timer-btn"
                onClick={() => handleStartTimer(detectedMinutes)}
              >
                ⏱ Start {detectedMinutes} min timer
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ fontSize: "3.2rem", fontWeight: 900, fontFamily: "monospace", color: timerSeconds === 0 ? "#ef4444" : "#f97316" }}>
                  {formatTimer(timerSeconds)}
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className="cook-mode-exit"
                    onClick={() => setTimerRunning((r) => !r)}
                  >
                    {timerRunning ? "Pause" : "Resume"}
                  </button>
                  <button
                    type="button"
                    className="cook-mode-exit"
                    onClick={() => handleStartTimer(detectedMinutes)}
                  >
                    Reset
                  </button>
                </div>
                {timerSeconds === 0 && (
                  <span style={{ color: "#ef4444", fontWeight: 700, fontSize: "1.2rem" }}>
                    🔔 Timer Done!
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="cook-mode-nav">
        <button
          type="button"
          className="cook-mode-nav-btn"
          disabled={stepIndex === 0}
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
        >
          ← Previous
        </button>

        <button
          type="button"
          className="cook-mode-nav-btn"
          disabled={stepIndex >= steps.length - 1}
          onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
        >
          Next Step →
        </button>
      </div>
    </div>
  );
}
