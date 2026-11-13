import { describe, expect, it } from "vitest";
import { docxToLines, linesToRows, matchSpeakers, parseLine, runningProgramRows, type PdfItem } from "./speaker-import";

const part = (o: Partial<{ id: string; outline_number: string | null; theme: string; assigned_to: string; speaker_name: string | null; status: string }>) =>
  ({ id: "p", outline_number: "12", theme: "A fé", assigned_to: "speaker", speaker_name: null, speaker_congregation: null, status: "pending", ...o });

describe("speaker import", () => {
  it("lê colunas com tab", () => {
    expect(parseLine("12\tA fé que move\tJoão Silva\tCabiri", ["A fé que move"])).toEqual({ number: "12", speaker: "João Silva", congregation: "Cabiri" });
  });
  it("lê texto com traço e Nº", () => {
    expect(parseLine("Nº 34 – Pedro Lima – Cazenga")).toEqual({ number: "34", speaker: "Pedro Lima", congregation: "Cazenga" });
  });
  it("lê congregação entre parênteses", () => {
    expect(parseLine("7. Carlos Melo (Viana)")).toEqual({ number: "7", speaker: "Carlos Melo", congregation: "Viana" });
  });
  it("ignora linhas sem número", () => {
    expect(linesToRows(["Programa da assembleia", "Sábado"])).toEqual([]);
  });
  it("parte vazia vem marcada; orador diferente vem desmarcado; confirmado bloqueado; sem Nº desmarcado", () => {
    const rows = linesToRows(["12\tJoão\tCabiri", "34\tPedro\tCazenga", "56\tAna\tX", "99\tZé\tY"]);
    const m = matchSpeakers(rows, [part({ id: "a" }), part({ id: "b", outline_number: "34", speaker_name: "Carlos" }), part({ id: "c", outline_number: "56", speaker_name: "Rui", status: "confirmed" })]);
    expect(m.map((x) => [x.kind, x.checked])).toEqual([["new", true], ["replace", false], ["confirmed", false], ["missing", false]]);
  });
  it("ignora partes do SC e da filial", () => {
    const m = matchSpeakers(linesToRows(["12\tJoão\tCabiri"]), [part({ assigned_to: "co" })]);
    expect(m[0].kind).toBe("missing");
  });
  it("rejeita DOCTYPE no Word", () => {
    expect(() => docxToLines("<!DOCTYPE x><w:p/>")).toThrow();
  });

});

// Trecho real do PDF "Running Program" (posições do pdf.js): nome em letra 10, congregação em letra 7.
const pi = (x: number, y: number, h: number, s: string): PdfItem => ({ page: 1, x, y, w: s.length * 5, h, s });
const runningProgram: PdfItem[] = [
  pi(65, 681, 9, "Horário"), pi(107, 681, 9, "Tema"), pi(329, 681, 9, "Orador"), pi(451, 681, 9, "Tipo"),
  pi(70, 638, 10, "09:50"), pi(107, 638, 10, "Cântico 7 e oração"), pi(329, 638, 10, "SC"), pi(343, 638, 10, "Wanderson"), pi(329, 623, 10, "Rodrigues"), pi(451, 638, 10, "Oração"),
  pi(70, 602, 10, "10:00"), pi(107, 602, 10, 'N.1: "Encontre a mais plena alegria em Jeová" —'), pi(107, 587, 10, "Como?"),
  pi(329, 602, 10, "José Amadeu"), pi(329, 587, 7, "Cidade do Sequele 06 - Sequele,"), pi(329, 573, 7, "I.B"), pi(451, 602, 10, "Discurso"),
  pi(70, 551, 10, "10:15"), pi(107, 551, 10, 'N.2: "Feliz aquele... cujo pecado é desculpado"'),
  pi(329, 551, 10, "Manuel António"), pi(329, 537, 7, "Cidade do Sequele 04 - Sequele."), pi(329, 522, 7, "I.B"), pi(451, 551, 10, "Discurso"),
  pi(70, 501, 10, "10:30"), pi(107, 501, 10, 'N.3: "Felizes são os que moram na tua casa!"'), pi(329, 501, 10, "SC"), pi(343, 501, 10, "Wanderson"), pi(329, 486, 10, "Rodrigues"), pi(451, 501, 10, "Discurso"),
  pi(70, 443, 10, "11:05"), pi(107, 443, 10, "N.4: 'Feliz o homem que se refugia em Jeová'"), pi(329, 443, 10, "N/A"), pi(451, 443, 10, "Discurso"),
  pi(70, 142, 10, "14:45"), pi(107, 142, 10, "N.10: Série de discursos: Busque o que traz"), pi(107, 128, 10, "verdadeira felicidade — Uma família unida"),
  pi(329, 142, 10, "Pedro Neto"), pi(329, 128, 10, "Rodrigues"), pi(451, 142, 10, "Discurso"),
];

describe("speaker import — programa oficial em PDF", () => {
  it("lê Nº do tema, nome e a congregação logo abaixo", () => {
    const rows = runningProgramRows(runningProgram);
    expect(rows[0]).toEqual({ number: "1", speaker: "José Amadeu", congregation: "Cidade do Sequele 06 - Sequele, I.B" });
    expect(rows[1]).toEqual({ number: "2", speaker: "Manuel António", congregation: "Cidade do Sequele 04 - Sequele. I.B" });
  });
  it("ignora N/A e partes do SC; nome quebrado em duas linhas fica junto", () => {
    const rows = runningProgramRows(runningProgram);
    expect(rows.map((r) => r.number)).toEqual(["1", "2", "10"]);
    expect(rows[2]).toEqual({ number: "10", speaker: "Pedro Neto Rodrigues", congregation: null });
  });
  it("sem cabeçalho Tema/Orador não lê nada", () => {
    expect(runningProgramRows(runningProgram.slice(4))).toEqual([]);
  });
  it("linha de texto com N.x: no tema também é aceita, sem pegar a coluna Tipo", () => {
    expect(parseLine('10:00\tN.1: "Encontre a mais plena alegria"\tJosé Amadeu\tDiscurso')).toEqual({ number: "1", speaker: "José Amadeu", congregation: null });
    expect(parseLine("11:05\tN.4: Feliz o homem\tN/A\tDiscurso")).toBeNull();
    expect(parseLine("10:30\tN.3: Felizes\tSC Wanderson Rodrigues\tDiscurso")).toBeNull();
  });
  it("formatos antigos continuam iguais", () => {
    expect(parseLine("12\tA fé que move\tJoão Silva\tCabiri", ["A fé que move"])).toEqual({ number: "12", speaker: "João Silva", congregation: "Cabiri" });
    expect(parseLine("7. Carlos Melo (Viana)")).toEqual({ number: "7", speaker: "Carlos Melo", congregation: "Viana" });
  });
});

import { appProgramRows, designacoesRows, matchSpeakers as ms2, retarget } from "./speaker-import";
import { programacaoEspiritualRows } from "./speaker-import";

describe("novos formatos de importação", () => {
  const it2 = (x: number, y: number, s: string, w = 30): PdfItem => ({ page: 1, x, y, w, h: 10, s });
  it("Programação espiritual: presidente, oração e discurso pelas colunas", () => {
    const items = [
      it2(72, 469, "NÚM."), it2(404, 461, "CÂNTICO"), it2(468, 461, "CENA", 15), it2(529, 469, "ORADOR", 40), it2(645, 469, "CONGREGAÇÃO", 73),
      it2(39, 446, "09:40", 20), it2(80, 446, "--", 5), it2(99, 446, "Música (Presidente da seção)", 108), it2(492, 446, "Francisco Lima", 100), it2(626, 446, "Sequele 05", 100),
      it2(39, 428, "09:50", 20), it2(80, 428, "--", 5), it2(99, 428, "Cântico e Oração inicial", 92), it2(518, 428, "Nicodemos Alves", 63), it2(626, 428, "Cassequel 09", 100),
      it2(39, 409, "10:49", 20), it2(78, 409, "10", 9), it2(99, 409, "Ao fazer planos", 100), it2(509, 409, "Araújo Tokes", 80), it2(626, 409, "Funda 01", 100),
      it2(39, 391, "10:15", 20), it2(76, 391, "S-1", 12), it2(101, 391, "(Série de discursos) X", 200),
    ];
    const r = programacaoEspiritualRows(items);
    expect(r.map((x) => [x.role, x.number, x.speaker, x.congregation])).toEqual([
      ["chair", "", "Francisco Lima", "Sequele 05"], ["prayer", "", "Nicodemos Alves", "Cassequel 09"], ["talk", "10", "Araújo Tokes", "Funda 01"],
    ]);
  });
  it("Programa do app: nome · Cong. abaixo do tema, ignora 'Ancião a definir'", () => {
    const r = appProgramRows(["09:00\tPresidente do programa", "Ancião a definir", "3\tpendente", "10:31\tA mulher sunamita", "João Mateus · Cong. Mulenvos 06 | Simpósio · 13 min", "10:44\t4 Daniel\tpendente", "Arzito · Cong. Ecoal 03 | Simpósio · 14 min"]);
    expect(r.map((x) => [x.number, x.speaker, x.congregation])).toEqual([["3", "João Mateus", "Mulenvos 06"], ["4", "Arzito", "Ecoal 03"]]);
  });
  it("Word Designações: Ancião + Sua designação", () => {
    const r = designacoesRows(["Ancião: Alberto Basílio — Funda 02", "Sua designação: Presidência do programa · 09:00", "Ancião: José Panzo — 08 Cidade do Sequele", "Sua designação: Parte Nº 10 · 14:59 · 14 min"]);
    expect(r.map((x) => [x.role, x.number, x.speaker, x.congregation, x.time])).toEqual([["chair", "", "Alberto Basílio", "Funda 02", "09:00"], ["talk", "10", "José Panzo", "08 Cidade do Sequele", "14:59"]]);
  });
  it("troca Nº 10 ↔ Nº 11 antes de aplicar e liga presidente por horário", () => {
    const base = { assigned_to: "speaker", speaker_name: null, status: "pending" };
    const parts = [
      { ...base, id: "c1", outline_number: null, theme: "Presidente do programa", part_type_label: "Presidência do programa", part_time: "09:00" },
      { ...base, id: "c2", outline_number: null, theme: "Presidente do programa", part_type_label: "Presidência do programa", part_time: "12:40" },
      { ...base, id: "p10", outline_number: "10", theme: "A" }, { ...base, id: "p11", outline_number: "11", theme: "B" },
    ];
    const m = ms2([
      { number: "", speaker: "Tarde", congregation: null, role: "chair", time: "13:20" },
      { number: "10", speaker: "X", congregation: null, role: "talk" }, { number: "11", speaker: "Y", congregation: null, role: "talk" },
    ], parts);
    expect(m[0].part?.id).toBe("c2");
    const sw = retarget(m, 1, parts[3]);
    expect([sw[1].part?.id, sw[2].part?.id, sw[2].swapped]).toEqual(["p11", "p10", true]);
  });
});
