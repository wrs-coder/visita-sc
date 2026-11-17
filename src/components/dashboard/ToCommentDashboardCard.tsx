// Cartão "Para comentar" na tela Esboços do Início: o MESMO cartão de Estudo e Anotações
// (texto, balões com link do texto bíblico, Modo comentário), lendo o workspace local do usuário.
// Só notas com ⭐. Sem nenhuma, o cartão não aparece.
import { useCallback, useEffect, useState } from "react";
import { Hand } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CollapsibleCard } from "@/components/dashboard/CollapsibleCard";
import { CommentCard, CommentMode } from "@/components/guest-workspace/BibleTrackExtras";
import { commentEntries, toggleCommentStar } from "@/lib/bible-tracks";
import { loadWs, saveWs, wsUserKey } from "@/lib/guest-workspace-store";
import type { Highlight } from "@/lib/bible-chapters";

export default function ToCommentDashboardCard({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const sk = wsUserKey(userId);
  const [list, setList] = useState<Highlight[]>([]);
  const [open, setOpen] = useState(false);
  const reload = useCallback(() => { void loadWs(sk).then((d) => setList(commentEntries(d))); }, [sk]);
  useEffect(() => {
    reload();
    const onVis = () => { if (document.visibilityState === "visible") reload(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", reload);
    return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", reload); };
  }, [reload]);
  // Tirar a ⭐ aqui grava no mesmo workspace (lê a cópia mais nova antes de salvar).
  const toggleStar = async (id: string) => {
    const d = await loadWs(sk);
    const n = toggleCommentStar(d, id);
    await saveWs(sk, n);
    setList(commentEntries(n));
  };
  if (list.length === 0) return null;
  return (
    <>
      <CollapsibleCard id="to-comment" accent="notes" icon={<Hand className="h-4 w-4" />}
        title={`${t("guestWs.toComment", { defaultValue: "Para comentar" })} (${list.length})`}>
        <CommentCard bare list={list} onOpen={() => setOpen(true)} onStar={(id) => void toggleStar(id)} />
      </CollapsibleCard>
      {open && <CommentMode list={list} onClose={() => setOpen(false)} />}
    </>
  );
}
