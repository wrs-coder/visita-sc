// Cartão que gerencia a senha que protege a aba "Anciãos" no acesso de
// visitantes (Corpo de Anciãos / ESC).
//
// - Apenas o COORDENADOR do corpo de anciãos define / atualiza / remove.
// - Os demais anciãos cadastrados (secretário, sup. de serviço)
//   visualizam a senha atual em texto puro.
// - O superintendente NÃO vê nem gerencia este cartão.
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getElderTabPasswordForElder,
  setElderTabPassword,
} from "@/lib/elder-tab-password.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, LockOpen, Loader2 } from "lucide-react";

export function ElderTabPasswordCard({ congregationId }: { congregationId: string }) {
  const fnLoad = useServerFn(getElderTabPasswordForElder);
  const fnSet = useServerFn(setElderTabPassword);

  const [loading, setLoading] = useState(true);
  const [isSet, setIsSet] = useState(false);
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fnLoad({ data: { congregationId } });
      if (r.ok) {
        setIsSet(r.isSet);
        setIsCoordinator(r.isCoordinator);
        setCurrentPassword(r.password);
      }
    } finally {
      setLoading(false);
    }
  }, [congregationId, fnLoad]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (password.length < 4) {
      toast.error("A senha precisa ter pelo menos 4 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    setSaving(true);
    try {
      const r = await fnSet({ data: { congregationId, newPassword: password } });
      if (!r.ok) {
        toast.error(r.error ?? "Erro ao salvar a senha.");
        return;
      }
      toast.success("Senha definida com sucesso.");
      setPassword("");
      setConfirm("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("Remover a senha? A aba ficará livre para todos os visitantes.")) return;
    setSaving(true);
    try {
      const r = await fnSet({ data: { congregationId, newPassword: "" } });
      if (!r.ok) {
        toast.error(r.error ?? "Erro ao remover a senha.");
        return;
      }
      toast.success("Senha removida.");
      setPassword("");
      setConfirm("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          {isSet ? (
            <Lock className="h-4 w-4 text-primary" />
          ) : (
            <LockOpen className="h-4 w-4 text-muted-foreground" />
          )}
          <h2 className="font-bold text-sm uppercase tracking-wide text-primary">
            Senha de acesso — aba "Anciãos" (visitantes)
          </h2>
        </div>

        <p className="text-xs text-muted-foreground">
          {isCoordinator
            ? "Como coordenador do corpo de anciãos, você define a senha que os visitantes (Corpo de Anciãos / ESC) precisam digitar para abrir esta aba. A senha fica visível para os demais anciãos cadastrados. Deixe em branco para liberar a aba para todos."
            : "Senha definida pelo coordenador do corpo de anciãos. Os visitantes (Corpo de Anciãos / ESC) precisam digitá-la para abrir esta aba."}
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…
          </div>
        ) : (
          <>
            <div className="text-xs">
              <span className="font-medium">Status atual: </span>
              {isSet ? (
                <span className="text-primary">Senha ativa</span>
              ) : (
                <span className="text-muted-foreground">Sem senha (aba livre)</span>
              )}
            </div>

            {isSet && (
              <div className="space-y-1">
                <Label className="text-xs">Senha atual</Label>
                <div className="relative">
                  <Input
                    readOnly
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showCurrent ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {isCoordinator && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="elder-pw" className="text-xs">
                      {isSet ? "Nova senha" : "Senha"}
                    </Label>
                    <div className="relative">
                      <Input
                        id="elder-pw"
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        maxLength={128}
                        placeholder="Mín. 4 caracteres"
                        autoComplete="new-password"
                        className="pr-9"
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
                  <div className="space-y-1">
                    <Label htmlFor="elder-pw-confirm" className="text-xs">
                      Confirmar senha
                    </Label>
                    <Input
                      id="elder-pw-confirm"
                      type={showPw ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      maxLength={128}
                      placeholder="Repita a senha"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button onClick={handleSave} disabled={saving || password.length === 0}>
                    {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    {isSet ? "Atualizar senha" : "Definir senha"}
                  </Button>
                  {isSet && (
                    <Button variant="outline" onClick={handleRemove} disabled={saving}>
                      Remover senha
                    </Button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
