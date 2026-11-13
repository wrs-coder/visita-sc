import type { NoteAttachment } from "@/lib/outline-attachments";

/** Nome do arquivo sem extensão, com espaços normalizados (máx. 200). */
export function fileBaseName(name: string): string {
  return name.replace(/\.[a-z0-9]{1,5}$/i, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}

/**
 * Quando o Tema está vazio e uma imagem/vídeo foi anexado, devolve o nome do
 * arquivo para preencher o Tema. Nunca sobrescreve um Tema já escrito.
 */
export function titleFromNewAttachment(
  currentTitle: string | null | undefined,
  prev: NoteAttachment[],
  next: NoteAttachment[],
): string | null {
  if ((currentTitle ?? "").trim()) return null;
  const known = new Set(prev.map((a) => a.id));
  const added = next.find((a) => !known.has(a.id) && (a.kind === "photo" || a.kind === "video"));
  if (!added) return null;
  const base = fileBaseName(added.title || "");
  return base || null;
}
