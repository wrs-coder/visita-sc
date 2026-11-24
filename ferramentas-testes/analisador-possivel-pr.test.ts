// Analisador: alerta de possível pioneiro regular (meses entre 35 h e 50 h, sem marcação de PR).
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

type M = { month: string; hours: number | null };
type Card = { id: string; firstname: string; lastname: string; status: string; area: string; months: M[] };
const req = createRequire(import.meta.url);
const an = req("../public/ferramentas/Analisador/analyzer.js") as Record<string, unknown>;
const A = (an && "prCandidates" in an ? an : (globalThis as Record<string, unknown>)["Analisador"]) as {
  prCandidates: (c: Card[], info?: Record<string, { inactive: boolean }>, d?: Record<string, string>) => { key: string; months: string[] }[];
};
const c = (id: string, name: string, hours: (number | null)[], o: Partial<Card> = {}): Card => ({
  id, firstname: name, lastname: "Silva", status: "Baptized Publisher", area: "g1",
  months: hours.map((h, i) => ({ month: "2026-0" + (i + 1), hours: h })), ...o,
});

describe("prCandidates", () => {
  it("35 h entra no alerta", () => { expect(A.prCandidates([c("1", "Ana", [35])])[0]?.months).toEqual(["2026-01"]); });
  it("49,9 h entra no alerta", () => { expect(A.prCandidates([c("1", "Ana", [49.9])]).length).toBe(1); });
  it("50 h não entra", () => { expect(A.prCandidates([c("1", "Ana", [50])]).length).toBe(0); });
  it("34 h não entra", () => { expect(A.prCandidates([c("1", "Ana", [34])]).length).toBe(0); });
  it("quem já é pioneiro regular não recebe alerta", () => { expect(A.prCandidates([c("1", "Ana", [40], { status: "Regular Pioneer" })]).length).toBe(0); });
  it("inativo não recebe alerta", () => { expect(A.prCandidates([c("1", "Ana", [40])], { "1": { inactive: true } }).length).toBe(0); });
  it("depois de decidir, o alerta não volta", () => { expect(A.prCandidates([c("1", "Ana", [40])], {}, { "ana silva": "pot" }).length).toBe(0); });
});
