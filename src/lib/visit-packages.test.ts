import { describe, it, expect } from "vitest";
import { missingFields, packageToForm, type VisitPackage } from "./visit-packages";

const pkg: VisitPackage = {
  id: "p1", name: "Primavera",
  template_id: "a", checklist_template_id: "b", field_template_id: "c",
  meeting_talk_template_id: "d", elder_program_template_id: "gone",
};
const available = {
  template_id: ["a"], checklist_template_id: ["b"], field_template_id: ["c"],
  meeting_talk_template_id: ["d"], elder_program_template_id: ["e"],
};

describe("pacotes da visita", () => {
  it("aponta o modelo que não existe mais", () => {
    expect(missingFields(pkg, available)).toEqual(["elder_program_template_id"]);
  });
  it("preenche só os modelos que existem", () => {
    expect(packageToForm(pkg, available)).toEqual({
      template_id: "a", checklist_template_id: "b", field_template_id: "c", meeting_talk_template_id: "d",
    });
  });
});

import { decideInitialSync } from "./visit-packages";
describe("migração dos pacotes para o servidor", () => {
  const p = (id: string) => ({ id, name: id, template_id: "", checklist_template_id: "", field_template_id: "", meeting_talk_template_id: "", elder_program_template_id: "" });
  it("servidor vazio: sobe os do aparelho", () => expect(decideInitialSync([], [p("a")], false).upload.map((x) => x.id)).toEqual(["a"]));
  it("não duplica os que já estão no servidor", () => expect(decideInitialSync([p("a")], [p("a"), p("b")], false).upload.map((x) => x.id)).toEqual(["b"]));
  it("depois de migrado, vale o servidor", () => expect(decideInitialSync([p("a")], [p("b")], true)).toEqual({ list: [p("a")], upload: [] }));
});

import { mergePending } from "./visit-packages";
describe("mergePending", () => {
  it("acumula exclusões pendentes sem repetir", () => {
    expect(mergePending({ removed: ["a"] }, ["a", "b"], []).removed.sort()).toEqual(["a", "b"]);
  });
  it("não exclui pacote que voltou a existir", () => {
    const p = { id: "a", name: "x", template_id: "", checklist_template_id: "", field_template_id: "", meeting_talk_template_id: "", elder_program_template_id: "" };
    expect(mergePending({ removed: ["a"] }, [], [p]).removed).toEqual([]);
  });
});
