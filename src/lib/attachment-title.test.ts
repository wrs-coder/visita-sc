import { describe, it, expect } from "vitest";
import { titleFromNewAttachment } from "./attachment-title";
import { firstLineTitle } from "./docx-import";

const a = (id: string, kind: "photo" | "video" | "publication", title: string) => ({ id, kind, title, created_at: 0 });

describe("Tema automático", () => {
  it("imagem nova com Tema vazio usa o nome do arquivo sem extensão", () => {
    expect(titleFromNewAttachment("", [], [a("1", "photo", "Mapa do território.jpg")])).toBe("Mapa do território");
  });
  it("vídeo também preenche", () => {
    expect(titleFromNewAttachment("  ", [], [a("1", "video", "demo.mp4")])).toBe("demo");
  });
  it("nunca sobrescreve Tema escrito", () => {
    expect(titleFromNewAttachment("Fé viva", [], [a("1", "photo", "x.jpg")])).toBeNull();
  });
  it("publicação não preenche", () => {
    expect(titleFromNewAttachment("", [], [a("1", "publication", "w.pdf")])).toBeNull();
  });
  it("Word: primeira linha com texto vira o Tema", () => {
    expect(firstLineTitle("<p> </p><p><strong>Imite a fé</strong> de Abraão</p><p>1. Intro</p>")).toBe("Imite a fé de Abraão");
    expect(firstLineTitle("<p></p>")).toBe("");
  });
});
