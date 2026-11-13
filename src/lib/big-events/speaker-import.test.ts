import { describe, expect, it } from "vitest";
import { docxToLines, linesToRows, matchSpeakers, parseLine } from "./speaker-import";

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
