import { cn } from "@/lib/utils";
// Logotipo oficial — caminho fixo via import do bundler para evitar substituição acidental.
import logoUrl from "@/assets/logo.png";

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt="Visita do Superintendente"
      className={cn("object-contain", className)}
      draggable={false}
    />
  );
}
