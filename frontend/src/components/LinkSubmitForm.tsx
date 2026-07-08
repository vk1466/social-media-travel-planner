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
    <section className="panel">
      <label className="field-label" htmlFor="links-input">
        Paste links, one per line
      </label>
      <textarea
        id="links-input"
        className="links-input"
        placeholder="https://www.instagram.com/reel/..."
        rows={6}
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={disabled}
      />

      {parsed.invalid.length > 0 && (
        <div className="inline-errors" role="alert">
          {parsed.invalid.map((line) => (
            <p key={line}>Not a valid URL: {line}</p>
          ))}
        </div>
      )}

      <div className="form-actions">
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={refresh}
            onChange={(event) => setRefresh(event.target.checked)}
            disabled={disabled}
          />
          Re-fetch already saved
        </label>
        <button
          type="button"
          className="primary-button"
          disabled={disabled || parsed.valid.length === 0}
          onClick={() => onSubmit(parsed.valid, refresh)}
        >
          Ingest {parsed.valid.length} link{parsed.valid.length === 1 ? "" : "s"}
        </button>
      </div>
    </section>
  );
}
