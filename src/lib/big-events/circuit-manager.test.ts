import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseProgramFile } from "./etim-import";

const text = "\uFEFF" + readFileSync(join(__dirname, "sample.circuit-manager.json"), "utf8");

describe("Circuito Manager (arquivo real)", () => {
  const res = parseProgramFile(text);
  const speakers = res.parts.filter((p) => p.assigned_to === "speaker");
  it("reconhece o formato e o tema, mesmo com BOM", () => {
    expect(res.format).toBe("circuit-manager");
    expect(res.title).toBe("Feliz É Aquele Que Confia em Jeová");
  });
  it("traz as 12 partes numeradas com orador", () => {
    expect(speakers.map((p) => p.outline_number)).toEqual(["1","2","3","4","5","6","7","8","9","10","11","12"]);
  });
  it("arredonda horário e põe a série no tema", () => {
    expect(speakers[1]).toMatchObject({ part_time: "10:16", duration_min: 16, part_type_label: "Simpósio" });
    expect(speakers[1].theme).toBe("Imite aqueles que confiaram em Jeová! — Baraque");
  });
  it("sugere tipos", () => {
    expect(speakers[5].part_type_label).toBe("Discurso Batismo");
    expect(speakers[6].part_type_label).toBe("Discurso Público");
    expect(speakers[7].part_type_label).toBe("A Sentinela");
    expect(speakers[0].part_type_label).toBe("Discurso");
  });
  it("cânticos sem orador e títulos ignorados", () => {
    expect(res.parts.some((p) => /^(Manhã|Tarde|Música)$/.test(p.theme))).toBe(false);
    expect(res.parts.find((p) => p.theme.startsWith("Cântico 31"))?.assigned_to).toBe("none");
  });
  it("rejeita arquivo inválido", () => {
    expect(() => parseProgramFile("não é json")).toThrow("Este arquivo não é um programa válido.");
  });
});
