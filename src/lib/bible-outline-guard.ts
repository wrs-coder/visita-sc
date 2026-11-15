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
