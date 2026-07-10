/**
 * Diálogo para adicionar um anexo (foto ou link) a um esboço.
 * - Foto: <input type=file accept="image/*"> — cobre Galeria + Downloads.
 * - Link: URL + tipo (vídeo / publicação).
 * Sempre exige um "Tema/Título" curto.
 */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, Link as LinkIcon, PlayCircle, FileText, Loader2, Video } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  isLikelyValidUrl,
  makeAttachmentId,
  savePhotoAttachment,
  saveVideoAttachment,
  MAX_LOCAL_VIDEO_BYTES,
  type NoteAttachment,
  type NoteAttachmentKind,
} from "@/lib/outline-attachments";

type Mode = "photo" | "link" | "videoFile";

interface Props {
  open: boolean;
  mode: Mode;
  noteId: string;
  onClose: () => void;
  onAdd: (attachment: NoteAttachment) => void;
}

export function AttachmentAddDialog({ open, mode, noteId, onClose, onAdd }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [linkKind, setLinkKind] = useState<Extract<NoteAttachmentKind, "video" | "publication">>("video");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setUrl("");
      setFile(null);
      setLinkKind("video");
    }
  }, [open, mode]);

  const needsFile = mode === "photo" || mode === "videoFile";
  const canSubmit = needsFile
    ? !!file && title.trim().length > 0 && !busy
    : isLikelyValidUrl(url) && title.trim().length > 0 && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      if (mode === "photo" && file) {
        const attId = makeAttachmentId();
        const saved = await savePhotoAttachment(file, noteId, attId);
        onAdd({
          id: saved.attachmentId,
          kind: "photo",
          title: title.trim().slice(0, 60),
          uri: saved.uri,
          source: "file",
          created_at: Date.now(),
        });
      } else if (mode === "videoFile" && file) {
        const attId = makeAttachmentId();
        const saved = await saveVideoAttachment(file, noteId, attId);
        onAdd({
          id: saved.attachmentId,
          kind: "video",
          title: title.trim().slice(0, 60),
          uri: saved.uri,
          mime: saved.mime,
          source: "file",
          created_at: Date.now(),
        });
      } else if (mode === "link") {
        onAdd({
          id: makeAttachmentId(),
          kind: linkKind,
          title: title.trim().slice(0, 60),
          url: url.trim(),
          source: "link",
          created_at: Date.now(),
        });
      }
      onClose();
    } catch (err) {
      console.error("[AttachmentAddDialog]", err);
      const msg = (err as Error | undefined)?.message;
      if (msg === "VIDEO_TOO_LARGE") {
        toast.error(
          t("personalOutlines.attachments.videoTooLarge", {
            defaultValue: "Vídeo muito grande. Limite: 200 MB.",
          }),
        );
      } else {
        toast.error(
          t("personalOutlines.attachments.addError", {
            defaultValue: "Não foi possível adicionar o anexo.",
          }),
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "photo" ? (
              <ImagePlus className="h-4 w-4 text-primary" />
            ) : (
              <LinkIcon className="h-4 w-4 text-primary" />
            )}
            {mode === "photo"
              ? t("personalOutlines.attachments.addPhotoTitle", { defaultValue: "Anexar imagem" })
              : t("personalOutlines.attachments.addLinkTitle", { defaultValue: "Vincular link" })}
          </DialogTitle>
          <DialogDescription>
            {mode === "photo"
              ? t("personalOutlines.attachments.addPhotoDesc", {
                  defaultValue: "Escolha uma foto da galeria ou arquivos. Fica salva apenas neste dispositivo.",
                })
              : t("personalOutlines.attachments.addLinkDesc", {
                  defaultValue: "Cole a URL (jw.org, vídeo, cântico...). Abre no aplicativo correspondente quando disponível.",
                })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {mode === "photo" ? (
            <div className="space-y-1.5">
              <Label htmlFor="att-file">
                {t("personalOutlines.attachments.file", { defaultValue: "Arquivo" })}
              </Label>
              <input
                id="att-file"
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground hover:file:bg-primary/90"
              />
              {file && (
                <p className="text-xs text-muted-foreground truncate">
                  {file.name} · {(file.size / 1024).toFixed(0)} KB
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>
                  {t("personalOutlines.attachments.kind", { defaultValue: "Tipo" })}
                </Label>
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={linkKind === "video" ? "default" : "outline"}
                    onClick={() => setLinkKind("video")}
                    className="flex-1"
                  >
                    <PlayCircle className="h-4 w-4 mr-1.5" />
                    {t("personalOutlines.attachments.video", { defaultValue: "Vídeo" })}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={linkKind === "publication" ? "default" : "outline"}
                    onClick={() => setLinkKind("publication")}
                    className="flex-1"
                  >
                    <FileText className="h-4 w-4 mr-1.5" />
                    {t("personalOutlines.attachments.publication", { defaultValue: "Publicação" })}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="att-url">
                  {t("personalOutlines.attachments.url", { defaultValue: "URL" })}
                </Label>
                <Input
                  id="att-url"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  placeholder="https://…"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="att-title">
              {t("personalOutlines.attachments.title", { defaultValue: "Tema/Título" })}
            </Label>
            <Input
              id="att-title"
              maxLength={60}
              placeholder={t("personalOutlines.attachments.titlePh", {
                defaultValue: "Ex.: Cântico 120, Vídeo da Ilustração",
              })}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus={mode === "link"}
            />
            <p className="text-[10px] text-muted-foreground">
              {title.length}/60
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.cancel", { defaultValue: "Cancelar" })}
          </Button>
          <Button type="button" onClick={submit} disabled={!canSubmit}>
            {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {t("personalOutlines.attachments.add", { defaultValue: "Adicionar" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
