import { describe, it, expect } from "vitest";
import { CANON } from "./bible-canon";
import {
  findCitations,
  resolveBookId,
  detectBibleLanguage,
  type BookInfo,
} from "./bible-refs";

// ============================================================================
// Fixtures: monta um array de BookInfo[] simulando o que viria do EPUB
// ============================================================================

const PT_NAMES: Record<string, string> = {
  B01: "Gênesis", B02: "Êxodo", B03: "Levítico", B04: "Números", B05: "Deuteronômio",
  B06: "Josué", B07: "Juízes", B08: "Rute", B09: "1 Samuel", B10: "2 Samuel",
  B11: "1 Reis", B12: "2 Reis", B13: "1 Crônicas", B14: "2 Crônicas", B15: "Esdras",
  B16: "Neemias", B17: "Ester", B18: "Jó", B19: "Salmos", B20: "Provérbios",
  B21: "Eclesiastes", B22: "Cântico dos Cânticos", B23: "Isaías", B24: "Jeremias",
  B25: "Lamentações", B26: "Ezequiel", B27: "Daniel", B28: "Oseias", B29: "Joel",
  B30: "Amós", B31: "Obadias", B32: "Jonas", B33: "Miqueias", B34: "Naum",
  B35: "Habacuque", B36: "Sofonias", B37: "Ageu", B38: "Zacarias", B39: "Malaquias",
  B40: "Mateus", B41: "Marcos", B42: "Lucas", B43: "João", B44: "Atos",
  B45: "Romanos", B46: "1 Coríntios", B47: "2 Coríntios", B48: "Gálatas",
  B49: "Efésios", B50: "Filipenses", B51: "Colossenses", B52: "1 Tessalonicenses",
  B53: "2 Tessalonicenses", B54: "1 Timóteo", B55: "2 Timóteo", B56: "Tito",
  B57: "Filêmon", B58: "Hebreus", B59: "Tiago", B60: "1 Pedro", B61: "2 Pedro",
  B62: "1 João", B63: "2 João", B64: "3 João", B65: "Judas", B66: "Apocalipse",
};

const ptBooks: BookInfo[] = CANON.map((c) => ({
  bookId: c.id,
  displayName: PT_NAMES[c.id] ?? c.english,
  aliases: [],
}));

const enBooks: BookInfo[] = CANON.map((c) => ({
  bookId: c.id,
  displayName: c.english,
  aliases: [],
}));

function firstMatch(books: BookInfo[], text: string) {
  const matches = findCitations(books, text);
  return matches[0];
}

// ============================================================================
// A. Idioma detectado
// ============================================================================
describe("detectBibleLanguage", () => {
  it("detecta português", () => {
    expect(detectBibleLanguage(ptBooks)).toBe("pt");
  });
  it("detecta inglês", () => {
    expect(detectBibleLanguage(enBooks)).toBe("en");
  });
});

// ============================================================================
// B. Resolução de aliases ambíguos — Bíblia PT
// ============================================================================
describe("Bíblia PT — desambiguação", () => {
  it.each([
    ["Jo 3:16", "B43"],   // João, não Jó
    ["Jn 1:1", "B43"],    // João, não Jonas
    ["Dn 7:13", "B27"],   // Daniel
    ["Jd 5", "B65"],      // Judas (single-chapter)
    ["Nm 6:24", "B04"],   // Números
  ])('"%s" → %s', (text, expected) => {
    expect(firstMatch(ptBooks, text)?.bookId).toBe(expected);
  });
});

// ============================================================================
// C. Resolução de aliases ambíguos — Bíblia EN
// ============================================================================
describe("Bíblia EN — desambiguação", () => {
  it.each([
    ["Jo 1:1", "B18"],     // Job
    ["Jn 1:1", "B32"],     // Jonah
    ["Dn 7:13", "B05"],    // Deuteronomy
    ["Jd 5", "B07"],       // Judges (mas Judges não é single-chapter; abaixo)
    ["Jude 5", "B65"],     // Jude (single-chapter)
  ])('"%s" → %s', (text, expected) => {
    const m = firstMatch(enBooks, text);
    // Para "Jd 5" em EN: Judges não é single-chapter, então não casa como verso-only.
    // Esperamos null nesse caso específico.
    if (text === "Jd 5") {
      expect(m).toBeUndefined();
    } else {
      expect(m?.bookId).toBe(expected);
    }
  });
});

// ============================================================================
// D. Acentuação PT
// ============================================================================
describe("Acentuação PT", () => {
  it.each([
    "João 2:1", "joao 2:1", "JOÃO 2:1",
  ])('"%s" → João 2:1', (text) => {
    const m = firstMatch(ptBooks, text);
    expect(m?.bookId).toBe("B43");
    expect(m?.chapter).toBe(2);
    expect(m?.verse).toBe(1);
  });

  it("Colossenses 3:14", () => {
    expect(firstMatch(ptBooks, "Colossenses 3:14")?.bookId).toBe("B51");
    expect(firstMatch(ptBooks, "colossenses 3:14")?.bookId).toBe("B51");
  });

  it("Filêmon (com e sem acento)", () => {
    expect(firstMatch(ptBooks, "Filêmon 6")?.bookId).toBe("B57");
    expect(firstMatch(ptBooks, "filemon 6")?.bookId).toBe("B57");
  });
});

// ============================================================================
// E. Livros numerados
// ============================================================================
describe("Livros numerados", () => {
  it.each([
    ["1 João 4:8", "B62"],
    ["I João 4:8", "B62"],
    ["1Jo 4:8", "B62"],
    ["1 Jo 4:8", "B62"],
    ["2 Pedro 3:10", "B61"],
    ["2Pe 3:10", "B61"],
    ["1Co 13:4", "B46"],
    ["1 Co 13:4", "B46"],
  ])('"%s" → %s', (text, expected) => {
    expect(firstMatch(ptBooks, text)?.bookId).toBe(expected);
  });
});

// ============================================================================
// F. Livros de capítulo único
// ============================================================================
describe("Livros de capítulo único (verso-only)", () => {
  it.each([
    ["Judas 5", "B65", 1, 5],
    ["2 João 4", "B63", 1, 4],
    ["3 Jo 8", "B64", 1, 8],
    ["Obadias 15", "B31", 1, 15],
    ["Filêmon 6", "B57", 1, 6],
  ])('"%s" → %s %d:%d', (text, bookId, chapter, verse) => {
    const m = firstMatch(ptBooks, text);
    expect(m?.bookId).toBe(bookId);
    expect(m?.chapter).toBe(chapter);
    expect(m?.verse).toBe(verse);
  });

  it('NEGATIVO: "Mateus 5" (sem :) não casa', () => {
    expect(firstMatch(ptBooks, "Mateus 5")).toBeUndefined();
  });
});

// ============================================================================
// G. Bordas com pontuação
// ============================================================================
describe("Bordas com pontuação", () => {
  it.each([
    "(João 2:1)",
    "João 2:1,",
    "Veja João 2:1. Próxima frase.",
    "—João 2:1—",
  ])('"%s" casa', (text) => {
    expect(firstMatch(ptBooks, text)?.bookId).toBe("B43");
  });

  it('NEGATIVO: "abcJoão 2:1" não casa (grudado em palavra)', () => {
    expect(firstMatch(ptBooks, "abcJoão 2:1")).toBeUndefined();
  });
});

// ============================================================================
// H. Intervalos
// ============================================================================
describe("Intervalos", () => {
  it("João 3:16-18 (hífen)", () => {
    const m = firstMatch(ptBooks, "João 3:16-18");
    expect(m?.verse).toBe(16);
    expect(m?.verseEnd).toBe(18);
  });
  it("João 3:16–18 (en-dash)", () => {
    const m = firstMatch(ptBooks, "João 3:16–18");
    expect(m?.verse).toBe(16);
    expect(m?.verseEnd).toBe(18);
  });
  it("Jd 5-7 (single-chapter range)", () => {
    const m = firstMatch(ptBooks, "Jd 5-7");
    expect(m?.bookId).toBe("B65");
    expect(m?.chapter).toBe(1);
    expect(m?.verse).toBe(5);
    expect(m?.verseEnd).toBe(7);
  });
});

// ============================================================================
// I. Forma antiga preservada
// ============================================================================
describe("Forma cap:vers antiga", () => {
  it("Judas 1:5 continua casando", () => {
    const m = firstMatch(ptBooks, "Judas 1:5");
    expect(m?.bookId).toBe("B65");
    expect(m?.chapter).toBe(1);
    expect(m?.verse).toBe(5);
  });
});

// ============================================================================
// J. Múltiplas citações
// ============================================================================
describe("Múltiplas citações", () => {
  it("Veja Mt 5:9 e Jo 14:6.", () => {
    const all = findCitations(ptBooks, "Veja Mt 5:9 e Jo 14:6.");
    expect(all).toHaveLength(2);
    expect(all[0].bookId).toBe("B40"); // Mateus
    expect(all[1].bookId).toBe("B43"); // João (não Jó!)
    expect(all[0].index).toBeLessThan(all[1].index);
  });
});

// ============================================================================
// K. resolveBookId
// ============================================================================
describe("resolveBookId", () => {
  it("PT: Jo → João", () => {
    expect(resolveBookId(ptBooks, "Jo")).toBe("B43");
  });
  it("EN: Jo → Job", () => {
    expect(resolveBookId(enBooks, "Jo")).toBe("B18");
  });
  it("PT: João (com acento)", () => {
    expect(resolveBookId(ptBooks, "João")).toBe("B43");
  });
});
