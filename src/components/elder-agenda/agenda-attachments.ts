// Anexos da pauta no aparelho: o arquivo fica guardado aqui (IndexedDB) e só sobe à nuvem
// quando o SC liga "Enviar". Fotos são comprimidas antes de enviar; só foto e PDF.
import { get as idbGet, set as idbSet, del as idbDel, createStore } from "idb-keyval";
import { downscaleImage } from "@/lib/outline-attachments";
import { MAX_CLOUD_BYTES, newId, type AgendaAttachment } from "@/lib/elder-agenda/agenda";

const store = typeof indexedDB !== "undefined" ? createStore("visita-sc-agenda-att", "files") : undefined;

export const localBlob = async (id: string): Promise<Blob | null> => (store ? ((await idbGet<Blob>(id, store)) ?? null) : null);
export const keepLocal = async (id: string, blob: Blob) => { if (store) await idbSet(id, blob, store); };
export const dropLocal = async (id: string) => { if (store) await idbDel(id, store); };

/** Lê o arquivo escolhido: foto vira JPEG reduzido (1600 px, ~70%); PDF vai como está. */
export async function prepareFile(file: File): Promise<{ att: AgendaAttachment; blob: Blob } | { error: string }> {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const isImg = file.type.startsWith("image/");
  if (!isPdf && !isImg) return { error: "Só fotos e PDF." };
  let blob: Blob = file;
  if (isImg) {
    const r = await downscaleImage(file, 1600);
    blob = r.mime === "image/jpeg" ? await recompress(r.blob) : r.blob;
  }
  if (isPdf && blob.size > MAX_CLOUD_BYTES) return { error: "O PDF passa de 5 MB." };
  const att: AgendaAttachment = { id: newId(), kind: isPdf ? "pdf" : "photo", title: file.name.slice(0, 200) || (isPdf ? "PDF" : "Foto"), url: "", cloudPath: "", size: blob.size };
  await keepLocal(att.id, blob);
  return { att, blob };
}

async function recompress(blob: Blob): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(blob);
    const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
    c.getContext("2d")!.drawImage(bmp, 0, 0);
    const out = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", 0.7));
    return out && out.size < blob.size ? out : blob;
  } catch { return blob; }
}
