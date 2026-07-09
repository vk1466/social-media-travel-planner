import type { ReactNode } from "react";

import { useDetailModal } from "../hooks/useDetailModal";

interface DetailModalProps {
  titleId: string;
  onClose: () => void;
  children: ReactNode;
}

export function DetailModal({ titleId, onClose, children }: DetailModalProps) {
  const panelRef = useDetailModal(onClose);

  return (
    <div className="detail-overlay" onClick={onClose} role="presentation">
      <article
        ref={panelRef}
        className="detail-panel"
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
