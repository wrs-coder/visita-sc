// Aceite dos Termos de Uso guardado só no aparelho (sem banco de dados).
// Trocar TERMS_VERSION apenas em mudanças importantes: isso pede novo aceite.
export const TERMS_VERSION = "2026-10-30";
export const TERMS_VERSION_LABEL = "30/10/2026";
export const TERMS_ACCEPTED_KEY = "visita-sc:terms-accepted";
export const TERMS_ACCEPTED_EVENT = "visita-sc:terms-accepted";

/** Precisa (re)aceitar quando nunca aceitou ou aceitou uma versão anterior. */
export function needsTermsAcceptance(stored: string | null, current = TERMS_VERSION): boolean {
  return stored !== current;
}

export function readAcceptedTermsVersion(): string | null {
  try { return localStorage.getItem(TERMS_ACCEPTED_KEY); } catch { return null; }
}

export function hasAcceptedCurrentTerms(): boolean {
  return !needsTermsAcceptance(readAcceptedTermsVersion());
}

export function recordTermsAcceptance(): void {
  try {
    localStorage.setItem(TERMS_ACCEPTED_KEY, TERMS_VERSION);
    window.dispatchEvent(new Event(TERMS_ACCEPTED_EVENT));
  } catch { /* armazenamento indisponível: pede de novo depois */ }
}
