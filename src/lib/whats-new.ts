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
