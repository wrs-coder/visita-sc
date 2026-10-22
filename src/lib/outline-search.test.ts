import { describe, it, expect } from "vitest";
import { searchOutlines } from "./outline-search";
import { pushRecentId } from "./recent-outlines";
import { repairFolderTypes } from "./folder-type-repair";

describe("busca por tema", () => {
  const items = [
    { id: "a", title: "Amor ao próximo", content: "<p>O Reino traz esperança</p>" },
    { id: "b", title: "O Reino, nossa esperança", content: "" },
    { id: "c", title: "Oração", content: "" },
  ];
  it("ignora acentos e ordem, título primeiro", () => {
    expect(searchOutlines(items, "esperanca reino").map((x) => x.id)).toEqual(["b", "a"]);
  });
  it("sem resultado quando falta um termo", () => {
    expect(searchOutlines(items, "reino oracao")).toEqual([]);
  });
});

describe("recentes", () => {
  it("guarda no máximo 5, o mais novo primeiro, sem repetir", () => {
    let l: string[] = [];
    for (const id of ["1", "2", "3", "4", "5", "6", "3"]) l = pushRecentId(l, id);
    expect(l).toEqual(["3", "6", "5", "4", "2"]);
  });
});

describe("pastas por subaba", () => {
  it("pasta mista vira duas, cada esboço na pasta do seu tipo", () => {
    const r = repairFolderTypes(
      [{ id: "f", type: "outline", parentId: null, name: "X" }],
      [{ id: "n1", type: "outline", folderId: "f" }, { id: "n2", type: "field_consideration", folderId: "f" }],
    );
    expect(r.folders).toEqual([{ id: "f__field_consideration", type: "field_consideration", parentId: null, name: "X" }]);
    expect(r.notes).toEqual([{ id: "n2", type: "field_consideration", folderId: "f__field_consideration" }]);
  });
  it("pasta com tipo errado é corrigida; vazia fica igual", () => {
    const r = repairFolderTypes(
      [{ id: "f", type: "outline", parentId: null, name: "X" }, { id: "e", type: "outline", parentId: null, name: "E" }],
      [{ id: "n", type: "field_consideration", folderId: "f" }],
    );
    expect(r.folders).toEqual([{ id: "f", type: "field_consideration", parentId: null, name: "X" }]);
    expect(r.notes).toEqual([]);
  });
});
