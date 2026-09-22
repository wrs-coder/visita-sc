/**
 * Lightbox de vídeo — player HTML5 em tela cheia.
 * O arquivo é resolvido sob demanda (Filesystem nativo ou IndexedDB).
 */
import { useEffect, useRef } from "react";
import { X, ImageOff, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAttachmentSrc } from "@/hooks/use-attachment-src";
import type { NoteAttachment } from "@/lib/outline-attachments";

interface Props {
  open: boolean;
  attachment: NoteAttachment;
  onClose: () => void;
}

export function AttachmentVideoLightbox({ open, attachment, onClose }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { src, status, markMissing } = useAttachmentSrc(attachment, open);

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
    if (!open || status !== "ready") return;
    const v = videoRef.current;
    v?.play().catch(() => { /* noop */ });
  }, [open, status, src]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-2 sm:p-4",
        "animate-in fade-in duration-150",
      )}
      role="dialog"
      aria-modal="true"
      aria-label={attachment.title}
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

      {status === "loading" && <Loader2 className="h-8 w-8 animate-spin text-white/80" />}

      {status === "missing" && (
        <div className="flex flex-col items-center gap-2 text-white/85 px-6 text-center">
          <ImageOff className="h-10 w-10" />
          <p className="text-sm">
            {t("personalOutlines.attachments.unavailable", {
              defaultValue: "Anexo indisponível neste aparelho",
            })}
          </p>
        </div>
      )}

      {status === "ready" && src && (
        <video
          ref={videoRef}
          src={src}
          controls
          playsInline
          preload="metadata"
          onClick={(e) => e.stopPropagation()}
          onError={markMissing}
          className="max-h-[100dvh] max-w-full outline-none"
        >
          {attachment.mime ? <source src={src} type={attachment.mime} /> : null}
        </video>
      )}
    </div>
  );
}
