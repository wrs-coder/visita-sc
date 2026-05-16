import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="Visita do Superintendente"
      className={cn("object-contain", className)}
      draggable={false}
    />
  );
}
