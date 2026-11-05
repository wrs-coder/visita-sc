import { describe, it, expect } from "vitest";
import { findCloudMatch, rowsInFolderTree, type CloudRowLike } from "./outline-cloud-match";

const row = (id: string, title: string, path: string, type = "outline", extra: Partial<CloudRowLike> = {}): CloudRowLike => ({
  id, title, folder_path: path, content_json: { note_type: type }, ...extra,
});

describe("findCloudMatch (aparelho B recebe o que o A enviou)", () => {
  const rows = [row("a", "Discurso 1", "Semana / Terça"), row("b", "Outro", "Semana")];
  it("usa o número da nuvem quando existe", () => {
    expect(findCloudMatch({ cloud_id: "b", title: "x" }, "", rows)?.id).toBe("b");
  });
  it("sem número da nuvem, liga pelo título e pasta", () => {
    expect(findCloudMatch({ title: " discurso 1 " }, "Semana/Terça", rows)?.id).toBe("a");
  });
  it("número da nuvem antigo cai para título e pasta", () => {
    expect(findCloudMatch({ cloud_id: "zzz", title: "Discurso 1" }, "Semana / Terça", rows)?.id).toBe("a");
  });
  it("não liga quando há dois iguais (evita trocar o esboço errado)", () => {
    const dup = [...rows, row("c", "Discurso 1", "Semana / Terça")];
    expect(findCloudMatch({ title: "Discurso 1" }, "Semana / Terça", dup)).toBeNull();
  });
  it("não liga tipo diferente nem apagado", () => {
    const r = [row("d", "X", "P", "field_consideration"), row("e", "X", "P", "outline", { deleted_at: "2026-01-01T00:00:00Z" })];
    expect(findCloudMatch({ title: "X", type: "outline" }, "P", r)).toBeNull();
  });
});

describe("rowsInFolderTree (Receber da pasta traz esboços novos)", () => {
  it("inclui subpastas e ignora pastas com nome parecido", () => {
    const rows = [row("1", "a", "Semana"), row("2", "b", "Semana / Terça"), row("3", "c", "Semanas"), row("4", "d", "Outra")];
    expect(rowsInFolderTree(rows, "Semana", "outline").map((r) => r.id)).toEqual(["1", "2"]);
  });
});
