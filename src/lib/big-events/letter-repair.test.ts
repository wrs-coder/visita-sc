import { describe, expect, it } from "vitest";
import { defaultTemplate, repairInheritedTemplates, type LetterTemplate } from "./letter-template";
import { letterPdfFit } from "./letter-render";
import { buildLetterModel } from "./letter-template";

const old: LetterTemplate = { ...defaultTemplate(), headerTitle: "Wanderson Rodrigues", headerSubtitle: "IBE-01",
  headerAddress: "Rua 1, Cidade do Sequele, Angola", headerPhone: "Tel.: +244 944 683 823 / 958 190 228", signature: "Wanderson Rodrigues, SC IBE-01", opening: "Texto meu" };
const mg = { full_name: "Bruno Araújo", circuit: "MG-037", phone: "31 9999-0000" };

describe("modelo herdado do IBE-01", () => {
  it("modelo inicial não traz dados de nenhum circuito", () => {
    const d = defaultTemplate();
    expect([d.headerTitle, d.headerSubtitle, d.headerAddress, d.headerPhone, d.signature].join("")).toBe("");
  });
  it("outra conta tem o timbre trocado pelos dados do perfil e mantém os textos", () => {
    const r = repairInheritedTemplates([old], mg);
    expect(r.changed).toBe(true);
    expect(r.list[0]).toMatchObject({ headerTitle: "Bruno Araújo", headerSubtitle: "MG-037", headerAddress: "", headerPhone: "Tel.: 31 9999-0000", signature: "Bruno Araújo, SC MG-037", opening: "Texto meu" });
  });
  it("a conta do IBE-01 não muda", () => {
    expect(repairInheritedTemplates([old], { full_name: "Wanderson Rodrigues", circuit: "IBE-01" }).changed).toBe(false);
  });
  it("modelo próprio vira padrão quando o padrão era a cópia herdada", () => {
    const own = { ...defaultTemplate(), id: "meu", headerTitle: "Bruno", headerSubtitle: "MG-037" };
    const r = repairInheritedTemplates([{ ...old, headerTitle: "Bruno A - MG-037" }, own], mg);
    expect(r.list[0].id).toBe("meu");
    expect(r.list[1].headerSubtitle).toBe("MG-037");
  });
});

const ev = { name: "Assembleia", event_date: "2026-11-07", location: "SAV", extra_info: null, public_token: "t", public_code: "abc", link_mode: "pin" };
const part = { id: "a", sort_order: 0, part_time: "09:40", duration_min: 10, theme: "T", outline_number: "7", instructions: null, part_type_label: "Discurso", assigned_to: "speaker", speaker_name: "Nome", speaker_congregation: "C", show_next_speaker: false };
describe("layout da carta", () => {
  it("automático informa o nível usado e cabe em 1 página", async () => {
    const r = await letterPdfFit(buildLetterModel(defaultTemplate(), ev, part, [part], "1234"), null);
    expect(r.pages).toBe(1);
    expect(r.level).toBeGreaterThanOrEqual(1);
  });
  it("manual usa os valores escolhidos, sem compactar", async () => {
    const t = { ...defaultTemplate(), layout: { mode: "manual" as const, size: 14, side: 85, top: 85, bottom: 85, gap: 1.5 }, opening: "**Texto** ==longo== ".repeat(120) };
    const r = await letterPdfFit(buildLetterModel(t, ev, part, [part], "1234"), null);
    expect(r.level).toBe(0);
    expect(r.pages).toBeGreaterThan(1);
  });
});
