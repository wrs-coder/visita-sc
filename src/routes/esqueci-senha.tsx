import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Compass, ArrowLeft, Mail } from "lucide-react";

export const Route = createFileRoute("/esqueci-senha")({ component: ForgotPasswordPage });

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível enviar o e-mail", { description: error.message });
      return;
    }
    setSent(true);
    toast.success("E-mail enviado!", { description: "Verifique sua caixa de entrada." });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-primary-soft/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center text-primary-foreground mb-8">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-4">
            <Compass className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Recuperar senha</h1>
          <p className="text-sm text-primary-foreground/80 mt-1">Enviaremos um link para você redefinir a senha</p>
        </div>

        <Card className="shadow-elevated border-0">
          <CardContent className="p-6">
            {sent ? (
              <div className="text-center space-y-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Verifique seu e-mail</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enviamos um link de redefinição para <span className="font-medium">{email}</span>.
                  </p>
                </div>
                <Link to="/" className="inline-flex items-center text-sm text-primary hover:underline">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para o login
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail do superintendente</Label>
                  <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button type="submit" className="w-full h-11" disabled={busy}>
                  {busy ? "Enviando..." : "Enviar link de recuperação"}
                </Button>
                <Link to="/" className="flex items-center justify-center text-sm text-muted-foreground hover:text-primary">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para o login
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
