import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { TimelineKind, TimelineSource } from "@/lib/today-timeline";
import {
  applyReminders, isRemindersSupported, kindsForRole, LEAD_OPTIONS, SECOND_OPTIONS, loadPrefs, planReminders,
  requestReminderPermission, savePrefs, sendTestReminder, type ReminderPrefs, type ReminderRole,
} from "@/lib/event-reminders";

const KIND_LABEL: Record<TimelineKind, string> = {
  schedule: "Cronograma", field: "Campo", study: "Estudos", meal: "Refeições",
  meeting: "Reuniões", transport: "Transporte",
};
const LEAD_LABEL: Record<number, string> = { 0: "Não", 15: "15 min", 30: "30 min", 60: "1 hora", 1440: "1 dia" };
const timeCls = "h-8 rounded-lg border border-input bg-background px-2 text-sm tabular-nums";
const CHANGED = "visita-sc:reminders-changed";

/** Reagenda os lembretes sempre que os eventos ou preferências mudam. Não renderiza nada. */
export function EventReminderSync({ items, scope, role }: { items: TimelineSource[]; scope: string; role: ReminderRole }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick((n) => n + 1);
    window.addEventListener(CHANGED, on);
    return () => window.removeEventListener(CHANGED, on);
  }, []);
  const sig = items.map((i) => `${i.id}${i.date}${i.time}${i.title}`).join("|");
  useEffect(() => {
    const h = setTimeout(() => {
      void applyReminders(planReminders(items, loadPrefs(scope, role), role));
    }, 1500);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, scope, role, tick]);
  return null;
}

export function ReminderSettingsCard({ scope, role }: { scope: string; role: ReminderRole }) {
  const [prefs, setPrefs] = useState<ReminderPrefs | null>(null);
  const [native, setNative] = useState(false);
  useEffect(() => {
    setPrefs(loadPrefs(scope, role));
    void isRemindersSupported().then(setNative);
  }, [scope, role]);
  if (!prefs) return null;

  const update = (p: ReminderPrefs) => {
    setPrefs(p);
    savePrefs(scope, p);
    window.dispatchEvent(new Event(CHANGED));
  };
  const toggle = async (on: boolean) => {
    if (on && !(await requestReminderPermission())) {
      toast.error("Permita as notificações do Visita SC nas configurações do celular.");
      return;
    }
    update({ ...prefs, enabled: on });
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4 text-primary" />Lembretes de eventos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!native ? (
          <p className="text-sm text-muted-foreground">Os lembretes funcionam apenas no aplicativo instalado no celular.</p>
        ) : (
          <>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">Avisar antes dos eventos da semana</span>
              <Switch checked={prefs.enabled} onCheckedChange={(v) => void toggle(v)} />
            </label>
            {prefs.enabled && (
              <>
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground">Antecedência</div>
                  <div className="flex flex-wrap gap-2">
                    {LEAD_OPTIONS.map((l) => (
                      <Button key={l} size="sm" variant={prefs.lead === l ? "default" : "outline"} onClick={() => update({ ...prefs, lead: l })}>
                        {LEAD_LABEL[l]}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground">Avisar sobre</div>
                  <div className="flex flex-wrap gap-2">
                    {kindsForRole(role).map((k) => {
                      const on = prefs.kinds.includes(k);
                      return (
                        <Button key={k} size="sm" variant={on ? "default" : "outline"}
                          onClick={() => update({ ...prefs, kinds: on ? prefs.kinds.filter((x) => x !== k) : [...prefs.kinds, k] })}>
                          {KIND_LABEL[k]}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground">Segundo aviso</div>
                  <div className="flex flex-wrap gap-2">
                    {SECOND_OPTIONS.map((l) => (
                      <Button key={l} size="sm" variant={(prefs.second ?? 0) === l ? "default" : "outline"} onClick={() => update({ ...prefs, second: l })}>
                        {LEAD_LABEL[l]}
                      </Button>
                    ))}
                  </div>
                </div>
                {prefs.kinds.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs text-muted-foreground">Antecedência por tipo</div>
                    <div className="rounded-xl border divide-y">
                      {prefs.kinds.map((k) => (
                        <label key={k} className="flex items-center justify-between gap-3 px-3 py-2">
                          <span className="text-sm">{KIND_LABEL[k]}</span>
                          <select
                            className={timeCls}
                            aria-label={`Antecedência: ${KIND_LABEL[k]}`}
                            value={prefs.leadByKind?.[k] ?? ""}
                            onChange={(e) => {
                              const next = { ...(prefs.leadByKind ?? {}) };
                              if (e.target.value) next[k] = Number(e.target.value);
                              else delete next[k];
                              update({ ...prefs, leadByKind: next });
                            }}
                          >
                            <option value="">Padrão ({LEAD_LABEL[prefs.lead]})</option>
                            {LEAD_OPTIONS.map((l) => <option key={l} value={l}>{LEAD_LABEL[l]}</option>)}
                          </select>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="rounded-xl border divide-y">
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-sm">Resumo do dia</span>
                    <div className="flex items-center gap-2">
                      {prefs.digest?.on && (
                        <input type="time" aria-label="Horário do resumo do dia" className={timeCls}
                          value={prefs.digest.time}
                          onChange={(e) => e.target.value && update({ ...prefs, digest: { on: true, time: e.target.value } })} />
                      )}
                      <Switch aria-label="Resumo do dia" checked={!!prefs.digest?.on}
                        onCheckedChange={(v) => update({ ...prefs, digest: { on: v, time: prefs.digest?.time ?? "07:00" } })} />
                    </div>
                  </div>
                  <div className="px-3 py-2 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm">Horário de silêncio</span>
                      <Switch aria-label="Horário de silêncio" checked={!!prefs.quiet?.on}
                        onCheckedChange={(v) => update({ ...prefs, quiet: { from: "22:00", to: "06:00", ...prefs.quiet, on: v } })} />
                    </div>
                    {prefs.quiet?.on && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>De</span>
                        <input type="time" aria-label="Silêncio começa" className={timeCls} value={prefs.quiet.from}
                          onChange={(e) => e.target.value && update({ ...prefs, quiet: { ...prefs.quiet!, from: e.target.value } })} />
                        <span>até</span>
                        <input type="time" aria-label="Silêncio termina" className={timeCls} value={prefs.quiet.to}
                          onChange={(e) => e.target.value && update({ ...prefs, quiet: { ...prefs.quiet!, to: e.target.value } })} />
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Na notificação, toque em “Adiar 10 min” para ser lembrado de novo.</p>
                <Button size="sm" variant="ghost" onClick={() => void sendTestReminder().then((ok) => ok && toast.success("Lembrete de teste em 3 segundos"))}>
                  Testar lembrete
                </Button>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
