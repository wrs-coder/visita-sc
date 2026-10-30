import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCircuitManagerCsv, decodeText } from "./etim-import";

const text = readFileSync(join(__dirname, "sample.circuit-manager.csv"), "utf8");

describe("CSV do Circuito Manager (arquivo real)", () => {
  const parts = parseCircuitManagerCsv(text);
  const speakers = parts.filter((p) => p.assigned_to === "speaker");
  it("traz as 12 partes numeradas", () => {
    expect(speakers.map((p) => p.outline_number)).toEqual(["1","2","3","4","5","6","7","8","9","10","11","12"]);
  });
  it("preenche o designado quando existe", () => {
    expect(speakers[0].speaker_name).toBe("Alberto Luvumba Silva");
    expect(speakers[1].speaker_name).toBeUndefined();
  });
  it("simpósio, horário e tipos", () => {
    expect(speakers[1]).toMatchObject({ part_time: "10:16", duration_min: 16, part_type_label: "Simpósio" });
    expect(speakers[5].part_type_label).toBe("Discurso Batismo");
    expect(speakers[6].part_type_label).toBe("Discurso Público");
    expect(speakers[7].part_type_label).toBe("A Sentinela");
    expect(speakers[11].theme).toBe("“Feliz é aquele que confia em Jeová”");
  });
  it("títulos ignorados e cânticos sem orador", () => {
    expect(parts.some((p) => /^(Manhã|Tarde|Música)$/.test(p.theme))).toBe(false);
    expect(parts.find((p) => p.theme.startsWith("Cântico 31"))?.assigned_to).toBe("none");
  });
  it("lê arquivo salvo em Windows-1252", () => {
    const bytes = new Uint8Array([0x4d, 0xe3, 0x65]); // "Mãe"
    expect(decodeText(bytes.buffer)).toBe("Mãe");
  });
  it("recusa CSV que não é programa", () => {
    expect(() => parseCircuitManagerCsv("a;b\n1;2")).toThrow();
  });
});
