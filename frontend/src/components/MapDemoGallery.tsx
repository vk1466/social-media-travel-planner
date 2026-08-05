import { Link } from "react-router-dom";

import { LIVING_MAP_THEMES } from "../livingMapThemes";

import "../living-map.css";

export function MapDemoGallery() {
  return (
    <div className="map-demo-gallery">
      <div className="map-demo-gallery-inner">
        <header className="map-demo-gallery-header">
          <h1>Living Map · Hybrid Glaze iterations</h1>
          <p>
            Twenty variants of the Hybrid Glaze base — sage land glaze and cream ocean stay
            fixed. Pins, map labels, chrome, and light layout framing change between demos.
          </p>
          <nav className="map-demo-gallery-nav" aria-label="Related views">
            <Link to="/map">Open default map</Link>
            <Link to="/posts">Classic library</Link>
          </nav>
        </header>

        <div className="map-demo-grid">
          {LIVING_MAP_THEMES.map((theme, index) => (
            <Link
              key={theme.id}
              className="map-demo-card"
              to={`/map/demos/${theme.id}`}
            >
              <div className="map-demo-card-swatches" aria-hidden="true">
                {theme.swatches.map((color) => (
                  <span key={`${theme.id}-${color}`} style={{ background: color }} />
                ))}
              </div>
              <span className="map-demo-card-index">
                {String(index + 1).padStart(2, "0")} · {theme.mode}
              </span>
              <h2>{theme.name}</h2>
              <p>{theme.thesis}</p>
              <div className="map-demo-card-tags">
                <span>{theme.layout}</span>
                <span>{theme.land}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
