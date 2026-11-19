// Segredo deste aparelho para as respostas em "Informações adicionais dos anciãos".
// Só o hash (SHA-256) vai na pauta; o segredo vai junto ao salvar para o servidor conferir.
const KEY = "visita-sc:agenda-author";

export function authorSecret(): string {
  try {
    let s = localStorage.getItem(KEY);
    if (!s || !/^[A-Za-z0-9_-]{16,128}$/.test(s)) {
      const b = crypto.getRandomValues(new Uint8Array(24));
      s = Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
      localStorage.setItem(KEY, s);
    }
    return s;
  } catch { return ""; }
}

export async function authorHash(): Promise<string> {
  const s = authorSecret();
  if (!s) return "";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
