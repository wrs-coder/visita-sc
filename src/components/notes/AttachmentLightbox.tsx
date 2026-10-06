/**
 * Lightbox de foto anexada — Dialog fullscreen com fundo escuro.
 * O arquivo é resolvido sob demanda (Filesystem nativo ou IndexedDB).
 */
import { useEffect } from "react";
import { X, ImageOff, Loader2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAttachmentSrc } from "@/hooks/use-attachment-src";
import type { NoteAttachment } from "@/lib/outline-attachments";

interface Props {
  open: boolean;
  attachment: NoteAttachment;
  onClose: () => void;
}

export function AttachmentLightbox({ open, attachment, onClose }: Props) {
  const { t } = useTranslation();
  const { src, status, markMissing } = useAttachmentSrc(attachment, open);

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
        <div
          className="h-full w-full"
          style={{ touchAction: "none" }}
          onClick={(e) => e.stopPropagation()}
        >
          <TransformWrapper
            key={attachment.id}
            minScale={1}
            maxScale={5}
            initialScale={1}
            centerOnInit
            doubleClick={{ mode: "toggle", step: 1 }}
            wheel={{ step: 0.15 }}
            pinch={{ step: 5 }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <TransformComponent
                  wrapperStyle={{ width: "100%", height: "100%" }}
                  contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <img
                    src={src}
                    alt={attachment.title ?? ""}
                    onError={markMissing}
                    className="max-h-[calc(100dvh-2rem)] max-w-full object-contain select-none"
                    draggable={false}
                  />
                </TransformComponent>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {[
                    { icon: ZoomOut, label: t("personalOutlines.attachments.zoomOut", { defaultValue: "Afastar" }), fn: () => zoomOut() },
                    { icon: RotateCcw, label: t("personalOutlines.attachments.zoomReset", { defaultValue: "Tamanho normal" }), fn: () => resetTransform() },
                    { icon: ZoomIn, label: t("personalOutlines.attachments.zoomIn", { defaultValue: "Aproximar" }), fn: () => zoomIn() },
                  ].map(({ icon: Icon, label, fn }) => (
                    <button
                      key={label}
                      type="button"
                      aria-label={label}
                      title={label}
                      onClick={(e) => {
                        e.stopPropagation();
                        fn();
                      }}
                      className="h-10 w-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/60"
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </TransformWrapper>
        </div>
      )}
      
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label={t("common.close", { defaultValue: "Fechar" })}
        className="absolute top-3 right-3 z-30 h-10 w-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/60"
      >
        <X className="h-5 w-5" />
      </button>

    </div>
  );
}
