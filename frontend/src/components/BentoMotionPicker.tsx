import { useEffect, useId, useState } from "react";

import {
  BENTO_MOTION_PRESETS,
  applyBentoMotion,
  initBentoMotion,
  type BentoMotionId,
} from "../bentoMotion";
import "./bento-motion-picker.css";

/** Floating lab control — try bento photo rotation motions like the color palette. */
export function BentoMotionPicker() {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [motion, setMotion] = useState<BentoMotionId>(() => initBentoMotion());

  useEffect(() => {
    setMotion(initBentoMotion());
  }, []);

  const handleSelect = (id: BentoMotionId) => {
    setMotion(applyBentoMotion(id));
  };

  const active = BENTO_MOTION_PRESETS.find((preset) => preset.id === motion);

  return (
    <div className="wf-bento-motion" data-open={open ? "true" : "false"}>
      <button
        type="button"
        className="wf-bento-motion-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span
          className="wf-bento-motion-swatch"
          style={{ background: active?.swatch }}
          aria-hidden="true"
        />
        <span className="wf-bento-motion-toggle-label">Motion</span>
      </button>

      {open ? (
        <div
          className="wf-bento-motion-panel"
          id={panelId}
          role="dialog"
          aria-label="Bento photo motion"
        >
          <div className="wf-bento-motion-head">
            <p className="wf-bento-motion-title">Photo motion</p>
            <p className="wf-bento-motion-sub">
              Rotate profile stills across the bento — one photo per tile.
            </p>
          </div>

          <div className="wf-bento-motion-presets" role="list">
            {BENTO_MOTION_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                role="listitem"
                className="wf-bento-motion-preset"
                aria-pressed={motion === preset.id}
                onClick={() => handleSelect(preset.id)}
              >
                <span
                  className="wf-bento-motion-preset-swatch"
                  style={{ background: preset.swatch }}
                  aria-hidden="true"
                />
                <span className="wf-bento-motion-preset-meta">
                  <span className="wf-bento-motion-preset-label">{preset.label}</span>
                  <span className="wf-bento-motion-preset-note">{preset.note}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
