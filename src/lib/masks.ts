// Máscaras e validações reativas — usadas em inputs do app.

/**
 * Máscara reativa para telemóveis (formato genérico Brasil/Portugal).
 * - Aceita apenas dígitos.
 * - Limita a 11 dígitos (suporta BR celular 11 dígitos / PT móvel 9 dígitos).
 * - Formata progressivamente:
 *     • até 9 dígitos  → "9XX XXX XXX" (PT)
 *     • 10 dígitos     → "(XX) XXXX-XXXX" (BR fixo)
 *     • 11 dígitos     → "(XX) XXXXX-XXXX" (BR celular)
 */
export function maskPhone(raw: string): string {
  const d = (raw ?? "").replace(/\D+/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 9) {
    // Padrão PT móvel: 3-3-3
    const p1 = d.slice(0, 3);
    const p2 = d.slice(3, 6);
    const p3 = d.slice(6, 9);
    return [p1, p2, p3].filter(Boolean).join(" ");
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  // 11 dígitos
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Valida formato estrito HH:MM (00–23 : 00–59).
 * Aceita strings vazias como "válido por omissão" — chame o validador
 * apenas para campos preenchidos.
 */
export function isValidHHMM(value: string | null | undefined): boolean {
  if (!value) return true;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
