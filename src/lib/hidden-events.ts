// Lista local (por dispositivo) de IDs de eventos do circuito que o
// superintendente decidiu remover da visualização — usada quando um evento
// "fantasma" persiste em cache mesmo após exclusão/conclusão no servidor.
// 100% client-side: não altera RLS, schema, nem qualquer dado remoto.
const KEY = "visita-sc:hidden-circuit-events";

function read(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function write(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* quota — silencioso */
  }
}

export function getHiddenEventIds(): Set<string> {
  return read();
}

export function isHiddenEvent(id: string | null | undefined): boolean {
  if (!id) return false;
  return read().has(id);
}

export function hideEventId(id: string) {
  const s = read();
  s.add(id);
  write(s);
}

export function clearHiddenEventIds() {
  write(new Set());
}
