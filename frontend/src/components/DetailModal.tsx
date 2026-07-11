import type { ReactNode } from "react";

import { useDetailModal } from "../hooks/useDetailModal";

interface DetailModalProps {
  titleId: string;
  onClose: () => void;
  children: ReactNode;
  panelClassName?: string;
}

export function DetailModal({ titleId, onClose, children, panelClassName }: DetailModalProps) {
  const panelRef = useDetailModal(onClose);
  const panelClasses = ["detail-panel", panelClassName].filter(Boolean).join(" ");

  return (
    <div className="detail-overlay" onClick={onClose} role="presentation">
      <article
        ref={panelRef}
        className={panelClasses}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </article>
    </div>
  );
}
