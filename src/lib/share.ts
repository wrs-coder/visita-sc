// Unified file save / pick helpers.
//
// Strategy (in order of preference, with graceful fallbacks):
//   0. Capacitor native APK — strictly writes Base64 data with Capacitor
//      Filesystem and opens the native Share sheet. No object URLs, no anchors,
//      and no WebView downloads are used while running natively.
//   1. File System Access API (`showSaveFilePicker` / `showOpenFilePicker`) —
//      lets the user choose ANY folder on desktop Chromium browsers.
//   2. Web Share API with files — on mobile (incl. Capacitor WebView) opens
//      the native share / "Save to Files" sheet, allowing the user to send
//      the file anywhere or save it to Downloads.
//   3. Anchor download fallback — saves directly to the device Downloads
//      folder, where the user can locate it via the file manager.

import { Capacitor } from "@capacitor/core";

type SaveOutcome = "saved" | "shared" | "downloaded";

interface SaveOptions {
  filename: string;
  mimeType: string;
  // File System Access API picker hints
  pickerTypes?: Array<{ description: string; accept: Record<string, string[]> }>;
}

function hasSaveFilePicker(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker === "function"
  );
}

function hasOpenFilePicker(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as { showOpenFilePicker?: unknown }).showOpenFilePicker === "function"
  );
}

function canShareFiles(file: File): boolean {
  if (typeof navigator === "undefined" || !("share" in navigator)) return false;
  const n = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  return typeof n.canShare === "function" ? n.canShare({ files: [file] }) : true;
}

function downloadAnchor(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function isCapacitorNative(): boolean {
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {
    /* noop */
  }
  if (typeof window === "undefined") return false;
  const cap = (
    window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
    }
  ).Capacitor;
  try {
    if (typeof cap?.isNativePlatform === "function") return cap.isNativePlatform();
    if (typeof cap?.getPlatform === "function") return cap.getPlatform() !== "web";
  } catch {
    /* noop */
  }
  return Boolean((window as unknown as { androidBridge?: unknown }).androidBridge);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read error"));
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Capacitor-native save: converts the already-generated export blob to Base64,
 * writes it through the native Filesystem plugin, then opens the native Share
 * sheet with the persisted file URI. This helper is intentionally read-only
 * with respect to app data: it only consumes the provided Blob and never writes
 * to local database stores, sync queues, IndexedDB records, or timestamps.
 */
async function saveViaCapacitor(blob: Blob, filename: string): Promise<SaveOutcome> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);
  const data = await blobToBase64(blob);
  const safeFilename =
    filename.replace(/[\\/:*?"<>|]+/g, "-").replace(/^\.+/, "file") || "export.dat";
  const path = `VisitaSC/${safeFilename}`;
  let directory = Directory.Documents;

  try {
    await Filesystem.writeFile({ path, data, directory, recursive: true });
  } catch (documentsError) {
    directory = Directory.External;
    try {
      await Filesystem.writeFile({ path, data, directory, recursive: true });
    } catch (externalError) {
      throw new Error(
        `Não foi possível salvar o arquivo no armazenamento nativo. ${(externalError as Error)?.message || (documentsError as Error)?.message || ""}`.trim(),
      );
    }
  }

  const { uri } = await Filesystem.getUri({ path, directory });
  try {
    await Share.share({
      title: safeFilename,
      url: uri,
      dialogTitle: safeFilename,
    });
  } catch (err) {
    const name = (err as Error)?.name ?? "";
    const msg = (err as Error)?.message ?? "";
    if (!/cancel/i.test(name) && !/cancel/i.test(msg)) throw err;
  }
  return "shared";
}

/**
 * Save a Blob to disk. Opens the native file picker when supported,
 * falls back to the share sheet on mobile, and finally to a Downloads
 * anchor — always producing a file the user can locate later.
 */
export async function saveBlob(blob: Blob, opts: SaveOptions): Promise<SaveOutcome> {
  const { filename, mimeType, pickerTypes } = opts;

  // 0. Capacitor native (APK) — use Filesystem + Share plugin so the user
  //    can save anywhere or send the file, instead of an invisible WebView
  //    download. In native mode, never fall through to object URLs, anchors,
  //    or any browser download behavior.
  if (isCapacitorNative()) {
    return saveViaCapacitor(blob, filename);
  }

  // 1. File System Access API — true folder picker
  if (hasSaveFilePicker()) {
    try {
      const types = pickerTypes ?? [
        {
          description: filename,
          accept: { [mimeType]: [`.${filename.split(".").pop() ?? "bin"}`] },
        },
      ];
      const handle = await (
        window as unknown as {
          showSaveFilePicker: (o: {
            suggestedName: string;
            types: typeof types;
          }) => Promise<FileSystemFileHandle>;
        }
      ).showSaveFilePicker({ suggestedName: filename, types });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return "saved";
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return "saved"; // user cancelled
      // Fall through to next strategy
    }
  }

  // 2. Web Share API with files — Capacitor WebView + mobile browsers
  try {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      const file = new File([blob], filename, { type: mimeType });
      if (canShareFiles(file)) {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          files: [file],
          title: filename,
        });
        return "shared";
      }
    }
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return "shared";
    // fall through
  }

  // 3. Plain anchor download → Downloads folder
  downloadAnchor(filename, blob);
  return "downloaded";
}

/**
 * Share or download a JSON payload. Backward-compatible alias kept for
 * existing call sites. Returns "shared" | "downloaded" for legacy callers
 * — the new "saved" outcome maps to "downloaded" semantics for the UI.
 */
export async function shareJsonFile(
  filename: string,
  payload: unknown,
): Promise<"shared" | "downloaded"> {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const out = await saveBlob(blob, {
    filename,
    mimeType: "application/json",
    pickerTypes: [{ description: "JSON", accept: { "application/json": [".json"] } }],
  });
  return out === "shared" ? "shared" : "downloaded";
}

/**
 * Open the native file picker. Uses File System Access API when available,
 * otherwise an <input type="file"> dialog.
 */
export async function pickFile(accept: string): Promise<File | null> {
  if (hasOpenFilePicker()) {
    try {
      const exts = accept
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.startsWith("."));
      const mimes = accept
        .split(",")
        .map((s) => s.trim())
        .filter((s) => !s.startsWith("."));
      const acceptObj: Record<string, string[]> = {};
      for (const m of mimes) acceptObj[m] = exts.length ? exts : [];
      if (!Object.keys(acceptObj).length) acceptObj["*/*"] = exts;
      const [handle] = await (
        window as unknown as {
          showOpenFilePicker: (o: {
            multiple: boolean;
            types: Array<{ description: string; accept: Record<string, string[]> }>;
          }) => Promise<FileSystemFileHandle[]>;
        }
      ).showOpenFilePicker({
        multiple: false,
        types: [{ description: "Arquivo", accept: acceptObj }],
      });
      return await handle.getFile();
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return null;
      // fall through to input fallback
    }
  }
  return new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.display = "none";
    input.onchange = () => {
      const f = input.files?.[0] ?? null;
      input.remove();
      resolve(f);
    };
    // If the dialog is dismissed without a selection, no event fires — clean up on focus.
    const cleanup = () => {
      setTimeout(() => {
        if (document.body.contains(input)) {
          input.remove();
          resolve(null);
        }
        window.removeEventListener("focus", cleanup);
      }, 500);
    };
    window.addEventListener("focus", cleanup, { once: true });
    document.body.appendChild(input);
    input.click();
  });
}

export async function readJsonFile<T = unknown>(file: File): Promise<T> {
  const text = await file.text();
  return JSON.parse(text) as T;
}
