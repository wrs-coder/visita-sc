// Share or download a JSON file using the native Web Share API when available.
// Falls back to a regular download anchor when files cannot be shared.

export async function shareJsonFile(filename: string, payload: unknown): Promise<"shared" | "downloaded"> {
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: "application/json" });

  try {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      const file = new File([blob], filename, { type: "application/json" });
      // Some browsers (iOS Safari) require canShare check
      const canShareFiles =
        typeof (navigator as Navigator & { canShare?: (d: ShareData) => boolean }).canShare === "function"
          ? (navigator as Navigator & { canShare: (d: ShareData) => boolean }).canShare({ files: [file] })
          : true;
      if (canShareFiles) {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          files: [file],
          title: filename,
          text: "Arquivo Visita SC",
        });
        return "shared";
      }
    }
  } catch (err) {
    // User cancelled — don't fallback in that case
    if ((err as Error)?.name === "AbortError") return "shared";
    // Otherwise fall through to download
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}

export async function readJsonFile<T = unknown>(file: File): Promise<T> {
  const text = await file.text();
  return JSON.parse(text) as T;
}
