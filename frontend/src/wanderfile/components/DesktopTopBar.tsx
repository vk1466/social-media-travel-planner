import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSavePipeline } from "../state/SavePipelineContext";
import { ViewAsSwitcher } from "../../components/ViewAsSwitcher";

interface DesktopTopBarProps {
  isSuperAdmin?: boolean;
  onViewAsChange?: (userId: string | null) => void;
}

export function DesktopTopBar({ isSuperAdmin, onViewAsChange }: DesktopTopBarProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { openSaveSheet, inFlightSaves, inboxFailures } = useSavePipeline();

  // Listen for global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isCompleteInstagramUrl = (text: string) => {
    const trimmed = text.trim();
    return (
      /\/reel\/[\w-]+/.test(trimmed) ||
      /\/reels\/[\w-]+/.test(trimmed) ||
      /\/p\/[\w-]+/.test(trimmed) ||
      /instagr\.am\/[\w-]+/.test(trimmed)
    );
  };

  const isUrlOrInstagram = (text: string) => {
    const trimmed = text.trim();
    return (
      trimmed.includes("instagram.com/reel") ||
      trimmed.includes("instagram.com/p/") ||
      trimmed.includes("instagr.am/") ||
      ((trimmed.includes("instagram.com") || trimmed.includes("instagr.am")) &&
        (trimmed.startsWith("http://") || trimmed.startsWith("https://"))) ||
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://")
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    if (isUrlOrInstagram(trimmed)) {
      setQuery("");
      openSaveSheet(trimmed);
      return;
    }

    // Otherwise navigate to library search
    navigate(`/library?q=${encodeURIComponent(trimmed)}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (isCompleteInstagramUrl(val)) {
      setQuery("");
      openSaveSheet(val.trim());
      return;
    }
    setQuery(val);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text")?.trim();
    if (pasted && isUrlOrInstagram(pasted)) {
      e.preventDefault();
      setQuery("");
      openSaveSheet(pasted);
    }
  };

  const savingCount = (inFlightSaves || []).length;

  return (
    <header
      className="wf-desktop-topbar wf-desktop-only"
      style={{
        height: "60px",
        width: "100%",
        padding: "0 32px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "24px",
        boxSizing: "border-box",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* ⌘K Search and paste bar */}
      <form onSubmit={handleSubmit} style={{ flex: 1, maxWidth: "560px", minWidth: 0 }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            height: "40px",
            padding: "0 14px",
            borderRadius: "var(--radius-pill)",
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            cursor: "text",
            boxSizing: "border-box",
            transition: "border-color 0.15s ease",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" color="var(--ink-2)">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onPaste={handlePaste}
            placeholder="Search places, reels, or paste an Instagram link…"
            style={{
              flex: 1,
              minWidth: 0,
              border: 0,
              background: "transparent",
              fontFamily: "inherit",
              fontSize: "14px",
              color: "var(--ink)",
              outline: "none",
            }}
          />
          <kbd
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--ink-2)",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "6px",
              padding: "2px 6px",
              lineHeight: 1,
              fontFamily: "inherit",
            }}
          >
            ⌘K
          </kbd>
        </label>
      </form>

      {/* Right status items */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
        {savingCount > 0 && (
          <button
            type="button"
            onClick={() => openSaveSheet()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--accent)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-pill)",
              padding: "6px 14px",
              background: "var(--surface-2)",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "var(--accent)",
                display: "inline-block",
                animation: "wf-skeleton-pulse 1.2s infinite",
              }}
            />
            <span>Processing {savingCount} {savingCount === 1 ? "reel" : "reels"}</span>
          </button>
        )}

        {inboxFailures && inboxFailures.length > 0 && (
          <Link
            to="/inbox"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "var(--radius-pill)",
              background: "rgba(217, 58, 58, 0.12)",
              color: "var(--danger)",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <span>⚠️ {inboxFailures.length} need attention</span>
          </Link>
        )}

        {isSuperAdmin && (
          <ViewAsSwitcher enabled={isSuperAdmin} onChange={onViewAsChange} />
        )}
      </div>
    </header>
  );
}
