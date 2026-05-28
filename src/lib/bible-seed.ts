// Amostra (seed) embutida no bundle — garante funcionamento 100% offline
// na primeira execução, sem depender de download. Estrutura espelha a
// Tradução do Novo Mundo das Escrituras Sagradas (textos abreviados para
// fins de teste; substituíveis no futuro por download completo).
//
// Cada idioma tem ao menos: Gênesis 1:1 e João 3:16.

import type { BibleLang, BookId } from "./bible-refs";

export interface SeedVerse {
  bookId: BookId;
  chapter: number;
  verse: number;
  text: string;
}

export const BIBLE_SEED: Record<BibleLang, SeedVerse[]> = {
  pt: [
    {
      bookId: "GEN",
      chapter: 1,
      verse: 1,
      text: "No princípio, Deus criou os céus e a terra.",
    },
    {
      bookId: "JHN",
      chapter: 3,
      verse: 16,
      text:
        "Porque Deus amou tanto o mundo que deu o seu Filho unigênito, " +
        "a fim de que todo aquele que nele exercer fé não seja destruído, " +
        "mas tenha vida eterna.",
    },
    {
      bookId: "PSA",
      chapter: 83,
      verse: 18,
      text:
        "Para que as pessoas saibam que tu, cujo nome é Jeová, " +
        "somente tu és o Altíssimo sobre toda a terra.",
    },
  ],
  en: [
    {
      bookId: "GEN",
      chapter: 1,
      verse: 1,
      text: "In the beginning God created the heavens and the earth.",
    },
    {
      bookId: "JHN",
      chapter: 3,
      verse: 16,
      text:
        "For God loved the world so much that he gave his only-begotten Son, " +
        "so that everyone exercising faith in him might not be destroyed " +
        "but have everlasting life.",
    },
    {
      bookId: "PSA",
      chapter: 83,
      verse: 18,
      text:
        "May people know that you, whose name is Jehovah, " +
        "you alone are the Most High over all the earth.",
    },
  ],
  es: [
    {
      bookId: "GEN",
      chapter: 1,
      verse: 1,
      text: "En el principio Dios creó los cielos y la tierra.",
    },
    {
      bookId: "JHN",
      chapter: 3,
      verse: 16,
      text:
        "Porque tanto amó Dios al mundo que dio a su Hijo unigénito, " +
        "para que todo el que ejerce fe en él no sea destruido, " +
        "sino que tenga vida eterna.",
    },
    {
      bookId: "PSA",
      chapter: 83,
      verse: 18,
      text:
        "Para que la gente sepa que tú, cuyo nombre es Jehová, " +
        "tú solo eres el Altísimo sobre toda la tierra.",
    },
  ],
};
