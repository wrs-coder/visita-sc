// Ponte para a bolinha flutuante do Android ("Sobrepor a outros apps").
// Sem permissão (ou APK antigo), usa uma notificação fixa com o horário de término.
// No navegador não faz nada: só a tela de foco.
import { Capacitor, registerPlugin } from "@capacitor/core";

interface FloatingTimerPlugin {
  check(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  show(o: { title: string; program: string; startedAt: number; spentMs: number; plannedMs: number; paused: boolean }): Promise<void>;
  hide(): Promise<void>;
}
const FT = registerPlugin<FloatingTimerPlugin>("FloatingTimer");
const NOTIF_ID = 771_204;
export const isNativeAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

export async function overlayGranted(): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  try { return (await FT.check()).granted; } catch { return false; }
}
export async function requestOverlay(): Promise<void> {
  if (!isNativeAndroid()) return;
  try { await FT.requestPermission(); } catch { /* APK antigo */ }
}

export interface FloatInfo { title: string; program: string; startedAt: number; spentMs: number; plannedMs: number | null; paused: boolean }

export async function showFloating(i: FloatInfo): Promise<void> {
  if (!isNativeAndroid()) return;
  try {
    await FT.show({ ...i, plannedMs: i.plannedMs ?? -1 });
    return;
  } catch { /* sem permissão: cai na notificação */ }
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const end = i.plannedMs != null && !i.paused ? new Date(i.startedAt + i.plannedMs - i.spentMs) : null;
    const hhmm = end ? end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null;
    await LocalNotifications.schedule({ notifications: [{
      id: NOTIF_ID, title: i.title || "Controle de tempo",
      body: [hhmm ? `Termina às ${hhmm}` : i.paused ? "Pausado" : "Em andamento", i.program].filter(Boolean).join(" · "),
      ongoing: true, autoCancel: false,
    }] });
  } catch { /* */ }
}

export async function hideFloating(): Promise<void> {
  if (!isNativeAndroid()) return;
  try { await FT.hide(); } catch { /* */ }
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID }] });
  } catch { /* */ }
}
