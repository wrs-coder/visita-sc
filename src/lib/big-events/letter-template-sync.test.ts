import { describe, it, expect } from "vitest";
import { mergeTemplates } from "./letter-template-sync";
import { defaultTemplate } from "./letter-template";
const t = (id: string, updatedAt: string) => ({ ...defaultTemplate(), id, updatedAt });
describe("mergeTemplates", () => {
  it("newest updatedAt wins", () => {
    const r = mergeTemplates([t("a", "2026-01-01")], [t("a", "2026-02-01")], true);
    expect(r.list[0].updatedAt).toBe("2026-02-01"); expect(r.upload).toHaveLength(1);
  });
  it("first sync uploads device-only templates once", () => {
    const r = mergeTemplates([t("a", "2026-01-01")], [t("b", "2026-01-01")], false);
    expect(r.list.map((x) => x.id)).toEqual(["a", "b"]);
    expect(mergeTemplates([t("a", "2026-01-01")], [t("b", "2026-01-01")], true).list.map((x) => x.id)).toEqual(["a"]);
  });
});

import { mergeTemplatesKeepLocal, templatesToUpload } from "./letter-template-sync";
describe("sincronização dos modelos como nos eventos", () => {
  const t = (id: string, updatedAt: string) => ({ id, updatedAt } as never);
  it("Baixar nunca apaga modelo só do aparelho", () => {
    const r = mergeTemplatesKeepLocal([t("a", "2026-01-02")], [t("a", "2026-01-01"), t("b", "2026-01-01")]);
    expect(r.list.map((x: { id: string }) => x.id)).toEqual(["a", "b"]);
    expect(r.localOnly).toEqual(["b"]);
  });
  it("envio pendente não sobrescreve versão mais nova da nuvem", () => {
    const up = templatesToUpload([t("a", "2026-01-05"), t("c", "2026-01-01")], [t("a", "2026-01-01"), t("b", "2026-01-01"), t("c", "2026-01-03")]);
    expect(up.map((x: { id: string }) => x.id)).toEqual(["b", "c"]);
  });
});
