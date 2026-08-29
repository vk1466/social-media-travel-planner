import { useRef, useState, type ReactNode, type RefObject } from "react";

import {
  DEMO_STOPS,
  DemoMapsButton,
  DemoPlaceButton,
  FakeMap,
  PhoneFrame,
  useSnapIndex,
  type Toast,
} from "./FlipDetailCardDemos";
import "./flip-card-demos.css";

type Stop = (typeof DEMO_STOPS)[number];

function Pager({
  activeIndex,
  onSelect,
}: {
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
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
            onClick={() => onSelect(index)}
            aria-label={item.name}
          />
        ))}
      </div>
    </div>
  );
}

function SnapShell({
  activeKey,
  listRef,
  activeIndex,
  onSelect,
  children,
}: {
  activeKey: string;
  listRef: RefObject<HTMLUListElement | null>;
  activeIndex: number;
  onSelect: (index: number) => void;
  children: ReactNode;
}) {
  return (
    <div className="flip-demo-face">
      <FakeMap activeKey={activeKey} />
      <div className="flip-demo-overlay">
        <ul className="post-flip-place-list flip-demo-list" ref={listRef}>
          {children}
        </ul>
        <Pager activeIndex={activeIndex} onSelect={onSelect} />
      </div>
    </div>
  );
}

function useExpandList(startOpen = true) {
  const listRef = useRef<HTMLUListElement>(null);
  const { activeIndex, scrollTo } = useSnapIndex(listRef, DEMO_STOPS.length);
  const [expandedKey, setExpandedKey] = useState<string | null>(
    startOpen ? DEMO_STOPS[0]!.key : null,
  );
  const toggle = (key: string) => setExpandedKey((current) => (current === key ? null : key));
  return { listRef, activeIndex, scrollTo, expandedKey, toggle };
}

function MapsPlace({
  item,
  onToast,
  inline,
}: {
  item: Stop;
  onToast: (toast: Toast) => void;
  inline?: boolean;
}) {
  return (
    <span className={inline ? "flip-place-inline-actions" : "flip-demo-actions-row"}>
      <DemoMapsButton onClick={() => onToast({ kind: "maps", name: item.name })} />
      <DemoPlaceButton onClick={() => onToast({ kind: "place", name: item.name })} />
    </span>
  );
}

function LayoutDemo({
  render,
}: {
  render: (item: Stop, index: number, expanded: boolean, toggle: (key: string) => void) => ReactNode;
}) {
  const { listRef, activeIndex, scrollTo, expandedKey, toggle } = useExpandList();

  return (
    <SnapShell
      activeKey={DEMO_STOPS[activeIndex]!.key}
      listRef={listRef}
      activeIndex={activeIndex}
      onSelect={scrollTo}
    >
      {DEMO_STOPS.map((item, index) => {
        const expanded = expandedKey === item.key;
        return (
          <li key={item.key} className={index === activeIndex ? "post-flip-place-item is-active" : "post-flip-place-item"}>
            {render(item, index, expanded, toggle)}
          </li>
        );
      })}
    </SnapShell>
  );
}

function AFlowLine({ onToast }: { onToast: (toast: Toast) => void }) {
  return (
    <LayoutDemo
      render={(item, _index, expanded, toggle) => (
        <div className="flip-place-body">
          <p className="flip-place-flow">
            <button type="button" className="flip-place-name-inline" onClick={() => toggle(item.key)}>
              {item.name}
            </button>
            <span className="flip-place-sep">·</span>
            <span className="flip-demo-chip">{item.category}</span>
          </p>
          {expanded && (
            <>
              <p className="post-flip-place-blurb">{item.details}</p>
              <p className="post-flip-place-tip">{item.tip}</p>
              <MapsPlace item={item} onToast={onToast} />
            </>
          )}
        </div>
      )}
    />
  );
}

function BMetaInline({ onToast }: { onToast: (toast: Toast) => void }) {
  return (
    <LayoutDemo
      render={(item, _index, expanded, toggle) => (
        <div className="flip-place-body">
          <p className="flip-place-flow">
            <button type="button" className="flip-place-name-inline" onClick={() => toggle(item.key)}>
              {item.name}
            </button>
          </p>
          <p className="flip-place-meta-inline">
            {[item.category, ...item.metaParts].filter(Boolean).join(" · ")}
          </p>
          {expanded && (
            <>
              <p className="post-flip-place-blurb">{item.details}</p>
              <p className="post-flip-place-tip">{item.tip}</p>
              <MapsPlace item={item} onToast={onToast} />
            </>
          )}
        </div>
      )}
    />
  );
}

function CTitleActions({ onToast }: { onToast: (toast: Toast) => void }) {
  return (
    <LayoutDemo
      render={(item, _index, expanded, toggle) => (
        <div className="flip-place-body">
          <p className="flip-place-flow flip-place-flow-spread">
            <button type="button" className="flip-place-name-inline" onClick={() => toggle(item.key)}>
              {item.name}
            </button>
            <MapsPlace item={item} onToast={onToast} inline />
          </p>
          {expanded && (
            <>
              <p className="flip-place-meta-inline">
                {[item.category, ...item.metaParts].join(" · ")}
              </p>
              <p className="post-flip-place-blurb">{item.details}</p>
              <p className="post-flip-place-tip">{item.tip}</p>
            </>
          )}
        </div>
      )}
    />
  );
}

function DBlurbRunOn({ onToast }: { onToast: (toast: Toast) => void }) {
  return (
    <LayoutDemo
      render={(item, _index, expanded, toggle) => (
        <div className="flip-place-body">
          <p className="flip-place-runon">
            <button type="button" className="flip-place-name-inline" onClick={() => toggle(item.key)}>
              {item.name}
            </button>
            {expanded ? (
              <span className="flip-place-runon-rest"> — {item.details}</span>
            ) : (
              <span className="flip-place-runon-rest flip-place-runon-clip"> — {item.details}</span>
            )}
          </p>
          {expanded && (
            <>
              <p className="flip-place-tip-inline">
                <span className="flip-demo-chip">Tip</span> {item.tip}
              </p>
              <MapsPlace item={item} onToast={onToast} inline />
            </>
          )}
        </div>
      )}
    />
  );
}

function ETipOnTitle({ onToast }: { onToast: (toast: Toast) => void }) {
  return (
    <LayoutDemo
      render={(item, _index, expanded, toggle) => (
        <div className="flip-place-body">
          <p className="flip-place-flow">
            <button type="button" className="flip-place-name-inline" onClick={() => toggle(item.key)}>
              {item.name}
            </button>
            <span className="flip-place-sep">·</span>
            <span className="flip-place-tip-clip">{item.tip}</span>
          </p>
          {expanded && (
            <>
              <p className="post-flip-place-blurb">{item.details}</p>
              <p className="flip-place-meta-inline">{[item.category, ...item.metaParts].join(" · ")}</p>
              <MapsPlace item={item} onToast={onToast} />
            </>
          )}
        </div>
      )}
    />
  );
}

function FChipStreet({ onToast }: { onToast: (toast: Toast) => void }) {
  return (
    <LayoutDemo
      render={(item, _index, expanded, toggle) => (
        <div className="flip-place-body">
          <p className="flip-place-flow">
            <button type="button" className="flip-place-name-inline" onClick={() => toggle(item.key)}>
              {item.name}
            </button>
          </p>
          <p className="flip-place-chips">
            <span className="flip-place-chip">{item.category}</span>
            <span className="flip-place-chip">{item.metaParts[0]}</span>
            <DemoMapsButton onClick={() => onToast({ kind: "maps", name: item.name })} />
            <DemoPlaceButton onClick={() => onToast({ kind: "place", name: item.name })} />
          </p>
          {expanded && (
            <>
              <p className="post-flip-place-blurb">{item.details}</p>
              <p className="post-flip-place-tip">{item.tip}</p>
            </>
          )}
        </div>
      )}
    />
  );
}

function GSplitRail({ onToast }: { onToast: (toast: Toast) => void }) {
  return (
    <LayoutDemo
      render={(item, _index, expanded, toggle) => (
        <div className="flip-place-split">
          <div className="flip-place-body">
            <button type="button" className="flip-place-name-inline" onClick={() => toggle(item.key)}>
              {item.name}
            </button>
            <p className="flip-place-meta-inline">{item.category}</p>
            {expanded && <p className="post-flip-place-blurb">{item.details}</p>}
            {expanded && <p className="post-flip-place-tip">{item.tip}</p>}
          </div>
          <MapsPlace item={item} onToast={onToast} />
        </div>
      )}
    />
  );
}

function HCaptionStack({ onToast }: { onToast: (toast: Toast) => void }) {
  return (
    <LayoutDemo
      render={(item, _index, expanded, toggle) => (
        <div className="flip-place-body">
          <p className="flip-place-kicker">{item.category}</p>
          <button type="button" className="flip-place-name-block" onClick={() => toggle(item.key)}>
            {item.name}
          </button>
          {expanded && (
            <>
              <p className="post-flip-place-blurb">{item.details}</p>
              <p className="flip-place-tip-inline">
                Tip · {item.tip}
              </p>
              <MapsPlace item={item} onToast={onToast} inline />
            </>
          )}
        </div>
      )}
    />
  );
}

function IFooterBar({ onToast }: { onToast: (toast: Toast) => void }) {
  return (
    <LayoutDemo
      render={(item, _index, expanded, toggle) => (
        <div className="flip-place-body">
          <p className="flip-place-flow">
            <button type="button" className="flip-place-name-inline" onClick={() => toggle(item.key)}>
              {item.name}
            </button>
            <span className="flip-place-sep">·</span>
            <span className="flip-demo-chip">{item.category}</span>
          </p>
          {expanded && <p className="post-flip-place-blurb">{item.details}</p>}
          {expanded && <p className="post-flip-place-tip">{item.tip}</p>}
          <p className="flip-place-footer">
            <MapsPlace item={item} onToast={onToast} inline />
            <span className="flip-place-sep">·</span>
            <span>{item.metaParts[1] ?? item.metaParts[0]}</span>
          </p>
        </div>
      )}
    />
  );
}

function JSentence({ onToast }: { onToast: (toast: Toast) => void }) {
  return (
    <LayoutDemo
      render={(item, _index, expanded, toggle) => (
        <div className="flip-place-body">
          <p className="flip-place-sentence">
            <button type="button" className="flip-place-name-inline" onClick={() => toggle(item.key)}>
              {item.name}
            </button>
            , a {(item.category ?? "stop").toLowerCase()} on {item.metaParts[0]}
            {expanded ? `. ${item.details}` : "."}
          </p>
          {expanded && (
            <>
              <p className="flip-place-tip-inline">Tip · {item.tip}</p>
              <MapsPlace item={item} onToast={onToast} inline />
            </>
          )}
        </div>
      )}
    />
  );
}

export function FlipCollapsedVariations() {
  const [toasts, setToasts] = useState<Record<string, Toast>>({});
  const setToast = (id: string) => (toast: Toast) => {
    setToasts((prev) => ({ ...prev, [id]: toast }));
  };

  return (
    <div className="flip-demo-page">
      <div className="flip-demo-intro">
        <p className="flip-demo-kicker">Collapsed snap · detail placement</p>
        <h1>Where the words sit</h1>
        <p>
          Same tap-to-expand. These ten only move index, name, category, blurb, tip, and Maps/Place
          — inline, wrapping, chips, footer. First card starts open so you can see the layout.{" "}
          <a className="flip-demo-inline-link" href="/dev/flip-cards">
            Back to 1–5
          </a>
        </p>
      </div>
      <div className="flip-demo-grid">
        <PhoneFrame title="A. Flow line" how="Index, name, and category on one baseline." toast={toasts.a ?? null}>
          <AFlowLine onToast={setToast("a")} />
        </PhoneFrame>
        <PhoneFrame title="B. Meta inline" how="Name, then one muted line: category · place · coords." toast={toasts.b ?? null}>
          <BMetaInline onToast={setToast("b")} />
        </PhoneFrame>
        <PhoneFrame title="C. Title + actions" how="Maps · Place sit on the title row, not a side column." toast={toasts.c ?? null}>
          <CTitleActions onToast={setToast("c")} />
        </PhoneFrame>
        <PhoneFrame title="D. Blurb run-on" how="Details continue after the name with a dash, same paragraph." toast={toasts.d ?? null}>
          <DBlurbRunOn onToast={setToast("d")} />
        </PhoneFrame>
        <PhoneFrame title="E. Tip on title" how="Tip is an inline clip after the name. Blurb only when expanded." toast={toasts.e ?? null}>
          <ETipOnTitle onToast={setToast("e")} />
        </PhoneFrame>
        <PhoneFrame title="F. Chip street" how="Category, location, Maps, Place as wrapping chips under the name." toast={toasts.f ?? null}>
          <FChipStreet onToast={setToast("f")} />
        </PhoneFrame>
        <PhoneFrame title="G. Split rail" how="Copy left, Maps/Place stacked on the right (today’s column, tighter)." toast={toasts.g ?? null}>
          <GSplitRail onToast={setToast("g")} />
        </PhoneFrame>
        <PhoneFrame title="H. Caption stack" how="Tiny kicker above a block title. Tip as “Tip · …” inline." toast={toasts.h ?? null}>
          <HCaptionStack onToast={setToast("h")} />
        </PhoneFrame>
        <PhoneFrame title="I. Footer bar" how="One bottom line: Maps · Place · coords, always visible." toast={toasts.i ?? null}>
          <IFooterBar onToast={setToast("i")} />
        </PhoneFrame>
        <PhoneFrame title="J. Sentence" how="Index + name + category + region wrap as one sentence; blurb appends." toast={toasts.j ?? null}>
          <JSentence onToast={setToast("j")} />
        </PhoneFrame>
      </div>
    </div>
  );
}
