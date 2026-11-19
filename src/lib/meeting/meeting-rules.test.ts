import { describe, expect, it } from "vitest";
import { assignSpeakers, normalizeSpeakerLine, parseSpeakerLines } from "./meeting-speakers";
import { applyVisitWeek } from "./visit-week-meeting";
import { buildMeetingShareFile, parseMeetingShareFile } from "./meeting-share";
import { partStarts, toTimerParts, totalMinutes, COUNSEL_SUFFIX, type MeetingPart, type MeetingProgram } from "./meeting-store";

const P = (id: string, theme: string, kind: MeetingPart["kind"], section: MeetingPart["section"], minutes = 5, extra: Partial<MeetingPart> = {}): MeetingPart =>
  ({ id, theme, kind, section, minutes, assigned: "", ...extra });
const prog = (): MeetingProgram => ({
  id: "w", monday: "2026-11-16", date: "2026-11-17", start: "19:30", title: "", updatedAt: "",
  parts: [
    P("s1", "Cântico 1 e oração", "song", "open"),
    P("ci", "Comentários iniciais", "comments", "open", 1),
    P("p1", "1. Tesouro", "part", "treasures", 10),
    P("p4", "4. Iniciando conversas", "part", "ministry", 3),
    P("s2", "Cântico 2", "song", "living", 3),
    P("p7", "7. Estudo bíblico de congregação", "part", "living", 30),
    P("cf", "Comentários finais", "comments", "close", 3),
    P("s3", "Cântico 3 e oração", "song", "close"),
  ],
});

describe("oradores", () => {
  it("dois nomes na mesma linha viram demonstração", () => {
    expect(normalizeSpeakerLine("Lucia Nunes e Fernanda Abreu")).toBe("Lucia Nunes / Fernanda Abreu");
    expect(normalizeSpeakerLine("Lucia Nunes/Fernanda Abreu")).toBe("Lucia Nunes / Fernanda Abreu");
  });
  it("cântico sozinho fica sem nome, cântico e oração recebe, comentários iniciais e finais têm o mesmo nome", () => {
    const names = parseSpeakerLines("Pedro\nJoão\nAna\nLucia e Bia\nCarlos\nMarcos");
    const r = assignSpeakers(prog().parts, names);
    expect(r.byId.get("s1")).toBe("Pedro");
    expect(r.byId.get("ci")).toBe("João");
    expect(r.byId.get("p4")).toBe("Lucia / Bia");
    expect(r.byId.has("s2")).toBe(false);
    expect(r.byId.get("cf")).toBe("João");
    expect(r.byId.get("s3")).toBe("Marcos");
  });
});

describe("conselho", () => {
  it("conselho de 1 min ganha tempo próprio e soma no horário", () => {
    const p = prog(); p.parts[3] = { ...p.parts[3], counsel: 1 };
    const t = toTimerParts(p);
    const i = t.findIndex((x) => x.id === `p4${COUNSEL_SUFFIX}`);
    expect(t[i - 1].id).toBe("p4");
    expect(t[i].duration_min).toBe(1);
    expect(t[i].speaker_name).toBeNull();
    expect(totalMinutes(p)).toBe(totalMinutes(prog()) + 1);
    expect(partStarts(p)[4]).toBe("19:50");
  });
});

describe("semana da visita", () => {
  it("troca o estudo pelo discurso de serviço, comentários finais antes e cântico de terça", () => {
    const { program, talkId } = applyVisitWeek(prog(), { serviceTalk: "Tenha consideração", finalSong: "151", scName: "Wanderson" });
    const ids = program.parts.map((x) => x.id);
    expect(talkId).toBe("p7");
    expect(ids.indexOf("cf")).toBe(ids.indexOf("p7") - 1);
    const talk = program.parts.find((x) => x.id === "p7")!;
    expect(talk.theme).toBe("Tenha consideração");
    expect(talk.minutes).toBe(30);
    expect(talk.assigned).toBe("Wanderson");
    expect(program.parts.at(-1)!.theme).toBe("Cântico 151 e oração");
  });
  it("fora da semana de visita nada muda", () => {
    expect(applyVisitWeek(prog(), null).program.parts.map((x) => x.id)).toEqual(prog().parts.map((x) => x.id));
  });
});

describe("partilhar semanas", () => {
  it("arquivo não leva oradores e importa com ids novos no horário da conta", () => {
    const p = prog(); p.parts[2].assigned = "Pedro";
    const file = buildMeetingShareFile([p]);
    expect(file).not.toContain("Pedro");
    const mine: MeetingProgram[] = [{ ...prog(), id: "x", date: "2026-11-18", start: "20:00" }];
    const [imp] = parseMeetingShareFile(file, mine);
    expect(imp.id).not.toBe("w");
    expect(imp.date).toBe("2026-11-18");
    expect(imp.start).toBe("20:00");
    expect(imp.parts.every((x) => x.assigned === "")).toBe(true);
  });
  it("recusa arquivo de outro tipo", () => {
    expect(() => parseMeetingShareFile('{"kind":"x"}', [])).toThrow();
  });
});

describe("semana da visita: presidente e oração final do Programa da visita", () => {
  const info = { serviceTalk: "T", finalSong: "151", scName: "W", chairman: "André", closingPrayer: "Adão" };
  it("comentários iniciais e finais vazios recebem o presidente", () => {
    const { program } = applyVisitWeek(prog(), info);
    expect(program.parts.find((x) => x.id === "ci")!.assigned).toBe("André");
    expect(program.parts.find((x) => x.id === "cf")!.assigned).toBe("André");
  });
  it("cântico e oração final vazio recebe a oração final", () => {
    const { program } = applyVisitWeek(prog(), info);
    expect(program.parts.find((x) => x.id === "s3")!.assigned).toBe("Adão");
    expect(program.parts.find((x) => x.id === "s1")!.assigned).toBe("");
  });
  it("nunca troca um nome já digitado", () => {
    const p = prog();
    p.parts[1] = { ...p.parts[1], assigned: "Claudio" };
    p.parts[7] = { ...p.parts[7], assigned: "Bebeca" };
    const { program } = applyVisitWeek(p, info);
    expect(program.parts.find((x) => x.id === "ci")!.assigned).toBe("Claudio");
    expect(program.parts.find((x) => x.id === "s3")!.assigned).toBe("Bebeca");
  });
});
