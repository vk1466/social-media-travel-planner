import { useEffect, useRef } from "react";

const INTERACTIVE =
  "input, textarea, select, option, [contenteditable='true'], [data-swipe-ignore]";
const NESTED_PAN =
  ".leaflet-container, .cover-rail, .category-nav, .lib-filters-cats, .lib-filters-seg, .book-spine-index";

function isTouchUi(): boolean {
  return window.matchMedia("(max-width: 760px), (pointer: coarse) and (hover: none)").matches;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(INTERACTIVE) || target.closest(NESTED_PAN));
}

function isScrolledFromTop(element: EventTarget | null): boolean {
  let node: HTMLElement | null = element instanceof HTMLElement ? element : null;
  while (node) {
    if (node.scrollTop > 2) return true;
    node = node.parentElement;
  }
  return false;
}

/** Horizontal flick: next/previous. Vertical flick is ignored so the page can still scroll. */
export function useHorizontalSwipe(
  targetRef: { readonly current: HTMLElement | null },
  {
    enabled,
    onLeft,
    onRight,
    threshold = 72,
  }: {
    enabled: boolean;
    onLeft?: () => void;
    onRight?: () => void;
    threshold?: number;
  },
) {
  const onLeftRef = useRef(onLeft);
  const onRightRef = useRef(onRight);
  onLeftRef.current = onLeft;
  onRightRef.current = onRight;

  useEffect(() => {
    const root = targetRef.current;
    if (!root || !enabled) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;
    let locked: "h" | "v" | null = null;
    let pointerId: number | null = null;

    const reset = () => {
      tracking = false;
      locked = null;
      pointerId = null;
    };

    const onDown = (event: PointerEvent) => {
      if (!isTouchUi() || event.pointerType === "mouse") return;
      if (isInteractive(event.target)) return;
      tracking = true;
      locked = null;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
    };

    const onMove = (event: PointerEvent) => {
      if (!tracking || event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (!locked && Math.hypot(dx, dy) > 16) {
        locked = Math.abs(dx) > Math.abs(dy) * 1.25 ? "h" : "v";
      }
    };

    const onUp = (event: PointerEvent) => {
      if (!tracking || event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      const axis = locked;
      reset();
      if (axis !== "h" || Math.abs(dx) < threshold) return;
      if (dx < 0) onLeftRef.current?.();
      else onRightRef.current?.();
    };

    root.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", reset);
    return () => {
      root.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", reset);
    };
  }, [enabled, targetRef, threshold]);
}

/** Pull down on a sheet/modal to close, when the panel is scrolled to the top. */
export function useDragDismiss(
  panelRef: { readonly current: HTMLElement | null },
  onClose: () => void,
  { enabled = true, threshold = 96 }: { enabled?: boolean; threshold?: number } = {},
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !enabled) return;

    let startY = 0;
    let dragging = false;
    let pointerId: number | null = null;
    let lastY = 0;
    let lastT = 0;
    let velocity = 0;
    const handle = panel.querySelector("[data-drag-handle]");

    const clearStyle = () => {
      panel.style.transform = "";
      panel.style.transition = "";
      panel.classList.remove("is-dragging");
    };

    const onDown = (event: PointerEvent) => {
      if (!isTouchUi() || event.pointerType === "mouse") return;
      if (isInteractive(event.target)) return;
      const fromHandle = handle instanceof Element && handle.contains(event.target as Node);
      if (!fromHandle && isScrolledFromTop(event.target)) return;
      dragging = true;
      pointerId = event.pointerId;
      startY = event.clientY;
      lastY = event.clientY;
      lastT = event.timeStamp;
      velocity = 0;
      panel.setPointerCapture?.(event.pointerId);
    };

    const onMove = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== pointerId) return;
      const dy = event.clientY - startY;
      const dt = event.timeStamp - lastT || 16;
      velocity = (event.clientY - lastY) / dt;
      lastY = event.clientY;
      lastT = event.timeStamp;
      if (dy <= 0) {
        panel.style.transform = "";
        return;
      }
      panel.classList.add("is-dragging");
      panel.style.transition = "none";
      panel.style.transform = `translateY(${dy}px)`;
    };

    const onUp = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== pointerId) return;
      dragging = false;
      pointerId = null;
      const dy = Math.max(0, event.clientY - startY);
      const shouldClose = dy > threshold || (dy > 36 && velocity > 0.55);
      if (shouldClose) {
        if (!prefersReducedMotion()) {
          panel.style.transition = "transform 160ms ease";
          panel.style.transform = "translateY(110%)";
        }
        onCloseRef.current();
        window.setTimeout(clearStyle, 180);
        return;
      }
      panel.style.transition = prefersReducedMotion() ? "none" : "transform 180ms ease";
      panel.style.transform = "";
      panel.classList.remove("is-dragging");
    };

    const reset = () => {
      dragging = false;
      pointerId = null;
      clearStyle();
    };

    panel.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", reset);
    return () => {
      panel.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", reset);
      clearStyle();
    };
  }, [enabled, panelRef, threshold]);
}
