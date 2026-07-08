import type { JobLink } from "../api";

interface IngestProgressProps {
  links: JobLink[];
  running: boolean;
}

function statusLabel(link: JobLink): string {
  switch (link.status) {
    case "pending":
      return "Waiting to start";
    case "fetching":
      return "Fetching post details…";
    case "saved":
      return "Saved";
    case "skipped":
      return "Already saved — skipped (no API credits used)";
    case "unsupported":
      return "We don't support this site yet";
    case "error":
      return link.error_message || "Failed to ingest";
    default:
      return link.status;
  }
}

function statusIcon(status: JobLink["status"]): string {
  switch (status) {
    case "pending":
      return "○";
    case "fetching":
      return "⟳";
    case "saved":
      return "✓";
    case "skipped":
    case "unsupported":
      return "–";
    case "error":
      return "✗";
    default:
      return "•";
  }
}

function shortenUrl(postUrl: string): string {
  try {
    const url = new URL(postUrl);
    const path = url.pathname.replace(/\/$/, "");
    return `${url.hostname}${path}`;
  } catch {
    return postUrl;
  }
}

export function IngestProgress({ links, running }: IngestProgressProps) {
  if (links.length === 0) {
    return null;
  }

  return (
    <section className="panel">
      <div className="section-header">
        <h2>Progress</h2>
        {running && <span className="badge badge-running">Running</span>}
      </div>
      <ul className="progress-list">
        {links.map((link) => (
          <li key={link.post_url} className={`progress-item status-${link.status}`}>
            <span className="progress-icon" aria-hidden="true">
              {statusIcon(link.status)}
            </span>
            <div className="progress-copy">
              <p className="progress-url">{shortenUrl(link.post_url)}</p>
              <p className="progress-status">{statusLabel(link)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
