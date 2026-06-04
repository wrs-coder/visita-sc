import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Send, MessageCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { getDateLocale } from "@/lib/date-locale";
import { toast } from "sonner";
import {
  listCoupleMessages,
  createCoupleMessage,
  markCoupleMessagesReadSuper,
  deleteCoupleThread,
  type CoupleThread,
} from "@/lib/couple-messages.functions";
import { CoupleMessagesReportDialog } from "@/components/visit-week/CoupleMessagesReportDialog";
import { VisitWeekReportButton } from "@/components/visit-week/VisitWeekReportDialog";
import { useActiveVisit } from "@/hooks/use-active-visit";

export const Route = createFileRoute("/_app/comunicacao-casal")({ component: Page });

function Page() {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const { role } = useAuth();
  const nav = useNavigate();
  const listFn = useServerFn(listCoupleMessages);
  const createFn = useServerFn(createCoupleMessage);
  const markFn = useServerFn(markCoupleMessagesReadSuper);
  const delFn = useServerFn(deleteCoupleThread);

  const [threads, setThreads] = useState<CoupleThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [delFor, setDelFor] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const { visit } = useActiveVisit();

  useEffect(() => {
    if (role && role !== "superintendent") nav({ to: "/dashboard" });
  }, [role, nav]);

  const load = useCallback(async () => {
    try {
      const r = await listFn();
      if (r.ok) setThreads(r.threads);
    } catch (err) {
      console.warn("[couple] load failed", err);
    } finally {
      setLoading(false);
    }
  }, [listFn]);

  useEffect(() => {
    load();
    markFn().catch(() => {});
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load, markFn]);

  const send = async () => {
    if (!title.trim()) return toast.error(t("couple.titleRequired"));
    if (!body.trim()) return toast.error(t("couple.bodyRequired"));
    setSending(true);
    try {
      await createFn({ data: { title: title.trim(), body: body.trim() } });
      toast.success(t("couple.sent"));
      setTitle("");
      setBody("");
      setOpen(false);
      load();
    } catch {
      toast.error(t("couple.sendFailed"));
    } finally {
      setSending(false);
    }
  };

  const sendReply = async (parentId: string) => {
    if (!replyBody.trim()) return;
    setSending(true);
    try {
      await createFn({ data: { parentId, body: replyBody.trim() } });
      setReplyBody("");
      setReplyOpen(null);
      load();
    } catch {
      toast.error(t("couple.sendFailed"));
    } finally {
      setSending(false);
    }
  };

  const remove = async () => {
    if (!delFor) return;
    try {
      await delFn({ data: { rootId: delFor } });
      toast.success(t("couple.deleted"));
      setDelFor(null);
      load();
    } catch {
      toast.error(t("couple.sendFailed"));
    }
  };

  const fmt = (iso: string) => format(parseISO(iso), "dd/MM HH:mm", { locale: dateLocale });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t("couple.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("couple.subtitleSuper")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <VisitWeekReportButton onClick={() => setReportOpen(true)} />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              {t("couple.newMessage")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("couple.newMessageTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("couple.titleField")}</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("couple.bodyField")}</Label>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={4000} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={send} disabled={sending}>
                <Send className="h-4 w-4 mr-1" />
                {sending ? "…" : t("couple.send")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : threads.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground text-center flex flex-col items-center gap-2">
            <MessageCircle className="h-8 w-8 opacity-50" />
            {t("couple.noMessages")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {threads.map((th) => (
            <Card key={th.root.id} className="shadow-card">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-primary/70 font-semibold">
                      {th.root.author === "wife" ? t("couple.fromWife") : t("couple.fromSuper")} ·{" "}
                      {fmt(th.root.created_at)}
                    </div>
                    <div className="font-semibold break-words">{th.root.title}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDelFor(th.root.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{th.root.body}</p>

                {th.replies.length > 0 && (
                  <div className="space-y-2 pl-3 border-l-2 border-primary/20">
                    {th.replies.map((rep) => (
                      <div key={rep.id} className="text-sm">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                          {rep.author === "wife" ? t("couple.fromWife") : t("couple.fromSuper")} ·{" "}
                          {fmt(rep.created_at)}
                        </div>
                        <p className="whitespace-pre-wrap break-words">{rep.body}</p>
                      </div>
                    ))}
                  </div>
                )}

                {replyOpen === th.root.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder={t("couple.replyPlaceholder")}
                      rows={3}
                      maxLength={4000}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => { setReplyOpen(null); setReplyBody(""); }}>
                        {t("common.cancel")}
                      </Button>
                      <Button size="sm" onClick={() => sendReply(th.root.id)} disabled={sending}>
                        <Send className="h-3.5 w-3.5 mr-1" />
                        {t("couple.send")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setReplyOpen(th.root.id)}>
                    {t("couple.reply")}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!delFor} onOpenChange={(o) => !o && setDelFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("couple.deleteThread")}</AlertDialogTitle>
            <AlertDialogDescription>{t("couple.confirmDelete")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={remove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("schedule.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CoupleMessagesReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        visitTitle={visit?.title ?? t("couple.title")}
      />
    </div>
  );
}
