/**
 * Resolve o endereço exibível de um anexo local sob demanda.
 * Estados: "loading" | "ready" | "missing".
 */
import { useEffect, useState } from "react";
import {
  releaseAttachmentSrc,
  resolveAttachmentSrc,
  type NoteAttachment,
} from "@/lib/outline-attachments";

export type AttachmentSrcStatus = "loading" | "ready" | "missing";

export function useAttachmentSrc(attachment: NoteAttachment | null | undefined, enabled = true) {
  const [src, setSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<AttachmentSrcStatus>("loading");

  const key = attachment
    ? `${attachment.id}|${attachment.storage ?? ""}|${attachment.path ?? ""}|${attachment.uri ?? ""}|${attachment.url ?? ""}`
    : "";

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;

    if (!attachment || !enabled) {
      setSrc(null);
      setStatus(enabled ? "missing" : "loading");
      return;
    }

    setStatus("loading");
    setSrc(null);

    void resolveAttachmentSrc(attachment)
      .then((resolved) => {
        if (cancelled) {
          releaseAttachmentSrc(resolved);
          return;
        }
        created = resolved;
        setSrc(resolved);
        setStatus(resolved ? "ready" : "missing");
      })
      .catch(() => {
        if (cancelled) return;
        setSrc(null);
        setStatus("missing");
      });

    return () => {
      cancelled = true;
      releaseAttachmentSrc(created);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return { src, status, markMissing: () => setStatus("missing") };
}
