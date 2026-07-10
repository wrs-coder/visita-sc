/**
 * Anexos de esboço (Onda: Miniaturas de anexos).
 *
 * - Fotos: gravadas em Capacitor Filesystem (Directory.Data) quando o app
 *   roda nativo; no navegador puro, guardadas como Blob URL em memória
 *   (fallback simples — a foto vive enquanto a página estiver aberta).
 * - Links (vídeo/publicação): apenas a URL de texto.
 * - `openExternalUrl` tenta o plugin nativo (@capacitor/browser) e faz
 *   fallback silencioso para window.open — nunca deixa o clique "morto".
 * - `serializeAttachments`/`parseAttachmentsFromContent` garantem que o
 *   round-trip com o Supabase (jsonb content_json) preserve todos os tipos.
 */

export type NoteAttachmentKind = "photo" | "video" | "publication";
export type NoteAttachmentSource = "link" | "file";

export interface NoteAttachment {
  id: string;
  kind: NoteAttachmentKind;
  title: string;
  /** photo/video-file: caminho relativo dentro de Directory.Data ou URL blob (web). */
  uri?: string;
  /** video-link/publication: URL externa. */
  url?: string;
  /** "file" = anexo local (uri); "link" = URL externa. Default por compat: link se url, file se uri. */
  source?: NoteAttachmentSource;
  /** MIME original (útil para vídeos locais). */
  mime?: string;
  created_at: number;
}

/** Limite prático (200 MB) para vídeos locais — evita OOM no readAsDataURL. */
export const MAX_LOCAL_VIDEO_BYTES = 200 * 1024 * 1024;

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

/** Guarda global das URLs de blob criadas neste tab (para revoke opcional). */
const blobUriByAttachment = new Map<string, string>();

/**
 * Detecta se o app está rodando dentro do WebView do Capacitor.
 * Fora do WebView usamos o fallback web (Blob URL).
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
  // Blob/data URL passam direto.
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
  // Vídeos
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime") || mime.includes("mov")) return "mov";
  if (mime.includes("matroska") || mime.includes("mkv")) return "mkv";
  if (mime.includes("3gpp") || mime.includes("3gp")) return "3gp";
  return "bin";
}

async function fileToBase64(file: File | Blob): Promise<string> {
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

export interface SavePhotoResult {
  attachmentId: string;
  uri: string;
  displaySrc: string;
}

/**
 * Persiste uma foto escolhida pelo usuário e devolve o `uri` a ser salvo
 * no anexo + `displaySrc` pronto para uso em <img>.
 */
export async function savePhotoAttachment(
  file: File,
  noteId: string,
  attachmentId: string = makeAttachmentId(),
): Promise<SavePhotoResult> {
  const ext = extFromMime(file.type) || (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const relativePath = `outline-attachments/${noteId}/${attachmentId}.${ext}`;

  if (isCapacitorNative()) {
    try {
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      const base64 = await fileToBase64(file);
      await Filesystem.writeFile({
        path: relativePath,
        data: base64,
        directory: Directory.Data,
        recursive: true,
      });
      const { uri } = await Filesystem.getUri({
        path: relativePath,
        directory: Directory.Data,
      });
      return { attachmentId, uri, displaySrc: toDisplaySrc(uri) };
    } catch (err) {
      console.warn("[outline-attachments] Filesystem write failed, using blob fallback", err);
    }
  }

  // Fallback web: Blob URL (efêmero — só neste tab).
  const url = URL.createObjectURL(file);
  blobUriByAttachment.set(attachmentId, url);
  return { attachmentId, uri: url, displaySrc: url };
}

/** Remove a foto do Filesystem (best-effort). Falhas silenciosas. */
export async function deletePhotoAttachment(uri: string | undefined | null): Promise<void> {
  if (!uri) return;
  if (uri.startsWith("blob:")) {
    try { URL.revokeObjectURL(uri); } catch { /* noop */ }
    return;
  }
  if (!isCapacitorNative()) return;
  try {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    // Extrai caminho relativo se veio como URI absoluta.
    const marker = "outline-attachments/";
    const idx = uri.indexOf(marker);
    const relativePath = idx >= 0 ? uri.slice(idx) : uri;
    await Filesystem.deleteFile({ path: relativePath, directory: Directory.Data });
  } catch (err) {
    console.warn("[outline-attachments] delete failed", err);
  }
}

/**
 * Abre um link externo permitindo deep-link nativo. Nunca lança;
 * qualquer erro cai em `window.open` para não deixar o clique morto.
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
    console.warn("[outline-attachments] Browser.open failed, falling back", err);
  }
  try {
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    /* último recurso: navegação direta */
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
  if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(s)) return true; // jwlibrary://, mailto: etc.
  return false;
}

/**
 * Normaliza um anexo vindo do content_json (jsonb) para o formato in-app.
 * Silencia entradas inválidas em vez de derrubar a lista inteira.
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
  const created_at =
    typeof r.created_at === "number" && Number.isFinite(r.created_at)
      ? r.created_at
      : Date.now();
  if (kind === "photo" && !uri) return null;
  if ((kind === "video" || kind === "publication") && !url) return null;
  return { id, kind, title, uri, url, created_at };
}

/**
 * Serializa uma lista para o formato salvo em content_json. Descarta
 * entradas inválidas para nunca corromper o jsonb no Supabase.
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
