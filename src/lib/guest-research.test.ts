import { describe, expect, it } from "vitest";
import { filterWsItems, internalLinkHtml, type WsItem } from "./guest-workspace-store";
import { sanitizeNoteHtml } from "./rich-content";

const item = (id: string, title: string, body: string): WsItem => ({ id, kind: "research", title, body, folderId: null, color: null, updatedAt: "2026-10-22" });

describe("pesquisas pessoais", () => {
  const items = [item("a", "Amor leal", "<p>Texto</p>"), item("b", "Outro", "<p>fala de humildade</p>")];
  it("busca pelo título", () => {
    expect(filterWsItems(items, { kind: "research", folder: null, color: null, query: "amor" }).map((i) => i.id)).toEqual(["a"]);
  });
  it("busca pelo conteúdo", () => {
    expect(filterWsItems(items, { kind: "research", folder: null, color: null, query: "humildade" }).map((i) => i.id)).toEqual(["b"]);
  });
  it("link interno sobrevive à limpeza", () => {
    expect(sanitizeNoteHtml(internalLinkHtml("abc-1", "X"))).toContain('href="#ws:abc-1"');
  });
  it("link perigoso é removido", () => {
    expect(sanitizeNoteHtml('<a href="javascript:alert(1)">x</a>')).not.toContain("javascript");
  });
});
