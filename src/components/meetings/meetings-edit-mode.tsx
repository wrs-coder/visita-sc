import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Estado global do "modo edição" da seção Semana da Visita (abas do
 * Superintendente). Quando desligado, todos os painéis devem renderizar
 * apenas leitura — sem inputs nem seletores.
 */
interface Ctx {
  /** Apenas relevante para o superintendente. Default: false (somente leitura). */
  editEnabled: boolean;
  setEditEnabled: (v: boolean) => void;
  /** True se o usuário NÃO é super (mantém comportamento original do ancião)
   *  OU se é super e a edição está habilitada. */
  effectiveEditAllowed: boolean;
  isSuper: boolean;
}

const MeetingsEditModeContext = createContext<Ctx | null>(null);

export function MeetingsEditModeProvider({
  isSuper,
  children,
}: {
  isSuper: boolean;
  children: ReactNode;
}) {
  const [editEnabled, setEditEnabled] = useState(false);
  const effectiveEditAllowed = !isSuper || editEnabled;
  return (
    <MeetingsEditModeContext.Provider
      value={{ editEnabled, setEditEnabled, effectiveEditAllowed, isSuper }}
    >
      {children}
    </MeetingsEditModeContext.Provider>
  );
}

export function useMeetingsEditMode(): Ctx {
  const ctx = useContext(MeetingsEditModeContext);
  if (ctx) return ctx;
  // Fallback seguro fora do provider: sempre permite (mantém comportamento legado).
  return { editEnabled: false, setEditEnabled: () => {}, effectiveEditAllowed: true, isSuper: false };
}

/** Pequeno bloco de exibição "label + valor" para o modo somente leitura. */
export function ReadOnlyValue({ label, value }: { label: string; value: string | null | undefined }) {
  const v = value && value.trim() ? value : "—";
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</div>
      <div className="text-sm whitespace-pre-wrap mt-0.5">{v}</div>
    </div>
  );
}
