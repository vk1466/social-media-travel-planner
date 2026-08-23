import { Link } from "react-router-dom";

export interface SiteFooterProps {
  isAdmin?: boolean;
  postCount?: number;
  placeCount?: number;
}

function BrandMark() {
  return (
    <svg
      className="wf-brand-mark"
      width="28"
      height="28"
      viewBox="0 0 28 28"
      aria-hidden="true"
    >
      <circle cx="14" cy="14" r="14" fill="currentColor" />
      <path
        className="wf-brand-mark-pin"
        d="M14 7.5 16.8 16.8 14 14 11.2 16.8 14 7.5Z"
      />
      <circle className="wf-brand-mark-pin" cx="14" cy="14" r="1.1" />
    </svg>
  );
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}

export function SiteFooter({
  isAdmin = false,
  postCount,
  placeCount,
}: SiteFooterProps) {
  const showCounts = postCount !== undefined && placeCount !== undefined;

  return (
    <footer className="wf-footer">
      <div className="wf-footer-inner">
        <div className="wf-footer-grid">
          <div className="wf-footer-brand">
            <Link to="/" className="wf-footer-brand-row">
              <BrandMark />
              <span className="wf-brand-name">Wanderfile</span>
            </Link>
            <p className="wf-footer-tagline">
              Travel inspiration from your feed, turned into places you can actually go.
            </p>
          </div>

          <div>
            <h2 className="wf-footer-heading">Browse</h2>
            <ul className="wf-footer-links">
              <li>
                <Link to="/" className="wf-footer-link">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/saved" className="wf-footer-link">
                  Saved lab
                </Link>
              </li>
              <li>
                <Link to="/posts" className="wf-footer-link">
                  Saves
                </Link>
              </li>
              <li>
                <Link to="/places" className="wf-footer-link">
                  Atlas
                </Link>
              </li>
              <li>
                <Link to="/history" className="wf-footer-link">
                  History
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="wf-footer-heading">Tools</h2>
            <ul className="wf-footer-links">
              <li>
                <Link to="/add" className="wf-footer-link">
                  Add links
                </Link>
              </li>
              <li>
                <Link to="/search" className="wf-footer-link">
                  Search
                </Link>
              </li>
              {isAdmin ? (
                <li>
                  <Link to="/admin" className="wf-footer-link">
                    Admin
                  </Link>
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="wf-footer-base">
          <span>Wanderfile</span>
          {showCounts ? (
            <span className="wf-footer-counts">
              {pluralize(postCount, "save", "saves")} ·{" "}
              {pluralize(placeCount, "place", "places")}
            </span>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
