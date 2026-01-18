import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  showCloseButton?: boolean;
  closeOnOverlay?: boolean;
  closeOnEsc?: boolean;
  maxHeightVh?: number;
  children: ReactNode;
}

export default function Modal({
  open,
  onClose,
  title,
  showCloseButton = true,
  closeOnOverlay = true,
  closeOnEsc = true,
  maxHeightVh = 90,
  children
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    lastActiveRef.current = document.activeElement as HTMLElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEsc) onClose();
    };
    if (closeOnEsc) {
      window.addEventListener("keydown", onKeyDown);
    }

    const focusTimer = window.setTimeout(() => {
      panelRef.current?.focus();
    }, 0);

    return () => {
      if (closeOnEsc) {
        window.removeEventListener("keydown", onKeyDown);
      }
      window.clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
      lastActiveRef.current?.focus?.();
    };
  }, [open, onClose, closeOnEsc]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      onMouseDown={() => {
        if (closeOnOverlay) onClose();
      }}
      aria-hidden={false}
    >
      <div className="absolute inset-0 bg-ink/50" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Modal"}
        tabIndex={-1}
        ref={panelRef}
        onMouseDown={(event) => event.stopPropagation()}
        className="relative z-10 w-full max-w-2xl rounded-3xl bg-sand shadow-glow outline-none overflow-hidden"
        style={{ maxHeight: `${maxHeightVh}vh` }}
      >
        <div className="sticky top-0 z-20 bg-sand/95 backdrop-blur border-b border-ink/10">
          <div className="flex items-start justify-between gap-4 px-6 py-4">
            <div>
              {title ? (
                <h2 className="font-display text-2xl">{title}</h2>
              ) : null}
            </div>
            {showCloseButton ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-ink/10 bg-white/80 px-3 py-2 text-sm"
                aria-label="Cerrar"
              >
                X
              </button>
            ) : null}
          </div>
        </div>
        <div
          className="px-6 py-4 overflow-y-auto"
          style={{ maxHeight: `calc(${maxHeightVh}vh - 72px)` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
