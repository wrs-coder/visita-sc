import { describe, expect, it } from "vitest";
import { parseRtfProgram, rtfToText } from "./rtf-program-import";

const RTF = String.raw`{\rtf1\ansi\uc1{\fonttbl{\f0 Times;}}{\info{\title X}}\pard Programa da Assembleia\par \u8220?Encontre a Mais Plena Alegria em Jeov\u225?\u8221? \u8212? Salmo 37\par Manh\u227?\par 9:40 M\u250?sica\par 9:50 {\field{\*\fldinst {HYPERLINK "https://x" }}{\fldrslt C\u226?ntico 7 e ora\u231?\u227?o}}\par 10:00 \u8220?Encontre a mais plena alegria\u8221?\par Tarde\par 1:20 M\u250?sica\par 2:15 S\u233?rie de discursos:\par Um estilo de vida simples\par 3:00 C\u226?ntico 88\par Preste aten\u231?\u227?o\par 9:99 nada\par}`;

describe("importar programa .rtf", () => {
  it("decodifica acentos e ignora o endereço do link", () => {
    const t = rtfToText(RTF);
    expect(t).toContain("Cântico 7 e oração");
    expect(t).not.toContain("https://x");
  });
  it("converte horários da tarde para 24h e marca cânticos sem orador", () => {
    const r = parseRtfProgram(RTF);
    expect(r.parts.map((p) => p.part_time)).toEqual(["09:40", "09:50", "10:00", "13:20", "14:15", "15:00"]);
    expect(r.parts[0].assigned_to).toBe("none");
    expect(r.parts[1].assigned_to).toBe("none");
    expect(r.parts[2].assigned_to).toBe("speaker");
    expect(r.parts[2].duration_min).toBeNull(); // almoço
    expect(r.parts[0].duration_min).toBe(10);
    expect(r.parts[4].talk_includes).toEqual(["Um estilo de vida simples"]);
    expect(r.title).toBe("Encontre a Mais Plena Alegria em Jeová");
  });
  it("série de discursos: um discurso por marcador, tema completo e tempo em branco", () => {
    const rtf = String.raw`{\rtf1\ansi\pard Programa\par X\par Manh\u227?\par 10:10 C\u226?ntico 5\par 10:15 S\u233?rie de discursos: Imite aqueles que confiaram em Jeov\u225?!\par \u8226? Baraque\par \u8226? A mulher sunamita\par \u8226? Daniel, Hananias, Misael e Azarias\par 11:00 C\u226?ntico 45\par}`;
    const r = parseRtfProgram(rtf);
    expect(r.parts.map((p) => p.theme)).toEqual([
      "Cântico 5",
      "Série de discursos: Imite aqueles que confiaram em Jeová!",
      "Imite aqueles que confiaram em Jeová! — Baraque",
      "Imite aqueles que confiaram em Jeová! — A mulher sunamita",
      "Imite aqueles que confiaram em Jeová! — Daniel, Hananias, Misael e Azarias",
      "Cântico 45",
    ]);
    expect(r.parts[1]).toMatchObject({ assigned_to: "none", duration_min: 45, part_time: "10:15" });
    expect(r.parts.slice(2, 5).map((p) => p.duration_min)).toEqual([null, null, null]);
    expect(r.parts.slice(2, 5).every((p) => p.symposium && p.assigned_to === "speaker")).toBe(true);
    expect(r.parts.map((p) => p.part_time)).toEqual(["10:10", "10:15", null, null, null, "11:00"]);
    expect(r.parts[0].duration_min).toBe(5);
  });
});
