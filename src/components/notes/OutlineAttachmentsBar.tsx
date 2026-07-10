/**
 * Barra horizontal de miniaturas de anexos — altura FIXA (5rem) para não
 * deformar o cálculo `calc(100dvh - 14rem - 5rem)` do editor imersivo.
 *
 * - Card 48×48, cantos arredondados, X discreto (readOnly esconde).
 * - Tema truncado em 1 linha (`truncate`) — garante altura absoluta.
 * - Fotos passam por `Capacitor.convertFileSrc` (via `toDisplaySrc`) para
 *   contornar o bloqueio do WebView a `file://` no Android.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, PlayCircle, FileText, ExternalLink, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";
import { AttachmentLightbox } from "./AttachmentLightbox";
import { AttachmentVideoLightbox } from "./AttachmentVideoLightbox";
import {
  deleteFileAttachment,
  openExternalUrl,
  toDisplaySrc,
  type NoteAttachment,
} from "@/lib/outline-attachments";

interface Props {
  attachments: NoteAttachment[];
  readOnly?: boolean;
  onRemove?: (id: string) => void;
  className?: string;
}

const BAR_HEIGHT = "h-20"; // 5rem — bate com o desconto do editor.

function isLocalVideo(a: NoteAttachment): boolean {
  if (a.kind !== "video") return false;
  if (a.source === "file") return true;
  // Compat: sem source, mas com uri e sem url → é arquivo local.
  if (!a.url && a.uri) return true;
  return false;
}

export function OutlineAttachmentsBar({ attachments, readOnly = false, onRemove, className }: Props) {
  const { t } = useTranslation();
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [videoLightbox, setVideoLightbox] = useState<{ src: string; mime?: string; title: string } | null>(null);

  if (!attachments || attachments.length === 0) return null;

  async function handleClick(a: NoteAttachment) {
    if (a.kind === "photo") {
      const src = toDisplaySrc(a.uri);
      if (!src) return;
      setLightbox({ src, alt: a.title });
    } else if (isLocalVideo(a)) {
      const src = toDisplaySrc(a.uri);
      if (!src) return;
      setVideoLightbox({ src, mime: a.mime, title: a.title });
    } else if (a.url) {
      await openExternalUrl(a.url);
    }
  }

  async function handleRemove(a: NoteAttachment) {
    if (!onRemove) return;
    if (a.kind === "photo" || isLocalVideo(a)) {
      await deleteFileAttachment(a.uri);
    }
    onRemove(a.id);
  }

  return (
    <>
      <div
        className={cn(
          "w-full border-b bg-background/95 backdrop-blur",
          BAR_HEIGHT,
          "flex items-center gap-2 overflow-x-auto overflow-y-hidden px-2 py-1.5",
          "scrollbar-thin",
          className,
        )}
        role="list"
        aria-label={t("personalOutlines.attachments.barLabel", {
          defaultValue: "Anexos do esboço",
        })}
      >
        {attachments.map((a) => {
          const isPhoto = a.kind === "photo";
          const isVideo = a.kind === "video";
          const src = isPhoto ? toDisplaySrc(a.uri) : "";
          const missing = isPhoto && !src;

          return (
            <div
              key={a.id}
              role="listitem"
              className="relative shrink-0 flex flex-col items-center w-14"
            >
              <button
                type="button"
                onClick={() => handleClick(a)}
                title={a.title || (isPhoto ? "Foto" : a.url ?? "Link")}
                className={cn(
                  "relative h-12 w-12 rounded-lg border bg-muted overflow-hidden",
                  "flex items-center justify-center",
                  "hover:ring-2 hover:ring-primary/60 transition",
                  "focus:outline-none focus:ring-2 focus:ring-primary",
                )}
              >
                {isPhoto && src && (
                  <img
                    src={src}
                    alt={a.title}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                )}
                {isPhoto && missing && (
                  <FileText className="h-5 w-5 text-muted-foreground/60" />
                )}
                {isVideo && (
                  <PlayCircle className="h-6 w-6 text-primary" />
                )}
                {a.kind === "publication" && (
                  <FileText className="h-6 w-6 text-primary" />
                )}
              </button>

              {!readOnly && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleRemove(a);
                  }}
                  aria-label={t("common.remove", { defaultValue: "Remover" })}
                  className={cn(
                    "absolute -top-1 -right-0.5 h-4 w-4 rounded-full bg-background border shadow",
                    "flex items-center justify-center text-muted-foreground hover:text-destructive",
                  )}
                >
                  <X className="h-3 w-3" />
                </button>
              )}

              <span
                className="mt-1 w-full text-[10px] leading-tight text-center text-foreground/80 truncate"
                title={a.title}
              >
                {a.title || (isPhoto ? "Foto" : "Link")}
              </span>
            </div>
          );
        })}
      </div>

      {lightbox && (
        <AttachmentLightbox
          open
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}

export { BAR_HEIGHT as ATTACHMENTS_BAR_HEIGHT_CLASS };
