/**
 * Barra horizontal de miniaturas de anexos — altura FIXA (5rem) para não
 * deformar o cálculo `calc(100dvh - 14rem - 5rem)` do editor imersivo.
 *
 * - Card 48×48, cantos arredondados, X discreto (readOnly esconde).
 * - Fotos/vídeos locais são resolvidos sob demanda (Filesystem nativo ou
 *   IndexedDB no navegador); quando o arquivo não existe mais, mostramos um
 *   aviso claro em vez do ícone de imagem quebrada.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, PlayCircle, FileText, ExternalLink, HardDrive, ImageOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AttachmentLightbox } from "./AttachmentLightbox";
import { AttachmentVideoLightbox } from "./AttachmentVideoLightbox";
import { useAttachmentSrc } from "@/hooks/use-attachment-src";
import {
  deleteFileAttachment,
  isLocalFileAttachment,
  openExternalUrl,
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
  return a.kind === "video" && isLocalFileAttachment(a);
}

function AttachmentThumb({
  attachment,
  onOpen,
}: {
  attachment: NoteAttachment;
  onOpen: (missing: boolean) => void;
}) {
  const { t } = useTranslation();
  const isPhoto = attachment.kind === "photo";
  const localVideo = isLocalVideo(attachment);
  const isExternal = (attachment.kind === "video" && !localVideo) || attachment.kind === "publication";
  const needsFile = isPhoto || localVideo;
  const { src, status, markMissing } = useAttachmentSrc(attachment, needsFile);
  const missing = needsFile && status === "missing";

  const defaultLabel = isPhoto
    ? t("personalOutlines.attachments.photo", { defaultValue: "Foto" })
    : localVideo
      ? t("personalOutlines.attachments.videoFile", { defaultValue: "Vídeo" })
      : t("personalOutlines.attachments.link", { defaultValue: "Link" });

  return (
    <button
      type="button"
      onClick={() => onOpen(missing)}
      title={
        missing
          ? t("personalOutlines.attachments.unavailable", {
              defaultValue: "Anexo indisponível neste aparelho",
            })
          : attachment.title || defaultLabel
      }
      className={cn(
        "relative h-12 w-12 rounded-lg border bg-muted overflow-hidden",
        "flex items-center justify-center",
        "hover:ring-2 hover:ring-primary/60 transition",
        "focus:outline-none focus:ring-2 focus:ring-primary",
        missing && "border-destructive/50",
      )}
    >
      {needsFile && status === "loading" && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {missing && <ImageOff className="h-5 w-5 text-destructive/70" />}
      {isPhoto && status === "ready" && src && (
        <img
          src={src}
          alt={attachment.title}
          className="h-full w-full object-cover"
          draggable={false}
          onError={markMissing}
        />
      )}
      {localVideo && status === "ready" && <PlayCircle className="h-6 w-6 text-primary" />}
      {attachment.kind === "video" && !localVideo && <PlayCircle className="h-6 w-6 text-primary" />}
      {attachment.kind === "publication" && <FileText className="h-6 w-6 text-primary" />}

      {(localVideo || isExternal) && (
        <span
          className={cn(
            "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-tl-md bg-background/85 border-l border-t",
            "flex items-center justify-center text-muted-foreground",
          )}
          aria-hidden="true"
        >
          {localVideo ? <HardDrive className="h-2.5 w-2.5" /> : <ExternalLink className="h-2.5 w-2.5" />}
        </span>
      )}
    </button>
  );
}

export function OutlineAttachmentsBar({ attachments, readOnly = false, onRemove, className }: Props) {
  const { t } = useTranslation();
  const [lightbox, setLightbox] = useState<NoteAttachment | null>(null);
  const [videoLightbox, setVideoLightbox] = useState<NoteAttachment | null>(null);
  const [missingNotice, setMissingNotice] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) return null;

  async function handleClick(a: NoteAttachment, missing: boolean) {
    if (missing) {
      setMissingNotice(a.id);
      return;
    }
    if (a.kind === "photo") setLightbox(a);
    else if (isLocalVideo(a)) setVideoLightbox(a);
    else if (a.url) await openExternalUrl(a.url);
  }

  async function handleRemove(a: NoteAttachment) {
    if (!onRemove) return;
    if (isLocalFileAttachment(a)) await deleteFileAttachment(a);
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
          const noticed = missingNotice === a.id;
          return (
            <div key={a.id} role="listitem" className="relative shrink-0 flex flex-col items-center w-14">
              <AttachmentThumb attachment={a} onOpen={(missing) => void handleClick(a, missing)} />

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
                className={cn(
                  "mt-1 w-full text-[10px] leading-tight text-center truncate",
                  noticed ? "text-destructive" : "text-foreground/80",
                )}
                title={a.title}
              >
                {noticed
                  ? t("personalOutlines.attachments.unavailableShort", { defaultValue: "Indisponível" })
                  : a.title || t("personalOutlines.attachments.link", { defaultValue: "Link" })}
              </span>
            </div>
          );
        })}
      </div>

      {lightbox && (
        <AttachmentLightbox open attachment={lightbox} onClose={() => setLightbox(null)} />
      )}
      {videoLightbox && (
        <AttachmentVideoLightbox open attachment={videoLightbox} onClose={() => setVideoLightbox(null)} />
      )}
    </>
  );
}

export { BAR_HEIGHT as ATTACHMENTS_BAR_HEIGHT_CLASS };
