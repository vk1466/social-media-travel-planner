import type { ReactNode } from "react";

import { useDetailModal } from "../hooks/useDetailModal";

export interface DetailModalProps {
  titleId: string;
  onClose: () => void;
  children: ReactNode;
  /** Extra class names on the panel `<article>`. */
  panelClassName?: string;
  /** Extra class names on the backdrop overlay `<div>`. */
  overlayClassName?: string;
  /**
   * When true, clicking the backdrop does not close the modal.
   * Useful for modals that contain destructive flows or required decisions.
   * Default: false (clicking backdrop closes).
   */
  preventOverlayClose?: boolean;
  /**
   * When false, pressing Escape does not close the modal.
   * Default: true.
   */
  closeOnEsc?: boolean;
}

export function DetailModal({
  titleId,
  onClose,
  children,
  panelClassName,
  overlayClassName,
  preventOverlayClose = false,
  closeOnEsc = true,
}: DetailModalProps) {
  const panelRef = useDetailModal(closeOnEsc ? onClose : null);
  const panelClasses = ["detail-panel", panelClassName].filter(Boolean).join(" ");
  const overlayClasses = ["detail-overlay", overlayClassName].filter(Boolean).join(" ");

  return (
    <div
      className={overlayClasses}
      onClick={preventOverlayClose ? undefined : onClose}
      role="presentation"
    >
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
