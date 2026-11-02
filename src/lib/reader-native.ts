// Voz (leitura em áudio) e brilho da tela para o leitor da aba Bíblia.
// No Android usa plugins nativos; no navegador cai para speechSynthesis / sem brilho real.
import { Capacitor } from "@capacitor/core";

const native = () => Capacitor.isNativePlatform();

export async function speakText(text: string, lang: string, rate: number): Promise<void> {
  if (native()) {
    const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
    await TextToSpeech.speak({ text, lang, rate, pitch: 1, volume: 1, category: "playback" });
    return;
  }
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  if (!synth) throw new Error("no-tts");
  await new Promise<void>((resolve, reject) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = rate;
    u.onend = () => resolve();
    u.onerror = (e) => (e.error === "interrupted" || e.error === "canceled" ? resolve() : reject(e));
    synth.speak(u);
  });
}

export async function stopSpeaking(): Promise<void> {
  try {
    if (native()) { const { TextToSpeech } = await import("@capacitor-community/text-to-speech"); await TextToSpeech.stop(); }
    else window.speechSynthesis?.cancel();
  } catch { /* ignore */ }
}

export function canSpeak(): boolean {
  return native() || (typeof window !== "undefined" && "speechSynthesis" in window);
}

/** Brilho real (Android). Retorna false quando não há suporte (usar escurecimento visual). */
export async function setScreenBrightness(level: number | null): Promise<boolean> {
  if (!native()) return false;
  try {
    const { ScreenBrightness } = await import("@capacitor-community/screen-brightness");
    await ScreenBrightness.setBrightness({ brightness: level == null ? -1 : level });
    return true;
  } catch { return false; }
}
