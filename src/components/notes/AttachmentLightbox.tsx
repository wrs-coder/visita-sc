/**
 * Lightbox de foto anexada — Dialog fullscreen com fundo escuro.
 * Clique no X ou no backdrop fecha e devolve o foco ao editor.
 */
import { useEffect } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  src: string;
  alt?: string;
  onClose: () => void;
}

export function AttachmentLightbox({ open, src, alt, onClose }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Impede que o ESC também feche o Dialog pai (tela cheia da nota).
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }
    };
    // `capture: true` garante que interceptamos antes do listener do Radix Dialog.
    document.addEventListener("keydown", onKey, { capture: true });
    return () => document.removeEventListener("keydown", onKey, { capture: true } as EventListenerOptions);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4",
        "animate-in fade-in duration-150",
      )}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label={t("common.close", { defaultValue: "Fechar" })}
        className="absolute top-3 right-3 h-10 w-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/60"
      >
        <X className="h-5 w-5" />
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? ""}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[100dvh] max-w-full object-contain select-none"
        draggable={false}
      />
    </div>
  );
}
