/**
 * Lightbox de vídeo — dispara o player HTML5 nativo em fullscreen.
 * Segue o mesmo padrão de captura (ESC/stopPropagation) do lightbox de foto
 * para nunca fechar o Dialog pai por engano.
 */
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  src: string;
  mime?: string;
  title?: string;
  onClose: () => void;
}

export function AttachmentVideoLightbox({ open, src, mime, title, onClose }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, { capture: true });
    return () =>
      document.removeEventListener("keydown", onKey, { capture: true } as EventListenerOptions);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    // Auto-play best-effort; se o navegador bloquear, o usuário toca em play.
    const v = videoRef.current;
    v?.play().catch(() => { /* noop */ });
  }, [open, src]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-2 sm:p-4",
        "animate-in fade-in duration-150",
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label={t("common.close", { defaultValue: "Fechar" })}
        className="absolute top-3 right-3 h-10 w-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/60 z-10"
      >
        <X className="h-5 w-5" />
      </button>

      <video
        ref={videoRef}
        src={src}
        controls
        playsInline
        preload="metadata"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[100dvh] max-w-full outline-none"
      >
        {mime ? <source src={src} type={mime} /> : null}
      </video>
    </div>
  );
}
