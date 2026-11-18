import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import { parseMwbFile, parseMwbRtf, resolveYear } from "./mwb-import";
import { currentProgram, mergeImported, partStarts, toTimerParts, totalMinutes } from "./meeting-store";
import { emptyTimer, spentMs, tapPart } from "@/lib/big-events/event-timer";

const sample = (n: string) => readFileSync(join(__dirname, "samples", n), "latin1");
const today = new Date(2026, 10, 17);

describe("apostila da reunião", () => {
  it("lê a semana de 11 a 17 de janeiro com partes e minutos", () => {
    const [w] = parseMwbRtf(sample("mwb_T_202701_01.rtf"), today);
    expect(w.monday).toBe("2027-01-11");
    expect(w.date).toBe("2027-01-12");
    expect(w.title).toBe("Ezequiel 13 a 14");
    const themes = w.parts.map((p) => `${p.theme}|${p.minutes}`);
    expect(themes).toContain("3. Leitura da Bíblia|4");
    expect(themes).toContain("8. Estudo bíblico de congregação|30");
    expect(themes[themes.length - 1]).toBe("Cântico 98 e oração|5");
    // Perguntas do estudo ("7. O que sabemos…?") não viram partes.
    expect(w.parts.filter((p) => p.kind === "part")).toHaveLength(8);
  });
  it("horários somam a partir do início", () => {
    const [w] = parseMwbRtf(sample("mwb_T_202701_01.rtf"), today);
    const s = partStarts(w);
    expect(s[0]).toBe("19:30");
    expect(s[1]).toBe("19:35"); // depois do cântico e oração
    expect(totalMinutes(w)).toBe(5 + 1 + 10 + 10 + 4 + 3 + 4 + 5 + 3 + 15 + 30 + 3 + 5);
  });
  it("importa várias semanas de um .zip", async () => {
    const zip = new JSZip();
    zip.file("a.rtf", sample("mwb_T_202701_01.rtf"), { binary: true });
    zip.file("b.rtf", sample("mwb_T_202701_07.rtf"), { binary: true });
    const bytes = await zip.generateAsync({ type: "uint8array" });
    const weeks = await parseMwbFile("x.zip", bytes, today);
    expect(weeks.map((w) => w.monday)).toEqual(["2027-01-11", "2027-02-22"]);
  });
  it("recusa arquivo que não é .rtf", () => {
    expect(() => parseMwbRtf("ola", today)).toThrow();
  });
  it("ano mais próximo de hoje", () => {
    expect(resolveYear(11, 1, today)).toBe(2027);
    expect(resolveYear(10, 11, today)).toBe(2026);
  });
  it("reimportar não substitui semana existente sem marcar", () => {
    const [w] = parseMwbRtf(sample("mwb_T_202701_01.rtf"), today);
    const mine = { ...w, start: "19:00", title: "minha" };
    expect(mergeImported([mine], [w], new Set())[0].title).toBe("minha");
    const replaced = mergeImported([mine], [w], new Set([w.monday]))[0];
    expect(replaced.title).toBe("Ezequiel 13 a 14");
    expect(replaced.id).toBe(mine.id);
    expect(replaced.start).toBe("19:00");
  });
  it("semana atual pela data de hoje", () => {
    const [w] = parseMwbRtf(sample("mwb_T_202701_01.rtf"), today);
    expect(currentProgram([w], new Date(2027, 0, 14))?.id).toBe(w.id);
    expect(currentProgram([w], new Date(2027, 0, 20))).toBeNull();
  });
  it("o controle não para ao minimizar: 5 min fora contam na parte", () => {
    const [w] = parseMwbRtf(sample("mwb_T_202701_01.rtf"), today);
    const part = toTimerParts(w)[2];
    const t0 = 1_000_000;
    const s = tapPart(emptyTimer(), part.id, t0);
    expect(Math.round(spentMs(s, part.id, t0 + 5 * 60_000) / 60_000)).toBe(5);
  });
});
