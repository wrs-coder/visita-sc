// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isBookOutlineDoc, isOutlineLikeVerse } from "./bible-outline-guard";
import { extractVersesFromDoc } from "./epub-bible-parser";

const fx = (n: string) =>
  new DOMParser().parseFromString(readFileSync(join(__dirname, "__fixtures__/tnm", n), "utf8"), "application/xhtml+xml");

describe("Conteúdo do livro e tabela de capítulos (TNM)", () => {
  it("o arquivo 'Conteúdo de Rute' não gera nenhum versículo", () => {
    const doc = fx("conteudo-rute.xhtml");
    expect(isBookOutlineDoc(doc)).toBe(true);
    expect(extractVersesFromDoc(doc, 1)).toEqual([]);
  });
  it("a tabela de capítulos não gera nenhum versículo", () => {
    const doc = fx("nav-rute.xhtml");
    expect(isBookOutlineDoc(doc)).toBe(true);
    expect(extractVersesFromDoc(doc, 1)).toEqual([]);
  });
  it("capítulo real com âncoras de versículo continua sendo lido", () => {
    const doc = new DOMParser().parseFromString(
      `<html><body><p><span id="chapter1_verse1"></span><strong>1</strong> Nos dias dos juízes houve fome.</p>
       <p><span id="chapter1_verse2"></span><sup>2</sup> O nome do homem era Elimeleque.</p>
       <p><span id="chapter1_verse3"></span><sup>3</sup> Mais tarde Elimeleque morreu.</p></body></html>`,
      "text/html",
    );
    expect(isBookOutlineDoc(doc)).toBe(false);
    const v = extractVersesFromDoc(doc, 1);
    expect(v.map((x) => x.verse)).toEqual([1, 2, 3]);
  });
});

describe("isOutlineLikeVerse", () => {
  it("reconhece tópicos do Conteúdo do livro", () => {
    expect(isOutlineLikeVerse("Efraim deve voltar a Jeová (1-14) Jacó lutou com Deus (3) Jacó chorou (4)")).toBe(true);
    expect(isOutlineLikeVerse("Efraim idólatra se esqueceu de Jeová (1-16)")).toBe(true);
    expect(isOutlineLikeVerse("Família de Elimeleque se muda para Moabe (1, 2)")).toBe(true);
  });
  it("não toca em versículos verdadeiros", () => {
    expect(isOutlineLikeVerse("Porque Deus amou tanto o mundo que deu o seu Filho unigênito.")).toBe(false);
    expect(isOutlineLikeVerse("Ele tinha 12 anos (segundo o relato) e foi ao templo.")).toBe(false);
    expect(isOutlineLikeVerse("Eram 600 homens.")).toBe(false);
  });
});
