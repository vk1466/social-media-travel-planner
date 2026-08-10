import { useMemo, useState } from "react";

import { LinkIcon } from "./PanelIcons";
import { SectionPanel } from "./SectionPanel";

interface LinkSubmitFormProps {
  disabled?: boolean;
  initialValue?: string;
  onSubmit: (links: string[], refresh: boolean) => void;
}

function isLikelyUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function LinkSubmitForm({
  disabled = false,
  initialValue = "",
  onSubmit,
}: LinkSubmitFormProps) {
  const [text, setText] = useState(initialValue);
  const [refresh, setRefresh] = useState(false);

  const parsed = useMemo(() => {
    const lines = text.split("\n");
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      if (isLikelyUrl(trimmed)) {
        valid.push(trimmed);
      } else {
        invalid.push(trimmed);
      }
    }

    return { valid, invalid };
  }, [text]);

  return (
    <SectionPanel
      frame="bare"
      icon={<LinkIcon />}
      title="Paste travel links"
      subtitle="One per line. Instagram reels, blogs, magazine articles — anything."
    >
      <textarea
        id="links-input"
        className="links-input"
        placeholder={
          "https://www.instagram.com/reel/...\nhttps://blog.example.com/tokyo-guide"
        }
        rows={5}
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={disabled}
        aria-label="Paste travel links"
      />

      {parsed.invalid.length > 0 && (
        <div className="inline-errors" role="alert">
          {parsed.invalid.map((line) => (
            <p key={line}>Not a valid URL: {line}</p>
          ))}
        </div>
      )}

      <div className="form-actions ingest-form-actions">
        <div className="ingest-form-meta">
          <span className="url-count">
            {parsed.valid.length} URL{parsed.valid.length === 1 ? "" : "s"} detected
          </span>
          <label className="checkbox-row ingest-refresh">
            <input
              type="checkbox"
              checked={refresh}
              onChange={(event) => setRefresh(event.target.checked)}
              disabled={disabled}
            />
            Re-fetch saved
          </label>
        </div>
        <button
          type="button"
          className="primary-button analyze-button"
          disabled={disabled || parsed.valid.length === 0}
          onClick={() => onSubmit(parsed.valid, refresh)}
        >
          Analyze links
        </button>
      </div>
    </SectionPanel>
  );
}
