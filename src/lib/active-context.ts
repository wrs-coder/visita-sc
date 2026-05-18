// Contexto ativo acessível fora do React (para a fila offline).
// É atualizado por `useSyncActiveContext` montado no layout do app.
type ActiveContext = {
  congregationId: string | null;
  userId: string | null;
};

let current: ActiveContext = { congregationId: null, userId: null };

export function setActiveContext(next: Partial<ActiveContext>) {
  current = { ...current, ...next };
}

export function getActiveContext(): ActiveContext {
  return current;
}
