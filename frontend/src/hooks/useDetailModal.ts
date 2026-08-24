import { useEffect, useRef } from "react";

/**
 * Wires up Escape-key handling and focus management for a modal panel.
 *
 * @param onClose - Called when Escape is pressed. Pass `null` to disable Escape-key close.
 */
export function useDetailModal(onClose: (() => void) | null) {
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!onClose) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      previouslyFocused?.focus();
    };
  }, []);

  return panelRef;
}
