// Abreviaturas de livros bíblicos só para títulos curtos (topo do leitor).
const ABBR: Record<string, string> = {
  "gênesis": "Gên", "êxodo": "Êx", "levítico": "Lev", "números": "Núm", "deuteronômio": "Deut",
  "josué": "Jos", "juízes": "Juí", "1 samuel": "1 Sam", "2 samuel": "2 Sam", "1 reis": "1 Reis", "2 reis": "2 Reis",
  "1 crônicas": "1 Crô", "2 crônicas": "2 Crô", "neemias": "Nee", "provérbios": "Pro", "eclesiastes": "Ecl",
  "cântico de salomão": "Cân", "cântico dos cânticos": "Cân", "lamentações": "Lam", "ezequiel": "Eze", "jeremias": "Jer",
  "isaías": "Isa", "habacuque": "Hab", "sofonias": "Sof", "zacarias": "Zac", "malaquias": "Mal",
  "mateus": "Mat", "lucas": "Luc", "atos": "Atos", "romanos": "Rom", "1 coríntios": "1 Cor", "2 coríntios": "2 Cor",
  "gálatas": "Gál", "efésios": "Efé", "filipenses": "Fil", "colossenses": "Col",
  "1 tessalonicenses": "1 Tes", "2 tessalonicenses": "2 Tes", "1 timóteo": "1 Tim", "2 timóteo": "2 Tim",
  "filêmon": "Flm", "hebreus": "Heb", "1 pedro": "1 Ped", "2 pedro": "2 Ped", "1 joão": "1 João", "2 joão": "2 João",
  "3 joão": "3 João", "apocalipse": "Apo", "revelação": "Rev",
};

// Nomes curtos que só são abreviados nos títulos (sempre abreviados).
const SHORT_ABBR: Record<string, string> = {
  "esdras": "Esd", "ester": "Est", "salmos": "Sal", "daniel": "Dan", "oseias": "Os", "oséias": "Os",
  "obadias": "Obd", "jonas": "Jon", "miqueias": "Miq", "miquéias": "Miq", "marcos": "Mar",
  "tiago": "Tia", "judas": "Jud", "jeremias": "Jer", "isaías": "Isa", "lucas": "Luc", "mateus": "Mat",
  "romanos": "Rom", "hebreus": "Heb", "gênesis": "Gên", "êxodo": "Êx", "números": "Núm", "neemias": "Nee",
  "efésios": "Efé", "gálatas": "Gál", "levítico": "Lev", "josué": "Jos", "juízes": "Juí",
};

/** Títulos: sempre usa a abreviatura (nomes de até 4 letras ficam inteiros). */
export function abbreviateBookAlways(name: string): string {
  const n = name.trim();
  const k = n.toLowerCase();
  const hit = ABBR[k] ?? SHORT_ABBR[k];
  if (hit) return hit;
  if (n.replace(/\s/g, "").length <= 4) return n;
  return abbreviateBookName(n);
}

/** Nomes com mais de 8 letras viram abreviatura; nomes curtos ficam completos. */
export function abbreviateBookName(name: string): string {
  const n = name.trim();
  if (n.replace(/\s/g, "").length <= 8) return n;
  const hit = ABBR[n.toLowerCase()];
  if (hit) return hit;
  const m = n.match(/^(\d)\s+(.+)$/);
  if (m) return `${m[1]} ${m[2].slice(0, 3)}`;
  return n.slice(0, 4);
}

/** Título do balão bíblico: sempre com o livro abreviado (ex.: "1 Tes. 5:12,13"). */
export function compactRefTitle(book: string, chapter: number | string, verses?: string): string {
  const tail = `${chapter}${verses ? `:${verses}` : ""}`;
  const ab = abbreviateBookAlways(book);
  return ab === book.trim() ? `${ab} ${tail}` : `${ab}. ${tail}`;
}
