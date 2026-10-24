import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { TimelineKind, TimelineSource } from "@/lib/today-timeline";
import {
  applyReminders, isRemindersSupported, kindsForRole, LEAD_OPTIONS, loadPrefs, planReminders,
  requestReminderPermission, savePrefs, sendTestReminder, type ReminderPrefs, type ReminderRole,
} from "@/lib/event-reminders";

const KIND_LABEL: Record<TimelineKind, string> = {
  schedule: "Cronograma", field: "Campo", study: "Estudos", meal: "Refeições",
  meeting: "Reuniões", transport: "Transporte",
};
const LEAD_LABEL: Record<number, string> = { 15: "15 min", 30: "30 min", 60: "1 hora", 1440: "1 dia" };
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
