// Proteções contra o quadro "Conteúdo do livro" e a tabela de capítulos da
// TNM entrarem como versículos. Só estrutura e números, nenhuma palavra de
// idioma, para valer em pt/en/es.

/** Arquivo inteiro é "Conteúdo do livro" ou tabela de navegação de capítulos. */
export function isBookOutlineDoc(doc: Document): boolean {
  const body = doc.body;
  if (!body) return false;
  // Âncoras reais de versículo = texto bíblico; nunca descartar.
  if (body.querySelector('[id^="chapter"][id*="_verse"], .w_ch, .verseNum, .verse-num')) return false;
  if (body.querySelector("ul.outline, ol.outline, li.chapterNo")) return true;
  if (body.querySelector(".w_bibleChapter, table.w_navigation")) return true;
  return false;
}

// "(3)", "(1-14)", "(1, 2)", "(4-9)"
const REF_GROUP = /\(\s*\d{1,3}(?:\s*[-–,]\s*\d{1,3})*\s*\)/g;
const REF_AT_END = /\(\s*\d{1,3}(?:\s*[-–,]\s*\d{1,3})*\s*\)\s*$/;

/** Texto com cara de tópico do "Conteúdo do livro", não de versículo. */
export function isOutlineLikeVerse(text: string): boolean {
  const t = (text ?? "").replace(/\u00A0/g, " ").trim();
  if (!t) return false;
  const groups = t.match(REF_GROUP)?.length ?? 0;
  if (groups >= 2) return true;
  return groups === 1 && REF_AT_END.test(t);
}

/**
 * Linha de navegação da TNM antes do texto: "Rute 1 : 1 - 22".
 * O link do capítulo aponta para biblechapternav*, o dos versículos para
 * bibleversenav* com o texto "1 - N". Devolve { chapter, last } ou null.
 */
export function readChapterVerseRange(doc: Document): { chapter: number; last: number } | null {
  const body = doc.body;
  if (!body) return null;
  const verseLink = body.querySelector('a[href*="bibleversenav"]');
  if (!verseLink) return null;
  const m = (verseLink.textContent ?? "").replace(/\u00A0/g, " ").match(/^\s*1\s*[-–]\s*(\d{1,3})\s*$/);
  if (!m) return null;
  const last = parseInt(m[1], 10);
  const chapLink = verseLink.parentElement?.querySelector('a[href*="biblechapternav"]');
  const chapter = parseInt((chapLink?.textContent ?? "").trim(), 10);
  if (!(chapter >= 1 && chapter <= 150) || !(last >= 1 && last <= 176)) return null;
  return { chapter, last };
}
