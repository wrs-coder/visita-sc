// Primeira entrada de uma conta nova de superintendente: abre "Meu Perfil"
// com um aviso de boas-vindas. Estado só no aparelho (localStorage).
const KEY = "firstRun.welcome";

export function markFirstRun(): void {
  try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
}
export function isFirstRunPending(): boolean {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}
export function finishFirstRun(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
/** Rota de destino após criar a conta de superintendente. */
export function afterSuperSignupRoute(): "/perfil" {
  markFirstRun();
  return "/perfil";
}
