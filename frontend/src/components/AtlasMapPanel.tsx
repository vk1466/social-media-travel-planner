import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

import { type AtlasNode } from "../placeAtlasModel";

import "leaflet/dist/leaflet.css";

/** Same basemap as the production atlas so the toggle stays honest. */
const VOYAGER = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const CARTO_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

function hasCoords(node: AtlasNode): boolean {
  return node.lat !== null && node.lng !== null;
}

function clusterChildren(scope: AtlasNode): AtlasNode[] {
  return scope.children.filter((child) => child.level !== "place" && hasCoords(child));
}

function pinChildren(scope: AtlasNode): AtlasNode[] {
  return scope.children.filter((child) => child.level === "place" && hasCoords(child));
}

interface AtlasMapPanelProps {
  scope: AtlasNode;
  onOpenNode: (node: AtlasNode) => void;
}

function clusterIcon(node: AtlasNode): L.DivIcon {
  const ratio = node.total === 0 ? 0 : Math.round((node.visited / node.total) * 100);
  const size = Math.min(72, 34 + Math.sqrt(node.total) * 4);
  return L.divIcon({
    className: "pl2-map-cluster-icon",
    html: `<div class="pl2-map-cluster" style="--size:${size}px;--ratio:${ratio}%">
      <b>${node.total}</b><span>${node.name}</span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function pinIcon(visited: boolean): L.DivIcon {
  return L.divIcon({
    className: "pl2-map-pin-icon",
    html: `<i class="pl2-map-pin ${visited ? "visited" : "dream"}"></i>`,
    iconSize: [14, 14],
    iconAnchor: [7, 14],
    popupAnchor: [0, -12],
  });
}

function FitScope({ scope }: { scope: AtlasNode }) {
  const map = useMap();

  useEffect(() => {
    const points = [...clusterChildren(scope), ...pinChildren(scope)].map(
      (node) => [node.lat as number, node.lng as number] as [number, number],
    );

    if (points.length === 0) {
      map.setView([20, 0], 2);
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], 9);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 11 });
  }, [map, scope]);

  return null;
}

function InvalidateSize() {
  const map = useMap();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => map.invalidateSize());
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [map]);

  return null;
}

/**
 * The current atlas scope on a real map: child regions become clickable
 * clusters that drill down. Pins appear only when this scope's children are
 * individual places — never every descendant at once.
 */
export function AtlasMapPanel({ scope, onOpenNode }: AtlasMapPanelProps) {
  const clusters = useMemo(() => clusterChildren(scope), [scope]);
  const pins = useMemo(() => pinChildren(scope), [scope]);

  return (
    <div className="pl2-map">
      <MapContainer
        className="pl2-map-canvas"
        center={[20, 0]}
        zoom={2}
        scrollWheelZoom
        worldCopyJump
      >
        <TileLayer url={VOYAGER} attribution={CARTO_ATTR} subdomains="abcd" opacity={0.75} />
        <InvalidateSize />
        <FitScope scope={scope} />

        {pins.map((node) => {
          const place = node.place!;
          return (
            <Marker
              key={node.key}
              position={[node.lat as number, node.lng as number]}
              icon={pinIcon(place.visited)}
            >
              <Popup>
                <strong>{place.name}</strong>
                <br />
                {place.categoryLabel} · {place.visited ? "Visited" : "Inspiration"}
                <br />
                <small>{place.trail.join(" › ")}</small>
              </Popup>
            </Marker>
          );
        })}

        {clusters.map((cluster) => (
          <Marker
            key={cluster.key}
            position={[cluster.lat as number, cluster.lng as number]}
            icon={clusterIcon(cluster)}
            eventHandlers={{ click: () => onOpenNode(cluster) }}
          />
        ))}
      </MapContainer>

      <p className="pl2-hint">
        {clusters.length > 0
          ? "Bubbles are the next level down — click one to drill in. The sage fill is visited share."
          : "Every pin in this scope · solid sage is visited, outlined sand is inspiration."}
      </p>
    </div>
  );
}
