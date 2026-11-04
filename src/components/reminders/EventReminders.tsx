import { useEffect, useState, type ReactNode } from "react";
import { Bell, ChevronDown } from "lucide-react";
import { CollapseBody, CollapseIdToggle, CollapseProvider, useCollapseOpen } from "@/components/ui/collapsible-blocks";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { TimelineKind, TimelineSource } from "@/lib/today-timeline";
import {
  applyReminders, isRemindersSupported, kindsForRole, LEAD_OPTIONS, LEAD_UNITS, leadLabel, leadToMinutes, loadPrefs, planReminders,
  requestReminderPermission, savePrefs, sendTestReminder, splitLead, type LeadUnit, type ReadingKind, type ReminderPrefs, type ReminderRole,
} from "@/lib/event-reminders";
import { lastReadDay } from "@/lib/reading-day-log";

const KIND_LABEL: Record<TimelineKind, string> = {
  schedule: "Cronograma", field: "Campo", study: "Estudos", meal: "Refeições",
  meeting: "Reuniões", transport: "Transporte",
};
const UNIT_LABEL: Record<LeadUnit, string> = { min: "minutos", h: "horas", d: "dias", w: "semanas" };
const DAY_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];

/** Antecedência livre: número + unidade, com atalhos rápidos. */
function LeadInput({ value, onChange, label }: { value: number; onChange: (min: number) => void; label: string }) {
  const init = splitLead(value);
  const [txt, setTxt] = useState(String(init.n));
  const [unit, setUnit] = useState<LeadUnit>(init.unit);
  useEffect(() => { const s = splitLead(value); setTxt(String(s.n)); setUnit(s.unit); }, [value]);
  const commit = (t: string, u: LeadUnit) => { const m = leadToMinutes(parseInt(t, 10) || 1, u); onChange(m); };
  return (
    <div className="flex items-center gap-2">
      <input type="text" inputMode="numeric" pattern="[0-9]*" aria-label={`${label}: quantidade`} className={`${timeCls} h-10 w-16 text-base text-center`}
        value={txt} onChange={(e) => setTxt(e.target.value.replace(/\D/g, "").slice(0, 3))} onBlur={() => commit(txt, unit)} />
      <select aria-label={`${label}: unidade`} className={`${timeCls} h-10 text-base`} value={unit}
        onChange={(e) => { const u = e.target.value as LeadUnit; setUnit(u); commit(txt, u); }}>
        {LEAD_UNITS.map(([u]) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
      </select>
    </div>
  );
}
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
      void applyReminders(planReminders(items, loadPrefs(scope, role), role, new Date(), { personal: lastReadDay("personal"), family: lastReadDay("family") }));
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
    <CollapseProvider scope="reminders">
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /><span className="flex-1">Lembretes de eventos</span><CollapseIdToggle id="card" /></CardTitle>
      </CardHeader>
      <CollapseBody id="card">
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
                <Sec id="lead" title="Antecedência">
                  <LeadInput label="Antecedência" value={prefs.lead} onChange={(m) => update({ ...prefs, lead: m })} />
                  <div className="flex flex-wrap gap-2">
                    {LEAD_OPTIONS.map((l) => (
                      <Button key={l} size="sm" variant={prefs.lead === l ? "default" : "outline"} onClick={() => update({ ...prefs, lead: l })}>
                        {leadLabel(l)}
                      </Button>
                    ))}
                  </div>
                </Sec>
                <Sec id="kinds" title="Avisar sobre">
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
                </Sec>
                <Sec id="second" title="Segundo aviso">
                  <div className="flex flex-wrap items-center gap-3">
                    <Switch aria-label="Segundo aviso" checked={!!prefs.second} onCheckedChange={(v) => update({ ...prefs, second: v ? 15 : 0 })} />
                    {!!prefs.second && <LeadInput label="Segundo aviso" value={prefs.second} onChange={(m) => update({ ...prefs, second: m })} />}
                  </div>
                </Sec>
                {prefs.kinds.length > 0 && (
                  <Sec id="byKind" title="Antecedência por tipo">
                    <div className="rounded-xl border divide-y">
                      {prefs.kinds.map((k) => (
                        <label key={k} className="flex items-center justify-between gap-3 px-3 py-2">
                          <span className="text-sm">{KIND_LABEL[k]}</span>
                          <div className="flex items-center gap-2">
                            {prefs.leadByKind?.[k] != null
                              ? <LeadInput label={`Antecedência: ${KIND_LABEL[k]}`} value={prefs.leadByKind[k]!} onChange={(m) => update({ ...prefs, leadByKind: { ...prefs.leadByKind, [k]: m } })} />
                              : <span className="text-xs text-muted-foreground">Padrão ({leadLabel(prefs.lead)})</span>}
                            <Switch aria-label={`Antecedência própria: ${KIND_LABEL[k]}`} checked={prefs.leadByKind?.[k] != null}
                              onCheckedChange={(v) => { const next = { ...(prefs.leadByKind ?? {}) }; if (v) next[k] = prefs.lead; else delete next[k]; update({ ...prefs, leadByKind: next }); }} />
                          </div>
                        </label>
                      ))}
                    </div>
                  </Sec>
                )}
                <Sec id="digest" title="Resumo do dia e silêncio">
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
                </Sec>
                <p className="text-xs text-muted-foreground">Na notificação, toque em “Adiar 10 min” para ser lembrado de novo.</p>
                <Button size="sm" variant="ghost" onClick={() => void sendTestReminder().then((ok) => ok && toast.success("Lembrete de teste em 3 segundos"))}>
                  Testar lembrete
                </Button>
              </>
            )}
            {role !== "elder" && (
              <Sec id="reading" title="Leitura da Bíblia">
                <div className="rounded-xl border divide-y">
                  {(["personal", "family"] as ReadingKind[]).map((k) => {
                    const r = prefs.reading?.[k] ?? { on: false, time: k === "personal" ? "06:30" : "20:00", days: [0, 1, 2, 3, 4, 5, 6] };
                    const set = (patch: Partial<typeof r>) => update({ ...prefs, reading: { ...prefs.reading, [k]: { ...r, ...patch } } });
                    return (
                      <div key={k} className="space-y-2 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm">{k === "personal" ? "Leitura pessoal" : "Leitura em família"}</span>
                          <Switch aria-label={k === "personal" ? "Leitura pessoal" : "Leitura em família"} checked={r.on}
                            onCheckedChange={async (v) => {
                              if (v && !(await requestReminderPermission())) { toast.error("Permita as notificações do Visita SC nas configurações do celular."); return; }
                              set({ on: v });
                            }} />
                        </div>
                        {r.on && (
                          <div className="flex flex-wrap items-center gap-2">
                            <input type="time" aria-label="Horário da leitura" className={`${timeCls} h-10 text-base`} value={r.time}
                              onChange={(e) => e.target.value && set({ time: e.target.value })} />
                            <div className="flex gap-1">
                              {DAY_LETTERS.map((l, d) => {
                                const on = r.days.includes(d);
                                return (
                                  <button key={d} type="button" aria-pressed={on} aria-label={`Dia ${d}`}
                                    onClick={() => set({ days: on ? r.days.filter((x) => x !== d) : [...r.days, d].sort() })}
                                    className={`h-8 w-8 rounded-full text-xs font-medium ${on ? "bg-primary text-primary-foreground" : "border text-muted-foreground"}`}>{l}</button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Se a leitura do dia já foi marcada, o aviso de hoje não aparece.</p>
              </Sec>
            )}
          </>
        )}
      </CardContent>
      </CollapseBody>
    </Card>
    </CollapseProvider>
  );
}

/** Bloco recolhível dos lembretes (só visual: conteúdo fica oculto, nunca desmontado). */
function Sec({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const [open, toggle] = useCollapseOpen(id);
  return (
    <div className="space-y-1.5">
      <button type="button" onClick={toggle} aria-expanded={open}
        className="flex w-full min-h-[36px] items-center justify-between gap-2 rounded-md text-xs font-medium text-muted-foreground active:bg-muted/60">
        <span>{title}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      <CollapseBody id={id} className="space-y-1.5">{children}</CollapseBody>
    </div>
  );
}
