// Onda 7.1 — Transição suave entre rotas usando framer-motion.
// Usa LazyMotion + domAnimation (subset leve, ~5KB gz) e AnimatePresence
// chaveado pelo pathname. Respeita prefers-reduced-motion e só monta
// animações após hidratação (evita mismatch SSR/CSR).
import { useEffect, useState, type ReactNode } from "react";
import { LazyMotion, domAnimation, AnimatePresence, m, useReducedMotion } from "framer-motion";

export function RouteTransition({ pathname, children }: { pathname: string; children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Antes da hidratação, render direto (sem motion) para SSR estável.
  if (!hydrated) return <>{children}</>;

  const duration = reduce ? 0 : 0.12;
  const y = reduce ? 0 : 4;

  return (
    <LazyMotion features={domAnimation} strict>
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={pathname}
          initial={{ opacity: 0, y }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -y }}
          transition={{ duration, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {children}
        </m.div>
      </AnimatePresence>
    </LazyMotion>
  );
}
