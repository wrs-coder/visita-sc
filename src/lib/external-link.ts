/**
 * Abertura de links externos (YouTube, sites) sem nunca carregar a página
 * dentro da própria tela do app — sites como o YouTube recusam ser abertos
 * em quadro interno ("www.youtube.com recusou a conexão").
 *
 * - App Android/iOS: abre pelo navegador do sistema (Capacitor Browser), que
 *   repassa para o app do YouTube quando instalado.
 * - Navegador/prévia: deixa o próprio link <a target="_blank"> abrir uma aba
 *   nova — é o caminho mais confiável, inclusive dentro de quadros.
 * - Sem internet: avisa em vez de abrir uma página em branco.
 */
import type { MouseEvent } from "react";
import { openExternalUrl } from "@/lib/outline-attachments";

export type ExternalLinkAction = "native" | "offline" | "browser";

/** Decide o que fazer ao tocar num link externo (lógica pura, testável). */
export function externalLinkAction(env: { native: boolean; online: boolean }): ExternalLinkAction {
  if (!env.online) return "offline";
  if (env.native) return "native";
  return "browser";
}

function isNativeApp(): boolean {
  try {
    const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
    return !!w.Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

/** Atributos de um link externo seguro: sempre aba nova, sem acesso de volta ao app. */
export const EXTERNAL_LINK_PROPS = { target: "_blank", rel: "noopener noreferrer" } as const;

/**
 * onClick para <a href={url} {...EXTERNAL_LINK_PROPS}>. No navegador não
 * interfere (o link abre a aba nova sozinho); no app usa o navegador do sistema.
 */
export function handleExternalLinkClick(
  e: MouseEvent<HTMLAnchorElement>,
  url: string,
  offlineMessage = "Precisa de internet para abrir este link.",
): void {
  const online = typeof navigator === "undefined" ? true : navigator.onLine !== false;
  const action = externalLinkAction({ native: isNativeApp(), online });
  if (action === "browser") return;
  e.preventDefault();
  if (action === "offline") {
    alert(offlineMessage);
    return;
  }
  void openExternalUrl(url);
}
