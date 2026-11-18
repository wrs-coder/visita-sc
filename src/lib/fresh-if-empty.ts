// Leituras de listas que respondem da cópia guardada: se a cópia veio vazia
// (ou falhou) e há internet, confirma uma vez direto na nuvem, porque uma
// cópia vazia antiga deixava a tela "sem modelos" até sair e entrar na conta.
import { withNetworkWindow } from "@/lib/net-policy";

export async function freshIfEmpty<T extends { ok: boolean }>(
  read: () => Promise<T>,
  isEmpty: (r: T) => boolean,
  online: () => boolean = () => typeof navigator === "undefined" || navigator.onLine,
): Promise<T | null> {
  const first = await read().catch(() => null);
  if (first && first.ok && !isEmpty(first)) return first;
  if (!online()) return first;
  const again = await withNetworkWindow(read).catch(() => null);
  return again && again.ok ? again : first;
}
