import { describe, expect, it } from "vitest";
import { buildBoardModel, formatRange, type BoardInput } from "./board-program";

const base: BoardInput = {
  startDate: "2026-11-17", endDate: "2026-11-22", sc: "Wanderson Rodrigues", congregation: "Cidade do Sequele",
  midweek: { at: null, chairman: "João", parts: null, serviceTalk: "Tenha consideração", finalSong: "151" },
  weekend: { at: null, publicTalk: "Quem governa o mundo?", finalTalk: null, openingSong: "3", closingSong: null },
  pioneer: { at: null, place: "Salão" }, elders: null,
  field: [{ date: "2026-11-18", period: "Manhã", time: "08:30:00", place: "Casa do Pedro" }, { date: "2026-11-18", period: "Tarde", time: "15:00", place: "Salão" }],
};

describe("quadro de anúncios", () => {
  it("período no formato do quadro", () => {
    expect(formatRange("2026-11-17", "2026-11-22")).toBe("17 a 22 de novembro de 2026");
  });
  it("usa dados do app: discurso de serviço, cântico de terça, discurso público com o SC", () => {
    const m = buildBoardModel(base);
    expect(m.midweek.find((r) => r.text === "Tenha consideração")?.who).toBe("Wanderson Rodrigues");
    expect(m.midweek.some((r) => r.text.startsWith("Cântico 151"))).toBe(true);
    expect(m.weekend.find((r) => r.text === "Quem governa o mundo?")?.who).toBe("Wanderson Rodrigues");
    expect(m.midweek[0].who).toBe("João");
  });
  it("serviço de campo de quarta a domingo, manhã e tarde separados", () => {
    const m = buildBoardModel(base);
    expect(m.field.map((f) => f.day)).toEqual(["Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]);
    expect(m.field[0].am).toEqual({ time: "08:30", place: "Casa do Pedro" });
    expect(m.field[0].pm.time).toBe("15:00");
    expect(m.field[1].am.place).toBe("");
  });
});
