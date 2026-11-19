import { beforeEach, describe, expect, it } from "vitest";
import { agendaAttachmentIds, purgeLocalAgenda } from "./purge-local-agenda";
import { readAgendaCache, writeAgendaCache } from "@/lib/elder-agenda/agenda-cache";
import { emptyAuto, normalizeAgenda } from "@/lib/elder-agenda/agenda";

// localStorage mínimo para o ambiente node dos testes.
beforeEach(() => {
  const m = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); },
  };
});

const payload = normalizeAgenda({ v: 3, blocks: [{ id: "t", title: "T", cards: [
  { id: "n", type: "notes", attachments: [{ id: "a1", kind: "photo", title: "Foto" }, { id: "a2", kind: "pdf", title: "Doc" }] },
  { id: "p", type: "private", attachments: [{ id: "a3", kind: "link", title: "L", url: "https://jw.org" }] },
] }] });

describe("finalizar a visita: pauta no aparelho", () => {
  it("encontra os anexos de todos os cartões, inclusive os só do SC", () => {
    expect(agendaAttachmentIds(payload).sort()).toEqual(["a1", "a2", "a3"]);
  });
  it("apaga a cópia da pauta desta visita e mantém a de outra", async () => {
    const base = { congregation: "C", range: "", role: "sc" as const, payload, auto: emptyAuto() };
    writeAgendaCache("visit.v1", { ...base, visitId: "v1" });
    writeAgendaCache("visit.v2", { ...base, visitId: "v2" });
    await purgeLocalAgenda("v1");
    expect(readAgendaCache("visit.v1")).toBeNull();
    expect(readAgendaCache("visit.v2")?.visitId).toBe("v2");
  });
});
