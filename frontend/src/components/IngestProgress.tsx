import type { JobLink } from "../api";

interface IngestProgressProps {
  links: JobLink[];
  running: boolean;
  onOpenPost?: (platform: string, postId: string) => void;
}

function statusLabel(link: JobLink): string {
  switch (link.status) {
    case "pending":
      return "Waiting to start";
    case "fetching":
      return "Fetching post details…";
    case "saved":
      return "Saved";
    case "linked":
      return "Added to your library (already processed — no API credits used)";
    case "skipped":
      return "Already in your library — skipped";
    case "unsupported":
      return "We don't support this site yet";
    case "error":
      return link.error_message || "Failed to ingest";
    default:
      return link.status;
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

function platformFromUrl(postUrl: string): string | null {
  try {
    const host = new URL(postUrl).hostname.replace(/^www\./, "");
    if (host.includes("instagram.com")) {
      return "instagram";
    }
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      return "youtube";
    }
    if (host.includes("tiktok.com")) {
      return "tiktok";
    }
    if (host.includes("reddit.com")) {
      return "reddit";
    }
    return null;
  } catch {
    return null;
  }
}

export function IngestProgress({ links, running, onOpenPost }: IngestProgressProps) {
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
        {links.map((link) => {
          const platform = platformFromUrl(link.post_url);
          const canOpenPost =
            (link.status === "saved" || link.status === "linked" || link.status === "skipped") &&
            link.post_id &&
            platform &&
            onOpenPost;
          return (
            <li key={link.post_url} className={`progress-item status-${link.status}`}>
              <span
                className={`progress-indicator progress-indicator-${link.status}`}
                aria-hidden="true"
              />
              <div className="progress-copy">
                <p className="progress-url">{shortenUrl(link.post_url)}</p>
                <p className="progress-status">{statusLabel(link)}</p>
                {canOpenPost && (
                  <button
                    type="button"
                    className="inline-link-button progress-open-button"
                    onClick={() => onOpenPost(platform, link.post_id!)}
                  >
                    View saved post
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
