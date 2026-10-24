import { Link } from "@tanstack/react-router";
import { Checkbox } from "@/components/ui/checkbox";

export function TermsAcceptance({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 text-xs text-muted-foreground leading-snug">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" aria-label="Aceitar termos" />
      <span>
        Li e aceito os{" "}
        <Link to="/termos-uso" target="_blank" className="text-primary underline">Termos de Uso</Link>{" "}e a{" "}
        <Link to="/politica-privacidade" target="_blank" className="text-primary underline">Política de Privacidade</Link>.
      </span>
    </label>
  );
}
