import { useEffect, useRef, type ReactNode } from "react";

import { useDragDismiss } from "../../hooks/usePointerSwipe";

interface DetailSheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

export function DetailSheet({ title, onClose, children, wide }: DetailSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  useDragDismiss(sheetRef, onClose);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <article
        ref={sheetRef}
        className={`sheet${wide ? " is-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" data-drag-handle aria-hidden="true" />
        <button ref={closeRef} type="button" className="sheet-close" onClick={onClose}>
          Close
        </button>
        {children}
      </article>
    </div>
  );
}
