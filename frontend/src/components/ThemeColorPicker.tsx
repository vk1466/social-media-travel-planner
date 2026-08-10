import { useEffect, useId, useState } from "react";

import { clearBrandUsageHighlight, highlightBrandUsage } from "../brandHighlight";
import {
  BRAND_COLOR_PRESETS,
  BRAND_MODES,
  DEFAULT_BRAND_COLOR,
  DEFAULT_BRAND_SHIFT,
  EDITABLE_BRAND_SWATCHES,
  HEADLINE_SIZE_OPTIONS,
  TEXT_FACE_OPTIONS,
  TEXT_ROLES,
  TEXT_SIZE_OPTIONS,
  applyBrandLab,
  defaultBrandLabState,
  deleteSavedBrandPalette,
  isDefaultBrandLab,
  normalizeHex,
  readBrandLabState,
  readLiveSwatches,
  resetBrandPalette,
  saveBrandPalette,
  seedBrandThemes,
  storeBrandLabState,
  type BrandLabState,
  type BrandMode,
  type BrandSwatchMap,
  type EditableBrandKey,
  type HeadlineSizeId,
  type SavedBrandPalette,
  type TextFaceId,
  type TextRoleId,
  type TextSizeId,
} from "../themeColor";
import "./theme-color-picker.css";

function emptySwatches(base: string): BrandSwatchMap {
  return {
    forest: base,
    forestDeep: base,
    sage: base,
    mint: base,
    ink: "#1c2420",
    quiet: "#5a6560",
    onBrand: "#f4f7f5",
  };
}

function Tip({ text, highlightHex }: { text: string; highlightHex?: string }) {
  return (
    <span
      className="wf-theme-picker-tip"
      title={text}
      aria-label={text}
      onMouseEnter={() => {
        if (highlightHex) {
          highlightBrandUsage(highlightHex);
        }
      }}
      onMouseLeave={() => {
        clearBrandUsageHighlight();
      }}
      onFocus={() => {
        if (highlightHex) {
          highlightBrandUsage(highlightHex);
        }
      }}
      onBlur={() => {
        clearBrandUsageHighlight();
      }}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      role="img"
      tabIndex={0}
    >
      ?
    </span>
  );
}

function SwatchField({
  label,
  tip,
  value,
  onChange,
}: {
  label: string;
  tip: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <label className="wf-theme-picker-swatch-edit">
      <span className="wf-theme-picker-swatch-name">
        {label}
        <Tip text={tip} highlightHex={value} />
      </span>
      <input
        type="color"
        value={value}
        aria-label={`${label}. ${tip}`}
        title={tip}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function ThemeColorPicker() {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [lab, setLab] = useState<BrandLabState>(defaultBrandLabState);
  const [hexDraft, setHexDraft] = useState(DEFAULT_BRAND_COLOR);
  const [swatches, setSwatches] = useState<BrandSwatchMap>(() =>
    emptySwatches(DEFAULT_BRAND_COLOR),
  );
  const [saved, setSaved] = useState<SavedBrandPalette[]>([]);
  const [saveName, setSaveName] = useState("");
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      clearBrandUsageHighlight();
    }
    return () => {
      clearBrandUsageHighlight();
    };
  }, [open]);

  useEffect(() => {
    const stored = readBrandLabState();
    setSaved(seedBrandThemes());
    if (isDefaultBrandLab(stored)) {
      resetBrandPalette();
      setLab(stored);
      setHexDraft(stored.base);
      setSwatches(emptySwatches(stored.base));
      requestAnimationFrame(() => {
        setSwatches(readLiveSwatches());
      });
      return;
    }
    const nextSwatches = applyBrandLab(stored);
    setLab(stored);
    setHexDraft(stored.base);
    setSwatches(nextSwatches);
  }, []);

  const commitLab = (next: BrandLabState) => {
    const base = normalizeHex(next.base) ?? lab.base;
    const normalized: BrandLabState = {
      base,
      shift: next.shift,
      overrides: next.overrides,
      textStyles: next.textStyles,
      mode: next.mode,
    };
    const nextSwatches = applyBrandLab(normalized);
    setLab(normalized);
    setHexDraft(base);
    setSwatches(nextSwatches);
    storeBrandLabState(normalized);
  };

  const commitMode = (mode: BrandMode) => {
    commitLab({ ...lab, mode });
  };

  const commitBase = (next: string) => {
    const hex = normalizeHex(next);
    if (!hex) {
      setHexDraft(lab.base);
      return;
    }
    commitLab({ ...lab, base: hex, overrides: {} });
  };

  const commitShift = (shift: number) => {
    commitLab({ ...lab, shift, overrides: {} });
  };

  const commitSwatch = (key: EditableBrandKey, next: string) => {
    const hex = normalizeHex(next);
    if (!hex) {
      return;
    }
    commitLab({
      ...lab,
      overrides: { ...lab.overrides, [key]: hex },
    });
  };

  const commitTextFace = (role: TextRoleId, face: TextFaceId) => {
    commitLab({
      ...lab,
      textStyles: {
        ...lab.textStyles,
        [role]: { ...lab.textStyles[role], face },
      },
    });
  };

  const commitTextSize = (role: TextRoleId, size: TextSizeId | HeadlineSizeId) => {
    commitLab({
      ...lab,
      textStyles: {
        ...lab.textStyles,
        [role]: { ...lab.textStyles[role], size },
      },
    });
  };

  const clearOverrides = () => {
    commitLab({ ...lab, overrides: {} });
  };

  const handleReset = () => {
    resetBrandPalette();
    const defaults = defaultBrandLabState();
    setLab(defaults);
    setHexDraft(defaults.base);
    storeBrandLabState(defaults);
    requestAnimationFrame(() => {
      setSwatches(readLiveSwatches());
    });
  };

  const handleSave = () => {
    const name = saveName.trim();
    if (!name) {
      setSaveNotice("Add a name to save this palette.");
      return;
    }
    const next = saveBrandPalette(name, lab, swatches);
    setSaved(next);
    setSaveName("");
    setSaveNotice(`Saved “${name}”.`);
  };

  const handleApplySaved = (entry: SavedBrandPalette) => {
    commitLab(entry.lab);
    setSaveNotice(`Loaded “${entry.name}”.`);
  };

  const handleDeleteSaved = (entry: SavedBrandPalette) => {
    setSaved(deleteSavedBrandPalette(entry.id));
    setSaveNotice(`Deleted “${entry.name}”.`);
  };

  const hasOverrides = Object.keys(lab.overrides).length > 0;
  const brandSwatches = EDITABLE_BRAND_SWATCHES.filter((item) => item.group === "brand");
  const faceStack = (id: TextFaceId) =>
    TEXT_FACE_OPTIONS.find((item) => item.id === id)?.stack ?? TEXT_FACE_OPTIONS[0].stack;

  return (
    <div className="wf-theme-picker" data-open={open ? "true" : "false"}>
      <button
        type="button"
        className="wf-theme-picker-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        title="Brand colors"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="wf-theme-picker-swatch" style={{ background: swatches.forest }} />
        <span className="wf-theme-picker-toggle-label">Color</span>
      </button>

      {open ? (
        <div className="wf-theme-picker-panel" id={panelId} role="dialog" aria-label="Brand colors">
          <div className="wf-theme-picker-head">
            <p className="wf-theme-picker-title">Brand colors</p>
            <button type="button" className="wf-theme-picker-reset" onClick={handleReset}>
              Reset
            </button>
          </div>

          <div
            className="wf-theme-picker-mode"
            role="radiogroup"
            aria-label="Chrome mode"
          >
            <span className="wf-theme-picker-field-label">
              Chrome
              <Tip text="Light or dark page ground. Both share the same brand fill and type — only the surfaces and copy colors flip." />
            </span>
            <div className="wf-theme-picker-mode-toggle">
              {BRAND_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={lab.mode === mode}
                  className="wf-theme-picker-mode-btn"
                  data-active={lab.mode === mode ? "true" : "false"}
                  onClick={() => commitMode(mode)}
                >
                  {mode === "dark" ? "Dark" : "Light"}
                </button>
              ))}
            </div>
          </div>

          <label className="wf-theme-picker-field">
            <span className="wf-theme-picker-field-label">
              Seed
              <Tip text="Starting hue for the derived palette. Brand fill and related tones rebuild from this." />
            </span>
            <input
              type="color"
              value={lab.base}
              aria-label="Brand seed color"
              title="Starting hue for the derived palette"
              onChange={(event) => commitBase(event.target.value)}
            />
          </label>

          <label className="wf-theme-picker-field">
            <span className="wf-theme-picker-field-label">Hex</span>
            <input
              type="text"
              value={hexDraft}
              spellCheck={false}
              aria-label="Brand seed hex"
              onChange={(event) => setHexDraft(event.target.value)}
              onBlur={() => commitBase(hexDraft)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitBase(hexDraft);
                }
              }}
            />
          </label>

          <label className="wf-theme-picker-shift">
            <span className="wf-theme-picker-shift-top">
              <span className="wf-theme-picker-field-label">
                Contrast
                <Tip text="How far Dark ground, Accent, and Highlight pull away from Seed. Mid and hover fills stay auto-derived." />
              </span>
              <span className="wf-theme-picker-shift-value">{lab.shift.toFixed(1)}×</span>
            </span>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={lab.shift}
              aria-label="Palette contrast"
              onChange={(event) => commitShift(Number(event.target.value))}
            />
            <span className="wf-theme-picker-shift-hint">
              0 flat · {DEFAULT_BRAND_SHIFT} default · 2 strong
            </span>
          </label>

          <div className="wf-theme-picker-swatches">
            <div className="wf-theme-picker-swatches-head">
              <p className="wf-theme-picker-preset-label">
                Surfaces
                <Tip text="Brand fills used for buttons, dark pages, chips, and highlights." />
              </p>
              {hasOverrides ? (
                <button type="button" className="wf-theme-picker-reset" onClick={clearOverrides}>
                  Rebuild
                </button>
              ) : null}
            </div>
            <div className="wf-theme-picker-swatch-grid">
              {brandSwatches.map((item) => (
                <SwatchField
                  key={item.key}
                  label={item.label}
                  tip={item.tip}
                  value={swatches[item.key]}
                  onChange={(hex) => commitSwatch(item.key, hex)}
                />
              ))}
            </div>
          </div>

          <div className="wf-theme-picker-swatches">
            <div className="wf-theme-picker-swatches-head">
              <p className="wf-theme-picker-preset-label">
                Copy
                <Tip text="Each copy role has its own typeface and size. Body and muted also set color on the dark ground." />
              </p>
            </div>
            <div className="wf-theme-picker-text-roles">
              {TEXT_ROLES.map((role) => {
                const style = lab.textStyles[role.id];
                const colorValue = swatches[role.colorKey];
                const sizeOptions =
                  role.sizeKind === "headline" ? HEADLINE_SIZE_OPTIONS : TEXT_SIZE_OPTIONS;
                const sampleSize =
                  role.sizeKind === "headline"
                    ? `calc(1.15rem * ${
                        HEADLINE_SIZE_OPTIONS.find((item) => item.id === style.size)?.scale ?? 1
                      })`
                    : TEXT_SIZE_OPTIONS.find((item) => item.id === style.size)?.rem;
                const sampleBg =
                  role.sampleTone === "fill" ? swatches.forest : swatches.forestDeep;
                return (
                  <div key={role.id} className="wf-theme-picker-text-role">
                    <div className="wf-theme-picker-text-role-head">
                      <span className="wf-theme-picker-swatch-name">
                        {role.label}
                        <Tip
                          text={role.tip}
                          highlightHex={role.ownColor ? colorValue : undefined}
                        />
                      </span>
                      {role.ownColor ? (
                        <input
                          type="color"
                          value={colorValue}
                          aria-label={`${role.label} color`}
                          title={role.tip}
                          onChange={(event) => commitSwatch(role.colorKey, event.target.value)}
                        />
                      ) : null}
                    </div>
                    <div className="wf-theme-picker-text-role-controls">
                      <label className="wf-theme-picker-mini-field">
                        <span>Face</span>
                        <select
                          value={style.face}
                          aria-label={`${role.label} typeface`}
                          onChange={(event) =>
                            commitTextFace(role.id, event.target.value as TextFaceId)
                          }
                        >
                          {TEXT_FACE_OPTIONS.map((face) => (
                            <option key={face.id} value={face.id}>
                              {face.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="wf-theme-picker-mini-field">
                        <span>Size</span>
                        <select
                          value={style.size}
                          aria-label={`${role.label} size`}
                          onChange={(event) =>
                            commitTextSize(
                              role.id,
                              event.target.value as TextSizeId | HeadlineSizeId,
                            )
                          }
                        >
                          {sizeOptions.map((size) => (
                            <option key={size.id} value={size.id}>
                              {size.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <p
                      className="wf-theme-picker-text-role-sample"
                      style={{
                        fontFamily: faceStack(style.face),
                        color: colorValue,
                        fontSize: sampleSize,
                        background: sampleBg,
                      }}
                    >
                      {role.sample}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="wf-theme-picker-saves">
            <div className="wf-theme-picker-swatches-head">
              <p className="wf-theme-picker-preset-label">
                Saved
                <Tip text="Store Seed, Contrast, colors, and per-role type settings." />
              </p>
            </div>
            <div className="wf-theme-picker-save-form">
              <input
                type="text"
                value={saveName}
                placeholder="Name this palette"
                aria-label="Saved palette name"
                onChange={(event) => {
                  setSaveName(event.target.value);
                  if (saveNotice) {
                    setSaveNotice(null);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSave();
                  }
                }}
              />
              <button type="button" className="wf-theme-picker-save-btn" onClick={handleSave}>
                Save
              </button>
            </div>
            {saveNotice ? <p className="wf-theme-picker-save-notice">{saveNotice}</p> : null}
            {saved.length > 0 ? (
              <ul className="wf-theme-picker-save-list">
                {saved.map((entry) => (
                  <li key={entry.id} className="wf-theme-picker-save-item">
                    <button
                      type="button"
                      className="wf-theme-picker-save-apply"
                      onClick={() => handleApplySaved(entry)}
                      title={entry.note ?? `Apply ${entry.name}`}
                    >
                      <span className="wf-theme-picker-save-chips" aria-hidden="true">
                        <span style={{ background: entry.preview.forest }} />
                        <span style={{ background: entry.preview.sage }} />
                        <span style={{ background: entry.preview.mint }} />
                        <span style={{ background: entry.preview.ink }} />
                      </span>
                      <span className="wf-theme-picker-save-meta">
                        <span className="wf-theme-picker-save-name">{entry.name}</span>
                        <span className="wf-theme-picker-save-date">
                          {entry.note ??
                            new Date(entry.savedAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="wf-theme-picker-save-delete"
                      aria-label={`Delete ${entry.name}`}
                      title="Delete"
                      onClick={() => handleDeleteSaved(entry)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="wf-theme-picker-save-empty">No saved palettes yet.</p>
            )}
          </div>

          <div className="wf-theme-picker-presets">
            <p className="wf-theme-picker-preset-label">Directions</p>
            <div className="wf-theme-picker-preset-row" role="list">
              {BRAND_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  role="listitem"
                  className="wf-theme-picker-preset"
                  style={{ background: preset.hex }}
                  title={preset.label}
                  aria-label={preset.label}
                  aria-pressed={lab.base === preset.hex && !hasOverrides}
                  onClick={() => commitBase(preset.hex)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
