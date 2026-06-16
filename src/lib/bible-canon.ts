// Catálogo canônico dos 66 livros da Bíblia em múltiplos idiomas.
// Usado pelo parser EPUB e pelo detector de citações para reconhecer livros
// independentemente do idioma do EPUB importado ou do texto digitado.

export interface CanonicalBook {
  /** ID estável: "B01" .. "B66" (ordem protestante padrão). */
  id: string;
  /** Ordem 1..66. */
  order: number;
  /** Nome canônico (em inglês) usado como fallback. */
  english: string;
  /** Aliases em vários idiomas + abreviações. Tudo em minúsculas, sem acento. */
  aliases: string[];
}

// Lista compacta. Cada item: [order, english, ...aliases (pt, es, en, fr, de, it, abrevs)]
// Os aliases são intencionalmente generosos: nomes completos + variantes + abrevs comuns.
// Tudo é normalizado (lower-case, sem acentos) antes da comparação.
const RAW: Array<[number, string, ...string[]]> = [
  // === Antigo Testamento ===
  [1,  "Genesis",
    "genesis","genese","genesi","genese","genese","genesis",
    "gen","gn","ge"],
  [2,  "Exodus",
    "exodo","exodus","exode","esodo","exodus",
    "exo","ex","exod","exd"],
  [3,  "Leviticus",
    "levitico","leviticus","levitique","levitico","levitikus",
    "lev","lv","le"],
  [4,  "Numbers",
    "numeros","numbers","nombres","numeri","numeri",
    "num","nm","nu","nb"],
  [5,  "Deuteronomy",
    "deuteronomio","deuteronomy","deuteronome","deuteronomium",
    "deut","dt","de","dn"],
  [6,  "Joshua",
    "josue","joshua","josua","giosue",
    "jos","js","jsh"],
  [7,  "Judges",
    "juizes","jueces","judges","juges","richter","giudici",
    "jz","jdg","jd","jdgs","jue"],
  [8,  "Ruth",
    "rute","ruth","rut","rute","rt"],
  [9,  "1 Samuel",
    "1 samuel","i samuel","primeiro samuel","1samuel","1sm","1 sm","1sam","1 sam","1s","1 s",
    "i sam","1° samuel","primero samuel"],
  [10, "2 Samuel",
    "2 samuel","ii samuel","segundo samuel","2samuel","2sm","2 sm","2sam","2 sam","2s","2 s",
    "ii sam","2° samuel","segundo samuel"],
  [11, "1 Kings",
    "1 reis","i reis","primeiro reis","1reis","1rs","1 rs","1re","1 re","1k","1 k","1ki","1 ki",
    "1 reyes","i reyes","1 kings","1 rois","1 konige","1 re"],
  [12, "2 Kings",
    "2 reis","ii reis","segundo reis","2reis","2rs","2 rs","2re","2 re","2k","2 k","2ki","2 ki",
    "2 reyes","ii reyes","2 kings","2 rois","2 konige","2 re"],
  [13, "1 Chronicles",
    "1 cronicas","i cronicas","primeiro cronicas","1cr","1 cr","1cro","1 cro","1ch","1 ch","1chr","1 chr",
    "1 cronache","1 chroniques","1 chronik"],
  [14, "2 Chronicles",
    "2 cronicas","ii cronicas","segundo cronicas","2cr","2 cr","2cro","2 cro","2ch","2 ch","2chr","2 chr",
    "2 cronache","2 chroniques","2 chronik"],
  [15, "Ezra",
    "esdras","ezra","esdra","esra",
    "esd","ed","ezr"],
  [16, "Nehemiah",
    "neemias","nehemias","nehemiah","nehemie","nehemia",
    "ne","neh","nee"],
  [17, "Esther",
    "ester","esther","ester","est","et","es"],
  [18, "Job",
    "jo","job","giobbe","hiob",
    "jb"],
  [19, "Psalms",
    "salmos","salmo","salmi","psalms","psalm","psaumes","psaume","psalmen",
    "sl","sal","ps","psa","pss"],
  [20, "Proverbs",
    "proverbios","proverbs","proverbes","proverbi","spruche","sprueche",
    "pv","prov","pr","prv","pro"],
  [21, "Ecclesiastes",
    "eclesiastes","ecclesiastes","ecclesiaste","prediger","qohelet",
    "ec","ecl","ecc","eccl","qo"],
  [22, "Song of Solomon",
    "cantares","cantico dos canticos","cantico","cantico dei cantici","song of solomon","song of songs",
    "cantique des cantiques","hohelied",
    "ct","cant","sos","song","so"],
  [23, "Isaiah",
    "isaias","isaiah","isaie","isaia","jesaja",
    "is","isa","isai","esa"],
  [24, "Jeremiah",
    "jeremias","jeremiah","jeremie","geremia","jeremia",
    "jr","jer","jere"],
  [25, "Lamentations",
    "lamentacoes","lamentaciones","lamentations","lamentazioni","klagelieder",
    "lm","lam","la"],
  [26, "Ezekiel",
    "ezequiel","ezekiel","ezechiel","ezechiele","hesekiel",
    "ez","ezeq","eze","ezk"],
  [27, "Daniel",
    "daniel","daniele",
    "dn","dan","da"],
  [28, "Hosea",
    "oseias","oseas","hosea","osee","osea",
    "os","ose","hos","hsa"],
  [29, "Joel",
    "joel","gioele",
    "jl","joe","joel"],
  [30, "Amos",
    "amos","amos","amos",
    "am","amo","amos"],
  [31, "Obadiah",
    "obadias","abdias","abdias","obadiah","abdia","obadja",
    "ob","obd","abd","oba"],
  [32, "Jonah",
    "jonas","jonah","giona","jona",
    "jn","jon","jona"],
  [33, "Micah",
    "miqueias","miqueas","micah","michee","michea","micha",
    "mq","miq","mi","mic","mch"],
  [34, "Nahum",
    "naum","nahum","nahum",
    "na","nah","nm"],
  [35, "Habakkuk",
    "habacuque","habacuc","habakkuk","habacuc","abacuc","habakuk",
    "hc","hab","hk","hbk"],
  [36, "Zephaniah",
    "sofonias","sofonias","zephaniah","sophonie","sofonia","zefanja",
    "sf","sof","sofo","zep","zeph","zph"],
  [37, "Haggai",
    "ageu","ageo","haggai","aggee","aggeo","haggai",
    "ag","age","hg","hag"],
  [38, "Zechariah",
    "zacarias","zacarias","zechariah","zacharie","zaccaria","sacharja",
    "zc","zac","zach","zech","zec"],
  [39, "Malachi",
    "malaquias","malaquias","malachi","malachie","malachia","maleachi",
    "ml","mal","mlc"],

  // === Novo Testamento ===
  [40, "Matthew",
    "mateus","mateo","matthew","matthieu","matthaus","matteo",
    "mt","mat","matt","mateu"],
  [41, "Mark",
    "marcos","mark","marc","markus","marco",
    "mc","mar","mrk","mk"],
  [42, "Luke",
    "lucas","luke","luc","lukas","luca",
    "lc","luc","luk","lk"],
  [43, "John",
    "joao","juan","john","jean","johannes","giovanni",
    "jo","joao","jn","joh","jhn"],
  [44, "Acts",
    "atos","atos dos apostolos","hechos","acts","actes","apostelgeschichte","atti","atti degli apostoli",
    "at","ato","ac","act","acts","ats","hch"],
  [45, "Romans",
    "romanos","romans","romains","romer","romani",
    "rm","rom","ro"],
  [46, "1 Corinthians",
    "1 corintios","i corintios","primeira corintios","1cor","1 cor","1co","1 co","1corintios","1 corinthians","1 corinthiens","1 korinther","1 corinzi"],
  [47, "2 Corinthians",
    "2 corintios","ii corintios","segunda corintios","2cor","2 cor","2co","2 co","2corintios","2 corinthians","2 corinthiens","2 korinther","2 corinzi"],
  [48, "Galatians",
    "galatas","gal","galatians","galates","galater","galati",
    "gl","gal","ga"],
  [49, "Ephesians",
    "efesios","efesios","ephesians","ephesiens","epheser","efesini",
    "ef","efe","eph","ep"],
  [50, "Philippians",
    "filipenses","filipenses","philippians","philippiens","philipper","filippesi",
    "fp","fil","filp","php","phil","phi"],
  [51, "Colossians",
    "colossenses","colosenses","colossians","colossiens","kolosser","colossesi",
    "cl","col","co"],
  [52, "1 Thessalonians",
    "1 tessalonicenses","i tessalonicenses","1 tesalonicenses","1ts","1 ts","1tes","1 tes","1tess","1 tess","1th","1 th","1 thessaloniciens","1 thessalonicher","1 tessalonicesi"],
  [53, "2 Thessalonians",
    "2 tessalonicenses","ii tessalonicenses","2 tesalonicenses","2ts","2 ts","2tes","2 tes","2tess","2 tess","2th","2 th","2 thessaloniciens","2 thessalonicher","2 tessalonicesi"],
  [54, "1 Timothy",
    "1 timoteo","i timoteo","1tm","1 tm","1tim","1 tim","1ti","1 ti","1 timothy","1 timothee","1 timotheus","1 timoteo"],
  [55, "2 Timothy",
    "2 timoteo","ii timoteo","2tm","2 tm","2tim","2 tim","2ti","2 ti","2 timothy","2 timothee","2 timotheus","2 timoteo"],
  [56, "Titus",
    "tito","titus","tite","titus",
    "tt","tit","ti"],
  [57, "Philemon",
    "filemom","filemon","philemon","filemone","filemom",
    "fm","flm","phm","phlm","phile"],
  [58, "Hebrews",
    "hebreus","hebreos","hebrews","hebreux","hebraer","ebrei",
    "hb","heb","hbr","he"],
  [59, "James",
    "tiago","santiago","james","jacques","jakobus","giacomo",
    "tg","tia","stg","sant","jas","jam","jc","jak","jak."],
  [60, "1 Peter",
    "1 pedro","i pedro","primeira pedro","1pe","1 pe","1pd","1 pd","1ped","1 ped","1 peter","1 pierre","1 petrus","1 pietro"],
  [61, "2 Peter",
    "2 pedro","ii pedro","segunda pedro","2pe","2 pe","2pd","2 pd","2ped","2 ped","2 peter","2 pierre","2 petrus","2 pietro"],
  [62, "1 John",
    "1 joao","i joao","primeira joao","1 juan","1jo","1 jo","1jn","1 jn","1joao","1 joao","1 john","1 jean","1 johannes","1 giovanni"],
  [63, "2 John",
    "2 joao","ii joao","segunda joao","2 juan","2jo","2 jo","2jn","2 jn","2joao","2 joao","2 john","2 jean","2 johannes","2 giovanni"],
  [64, "3 John",
    "3 joao","iii joao","terceira joao","3 juan","3jo","3 jo","3jn","3 jn","3joao","3 joao","3 john","3 jean","3 johannes","3 giovanni"],
  [65, "Jude",
    "judas","jude","giuda",
    "jd","jud","jude"],
  [66, "Revelation",
    "apocalipse","apocalipsis","revelation","apocalypse","offenbarung","apocalisse",
    "ap","apo","apoc","rev","re","rv"],
];

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Normaliza um nome para comparação: minúsculas, sem acento, espaços colapsados, sem ponto final. */
export function normalizeName(s: string): string {
  return stripDiacritics(s)
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const CANON: CanonicalBook[] = RAW.map(([order, english, ...aliases]) => ({
  id: `B${String(order).padStart(2, "0")}`,
  order,
  english,
  aliases: Array.from(new Set([english, ...aliases].map(normalizeName))).filter(Boolean),
}));

/** Mapa: alias normalizado -> CanonicalBook. */
const ALIAS_INDEX: Map<string, CanonicalBook> = (() => {
  const m = new Map<string, CanonicalBook>();
  for (const b of CANON) {
    for (const a of b.aliases) {
      // Em caso de colisão, mantém o primeiro (improvável em livros bíblicos canônicos).
      if (!m.has(a)) m.set(a, b);
    }
  }
  return m;
})();

/** Lista de aliases ordenados do maior para o menor, para regex de matching. */
export const ALL_ALIASES_LONG_FIRST: { alias: string; book: CanonicalBook }[] = (() => {
  const arr: { alias: string; book: CanonicalBook }[] = [];
  for (const b of CANON) for (const a of b.aliases) arr.push({ alias: a, book: b });
  arr.sort((a, b) => b.alias.length - a.alias.length);
  return arr;
})();

/** Resolve um nome (em qualquer idioma) para um livro canônico, ou null. */
export function resolveCanonical(name: string): CanonicalBook | null {
  if (!name) return null;
  const norm = normalizeName(name);
  if (!norm) return null;
  const direct = ALIAS_INDEX.get(norm);
  if (direct) return direct;
  // Tenta remover sufixos numéricos: "Mateus 1", "Mateus capítulo 1"
  const cleaned = norm
    .replace(/\s+(capitulo|cap|chapter|chap)\s*\d+\s*$/i, "")
    .replace(/\s+\d{1,3}\s*$/, "")
    .trim();
  if (cleaned && cleaned !== norm) {
    const hit = ALIAS_INDEX.get(cleaned);
    if (hit) return hit;
  }
  // Tenta tratar primeiro token + "1/2/3" como "1 X"
  const m = norm.match(/^([123])\s+(.+)$/);
  if (m) {
    const rest = m[2];
    // Busca como "1 rest"
    const key = `${m[1]} ${rest}`;
    const hit = ALIAS_INDEX.get(key);
    if (hit) return hit;
  }
  return null;
}

/** Procura o livro canônico mais plausível dentro de um pedaço de texto (heading, título). */
export function findCanonicalInText(text: string): CanonicalBook | null {
  if (!text) return null;
  const norm = normalizeName(text);
  if (!norm) return null;
  // 1) match direto
  const direct = resolveCanonical(norm);
  if (direct) return direct;
  // 2) tenta achar qualquer alias como substring (long-first p/ evitar "jo" antes de "joao")
  for (const { alias, book } of ALL_ALIASES_LONG_FIRST) {
    if (alias.length < 3) continue; // evita falsos positivos com aliases muito curtos
    // Limites de palavra
    const re = new RegExp(`(^|[^a-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`);
    if (re.test(norm)) return book;
  }
  return null;
}

// =============================================================
// Nomes localizados dos 66 livros (apenas nomes — não é texto bíblico).
// Usados para exibir o título do popup no idioma da interface.
// =============================================================

export type CanonLang = "pt" | "en" | "es";

const LOCALIZED_NAMES: Record<string, Record<CanonLang, string>> = {
  B01: { pt: "Gênesis", en: "Genesis", es: "Génesis" },
  B02: { pt: "Êxodo", en: "Exodus", es: "Éxodo" },
  B03: { pt: "Levítico", en: "Leviticus", es: "Levítico" },
  B04: { pt: "Números", en: "Numbers", es: "Números" },
  B05: { pt: "Deuteronômio", en: "Deuteronomy", es: "Deuteronomio" },
  B06: { pt: "Josué", en: "Joshua", es: "Josué" },
  B07: { pt: "Juízes", en: "Judges", es: "Jueces" },
  B08: { pt: "Rute", en: "Ruth", es: "Rut" },
  B09: { pt: "1 Samuel", en: "1 Samuel", es: "1 Samuel" },
  B10: { pt: "2 Samuel", en: "2 Samuel", es: "2 Samuel" },
  B11: { pt: "1 Reis", en: "1 Kings", es: "1 Reyes" },
  B12: { pt: "2 Reis", en: "2 Kings", es: "2 Reyes" },
  B13: { pt: "1 Crônicas", en: "1 Chronicles", es: "1 Crónicas" },
  B14: { pt: "2 Crônicas", en: "2 Chronicles", es: "2 Crónicas" },
  B15: { pt: "Esdras", en: "Ezra", es: "Esdras" },
  B16: { pt: "Neemias", en: "Nehemiah", es: "Nehemías" },
  B17: { pt: "Ester", en: "Esther", es: "Ester" },
  B18: { pt: "Jó", en: "Job", es: "Job" },
  B19: { pt: "Salmos", en: "Psalms", es: "Salmos" },
  B20: { pt: "Provérbios", en: "Proverbs", es: "Proverbios" },
  B21: { pt: "Eclesiastes", en: "Ecclesiastes", es: "Eclesiastés" },
  B22: { pt: "Cântico dos Cânticos", en: "Song of Solomon", es: "Cantar de los Cantares" },
  B23: { pt: "Isaías", en: "Isaiah", es: "Isaías" },
  B24: { pt: "Jeremias", en: "Jeremiah", es: "Jeremías" },
  B25: { pt: "Lamentações", en: "Lamentations", es: "Lamentaciones" },
  B26: { pt: "Ezequiel", en: "Ezekiel", es: "Ezequiel" },
  B27: { pt: "Daniel", en: "Daniel", es: "Daniel" },
  B28: { pt: "Oseias", en: "Hosea", es: "Oseas" },
  B29: { pt: "Joel", en: "Joel", es: "Joel" },
  B30: { pt: "Amós", en: "Amos", es: "Amós" },
  B31: { pt: "Obadias", en: "Obadiah", es: "Abdías" },
  B32: { pt: "Jonas", en: "Jonah", es: "Jonás" },
  B33: { pt: "Miqueias", en: "Micah", es: "Miqueas" },
  B34: { pt: "Naum", en: "Nahum", es: "Nahúm" },
  B35: { pt: "Habacuque", en: "Habakkuk", es: "Habacuc" },
  B36: { pt: "Sofonias", en: "Zephaniah", es: "Sofonías" },
  B37: { pt: "Ageu", en: "Haggai", es: "Ageo" },
  B38: { pt: "Zacarias", en: "Zechariah", es: "Zacarías" },
  B39: { pt: "Malaquias", en: "Malachi", es: "Malaquías" },
  B40: { pt: "Mateus", en: "Matthew", es: "Mateo" },
  B41: { pt: "Marcos", en: "Mark", es: "Marcos" },
  B42: { pt: "Lucas", en: "Luke", es: "Lucas" },
  B43: { pt: "João", en: "John", es: "Juan" },
  B44: { pt: "Atos", en: "Acts", es: "Hechos" },
  B45: { pt: "Romanos", en: "Romans", es: "Romanos" },
  B46: { pt: "1 Coríntios", en: "1 Corinthians", es: "1 Corintios" },
  B47: { pt: "2 Coríntios", en: "2 Corinthians", es: "2 Corintios" },
  B48: { pt: "Gálatas", en: "Galatians", es: "Gálatas" },
  B49: { pt: "Efésios", en: "Ephesians", es: "Efesios" },
  B50: { pt: "Filipenses", en: "Philippians", es: "Filipenses" },
  B51: { pt: "Colossenses", en: "Colossians", es: "Colosenses" },
  B52: { pt: "1 Tessalonicenses", en: "1 Thessalonians", es: "1 Tesalonicenses" },
  B53: { pt: "2 Tessalonicenses", en: "2 Thessalonians", es: "2 Tesalonicenses" },
  B54: { pt: "1 Timóteo", en: "1 Timothy", es: "1 Timoteo" },
  B55: { pt: "2 Timóteo", en: "2 Timothy", es: "2 Timoteo" },
  B56: { pt: "Tito", en: "Titus", es: "Tito" },
  B57: { pt: "Filêmon", en: "Philemon", es: "Filemón" },
  B58: { pt: "Hebreus", en: "Hebrews", es: "Hebreos" },
  B59: { pt: "Tiago", en: "James", es: "Santiago" },
  B60: { pt: "1 Pedro", en: "1 Peter", es: "1 Pedro" },
  B61: { pt: "2 Pedro", en: "2 Peter", es: "2 Pedro" },
  B62: { pt: "1 João", en: "1 John", es: "1 Juan" },
  B63: { pt: "2 João", en: "2 John", es: "2 Juan" },
  B64: { pt: "3 João", en: "3 John", es: "3 Juan" },
  B65: { pt: "Judas", en: "Jude", es: "Judas" },
  B66: { pt: "Apocalipse", en: "Revelation", es: "Apocalipsis" },
};

/**
 * Retorna o nome canônico do livro no idioma solicitado, ou null se
 * o bookId ou idioma não estiverem mapeados. Aceita "pt-BR", "en-US"
 * etc. — usa apenas o prefixo de 2 letras.
 */
export function getLocalizedBookName(bookId: string, lang: string): string | null {
  if (!bookId) return null;
  const short = (lang || "").slice(0, 2).toLowerCase();
  if (short !== "pt" && short !== "en" && short !== "es") return null;
  const entry = LOCALIZED_NAMES[bookId];
  return entry ? entry[short as CanonLang] : null;
}
