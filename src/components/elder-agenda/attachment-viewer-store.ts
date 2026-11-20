// Visualizador de anexos da pauta: guarda o documento só em memória (aberto ou minimizado), nunca em disco.
import { useSyncExternalStore } from "react";

export interface ViewerDoc { id: string; title: string; kind: "photo" | "pdf"; blob: Blob; page: number; minimized: boolean }

let doc: ViewerDoc | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export const viewerStore = {
  get: () => doc,
  open(next: Omit<ViewerDoc, "page" | "minimized">) { doc = { ...next, page: doc?.id === next.id ? doc.page : 1, minimized: false }; emit(); },
  minimize() { if (doc) { doc = { ...doc, minimized: true }; emit(); } },
  restore() { if (doc) { doc = { ...doc, minimized: false }; emit(); } },
  setPage(page: number) { if (doc && doc.page !== page) doc = { ...doc, page }; },
  close() { doc = null; emit(); },
  subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
};

export const useViewerDoc = () => useSyncExternalStore(viewerStore.subscribe, viewerStore.get, () => null);
