import { describe, expect, it } from "vitest";
import pt from "@/i18n/locales/pt.json";
import en from "@/i18n/locales/en.json";
import es from "@/i18n/locales/es.json";
import { PAGE_TITLE_KEYS, pageTitleKey } from "./page-titles";

const get = (o: unknown, k: string) => k.split(".").reduce<unknown>((a, p) => (a as Record<string, unknown> | undefined)?.[p], o);

describe("títulos das telas no topo", () => {
  it("toda chave existe em pt, en e es", () => {
    for (const k of Object.values(PAGE_TITLE_KEYS)) {
      for (const l of [pt, en, es]) expect(typeof get(l, k), k).toBe("string");
    }
  });
  it("Início não tem título; relatório com id tem", () => {
    expect(pageTitleKey("/dashboard")).toBeNull();
    expect(pageTitleKey("/relatorio/abc")).toBe("report.title");
    expect(pageTitleKey("/notas/")).toBe("notes.title");
  });
});
