// Gaveta de rodapé com os pontos altos da leitura.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { resolveCanonical, getLocalizedBookName } from "@/lib/bible-canon";
import { filterHighlights, bookId as bid, type Highlight } from "@/lib/bible-chapters";

export function refToBookId(ref: string): string | null {
  const m = /^\s*(.+?)\s+\d/.exec(ref);
  return resolveCanonical((m ? m[1] : ref).trim())?.id ?? null;
}

export function HighlightsDrawer({ open, onOpenChange, highlights, onSave, onDelete, presetRef }: {
  open: boolean; onOpenChange: (o: boolean) => void; highlights: Highlight[];
  onSave: (h: Highlight) => void; onDelete: (id: string) => void; presetRef?: string;
}) {
  const { t, i18n } = useTranslation();
  const [editId, setEditId] = useState<string | null>(null);
  const [ref, setRef] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [book, setBook] = useState<string | null>(null);

  useEffect(() => { if (open) { setEditId(null); setRef(presetRef ?? ""); setText(""); } }, [open, presetRef]);

  const name = (id: string) => getLocalizedBookName(id, i18n.language) ?? id;
  const books = [...new Set(highlights.map((h) => h.bookId).filter((b): b is string => !!b))].sort();
  const list = filterHighlights(highlights, book, q).sort((a, b) => b.date.localeCompare(a.date));

  const save = () => {
    if (!text.trim() && !ref.trim()) return;
    const old = highlights.find((h) => h.id === editId);
    onSave({ id: editId ?? crypto.randomUUID(), ref: ref.trim(), bookId: refToBookId(ref), text: text.trim(), date: old?.date ?? new Date().toISOString() });
    setEditId(null); setRef(""); setText("");
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>{t("guestWs.highlights", { defaultValue: "Pontos altos" })}</DrawerTitle>
          <DrawerDescription className="sr-only">{t("guestWs.highlights", { defaultValue: "Pontos altos" })}</DrawerDescription>
        </DrawerHeader>
        <div className="mx-auto w-full max-w-2xl space-y-4 overflow-y-auto px-4 pb-6">
          <div className="space-y-2 rounded-xl border bg-card p-3">
            <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder={t("guestWs.refPh", { defaultValue: "Referência (ex.: Salmo 23:1)" })} />
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={t("guestWs.meditationPh", { defaultValue: "Meditação" })} />
            <div className="flex justify-end gap-2">
              {editId && <Button variant="ghost" size="sm" onClick={() => { setEditId(null); setRef(""); setText(""); }}>{t("common.cancel", { defaultValue: "Cancelar" })}</Button>}
              <Button size="sm" onClick={save}>{t("common.save", { defaultValue: "Salvar" })}</Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("guestWs.search", { defaultValue: "Pesquisar" })} className="h-9" />
            <select value={book ?? ""} onChange={(e) => setBook(e.target.value || null)} className="h-9 rounded-md border bg-background px-2 text-sm">
              <option value="">{t("guestWs.allBooks", { defaultValue: "Todos os livros" })}</option>
              {books.map((b) => <option key={b} value={b}>{name(b)}</option>)}
            </select>
          </div>
          {list.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("guestWs.noHighlights", { defaultValue: "Nenhum ponto alto ainda." })}</p>
          ) : (
            <ul className="space-y-2">
              {list.map((h) => (
                <li key={h.id} className="rounded-xl border bg-card p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{h.ref || "—"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(h.date).toLocaleDateString(i18n.language)}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("guestWs.edit", { defaultValue: "Editar" })}
                      onClick={() => { setEditId(h.id); setRef(h.ref); setText(h.text); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label={t("guestWs.delete", { defaultValue: "Apagar" })}
                      onClick={() => { if (window.confirm(t("guestWs.confirmDelete", { defaultValue: "Apagar este item?" }))) onDelete(h.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  {h.text && <p className="mt-1 whitespace-pre-wrap text-sm">{h.text}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export { bid };
