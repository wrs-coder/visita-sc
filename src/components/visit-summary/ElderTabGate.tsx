// Cobertura de senha em torno da visualização do programa de anciãos
// (Pastoreios, Encorajamento, Recomendações e Assuntos Locais) para os
// visitantes do Corpo de Anciãos / ESC.
//
// - Se o superintendente não definiu senha → exibe o conteúdo direto.
// - Se há senha → pede a senha; depois de validar, marca como destravado
//   em sessionStorage até o usuário fechar a aba/navegador.
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getElderTabPasswordStatus,
  verifyElderTabPassword,
} from "@/lib/elder-tab-password.functions";
import {
  ElderProgramReadOnly,
  type ElderProgramData,
} from "@/components/visit-summary/ElderProgramReadOnly";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, Eye, EyeOff } from "lucide-react";

const STORAGE_PREFIX = "elderTabUnlocked:";

function isUnlocked(congregationId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(STORAGE_PREFIX + congregationId) === "1";
  } catch {
    return false;
  }
}

function markUnlocked(congregationId: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_PREFIX + congregationId, "1");
  } catch {
    /* ignore */
  }
}

export function ElderTabGate({
  congregationId,
  data,
}: {
  congregationId: string;
  data: ElderProgramData | null;
}) {
  const fnStatus = useServerFn(getElderTabPasswordStatus);
  const fnVerify = useServerFn(verifyElderTabPassword);

  const [loading, setLoading] = useState(true);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [unlocked, setUnlocked] = useState(() => isUnlocked(congregationId));
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fnStatus({ data: { congregationId } });
      if (r.ok) setRequiresPassword(r.isSet);
      else setRequiresPassword(false);
    } catch {
      setRequiresPassword(false);
    } finally {
      setLoading(false);
    }
  }, [congregationId, fnStatus]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    setUnlocked(isUnlocked(congregationId));
  }, [congregationId]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!password) {
      toast.error("Digite a senha.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fnVerify({ data: { congregationId, password } });
      if (r.ok) {
        markUnlocked(congregationId);
        setUnlocked(true);
        setPassword("");
        toast.success("Acesso liberado.");
      } else {
        toast.error("Senha incorreta.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Verificando acesso…
        </CardContent>
      </Card>
    );
  }

  if (requiresPassword && !unlocked) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-base">Aba protegida por senha</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            O superintendente definiu uma senha para esta aba. Digite a senha para
            visualizar os Pastoreios, Encorajamento, Recomendações e Assuntos Locais.
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="elder-tab-pw" className="text-xs">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="elder-tab-pw"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={128}
                  autoFocus
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Acessar
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return <ElderProgramReadOnly data={data} />;
}
