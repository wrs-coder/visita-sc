import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Heart, Check, Reply } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { markCoupleMessagesReadSuper, type CoupleThread } from "@/lib/couple-messages.functions";

/** Ícone discreto de recados da esposa no topo do painel, com contador e popup. */
export function CoupleMessagesButton({
  threads,
  unread,
  onChanged,
}: {
  threads: CoupleThread[];
  unread: number;
  onChanged: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const markRead = useServerFn(markCoupleMessagesReadSuper);
  const label = t("dashboard.couple.title", { defaultValue: "Recados" });
  const unreadThreads = threads.filter((th) => {
    const last = th.replies[th.replies.length - 1] ?? th.root;
    return last.author === "wife" && !last.read_by_super;
  });

  const handleRead = async () => {
    setBusy(true);
    try {
      await markRead();
      await onChanged();
    } catch (err) {
      console.error("[CoupleMessagesButton] Erro ao marcar como lido:", err);
      toast.error(t("dashboard.couple.readError", { defaultValue: "Não foi possível marcar como lido agora." }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative h-8 w-8 rounded-full"
        onClick={() => setOpen(true)}
        title={label}
        aria-label={unread > 0 ? `${label} (${unread})` : label}
      >
        <Heart className="h-4 w-4 text-primary" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold leading-4 text-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[92vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription className="sr-only">{label}</DialogDescription>
          </DialogHeader>
          {unreadThreads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("dashboard.couple.empty", { defaultValue: "Nenhum recado novo" })}
            </p>
          ) : (
            <ul className="space-y-2 max-h-[55vh] overflow-y-auto">
              {unreadThreads.map((th) => {
                const last = th.replies[th.replies.length - 1] ?? th.root;
                return (
                  <li key={th.root.id} className="p-2 rounded-md border bg-card">
                    <div className="font-medium text-sm break-words">{th.root.title}</div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words mt-1">{last.body}</p>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            {unreadThreads.length > 0 && (
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void handleRead()}>
                <Check className="h-4 w-4 mr-1" />
                {t("dashboard.couple.read", { defaultValue: "Lido" })}
              </Button>
            )}
            <Button asChild size="sm">
              <Link to="/comunicacao-casal" onClick={() => setOpen(false)}>
                <Reply className="h-4 w-4 mr-1" />
                {t("dashboard.couple.reply", { defaultValue: "Responder" })}
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
