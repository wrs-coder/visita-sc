// Mapas de livros bíblicos por idioma + builder de regex dinâmico.
// Cobre os 66 livros das Escrituras (com abreviações comuns) em PT/EN/ES.
// Usado tanto na detecção em tempo real (modo Edição) quanto no render do
// modo Esboço (gerar links clicáveis).

export type BibleLang = "pt" | "en" | "es";

/** Identificador canônico do livro (chave usada no armazenamento). */
export type BookId =
  | "GEN" | "EXO" | "LEV" | "NUM" | "DEU" | "JOS" | "JDG" | "RUT"
  | "1SA" | "2SA" | "1KI" | "2KI" | "1CH" | "2CH" | "EZR" | "NEH"
  | "EST" | "JOB" | "PSA" | "PRO" | "ECC" | "SNG" | "ISA" | "JER"
  | "LAM" | "EZK" | "DAN" | "HOS" | "JOL" | "AMO" | "OBA" | "JON"
  | "MIC" | "NAM" | "HAB" | "ZEP" | "HAG" | "ZEC" | "MAL"
  | "MAT" | "MRK" | "LUK" | "JHN" | "ACT" | "ROM" | "1CO" | "2CO"
  | "GAL" | "EPH" | "PHP" | "COL" | "1TH" | "2TH" | "1TI" | "2TI"
  | "TIT" | "PHM" | "HEB" | "JAS" | "1PE" | "2PE" | "1JN" | "2JN"
  | "3JN" | "JUD" | "REV";

/** Nome canônico (forma de exibição) por idioma. */
export const BOOK_DISPLAY: Record<BibleLang, Partial<Record<BookId, string>>> = {
  pt: {
    GEN: "Gênesis", EXO: "Êxodo", LEV: "Levítico", NUM: "Números", DEU: "Deuteronômio",
    JOS: "Josué", JDG: "Juízes", RUT: "Rute",
    "1SA": "1 Samuel", "2SA": "2 Samuel", "1KI": "1 Reis", "2KI": "2 Reis",
    "1CH": "1 Crônicas", "2CH": "2 Crônicas", EZR: "Esdras", NEH: "Neemias",
    EST: "Ester", JOB: "Jó", PSA: "Salmos", PRO: "Provérbios", ECC: "Eclesiastes",
    SNG: "Cântico de Salomão", ISA: "Isaías", JER: "Jeremias", LAM: "Lamentações",
    EZK: "Ezequiel", DAN: "Daniel", HOS: "Oseias", JOL: "Joel", AMO: "Amós",
    OBA: "Obadias", JON: "Jonas", MIC: "Miqueias", NAM: "Naum", HAB: "Habacuque",
    ZEP: "Sofonias", HAG: "Ageu", ZEC: "Zacarias", MAL: "Malaquias",
    MAT: "Mateus", MRK: "Marcos", LUK: "Lucas", JHN: "João", ACT: "Atos",
    ROM: "Romanos", "1CO": "1 Coríntios", "2CO": "2 Coríntios",
    GAL: "Gálatas", EPH: "Efésios", PHP: "Filipenses", COL: "Colossenses",
    "1TH": "1 Tessalonicenses", "2TH": "2 Tessalonicenses",
    "1TI": "1 Timóteo", "2TI": "2 Timóteo", TIT: "Tito", PHM: "Filêmon",
    HEB: "Hebreus", JAS: "Tiago", "1PE": "1 Pedro", "2PE": "2 Pedro",
    "1JN": "1 João", "2JN": "2 João", "3JN": "3 João", JUD: "Judas", REV: "Apocalipse",
  },
  en: {
    GEN: "Genesis", EXO: "Exodus", LEV: "Leviticus", NUM: "Numbers", DEU: "Deuteronomy",
    JOS: "Joshua", JDG: "Judges", RUT: "Ruth",
    "1SA": "1 Samuel", "2SA": "2 Samuel", "1KI": "1 Kings", "2KI": "2 Kings",
    "1CH": "1 Chronicles", "2CH": "2 Chronicles", EZR: "Ezra", NEH: "Nehemiah",
    EST: "Esther", JOB: "Job", PSA: "Psalms", PRO: "Proverbs", ECC: "Ecclesiastes",
    SNG: "Song of Solomon", ISA: "Isaiah", JER: "Jeremiah", LAM: "Lamentations",
    EZK: "Ezekiel", DAN: "Daniel", HOS: "Hosea", JOL: "Joel", AMO: "Amos",
    OBA: "Obadiah", JON: "Jonah", MIC: "Micah", NAM: "Nahum", HAB: "Habakkuk",
    ZEP: "Zephaniah", HAG: "Haggai", ZEC: "Zechariah", MAL: "Malachi",
    MAT: "Matthew", MRK: "Mark", LUK: "Luke", JHN: "John", ACT: "Acts",
    ROM: "Romans", "1CO": "1 Corinthians", "2CO": "2 Corinthians",
    GAL: "Galatians", EPH: "Ephesians", PHP: "Philippians", COL: "Colossians",
    "1TH": "1 Thessalonians", "2TH": "2 Thessalonians",
    "1TI": "1 Timothy", "2TI": "2 Timothy", TIT: "Titus", PHM: "Philemon",
    HEB: "Hebrews", JAS: "James", "1PE": "1 Peter", "2PE": "2 Peter",
    "1JN": "1 John", "2JN": "2 John", "3JN": "3 John", JUD: "Jude", REV: "Revelation",
  },
  es: {
    GEN: "Génesis", EXO: "Éxodo", LEV: "Levítico", NUM: "Números", DEU: "Deuteronomio",
    JOS: "Josué", JDG: "Jueces", RUT: "Rut",
    "1SA": "1 Samuel", "2SA": "2 Samuel", "1KI": "1 Reyes", "2KI": "2 Reyes",
    "1CH": "1 Crónicas", "2CH": "2 Crónicas", EZR: "Esdras", NEH: "Nehemías",
    EST: "Ester", JOB: "Job", PSA: "Salmos", PRO: "Proverbios", ECC: "Eclesiastés",
    SNG: "Cantar de los Cantares", ISA: "Isaías", JER: "Jeremías", LAM: "Lamentaciones",
    EZK: "Ezequiel", DAN: "Daniel", HOS: "Oseas", JOL: "Joel", AMO: "Amós",
    OBA: "Abdías", JON: "Jonás", MIC: "Miqueas", NAM: "Nahúm", HAB: "Habacuc",
    ZEP: "Sofonías", HAG: "Ageo", ZEC: "Zacarías", MAL: "Malaquías",
    MAT: "Mateo", MRK: "Marcos", LUK: "Lucas", JHN: "Juan", ACT: "Hechos",
    ROM: "Romanos", "1CO": "1 Corintios", "2CO": "2 Corintios",
    GAL: "Gálatas", EPH: "Efesios", PHP: "Filipenses", COL: "Colosenses",
    "1TH": "1 Tesalonicenses", "2TH": "2 Tesalonicenses",
    "1TI": "1 Timoteo", "2TI": "2 Timoteo", TIT: "Tito", PHM: "Filemón",
    HEB: "Hebreos", JAS: "Santiago", "1PE": "1 Pedro", "2PE": "2 Pedro",
    "1JN": "1 Juan", "2JN": "2 Juan", "3JN": "3 Juan", JUD: "Judas", REV: "Apocalipsis",
  },
};

/** Aliases adicionais (abreviações comuns) por idioma. */
const BOOK_ALIASES: Record<BibleLang, Partial<Record<BookId, string[]>>> = {
  pt: {
    GEN: ["Gn"], EXO: ["Ex"], LEV: ["Lv"], NUM: ["Nm"], DEU: ["Dt"],
    JOS: ["Js"], JDG: ["Jz"], RUT: ["Rt"], PSA: ["Sl"], PRO: ["Pv"],
    ISA: ["Is"], JER: ["Jr"], EZK: ["Ez"], DAN: ["Dn"],
    MAT: ["Mt"], MRK: ["Mc"], LUK: ["Lc"], JHN: ["Jo"], ACT: ["At"],
    ROM: ["Rm"], GAL: ["Gl"], EPH: ["Ef"], PHP: ["Fp"], COL: ["Cl"],
    HEB: ["Hb"], JAS: ["Tg"], REV: ["Ap"],
  },
  en: {
    GEN: ["Gen", "Ge"], EXO: ["Ex", "Exod"], LEV: ["Lev"], NUM: ["Num"], DEU: ["Deut", "Dt"],
    JOS: ["Josh"], JDG: ["Judg"], RUT: ["Ru"], PSA: ["Ps", "Psa"], PRO: ["Prov", "Pr"],
    ISA: ["Isa", "Is"], JER: ["Jer"], EZK: ["Ezek", "Eze"], DAN: ["Dan"],
    MAT: ["Matt", "Mt"], MRK: ["Mk"], LUK: ["Lk"], JHN: ["Jn", "Joh"], ACT: ["Ac"],
    ROM: ["Rom"], GAL: ["Gal"], EPH: ["Eph"], PHP: ["Phil", "Php"], COL: ["Col"],
    HEB: ["Heb"], JAS: ["Jas"], REV: ["Rev"],
  },
  es: {
    GEN: ["Gén", "Gn"], EXO: ["Éx"], LEV: ["Lv"], NUM: ["Nm"], DEU: ["Dt"],
    JOS: ["Jos"], JDG: ["Jue"], RUT: ["Rt"], PSA: ["Sal"], PRO: ["Pr"],
    ISA: ["Is"], JER: ["Jer"], EZK: ["Ez"], DAN: ["Dn"],
    MAT: ["Mt"], MRK: ["Mr", "Mc"], LUK: ["Lc"], JHN: ["Jn"], ACT: ["Hch"],
    ROM: ["Ro"], GAL: ["Gá"], EPH: ["Ef"], PHP: ["Fil"], COL: ["Col"],
    HEB: ["Heb"], JAS: ["Snt"], REV: ["Ap"],
  },
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Cria índice nome→bookId para um idioma (normalizado). */
function buildIndex(lang: BibleLang): Map<string, BookId> {
  const idx = new Map<string, BookId>();
  const display = BOOK_DISPLAY[lang];
  const aliases = BOOK_ALIASES[lang];
  for (const [id, name] of Object.entries(display) as [BookId, string][]) {
    idx.set(name.toLowerCase(), id);
    for (const al of aliases[id] ?? []) idx.set(al.toLowerCase(), id);
  }
  return idx;
}

const INDEX_CACHE: Partial<Record<BibleLang, Map<string, BookId>>> = {};
function getIndex(lang: BibleLang): Map<string, BookId> {
  if (!INDEX_CACHE[lang]) INDEX_CACHE[lang] = buildIndex(lang);
  return INDEX_CACHE[lang]!;
}

const REGEX_CACHE: Partial<Record<BibleLang, RegExp>> = {};
/**
 * Regex global para detectar "Livro Cap:Vers" (com possível "-Vers2") no idioma.
 * Atenção: use sempre com `new RegExp(source, "gi")` para evitar reuso de lastIndex.
 */
export function getCitationRegex(lang: BibleLang): RegExp {
  if (REGEX_CACHE[lang]) return new RegExp(REGEX_CACHE[lang]!.source, "gi");
  const display = BOOK_DISPLAY[lang];
  const aliases = BOOK_ALIASES[lang];
  const all: string[] = [];
  for (const [id, name] of Object.entries(display) as [BookId, string][]) {
    all.push(name);
    for (const al of aliases[id] ?? []) all.push(al);
  }
  // Ordena por comprimento decrescente para casar primeiro o nome mais longo.
  all.sort((a, b) => b.length - a.length);
  const alt = all.map(escapeRegex).join("|");
  // Aceita "1 Pedro", "1Pedro", abreviações com ponto opcional ("Gn.")
  const source = `\\b(${alt})\\.?\\s*(\\d{1,3}):(\\d{1,3})(?:[-–](\\d{1,3}))?\\b`;
  REGEX_CACHE[lang] = new RegExp(source);
  return new RegExp(source, "gi");
}

export interface CitationMatch {
  raw: string;       // texto exato encontrado
  bookId: BookId;
  bookName: string;  // nome canônico de exibição
  chapter: number;
  verse: number;
  verseEnd?: number;
  index: number;
  length: number;
}

/** Resolve um nome (qualquer alias) para o BookId canônico. */
export function resolveBookId(lang: BibleLang, name: string): BookId | null {
  return getIndex(lang).get(name.toLowerCase().replace(/\.$/, "")) ?? null;
}

/** Encontra todas as citações no texto, ordenadas pela posição. */
export function findCitations(lang: BibleLang, text: string): CitationMatch[] {
  if (!text) return [];
  const re = getCitationRegex(lang);
  const out: CitationMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const bookId = resolveBookId(lang, m[1]);
    if (!bookId) continue;
    out.push({
      raw: m[0],
      bookId,
      bookName: BOOK_DISPLAY[lang][bookId] ?? m[1],
      chapter: Number(m[2]),
      verse: Number(m[3]),
      verseEnd: m[4] ? Number(m[4]) : undefined,
      index: m.index,
      length: m[0].length,
    });
  }
  return out;
}
