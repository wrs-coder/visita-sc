import { describe, it, expect } from "vitest";
import { pickLetterParts, speakerChanged } from "./letter-pick";

const parts = [
  { id: "a", assigned_to: "speaker", speaker_name: "João", sort_order: 2 },
  { id: "b", assigned_to: "co", speaker_name: "Wanderson", sort_order: 1 },
  { id: "c", assigned_to: "speaker", speaker_name: "Pedro", sort_order: 0 },
  { id: "d", assigned_to: "speaker", speaker_name: " ", sort_order: 3 },
];
describe("letter-pick", () => {
  it("SC/filial e sem nome não recebem carta", () => expect(pickLetterParts(parts).map((p) => p.id)).toEqual(["c", "a"]));
  it("gera só as escolhidas", () => expect(pickLetterParts(parts, new Set(["a", "b"])).map((p) => p.id)).toEqual(["a"]));
  it("outro orador renova; maiúsculas/espaços não", () => {
    expect(speakerChanged("João Silva", "Pedro")).toBe(true);
    expect(speakerChanged("João Silva", " joão  silva ")).toBe(false);
    expect(speakerChanged(null, "Pedro")).toBe(false);
  });
});
