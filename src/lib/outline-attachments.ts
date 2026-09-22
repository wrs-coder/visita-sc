/**
 * Anexos de esboço — armazenamento DURÁVEL (somente no aparelho).
 *
 * - Nativo (Capacitor): arquivo gravado em Directory.Data com CAMINHO RELATIVO
 *   persistido (`path`). A URI absoluta muda entre atualizações do app, por isso
 *   nunca é salva como fonte de verdade; ela é resolvida na hora de exibir.
 * - Web/PWA: o próprio Blob é guardado no IndexedDB (idb-keyval). O `blob:` URL
 *   é criado sob demanda, o que faz o anexo sobreviver a recarregamentos.
 * - Links (vídeo/publicação): apenas a URL de texto.
 * - Fotos grandes são reduzidas (máx. 2000px) e convertidas para JPEG — inclusive
 *   HEIC do iPhone, quando o navegador consegue decodificar.
 * - `serializeAttachments`/`parseAttachmentsFromContent` garantem round-trip com o
 *   content_json (jsonb) sem perder entradas existentes (compat com `uri` legado).
 */

import { get as idbGet, set as idbSet, del as idbDel, createStore } from "idb-keyval";

export type NoteAttachmentKind = "photo" | "video" | "publication";
export type NoteAttachmentSource = "link" | "file";
export type NoteAttachmentStorage = "fs" | "idb";

export interface NoteAttachment {
  id: string;
  kind: NoteAttachmentKind;
  title: string;
  /** Onde o arquivo local vive: "fs" (Filesystem nativo) ou "idb" (navegador). */
  storage?: NoteAttachmentStorage;
  /** Caminho relativo estável do arquivo local (chave no Filesystem/IndexedDB). */
  path?: string;
  /** LEGADO: URI absoluta ou blob: de versões anteriores. Só leitura. */
  uri?: string;
  /** video-link/publication: URL externa. */
  url?: string;
  /** "file" = anexo local; "link" = URL externa. */
  source?: NoteAttachmentSource;
  /** MIME original (útil para vídeos locais). */
  mime?: string;
  created_at: number;
}

/** Limite prático (200 MB) para vídeos locais. */
export const MAX_LOCAL_VIDEO_BYTES = 200 * 1024 * 1024;

/** Maior lado permitido para fotos anexadas. */
const MAX_PHOTO_EDGE = 2000;

const attachmentStore = (() => {
  try {
    if (typeof indexedDB === "undefined") return null;
    return createStore("visitasc-attachments", "files");
  } catch {
    return null;
  }
})();

function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function makeAttachmentId(): string {
  return uid();
}

/**
 * Detecta se o app está rodando dentro do WebView do Capacitor.
 */
function isCapacitorNative(): boolean {
  try {
    const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
    return !!w.Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

/** Converte file:// para um URL utilizável pelo <img> no WebView. */
export function toDisplaySrc(uri: string | undefined | null): string {
  if (!uri) return "";
  if (uri.startsWith("blob:") || uri.startsWith("data:") || uri.startsWith("http")) {
    return uri;
  }
  try {
    const w = window as unknown as { Capacitor?: { convertFileSrc?: (u: string) => string } };
    if (w.Capacitor?.convertFileSrc) return w.Capacitor.convertFileSrc(uri);
  } catch {
    /* noop */
  }
  return uri;
}

function extFromMime(mime: string): string {
  if (!mime) return "bin";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("heic")) return "heic";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime") || mime.includes("mov")) return "mov";
  if (mime.includes("matroska") || mime.includes("mkv")) return "mkv";
  if (mime.includes("3gpp") || mime.includes("3gp")) return "3gp";
  return "bin";
}

async function blobToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime || "application/octet-stream" });
}

/**
 * Reduz a foto para no máximo `MAX_PHOTO_EDGE` px no maior lado e converte
 * para JPEG. Se o navegador não conseguir decodificar (HEIC sem suporte),
 * devolve o arquivo original — melhor guardar algo do que falhar.
 */
export async function downscaleImage(
  file: Blob,
  maxEdge: number = MAX_PHOTO_EDGE,
): Promise<{ blob: Blob; mime: string }> {
  const originalMime = file.type || "image/jpeg";
  try {
    if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
      return { blob: file, mime: originalMime };
    }
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));
    const isJpeg = originalMime.includes("jpeg");
    if (scale === 1 && isJpeg) {
      bitmap.close?.();
      return { blob: file, mime: originalMime };
    }
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return { blob: file, mime: originalMime };
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close?.();
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85),
    );
    if (!out) return { blob: file, mime: originalMime };
    return { blob: out, mime: "image/jpeg" };
  } catch (err) {
    console.warn("[outline-attachments] downscale falhou, usando original", err);
    return { blob: file, mime: originalMime };
  }
}

async function writeLocalFile(
  blob: Blob,
  mime: string,
  relativePath: string,
): Promise<NoteAttachmentStorage> {
  if (isCapacitorNative()) {
    try {
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      const base64 = await blobToBase64(blob);
      await Filesystem.writeFile({
        path: relativePath,
        data: base64,
        directory: Directory.Data,
        recursive: true,
      });
      return "fs";
    } catch (err) {
      console.warn("[outline-attachments] Filesystem write falhou, usando IndexedDB", err);
    }
  }
  if (!attachmentStore) throw new Error("ATTACHMENT_STORAGE_UNAVAILABLE");
  await idbSet(relativePath, new Blob([blob], { type: mime }), attachmentStore);
  return "idb";
}

export interface SaveFileResult {
  attachmentId: string;
  storage: NoteAttachmentStorage;
  path: string;
  mime: string;
}

export type SavePhotoResult = SaveFileResult;
export type SaveVideoResult = SaveFileResult;

/** Persiste uma foto (reduzida) escolhida pelo usuário. */
export async function savePhotoAttachment(
  file: File,
  noteId: string,
  attachmentId: string = makeAttachmentId(),
): Promise<SavePhotoResult> {
  const { blob, mime } = await downscaleImage(file);
  const ext = extFromMime(mime) || "jpg";
  const path = `outline-attachments/${noteId}/${attachmentId}.${ext}`;
  const storage = await writeLocalFile(blob, mime, path);
  return { attachmentId, storage, path, mime };
}

/** Persiste um vídeo local escolhido pelo usuário. */
export async function saveVideoAttachment(
  file: File,
  noteId: string,
  attachmentId: string = makeAttachmentId(),
): Promise<SaveVideoResult> {
  if (file.size > MAX_LOCAL_VIDEO_BYTES) {
    throw new Error("VIDEO_TOO_LARGE");
  }
  const mime = file.type || "video/mp4";
  const ext = extFromMime(mime) || (file.name.split(".").pop() ?? "mp4").toLowerCase();
  const path = `outline-attachments/${noteId}/${attachmentId}.${ext}`;
  const storage = await writeLocalFile(file, mime, path);
  return { attachmentId, storage, path, mime };
}

/** True quando o anexo aponta para um arquivo local (foto ou vídeo do aparelho). */
export function isLocalFileAttachment(a: NoteAttachment): boolean {
  if (a.kind === "publication") return false;
  if (a.source === "file") return true;
  if (a.path) return true;
  return !a.url && !!a.uri;
}

/**
 * Resolve, sob demanda, o endereço exibível de um anexo local.
 * Devolve null quando o arquivo não existe mais neste aparelho
 * (inclusive anexos legados que só guardavam `blob:` temporário).
 */
export async function resolveAttachmentSrc(a: NoteAttachment): Promise<string | null> {
  if (!isLocalFileAttachment(a)) return a.url ?? null;

  if (a.path) {
    if (a.storage === "idb" || !isCapacitorNative()) {
      if (!attachmentStore) return null;
      try {
        const blob = await idbGet<Blob>(a.path, attachmentStore);
        if (blob) return URL.createObjectURL(blob);
      } catch (err) {
        console.warn("[outline-attachments] leitura IndexedDB falhou", err);
      }
      if (!isCapacitorNative()) return null;
    }
    try {
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      const { uri } = await Filesystem.getUri({ path: a.path, directory: Directory.Data });
      // Confirma existência para não devolver um caminho morto.
      await Filesystem.stat({ path: a.path, directory: Directory.Data });
      return toDisplaySrc(uri);
    } catch (err) {
      console.warn("[outline-attachments] arquivo nativo indisponível", err);
      return null;
    }
  }

  // LEGADO: anexos antigos guardavam a URI absoluta (ou um blob: efêmero).
  if (a.uri) {
    if (a.uri.startsWith("blob:")) return null; // morreu no recarregamento
    if (a.uri.startsWith("data:") || a.uri.startsWith("http")) return a.uri;
    if (isCapacitorNative()) {
      const marker = "outline-attachments/";
      const idx = a.uri.indexOf(marker);
      const rel = idx >= 0 ? a.uri.slice(idx) : null;
      if (rel) {
        try {
          const { Filesystem, Directory } = await import("@capacitor/filesystem");
          const { uri } = await Filesystem.getUri({ path: rel, directory: Directory.Data });
          await Filesystem.stat({ path: rel, directory: Directory.Data });
          return toDisplaySrc(uri);
        } catch {
          return null;
        }
      }
      return toDisplaySrc(a.uri);
    }
  }
  return null;
}

/** Libera um blob: URL criado por `resolveAttachmentSrc`. */
export function releaseAttachmentSrc(src: string | null | undefined): void {
  if (src && src.startsWith("blob:")) {
    try { URL.revokeObjectURL(src); } catch { /* noop */ }
  }
}

/** Remove o arquivo local (Filesystem e/ou IndexedDB). Falhas silenciosas. */
export async function deleteFileAttachment(a: NoteAttachment | string | null | undefined): Promise<void> {
  if (!a) return;
  const att: NoteAttachment =
    typeof a === "string"
      ? { id: "", kind: "photo", title: "", uri: a, created_at: 0 }
      : a;

  const marker = "outline-attachments/";
  let rel = att.path ?? null;
  if (!rel && att.uri) {
    if (att.uri.startsWith("blob:")) {
      try { URL.revokeObjectURL(att.uri); } catch { /* noop */ }
      return;
    }
    const idx = att.uri.indexOf(marker);
    rel = idx >= 0 ? att.uri.slice(idx) : att.uri;
  }
  if (!rel) return;

  if (attachmentStore) {
    try { await idbDel(rel, attachmentStore); } catch { /* noop */ }
  }
  if (isCapacitorNative()) {
    try {
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      await Filesystem.deleteFile({ path: rel, directory: Directory.Data });
    } catch (err) {
      console.warn("[outline-attachments] delete falhou", err);
    }
  }
}

/** Compat: alias antigo. */
export const deletePhotoAttachment = deleteFileAttachment;

/**
 * Abre um link externo permitindo deep-link nativo. Nunca lança.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (!url) return;
  try {
    if (isCapacitorNative()) {
      const mod = await import("@capacitor/browser");
      await mod.Browser.open({ url });
      return;
    }
  } catch (err) {
    console.warn("[outline-attachments] Browser.open falhou, usando fallback", err);
  }
  try {
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    try { window.location.href = url; } catch { /* noop */ }
  }
}

/**
 * Validação leve — aceita http(s), jwlibrary:// e outros esquemas comuns.
 */
export function isLikelyValidUrl(url: string): boolean {
  const s = url.trim();
  if (!s) return false;
  if (/^https?:\/\//i.test(s)) return true;
  if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(s)) return true;
  return false;
}

/**
 * Normaliza um anexo vindo do content_json (jsonb) para o formato in-app.
 */
export function normalizeAttachment(raw: unknown): NoteAttachment | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const kind = r.kind;
  if (kind !== "photo" && kind !== "video" && kind !== "publication") return null;
  const id = typeof r.id === "string" && r.id.length > 0 ? r.id : makeAttachmentId();
  const title = typeof r.title === "string" ? r.title.slice(0, 120) : "";
  const uri = typeof r.uri === "string" ? r.uri : undefined;
  const url = typeof r.url === "string" ? r.url : undefined;
  const path = typeof r.path === "string" && r.path.length > 0 ? r.path : undefined;
  const storage: NoteAttachmentStorage | undefined =
    r.storage === "fs" || r.storage === "idb" ? r.storage : undefined;
  const mime = typeof r.mime === "string" ? r.mime : undefined;
  const rawSource = r.source;
  const source: NoteAttachmentSource | undefined =
    rawSource === "file" || rawSource === "link"
      ? rawSource
      : url
        ? "link"
        : path || uri
          ? "file"
          : undefined;
  const created_at =
    typeof r.created_at === "number" && Number.isFinite(r.created_at)
      ? r.created_at
      : Date.now();
  if (kind === "photo" && !uri && !path) return null;
  if (kind === "publication" && !url) return null;
  if (kind === "video" && !url && !uri && !path) return null;
  return { id, kind, title, storage, path, uri, url, source, mime, created_at };
}

/**
 * Serializa uma lista para o formato salvo em content_json.
 */
export function serializeAttachments(list: NoteAttachment[] | null | undefined): NoteAttachment[] {
  if (!Array.isArray(list)) return [];
  const out: NoteAttachment[] = [];
  for (const item of list) {
    const norm = normalizeAttachment(item);
    if (norm) out.push(norm);
  }
  return out;
}

/**
 * Extrai anexos de um content_json (qualquer coisa que veio do Supabase).
 */
export function parseAttachmentsFromContent(cj: unknown): NoteAttachment[] {
  if (!cj || typeof cj !== "object") return [];
  const arr = (cj as Record<string, unknown>).attachments;
  if (!Array.isArray(arr)) return [];
  return serializeAttachments(arr as NoteAttachment[]);
}

export { base64ToBlob };
