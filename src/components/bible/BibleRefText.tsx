// Texto somente leitura com as referências bíblicas em azul, abrindo a Bíblia
// numa janela. O texto salvo não muda: os links são criados só na exibição.
import { useEffect, useState } from "react";
import { RichOutlineContent } from "@/lib/rich-content";
import { getActiveLibrary, type BibleLibrary } from "@/lib/bible-notes-store";
import { cn } from "@/lib/utils";

let cached: Promise<BibleLibrary | null> | null = null;
function loadLibrary(): Promise<BibleLibrary | null> {
  if (!cached) cached = getActiveLibrary().catch(() => null);
  return cached;
}

export function BibleRefText({ text, className }: { text: string; className?: string }) {
  const [library, setLibrary] = useState<BibleLibrary | null>(null);
  useEffect(() => {
    let alive = true;
    void loadLibrary().then((l) => { if (alive) setLibrary(l); });
    return () => { alive = false; };
  }, []);
  if (!text) return null;
  return (
    <div className={cn("whitespace-pre-wrap", className)}>
      <RichOutlineContent html={text} library={library} />
    </div>
  );
}
