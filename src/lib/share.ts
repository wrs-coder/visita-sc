// Unified file save / pick helpers.
//
// Strategy (in order of preference, with graceful fallbacks):
//   1. File System Access API (`showSaveFilePicker` / `showOpenFilePicker`) —
//      lets the user choose ANY folder on desktop Chromium browsers.
//   2. Web Share API with files — on mobile (incl. Capacitor WebView) opens
//      the native share / "Save to Files" sheet, allowing the user to send
//      the file anywhere or save it to Downloads.
//   3. Anchor download fallback — saves directly to the device Downloads
//      folder, where the user can locate it via the file manager.

type SaveOutcome = "saved" | "shared" | "downloaded";

interface SaveOptions {
  filename: string;
  mimeType: string;
  // File System Access API picker hints
  pickerTypes?: Array<{ description: string; accept: Record<string, string[]> }>;
}

function hasSaveFilePicker(): boolean {
  return typeof window !== "undefined" && typeof (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker === "function";
}

function hasOpenFilePicker(): boolean {
  return typeof window !== "undefined" && typeof (window as unknown as { showOpenFilePicker?: unknown }).showOpenFilePicker === "function";
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
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor;
  if (!cap) return false;
  try {
    if (typeof cap.isNativePlatform === "function") return cap.isNativePlatform();
    if (typeof cap.getPlatform === "function") return cap.getPlatform() !== "web";
  } catch { /* noop */ }
  return false;
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
 * Capacitor-native save: writes the blob to the app's Cache directory
 * and opens the native Share sheet so the user can save it to Files,
 * Drive, email, etc. Returns true on success, false to allow fallback.
 */
async function saveViaCapacitor(blob: Blob, filename: string, mimeType: string): Promise<boolean> {
  if (!isCapacitorNative()) return false;
  try {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const data = await blobToBase64(blob);
    const written = await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory.Cache,
    });
    try {
      await Share.share({
        title: filename,
        url: written.uri,
        dialogTitle: filename,
      });
    } catch (err) {
      // User cancel = success; only treat real failures as fallback
      const name = (err as Error)?.name ?? "";
      const msg = (err as Error)?.message ?? "";
      if (!/cancel/i.test(name) && !/cancel/i.test(msg)) {
        // Fall back to copying to Documents so file is at least findable
        try {
          await Filesystem.writeFile({ path: filename, data, directory: Directory.Documents });
        } catch { /* ignore */ }
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Save a Blob to disk. Opens the native file picker when supported,
 * falls back to the share sheet on mobile, and finally to a Downloads
 * anchor — always producing a file the user can locate later.
 */
export async function saveBlob(blob: Blob, opts: SaveOptions): Promise<SaveOutcome> {
  const { filename, mimeType, pickerTypes } = opts;

  // 0. Capacitor native (APK) — use Filesystem + Share plugin so the user
  //    can save anywhere or send the file, instead of an invisible WebView download.
  if (isCapacitorNative()) {
    const ok = await saveViaCapacitor(blob, filename, mimeType);
    if (ok) return "shared";
    // fall through to web fallbacks
  }

  // 1. File System Access API — true folder picker
  if (hasSaveFilePicker()) {
    try {
      const types = pickerTypes ?? [{ description: filename, accept: { [mimeType]: [`.${filename.split(".").pop() ?? "bin"}`] } }];
      const handle = await (window as unknown as {
        showSaveFilePicker: (o: { suggestedName: string; types: typeof types }) => Promise<FileSystemFileHandle>;
      }).showSaveFilePicker({ suggestedName: filename, types });
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
export async function shareJsonFile(filename: string, payload: unknown): Promise<"shared" | "downloaded"> {
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
      const exts = accept.split(",").map((s) => s.trim()).filter((s) => s.startsWith("."));
      const mimes = accept.split(",").map((s) => s.trim()).filter((s) => !s.startsWith("."));
      const acceptObj: Record<string, string[]> = {};
      for (const m of mimes) acceptObj[m] = exts.length ? exts : [];
      if (!Object.keys(acceptObj).length) acceptObj["*/*"] = exts;
      const [handle] = await (window as unknown as {
        showOpenFilePicker: (o: { multiple: boolean; types: Array<{ description: string; accept: Record<string, string[]> }> }) => Promise<FileSystemFileHandle[]>;
      }).showOpenFilePicker({ multiple: false, types: [{ description: "Arquivo", accept: acceptObj }] });
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
