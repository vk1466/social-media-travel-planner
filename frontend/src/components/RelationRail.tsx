import { Link } from "react-router-dom";

import "../relation-rail.css";

export interface RelationRailItem {
  key: string;
  to: string;
  label: string;
  sublabel?: string;
  background: string;
  shape: "tile" | "cover";
}

export interface RelationRailProps {
  heading: string;
  emptyText: string;
  items: RelationRailItem[];
}

export function RelationRail({ heading, emptyText, items }: RelationRailProps) {
  return (
    <section className="rr">
      <h3 className="rr-heading">{heading}</h3>
      {items.length === 0 ? (
        <p className="rr-empty">{emptyText}</p>
      ) : (
        <div className="rr-rail">
          {items.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              className="rr-item"
              data-shape={item.shape}
              style={{ background: item.background }}
            >
              <span className="rr-item-scrim" aria-hidden="true" />
              <span className="rr-item-text">
                <span className="rr-item-label">{item.label}</span>
                {item.sublabel ? (
                  <span className="rr-item-sublabel">{item.sublabel}</span>
                ) : null}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
