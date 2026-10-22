import { describe, it, expect } from "vitest";
import { fieldNoteInfoRows } from "./field-note-info";

const t = (_k: string, d: string) => d;

describe("fieldNoteInfoRows", () => {
  it("mostra só os campos preenchidos", () => {
    const rows = fieldNoteInfoRows({ title: "Saída", prayer: " ", territory: "S-13 nº 4", assistants: null }, t);
    expect(rows.map((r) => r[0])).toEqual(["Título", "Território"]);
  });
  it("esboço sem dados não tem linhas", () => {
    expect(fieldNoteInfoRows({}, t)).toEqual([]);
  });
});
