// Onda 7.2 — Virtualização de listas longas usando @tanstack/react-virtual.
// Usa `useWindowVirtualizer` porque o scroll do app é da janela (não de um
// div interno com altura fixa). Ativa-se apenas quando o número de itens
// passa de `threshold`; abaixo disso renderiza a lista normal para evitar
// overhead em listas curtas (mais comuns no app).
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, type ReactNode } from "react";

export type VirtualListProps<T> = {
  items: T[];
  /** Altura estimada de cada item em px. */
  estimateSize: number;
  /** Render por item. */
  children: (item: T, index: number) => ReactNode;
  /** Chave estável por item. */
  getKey: (item: T, index: number) => string | number;
  /** Espaço (gap) entre itens em px — refletido como margin no wrapper. */
  gap?: number;
  /** Itens a renderizar antes/depois do viewport. */
  overscan?: number;
  /** Limite mínimo para ativar virtualização. */
  threshold?: number;
  className?: string;
};

export function VirtualList<T>({
  items,
  estimateSize,
  children,
  getKey,
  gap = 8,
  overscan = 6,
  threshold = 30,
  className,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const scrollMargin = parentRef.current?.offsetTop ?? 0;

  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: () => estimateSize + gap,
    overscan,
    scrollMargin,
  });

  // Recalcula medições quando o tamanho da lista muda (ex.: filtro).
  useEffect(() => {
    virtualizer.measure();
  }, [items.length, virtualizer]);

  // Fallback: lista curta renderiza normalmente.
  if (items.length < threshold) {
    return (
      <div className={className} style={{ display: "flex", flexDirection: "column", gap }}>
        {items.map((it, i) => (
          <div key={getKey(it, i)}>{children(it, i)}</div>
        ))}
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <div ref={parentRef} className={className} style={{ position: "relative", height: totalSize }}>
      {virtualItems.map((v) => {
        const item = items[v.index];
        return (
          <div
            key={getKey(item, v.index)}
            data-index={v.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${v.start - scrollMargin}px)`,
              paddingBottom: gap,
            }}
          >
            {children(item, v.index)}
          </div>
        );
      })}
    </div>
  );
}
