import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import pt from "@/i18n/locales/pt.json";
import { HELP_TOPICS, searchHelp } from "./help-content";

function lookup(key: string): string | undefined {
  let cur: unknown = pt;
  for (const part of key.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part];
    } else return undefined;
  }
  return typeof cur === "string" ? cur : undefined;
}

describe("help content fidelity", () => {
  it("every topic route has a real screen file", () => {
    for (const tp of HELP_TOPICS) {
      const file = `src/routes/_app${tp.route.replace(/\//g, ".")}.tsx`;
      expect(existsSync(file), file).toBe(true);
    }
  });

  it("every cited label exists in the app translations", () => {
    for (const tp of HELP_TOPICS)
      for (const s of tp.steps)
        if (s.labelKey) expect(lookup(s.labelKey), s.labelKey).toBeTypeOf("string");
  });

  it("quoted button names exist in the screen source", () => {
    expect(readFileSync("src/routes/_app.configuracoes.tsx", "utf8")).toContain("Importar");
    expect(lookup("itinerary.newVisit")).toBe("Nova visita");
    expect(lookup("offlinePin.create")).toBe("Criar PIN");
    expect(lookup("circuit.pillCircuit")).toBe("Circuito");
    const ev = readFileSync("src/components/circuit/BigEvents.tsx", "utf8");
    for (const w of ["Novo evento", "Importar programa", "Modelos de carta", "Exportar"]) expect(ev).toContain(w);
    const bt = readFileSync("src/components/guest-workspace/BibleTrackExtras.tsx", "utf8");
    for (const w of ["Marcar capítulos lidos", "Para comentar", "Modo comentário"]) expect(bt).toContain(w);
    const br = readFileSync("src/components/guest-workspace/BibleReadingTab.tsx", "utf8");
    for (const w of ["Pessoal", "Família", "Reunião", "Dias", "Continuar", "Meta de leitura"]) expect(br).toContain(w);
    const vt = readFileSync("src/components/visit-week/VisitProgramTabs.tsx", "utf8");
    for (const w of ["Anciãos", "Estudos e Revisitas", "Reuniões", "Refeições", "Transporte"]) expect(vt).toContain(w);
  });

  it("search ignores accents and finds the security topic for 'pin'", () => {
    const tr = (k: string) => lookup(k) ?? k;
    expect(searchHelp(HELP_TOPICS, "pin", tr).map((t) => t.id)).toContain("security");
    expect(searchHelp(HELP_TOPICS, "itinerário", tr).map((t) => t.id)).toEqual(["circuit"]);
  });
});
