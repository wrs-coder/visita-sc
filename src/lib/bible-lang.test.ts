import { describe, it, expect } from "vitest";
import { resolveBibleLang, parseLangTag } from "./bible-lang";

const b = (...names: string[]) => names.map((displayName) => ({ displayName }));
const ptBR = b("Gênesis", "Êxodo", "Juízes", "Mateus", "João", "Apocalipse");
const ptPT = b("Génesis", "Êxodo", "Juízes", "Mateus", "João", "Actos", "Apocalipse");
const es = b("Génesis", "Éxodo", "Jueces", "Mateo", "Juan", "Apocalipsis");
const en = b("Genesis", "Exodus", "Judges", "Matthew", "John", "Revelation");

describe("resolveBibleLang", () => {
  it("livros em português vencem um idioma declarado errado", () => {
    expect(resolveBibleLang("en", ptBR)).toEqual({ lang: "pt", langLabel: "Português" });
  });
  it("reconhece Portugal pela região declarada", () => {
    expect(resolveBibleLang("pt-PT", ptBR).langLabel).toBe("Português (Portugal)");
  });
  it("infere Portugal pelas grafias mesmo declarado como inglês", () => {
    expect(resolveBibleLang("en", ptPT)).toEqual({ lang: "pt", langLabel: "Português (Portugal)" });
  });
  it("mantém Brasil quando declarado", () => {
    expect(resolveBibleLang("pt-BR", ptBR).langLabel).toBe("Português (Brasil)");
  });
  it("espanhol e inglês continuam corretos", () => {
    expect(resolveBibleLang("es", es).langLabel).toBe("Español");
    expect(resolveBibleLang("en", en).langLabel).toBe("English");
  });
  it("sem livros reconhecíveis, usa o declarado", () => {
    expect(resolveBibleLang("fr", b("Xyz")).lang).toBe("fr");
    expect(parseLangTag("")).toEqual({ base: "xx", region: null });
  });
});
