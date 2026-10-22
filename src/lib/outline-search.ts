// Busca por tema nos esboços: sem acentos, sem maiúsculas, termos em qualquer ordem.
export interface SearchableOutline {
  id: string;
  title?: string | null;
  content?: string | null;
  talk?: { talk_title?: string | null } | null;
}

export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function searchTerms(q: string): string[] {
  return normalizeText(q).split(" ").filter((w) => w.length > 1 || /\d/.test(w));
}

/** 0 = não bate; 3 = todos no título; 2 = título+tema; 1 = só no texto. */
export function outlineScore(o: SearchableOutline, q: string): number {
  const terms = searchTerms(q);
  if (terms.length === 0) return 0;
  const title = normalizeText(`${o.title ?? ""}`);
  const head = normalizeText(`${o.title ?? ""} ${o.talk?.talk_title ?? ""}`);
  const all = `${head} ${normalizeText(o.content ?? "")}`;
  if (!terms.every((t) => all.includes(t))) return 0;
  if (terms.every((t) => title.includes(t))) return 3;
  if (terms.every((t) => head.includes(t))) return 2;
  return 1;
}

export function searchOutlines<T extends SearchableOutline>(items: T[], q: string): T[] {
  return items
    .map((o, i) => ({ o, i, s: outlineScore(o, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.o);
}
