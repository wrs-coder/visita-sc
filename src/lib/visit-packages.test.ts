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
