import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from "react";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: string;
  text: string;
  action?: ToastAction;
  duration?: number;
}

export type ToastOptions =
  | string
  | {
      message: string;
      action?: ToastAction;
      duration?: number;
    };

interface ToastContextValue {
  showToast: (textOrOptions: ToastOptions, action?: ToastAction, duration?: number) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
  hideToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    (
      textOrOptions: ToastOptions,
      action?: ToastAction,
      duration = 4000
    ) => {
      let text = "";
      let act = action;
      let dur = duration;

      if (typeof textOrOptions === "object" && textOrOptions !== null) {
        text = textOrOptions.message;
        act = textOrOptions.action ?? action;
        dur = textOrOptions.duration ?? duration;
      } else {
        text = textOrOptions;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const id = Math.random().toString(36).slice(2);
      setToast({ id, text, action: act, duration: dur });

      timerRef.current = setTimeout(() => {
        setToast((curr) => (curr?.id === id ? null : curr));
        timerRef.current = null;
      }, dur);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="wf-toast"
          style={{
            fontFamily: "var(--wf-font-sans)",
            fontSize: "14px",
            lineHeight: "20px",
            fontWeight: 500,
          }}
        >
          <span>{toast.text}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                hideToast();
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--wf-primary)",
                fontWeight: 700,
                fontSize: "14px",
                cursor: "pointer",
                padding: "4px 8px",
                minHeight: "36px",
                borderRadius: "6px",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  );
}
