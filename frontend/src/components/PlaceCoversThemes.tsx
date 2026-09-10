import type { CSSProperties } from "react";

import { leafPlaces, levelLabel, type AtlasNode } from "../placeAtlasModel";

interface PlaceMagazineCoversProps {
  scope: AtlasNode;
  trail: AtlasNode[];
  children: AtlasNode[];
  onOpenNode: (node: AtlasNode) => void;
}

function nodeImage(node: AtlasNode): string | null {
  return leafPlaces(node).find((place) => place.imageUrl)?.imageUrl ?? null;
}

function coverStyle(node: AtlasNode, index: number): CSSProperties {
  const imageUrl = nodeImage(node);
  const hue = (index * 47 + node.name.length * 13) % 360;
  const fallback = `linear-gradient(145deg, hsl(${hue} 24% 42%), hsl(${(hue + 34) % 360} 32% 16%))`;
  return {
    backgroundImage: imageUrl
      ? `linear-gradient(0deg, rgb(6 14 10 / 0.18), transparent 68%), url("${imageUrl.replaceAll('"', '\\"')}")`
      : fallback,
  };
}

function actionLabel(node: AtlasNode): string {
  return node.level === "place"
    ? "Open place"
    : `Explore ${node.total} place${node.total === 1 ? "" : "s"}`;
}

function HierarchyNav({ trail, onOpenNode }: Pick<PlaceMagazineCoversProps, "trail" | "onOpenNode">) {
  const parent = trail.at(-2);
  return (
    <nav className="place-theme-hierarchy" aria-label="Atlas hierarchy">
      <div>
        {trail.map((node, index) => (
          <span key={node.key}>
            {index > 0 ? <i>/</i> : null}
            <button type="button" aria-current={index === trail.length - 1 ? "page" : undefined} onClick={() => onOpenNode(node)}>
              {node.name}
            </button>
          </span>
        ))}
      </div>
      {parent ? <button type="button" className="place-theme-up" onClick={() => onOpenNode(parent)}>↑ Up to {parent.name}</button> : null}
    </nav>
  );
}

export function PlaceMagazineCovers({ scope, trail, children, onOpenNode }: PlaceMagazineCoversProps) {
  return (
    <section className="place-theme place-theme--magazine">
      <HierarchyNav trail={trail} onOpenNode={onOpenNode} />
      <header className="magazine-heading">
        <div><span>The travel edit</span><h3>{scope.name}</h3></div>
        <small>{children.length} {children.length === 1 ? "story" : "stories"}</small>
      </header>
      <div className="magazine-grid">
        {children.map((node, index) => {
          const location = node.place?.trail.slice(-2).join(" · ") || `${levelLabel(node.level)} · ${scope.name}`;
          const category = node.place?.categoryLabel || levelLabel(node.level);
          return (
            <button key={node.key} type="button" className="magazine-card" onClick={() => onOpenNode(node)} aria-label={`${actionLabel(node)}: ${node.name}`}>
              <span className="magazine-card-media" style={coverStyle(node, index)}>
                <span className="magazine-card-category">{category}</span>
                <span className="magazine-card-save" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3h12v18l-6-4-6 4V3Z" /></svg>
                </span>
                <span className="magazine-card-kicker">The {scope.name} edit · {String(index + 1).padStart(2, "0")}</span>
              </span>
              <span className="magazine-card-copy">
                <span className="magazine-card-location">⌖ {location}</span>
                <strong>{node.name}</strong>
                <span className="magazine-card-foot">
                  <span>{node.level === "place" ? `${node.saves} saved ${node.saves === 1 ? "post" : "posts"}` : `${node.total} saved places`}</span>
                  <span>View ↗</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
