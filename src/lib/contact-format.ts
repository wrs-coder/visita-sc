/** Telefone em qualquer formato internacional: só dígitos, espaço e + ( ) - . (máx. 30). */
export function sanitizeIntlPhone(input: string): string {
  return input.replace(/[^\d\s+()\-.]/g, "").slice(0, 30);
}

/** Valor para links tel: (só dígitos e +). */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** E-mail opcional: vazio é válido. */
export function isValidEmail(input: string): boolean {
  const v = input.trim();
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
