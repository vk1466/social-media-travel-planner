import { useMemo, useState } from "react";

interface LinkSubmitFormProps {
  disabled?: boolean;
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

export function LinkSubmitForm({ disabled = false, onSubmit }: LinkSubmitFormProps) {
  const [text, setText] = useState("");
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
    <section className="ingest-panel panel">
      <div className="ingest-panel-header">
        <span className="ingest-panel-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path
              d="M7.5 10.5 3 6m0 0 4.5-4.5M3 6h8.5a4 4 0 0 1 0 8H11"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div>
          <h2 className="ingest-panel-title">Paste travel links</h2>
          <p className="ingest-panel-subtitle">
            One per line. Instagram reels, blogs, magazine articles — anything.
          </p>
        </div>
      </div>

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
    </section>
  );
}
