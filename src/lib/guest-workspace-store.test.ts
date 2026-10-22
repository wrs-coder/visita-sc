import { describe, it, expect } from "vitest";
import { sanitizeWs } from "./guest-workspace-store";

describe("sanitizeWs", () => {
  it("descarta itens de tipo desconhecido ao restaurar", () => {
    const d = sanitizeWs({ items: [{ id: "a", kind: "note", title: "x", body: "y" }, { id: "b", kind: "hack" }] });
    expect(d.items.map((i) => i.id)).toEqual(["a"]);
  });
  it("arquivo inválido vira espaço vazio", () => {
    expect(sanitizeWs("lixo").items).toHaveLength(0);
  });
});
