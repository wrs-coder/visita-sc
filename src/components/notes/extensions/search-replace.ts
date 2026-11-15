import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import { findInText } from "@/lib/note-search";

/**
 * Localizar e substituir: só decorações na tela (nada muda no HTML salvo)
 * e trocas feitas com insertText, que mantém a formatação do trecho.
 */
export interface SearchHit {
  from: number;
  to: number;
  /** Texto do parágrafo e posição do achado dentro dele (para a trava bíblica). */
  blockText: string;
  start: number;
  end: number;
}

interface SearchState {
  term: string;
  index: number;
  hits: SearchHit[];
  deco: DecorationSet;
}

export const searchKey = new PluginKey<SearchState>("noteSearch");

function collect(doc: PMNode, term: string): SearchHit[] {
  const hits: SearchHit[] = [];
  if (!term.trim()) return hits;
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    const text = node.textBetween(0, node.content.size, undefined, "\ufffc");
    for (const r of findInText(text, term)) {
      hits.push({ from: pos + 1 + r.start, to: pos + 1 + r.end, blockText: text, start: r.start, end: r.end });
    }
    return false;
  });
  return hits;
}

function decorate(doc: PMNode, hits: SearchHit[], index: number): DecorationSet {
  if (!hits.length) return DecorationSet.empty;
  return DecorationSet.create(
    doc,
    hits.map((h, i) => Decoration.inline(h.from, h.to, { class: i === index ? "search-hit search-hit-current" : "search-hit" })),
  );
}

function build(doc: PMNode, term: string, index: number): SearchState {
  const hits = collect(doc, term);
  const idx = hits.length ? Math.min(Math.max(0, index), hits.length - 1) : 0;
  return { term, index: idx, hits, deco: decorate(doc, hits, idx) };
}

export function getSearchState(state: EditorState): SearchState | undefined {
  return searchKey.getState(state);
}

type Meta = { term?: string; index?: number };

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    noteSearch: {
      setSearchTerm: (term: string) => ReturnType;
      searchStep: (delta: number) => ReturnType;
      replaceCurrentHit: (replacement: string) => ReturnType;
      replaceAllHits: (replacement: string) => ReturnType;
    };
  }
}

export const SearchReplace = Extension.create({
  name: "noteSearch",

  addCommands() {
    const withMeta = (tr: Transaction, meta: Meta) => tr.setMeta(searchKey, meta);
    return {
      setSearchTerm:
        (term: string) =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(withMeta(tr, { term, index: 0 }));
          return true;
        },
      searchStep:
        (delta: number) =>
        ({ state, tr, dispatch }) => {
          const s = getSearchState(state);
          if (!s || !s.hits.length) return false;
          const n = s.hits.length;
          const index = (((s.index + delta) % n) + n) % n;
          if (dispatch) dispatch(withMeta(tr, { index }));
          return true;
        },
      replaceCurrentHit:
        (replacement: string) =>
        ({ state, tr, dispatch }) => {
          const s = getSearchState(state);
          const hit = s?.hits[s.index];
          if (!s || !hit) return false;
          if (dispatch) {
            if (replacement) tr.insertText(replacement, hit.from, hit.to);
            else tr.delete(hit.from, hit.to);
            dispatch(withMeta(tr, { index: s.index }));
          }
          return true;
        },
      replaceAllHits:
        (replacement: string) =>
        ({ state, tr, dispatch }) => {
          const s = getSearchState(state);
          if (!s || !s.hits.length) return false;
          if (dispatch) {
            // Do fim para o começo: as posições anteriores não mudam.
            for (const hit of [...s.hits].reverse()) {
              if (replacement) tr.insertText(replacement, hit.from, hit.to);
              else tr.delete(hit.from, hit.to);
            }
            dispatch(withMeta(tr, { index: 0 }));
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key: searchKey,
        state: {
          init: () => ({ term: "", index: 0, hits: [], deco: DecorationSet.empty }),
          apply(tr, prev) {
            const meta = tr.getMeta(searchKey) as Meta | undefined;
            const term = meta?.term ?? prev.term;
            const index = meta?.index ?? prev.index;
            if (!term) return prev.term || prev.hits.length ? { term: "", index: 0, hits: [], deco: DecorationSet.empty } : prev;
            if (!meta && !tr.docChanged) return prev;
            if (!meta) return build(tr.doc, term, index);
            if (meta.term === undefined && !tr.docChanged) {
              const idx = prev.hits.length ? Math.min(Math.max(0, index), prev.hits.length - 1) : 0;
              return { ...prev, index: idx, deco: decorate(tr.doc, prev.hits, idx) };
            }
            return build(tr.doc, term, index);
          },
        },
        props: {
          decorations(state) {
            return searchKey.getState(state)?.deco ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
