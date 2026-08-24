import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";

import type { ReelDetailItem } from "./postDetailUtils";
import "./flip-card-demos.css";

export const DEMO_STOPS: Array<ReelDetailItem & { mapX: number; mapY: number }> = [
  {
    key: "rialto",
    name: "Rialto Beach",
    category: "Beach",
    metaParts: ["Olympic Peninsula", "47.934°N  124.638°W"],
    details: "Sea stacks and driftwood just after the parking lot. Tide tables matter for Hole-in-the-Wall.",
    tip: "Go at minus tide if you want the walk north to feel like a different coast.",
    placeId: "us-washington-rialto-beach",
    mapUrl: "https://maps.google.com/?q=Rialto+Beach",
    mapX: 22,
    mapY: 58,
  },
  {
    key: "punchbowl",
    name: "Devil’s Punchbowl",
    category: "Viewpoint",
    metaParts: ["Olympic Peninsula", "47.941°N  124.385°W"],
    details: "Cliff-edge lookout over the Strait of Juan de Fuca; best in late afternoon light.",
    tip: "Park at the pullout, not the trailhead lot — it fills by 10am.",
    placeId: "us-washington-devils-punchbowl",
    mapUrl: "https://maps.google.com/?q=Devils+Punchbowl+Olympic",
    mapX: 48,
    mapY: 36,
  },
  {
    key: "lapush",
    name: "First Beach, La Push",
    category: "Beach",
    metaParts: ["Quileute", "47.904°N  124.637°W"],
    details: "Village beach with James Island sitting off the mouth of the river.",
    tip: "Stay on the public beach; the headlands beyond are tribal land.",
    placeId: "us-washington-first-beach",
    mapUrl: "https://maps.google.com/?q=First+Beach+La+Push",
    mapX: 28,
    mapY: 72,
  },
  {
    key: "hurricane",
    name: "Hurricane Ridge",
    category: "Viewpoint",
    metaParts: ["Olympic National Park", "47.970°N  123.498°W"],
    details: "Alpine road with Olympic peaks on a clear day and fog the rest of the time.",
    tip: "Check the webcam before you drive; the gate closes for weather without much warning.",
    placeId: "us-washington-hurricane-ridge",
    mapUrl: "https://maps.google.com/?q=Hurricane+Ridge",
    mapX: 74,
    mapY: 28,
  },
];

export type Toast = { kind: "place" | "maps"; name: string } | null;

/** Four-color Google Maps pin. */
export function GoogleMapsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#34A853" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
      <path fill="#FBBC04" d="M12 2v20s7-7.75 7-13a7 7 0 0 0-7-7z" />
      <path fill="#EA4335" d="M12 9v13s7-7.75 7-13H12z" />
      <path fill="#4285F4" d="M5 9a7 7 0 0 0 1.76 4.7L12 22V9H5z" />
      <circle cx="12" cy="9" r="3.15" fill="#1A73E8" />
      <circle cx="12" cy="9" r="1.45" fill="#fff" />
    </svg>
  );
}

/** Wanderfile place mark — rounded tile with a W, not a map pin. */
export function WanderfilePlaceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect width="16" height="16" rx="4" fill="currentColor" opacity="0.22" />
      <path
        d="M3.4 4.2h1.55l1.42 5.35L8 6.05l1.63 3.5 1.42-5.35H12.6L10.7 12.1H9.05L8 9.55 6.95 12.1H5.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function DemoMapsButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="flip-place-icon-btn" aria-label="Open in Google Maps" title="Maps" onClick={onClick}>
      <GoogleMapsIcon />
    </button>
  );
}

export function DemoPlaceButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="flip-place-icon-btn" aria-label="Open place" title="Place" onClick={onClick}>
      <WanderfilePlaceIcon />
    </button>
  );
}

export function PhoneFrame({
  title,
  how,
  toast,
  children,
}: {
  title: string;
  how: string;
  toast: Toast;
  children: ReactNode;
}) {
  return (
    <article className="flip-demo-stage">
      <header className="flip-demo-stage-copy">
        <h2>{title}</h2>
        <p>{how}</p>
        <p className="flip-demo-toast" aria-live="polite">
          {toast
            ? toast.kind === "place"
              ? `Would open Place · ${toast.name}`
              : `Would open Maps · ${toast.name}`
            : "Interact with the phone — nothing leaves this page."}
        </p>
      </header>
      <div className="flip-demo-phone">{children}</div>
    </article>
  );
}

export function FakeMap({ activeKey }: { activeKey: string }) {
  return (
    <div className="flip-demo-map" aria-hidden="true">
      <div className="flip-demo-map-land" />
      <div className="flip-demo-map-water" />
      {DEMO_STOPS.map((stop) => (
        <span
          key={stop.key}
          className={stop.key === activeKey ? "flip-demo-pin is-active" : "flip-demo-pin"}
          style={{ left: `${stop.mapX}%`, top: `${stop.mapY}%` }}
        />
      ))}
    </div>
  );
}

export function useSnapIndex(listRef: RefObject<HTMLUListElement | null>, itemCount: number) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const items = [...list.querySelectorAll<HTMLElement>(":scope > li")];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = items.indexOf(visible.target as HTMLElement);
        if (index >= 0) setActiveIndex(index);
      },
      { root: list, threshold: 0.55 },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [listRef, itemCount]);

  const scrollTo = useCallback(
    (index: number) => {
      setActiveIndex(index);
      const item = listRef.current?.children[index] as HTMLElement | undefined;
      item?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    },
    [listRef],
  );

  return { activeIndex, setActiveIndex, scrollTo };
}

function Demo1Collapsed({ onToast }: { onToast: (toast: Toast) => void }) {
  const listRef = useRef<HTMLUListElement>(null);
  const { activeIndex, scrollTo } = useSnapIndex(listRef, DEMO_STOPS.length);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const active = DEMO_STOPS[activeIndex]!;

  return (
    <div className="flip-demo-face">
      <FakeMap activeKey={active.key} />
      <div className="flip-demo-overlay">
        <ul className="post-flip-place-list flip-demo-list" ref={listRef}>
          {DEMO_STOPS.map((item, index) => {
            const expanded = expandedKey === item.key;
            return (
              <li
                key={item.key}
                className={index === activeIndex ? "post-flip-place-item is-active" : "post-flip-place-item"}
              >
                <button
                  type="button"
                  className="flip-demo-expand"
                  onClick={() => setExpandedKey(expanded ? null : item.key)}
                >
                  <span className="flip-demo-expand-copy">
                    <span className="post-flip-place-name-static">{item.name}</span>
                    <span className="flip-demo-chip">{item.category}</span>
                    {expanded && item.details && <span className="post-flip-place-blurb">{item.details}</span>}
                    {expanded && item.tip && <span className="post-flip-place-tip">{item.tip}</span>}
                  </span>
                  <span className="flip-demo-hint">{expanded ? "Less" : "Tap"}</span>
                </button>
                {expanded && (
                  <div className="post-flip-place-actions flip-demo-actions-row">
                    <DemoMapsButton onClick={() => onToast({ kind: "maps", name: item.name })} />
                    <DemoPlaceButton onClick={() => onToast({ kind: "place", name: item.name })} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="post-flip-place-pager">
          <p className="post-flip-brief-meta">
            {activeIndex + 1} / {DEMO_STOPS.length}
          </p>
          <div className="post-flip-place-dots">
            {DEMO_STOPS.map((item, index) => (
              <button
                key={item.key}
                type="button"
                className={index === activeIndex ? "post-flip-place-dot is-active" : "post-flip-place-dot"}
                onClick={() => scrollTo(index)}
                aria-label={item.name}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Demo2Pager({ onToast }: { onToast: (toast: Toast) => void }) {
  const [activeIndex, setActiveIndex] = useState(1);
  const touchX = useRef<number | null>(null);
  const item = DEMO_STOPS[activeIndex]!;

  const go = (next: number) => {
    setActiveIndex(Math.max(0, Math.min(DEMO_STOPS.length - 1, next)));
  };

  return (
    <div className="flip-demo-face">
      <FakeMap activeKey={item.key} />
      <div className="flip-demo-overlay">
        <div
          className="flip-demo-pager-card"
          onTouchStart={(event) => {
            touchX.current = event.changedTouches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            if (touchX.current == null) return;
            const dx = (event.changedTouches[0]?.clientX ?? 0) - touchX.current;
            if (dx < -40) go(activeIndex + 1);
            if (dx > 40) go(activeIndex - 1);
            touchX.current = null;
          }}
        >
          <div className="flip-demo-pager-chrome">
            <span>
              Stop {activeIndex + 1} of {DEMO_STOPS.length}
            </span>
            <div className="post-flip-place-dots">
              {DEMO_STOPS.map((stop, index) => (
                <button
                  key={stop.key}
                  type="button"
                  className={index === activeIndex ? "post-flip-place-dot is-active" : "post-flip-place-dot"}
                  onClick={() => go(index)}
                />
              ))}
            </div>
          </div>
          <h3>{item.name}</h3>
          <p className="post-flip-place-meta">{[item.category, ...item.metaParts].join(" · ")}</p>
          <p className="post-flip-place-blurb">{item.details}</p>
          <div className="flip-demo-actions-row">
            <DemoMapsButton onClick={() => onToast({ kind: "maps", name: item.name })} />
            <DemoPlaceButton onClick={() => onToast({ kind: "place", name: item.name })} />
          </div>
          <div className="flip-demo-pager-nav">
            <button type="button" onClick={() => go(activeIndex - 1)} disabled={activeIndex === 0}>
              Prev
            </button>
            <button
              type="button"
              onClick={() => go(activeIndex + 1)}
              disabled={activeIndex === DEMO_STOPS.length - 1}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type SheetHeight = "peek" | "half" | "full";

function Demo3Sheet({ onToast }: { onToast: (toast: Toast) => void }) {
  const [activeIndex, setActiveIndex] = useState(1);
  const [height, setHeight] = useState<SheetHeight>("peek");
  const dragStartY = useRef<number | null>(null);
  const item = DEMO_STOPS[activeIndex]!;

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    dragStartY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragStartY.current == null) return;
    const dy = event.clientY - dragStartY.current;
    dragStartY.current = null;
    const order: SheetHeight[] = ["peek", "half", "full"];
    const current = order.indexOf(height);
    if (dy < -24) setHeight(order[Math.min(2, current + 1)]!);
    else if (dy > 24) setHeight(order[Math.max(0, current - 1)]!);
  };

  return (
    <div className="flip-demo-face">
      <FakeMap activeKey={item.key} />
      <div className={`flip-demo-sheet is-${height}`}>
        <button
          type="button"
          className="flip-demo-handle"
          aria-label="Drag sheet height"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        />
        <p className="flip-demo-sheet-name">{item.name}</p>
        <p className="flip-demo-chip">{item.category}</p>
        {(height === "half" || height === "full") && (
          <p className="post-flip-place-blurb">{item.details}</p>
        )}
        {height === "full" && (
          <>
            <p className="post-flip-place-tip">{item.tip}</p>
            <div className="flip-demo-actions-row">
              <DemoMapsButton onClick={() => onToast({ kind: "maps", name: item.name })} />
              <DemoPlaceButton onClick={() => onToast({ kind: "place", name: item.name })} />
            </div>
          </>
        )}
        {height !== "peek" && (
          <div className="flip-demo-sheet-nav">
            <button type="button" onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}>
              Prev stop
            </button>
            <button type="button" onClick={() => setHeight("peek")}>
              Peek
            </button>
            <button type="button" onClick={() => setHeight("half")}>
              Half
            </button>
            <button type="button" onClick={() => setHeight("full")}>
              Full
            </button>
            <button type="button" onClick={() => setActiveIndex((i) => Math.min(DEMO_STOPS.length - 1, i + 1))}>
              Next stop
            </button>
          </div>
        )}
        {height === "peek" && (
          <div className="flip-demo-sheet-nav">
            <button type="button" onClick={() => setHeight("half")}>
              Half
            </button>
            <button type="button" onClick={() => setHeight("full")}>
              Full
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Demo4TipHero({ onToast }: { onToast: (toast: Toast) => void }) {
  const listRef = useRef<HTMLUListElement>(null);
  const { activeIndex, scrollTo } = useSnapIndex(listRef, DEMO_STOPS.length);
  const active = DEMO_STOPS[activeIndex]!;

  return (
    <div className="flip-demo-face">
      <FakeMap activeKey={active.key} />
      <div className="flip-demo-overlay">
        <ul className="post-flip-place-list flip-demo-list" ref={listRef}>
          {DEMO_STOPS.map((item, index) => (
            <li
              key={item.key}
              className={index === activeIndex ? "post-flip-place-item is-active flip-demo-tip-card" : "post-flip-place-item flip-demo-tip-card"}
            >
              <p className="flip-demo-tip-hero">{item.tip}</p>
              <p className="flip-demo-tip-caption">
                {item.name}
                <span className="flip-demo-chip">{item.category}</span>
              </p>
              <p className="post-flip-place-blurb">{item.details}</p>
              <div className="flip-demo-actions-row">
                <DemoMapsButton onClick={() => onToast({ kind: "maps", name: item.name })} />
                <DemoPlaceButton onClick={() => onToast({ kind: "place", name: item.name })} />
              </div>
            </li>
          ))}
        </ul>
        <div className="post-flip-place-pager">
          <p className="post-flip-brief-meta">
            {activeIndex + 1} / {DEMO_STOPS.length}
          </p>
          <div className="post-flip-place-dots">
            {DEMO_STOPS.map((item, index) => (
              <button
                key={item.key}
                type="button"
                className={index === activeIndex ? "post-flip-place-dot is-active" : "post-flip-place-dot"}
                onClick={() => scrollTo(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Demo5WholeCard({ onToast }: { onToast: (toast: Toast) => void }) {
  const listRef = useRef<HTMLUListElement>(null);
  const { activeIndex, scrollTo } = useSnapIndex(listRef, DEMO_STOPS.length);
  const active = DEMO_STOPS[activeIndex]!;

  return (
    <div className="flip-demo-face">
      <FakeMap activeKey={active.key} />
      <div className="flip-demo-overlay">
        <ul className="post-flip-place-list flip-demo-list" ref={listRef}>
          {DEMO_STOPS.map((item, index) => (
            <li key={item.key} className={index === activeIndex ? "post-flip-place-item is-active" : "post-flip-place-item"}>
              <button type="button" className="flip-demo-whole" onClick={() => onToast({ kind: "place", name: item.name })}>
                <span className="flip-demo-expand-copy">
                  <span className="post-flip-place-name-static">{item.name}</span>
                  <span className="post-flip-place-meta">
                    {item.category} · tap card for Place
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="flip-demo-maps-fab flip-place-icon-btn"
                aria-label="Open in Google Maps"
                title="Maps"
                onClick={(event) => {
                  event.stopPropagation();
                  onToast({ kind: "maps", name: item.name });
                }}
              >
                <GoogleMapsIcon />
              </button>
            </li>
          ))}
        </ul>
        <div className="post-flip-place-pager">
          <p className="post-flip-brief-meta">
            {activeIndex + 1} / {DEMO_STOPS.length}
          </p>
          <div className="post-flip-place-dots">
            {DEMO_STOPS.map((item, index) => (
              <button
                key={item.key}
                type="button"
                className={index === activeIndex ? "post-flip-place-dot is-active" : "post-flip-place-dot"}
                onClick={() => scrollTo(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FlipDetailCardDemos() {
  const [toasts, setToasts] = useState<Record<string, Toast>>({});

  const setToast = (id: string) => (toast: Toast) => {
    setToasts((prev) => ({ ...prev, [id]: toast }));
  };

  return (
    <div className="flip-demo-page">
      <div className="flip-demo-intro">
        <p className="flip-demo-kicker">FlipDetailCard prototypes</p>
        <h1>Designs 1–5, live</h1>
        <p>
          Same four Olympic stops in each phone. Scroll sideways on the cards, drag the sheet
          handle, tap Place vs Maps. Production post detail is unchanged.{" "}
          <a className="flip-demo-inline-link" href="/dev/flip-cards/collapsed">
            Ten collapsed-snap variations
          </a>
        </p>
      </div>
      <div className="flip-demo-grid">
        <PhoneFrame
          title="1. Collapsed snap"
          how="Cards stay compact. Tap to expand copy and actions."
          toast={toasts.d1 ?? null}
        >
          <Demo1Collapsed onToast={setToast("d1")} />
        </PhoneFrame>
        <PhoneFrame
          title="2. Single pager"
          how="One card. Prev/next or dots change the stop; the pin follows."
          toast={toasts.d2 ?? null}
        >
          <Demo2Pager onToast={setToast("d2")} />
        </PhoneFrame>
        <PhoneFrame
          title="3. Sheet heights"
          how="Drag the handle up/down, or use Peek / Half / Full. Prev/next changes stop."
          toast={toasts.d3 ?? null}
        >
          <Demo3Sheet onToast={setToast("d3")} />
        </PhoneFrame>
        <PhoneFrame
          title="4. Tip as hero"
          how="Advice is the headline. Name and category sit under it."
          toast={toasts.d4 ?? null}
        >
          <Demo4TipHero onToast={setToast("d4")} />
        </PhoneFrame>
        <PhoneFrame
          title="5. Whole-card Place"
          how="Tap the card to open Place. The Maps pill is the only other action."
          toast={toasts.d5 ?? null}
        >
          <Demo5WholeCard onToast={setToast("d5")} />
        </PhoneFrame>
      </div>
    </div>
  );
}
