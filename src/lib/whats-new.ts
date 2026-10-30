// Decide se mostra "O que há de novo" uma única vez após atualizar o app.
export const WHATS_NEW_KEY = "visita-sc:whats-new-seen";

/**
 * Mostra quando a versão instalada é a das novidades, ainda não foi vista
 * e o aparelho já tinha uso anterior (instalação nova não vê o aviso).
 */
export function shouldShowWhatsNew(opts: {
  installed: string;
  notesVersion: string;
  seen: string | null;
  hadPreviousUse: boolean;
}): boolean {
  if (opts.installed !== opts.notesVersion) return false;
  if (opts.seen === opts.notesVersion) return false;
  return opts.hadPreviousUse;
}

/**
 * Abre a janela sozinha nesta versão? Ajustes pequenos não merecem aviso;
 * o conteúdo continua acessível em Configurações → Ver novidades.
 */
export function shouldAutoOpenWhatsNew(
  opts: {
    installed: string;
    notesVersion: string;
    seen: string | null;
    hadPreviousUse: boolean;
  },
  autoShow: boolean,
): boolean {
  return autoShow && shouldShowWhatsNew(opts);
}

/** Evento para abrir a janela de novidades sob pedido (Configurações). */
export const OPEN_WHATS_NEW_EVENT = "visita-sc:open-whats-new";

export function openWhatsNew(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_WHATS_NEW_EVENT));
}

/**
 * Houve uso anterior do app no aparelho? Qualquer dado guardado pelo app
 * (sessão, PIN, preferências, rascunhos…) conta; a própria marca da janela não.
 */
export function hasPreviousUse(keys: readonly string[]): boolean {
  return keys.some(
    (k) => k !== WHATS_NEW_KEY && (k.startsWith("visita-sc:") || k.startsWith("visita-sc.") || /^sb-.+-auth-token$/.test(k)),
  );
}
