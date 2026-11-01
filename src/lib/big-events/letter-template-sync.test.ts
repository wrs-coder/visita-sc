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
