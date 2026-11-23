// Regras do Conversor S-21 (ferramenta avulsa em public/ferramentas, fora do app).
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

type Month = { month: string; participated: boolean; studies: number | null; auxiliary: boolean; hours: number | null; comments: string };
type Pub = Record<string, unknown> & { status: string; months: Month[] };
const loaded = createRequire(import.meta.url)("../../public/ferramentas/S21_Export/converter.js") as unknown;
const S21 = ((loaded && typeof loaded === "object" && "toTswin" in loaded ? loaded : (globalThis as Record<string, unknown>)["S21"]) as {
  serviceYearEnd: (v: string) => number | null;
  monthIso: (sy: string, i: number) => string;
  fromFields: (f: Record<string, unknown>, file?: string) => Pub;
  toRows: (l: Pub[]) => { contacts: unknown[][]; reports: unknown[][] };
  toTswin: (l: Pub[], d: Date) => string;
  excelSerial: (iso: string) => number | null;
  toCircuit: (l: Pub[], o: { name?: string; number?: string; country?: string; today?: Date }) => Circuit;
});

type Report = { id: number; user: { id: number }; month: number; year: number; minutes: number; minutes_as_hours: string; pioneer: string | null; studies: number | null; submitted_month: string };
type Circuit = {
  congregation: Record<string, unknown>;
  publishers: Array<Record<string, unknown>>;
  reports: Report[];
  monthlyTotals: Array<{ month: string; pub: { count: number; hours: number }; aux: { count: number; hours: number }; reg: { count: number } }>;
  attendance: { attendance: Array<{ month: string }> };
  privileges: Record<string, unknown[]>;
};

function card(status: string, extra: Record<string, unknown> = {}): Pub {
  const f: Record<string, unknown> = {
    "900_1_Text_SanSerif": "João Carlos Silva", "900_2_Text_SanSerif": "05/05/1988", "900_3_CheckBox": true,
    "900_5_Text_SanSerif": "25/03/2018", "900_13_Text_C_SanSerif": "2026/2027",
    "900_10_CheckBox": status === "rp",
    // setembro: participou, 2 estudos, 15 horas; outubro: P.A. com 30 horas
    "901_20_CheckBox": true, "902_20_Text_C_SanSerif": "2", "904_20_S21_Value": "15",
    "901_21_CheckBox": true, "903_21_CheckBox": true, "904_21_S21_Value": "30",
    ...extra,
  };
  return S21.fromFields(f, "x.pdf");
}

describe("Conversor S-21", () => {
  it("o último ano escrito é o ano do registro", () => {
    expect(S21.serviceYearEnd("2026/2027")).toBe(2027);
    expect(S21.serviceYearEnd("26/27")).toBe(2027);
    expect(S21.serviceYearEnd("26/7")).toBe(2027);
    expect(S21.serviceYearEnd("2027")).toBe(2027);
    expect(S21.monthIso("26/7", 0)).toBe("2026-09");
    expect(S21.monthIso("26/7", 11)).toBe("2027-08");
  });

  it("Hourglass: publicador comum que participou leva 1 hora; P.A. leva as horas do mês marcado", () => {
    const r = S21.toRows([card("pub")]).reports;
    expect(r[1]?.[2]).toBe(1); // setembro, sem P.A.
    expect(r[2]?.[2]).toBe(30); // outubro, P.A.
    expect(r[2]?.[4]).toBe("Auxiliary");
  });

  it("Hourglass: pioneiro regular leva \"Regular\" em cada mês e células vazias ficam nulas", () => {
    const { contacts, reports } = S21.toRows([card("rp")]);
    expect(reports[1]?.[4]).toBe("Regular");
    expect(reports[2]?.[4]).toBe("Regular");
    expect(reports[1]?.[6]).toBeNull();
    expect(contacts[1]?.[9]).toBeNull();
    expect(contacts[1]?.[18]).toBe("Regular Pioneer");
  });

  it("Hourglass: datas e meses viram número de data do Excel, como no modelo", () => {
    expect(S21.excelSerial("2023-04-01")).toBe(45017);
    expect(S21.excelSerial("1980-01-01")).toBe(29221);
    expect(S21.excelSerial("")).toBeNull();
  });

  it("Hourglass: cartões da mesma pessoa em anos diferentes viram um só contato", () => {
    const other = card("pub", { "900_13_Text_C_SanSerif": "2025/2026" });
    const { contacts, reports } = S21.toRows([card("pub"), other]);
    expect(contacts).toHaveLength(2);
    expect(reports.slice(1).map((r) => r[1])).toEqual(["2025-09-01", "2025-10-01", "2026-09-01", "2026-10-01"]);
  });

  it("pioneiro regular leva as horas de todos os meses", () => {
    const r = S21.toRows([card("rp")]).reports;
    expect(r[1]?.[2]).toBe(15);
  });

  it("TSWin: publicador marca participação com 1; P.A. leva horas e Aux", () => {
    const xml = S21.toTswin([card("pub")], new Date(2026, 10, 23));
    expect(xml.startsWith('<PUBLIST>\r\n<Agent Ver="9000">Tswin</Agent>\r\n<Date>2026-11-23</Date>\r\n<Count>1</Count>')).toBe(true);
    expect(xml).toContain('<Sep Year="2026">\r\n<Plcmts>0</Plcmts>\r\n<Videos>0</Videos>\r\n<Hours>1</Hours>\r\n<R.V.s>0</R.V.s>\r\n<BiSt.>2</BiSt.>\r\n<Remark/>\r\n<Pio/>');
    expect(xml).toContain('<Oct Year="2026">\r\n<Plcmts>0</Plcmts>\r\n<Videos>0</Videos>\r\n<Hours>30</Hours>');
    expect(xml).toContain("<fname>João Carlos</fname>\r\n<lname>Silva</lname>");
    expect(xml).toContain("<svt>BapBro</svt>");
  });

  it("TSWin: 24 meses, anos pares primeiro, terminando em agosto do ano do registro", () => {
    const xml = S21.toTswin([card("rp")], new Date(2026, 10, 23));
    const years = [...xml.matchAll(/<(\w{3}) Year="(\d+)">/g)].map((m) => `${m[1]}${m[2]}`);
    expect(years).toHaveLength(24);
    expect(years.slice(0, 12)).toEqual(["Jan2026", "Feb2026", "Mar2026", "Apr2026", "May2026", "Jun2026", "Jul2026", "Aug2026", "Sep2026", "Oct2026", "Nov2026", "Dec2026"]);
    expect(years.slice(12)).toEqual(["Jan2027", "Feb2027", "Mar2027", "Apr2027", "May2027", "Jun2027", "Jul2027", "Aug2027", "Sep2025", "Oct2025", "Nov2025", "Dec2025"]);
    expect(xml).toContain("<Hours>15</Hours>\r\n<R.V.s>0</R.V.s>\r\n<BiSt.>2</BiSt.>\r\n<Remark/>\r\n<Pio>Reg</Pio>");
  });

  it("Circuit Manager: mesmas seções e campos do hourglass-export, na mesma ordem", () => {
    const j = S21.toCircuit([card("pub")], { name: "Central", number: "12345", country: "BR", today: new Date(Date.UTC(2026, 10, 23, 22, 13, 55)) });
    expect(Object.keys(j)).toEqual(["congregation", "publishers", "addresses", "fsGroups", "attendance", "reports", "notPublishers", "monthlyTotals", "privileges", "territories", "territoryRecords"]);
    expect(Object.keys(j.congregation)).toHaveLength(34);
    expect(Object.keys(j.publishers[0] ?? {})).toHaveLength(57);
    expect(Object.keys(j.privileges)).toHaveLength(41);
    expect(j.congregation["name"]).toBe("Central");
    expect(j.congregation["number"]).toBe(12345);
    expect(j.publishers[0]?.["congregations_id"]).toBe(12345);
    expect(j.reports[0]?.user.id).toBe(j.publishers[0]?.["id"]);
  });

  it("Circuit Manager: publicador comum = 60 minutos; P.A. = horas do cartão com Auxiliary", () => {
    const j = S21.toCircuit([card("pub")], { today: new Date(Date.UTC(2026, 10, 23)) });
    expect(j.reports).toHaveLength(2);
    expect(j.reports[0]).toMatchObject({ month: 9, year: 2026, minutes: 60, minutes_as_hours: "1", pioneer: null, studies: 2, submitted_month: "2026-09" });
    expect(j.reports[1]).toMatchObject({ month: 10, year: 2026, minutes: 1800, minutes_as_hours: "30", pioneer: "Auxiliary" });
    const sep = j.monthlyTotals.find((t) => t.month === "2026-09");
    expect(sep?.pub).toMatchObject({ count: 1, hours: 1 });
    expect(j.monthlyTotals.find((t) => t.month === "2026-10")?.aux).toMatchObject({ count: 1, hours: 30 });
  });

  it("Circuit Manager: pioneiro regular leva Regular; assistência cobre do mês atual a setembro de 3 anos atrás", () => {
    const j = S21.toCircuit([card("rp")], { today: new Date(2026, 10, 23) });
    expect(j.publishers[0]?.["status"]).toBe("Regular Pioneer");
    expect(j.reports.every((r) => r.pioneer === "Regular")).toBe(true);
    expect(j.attendance.attendance).toHaveLength(39);
    expect(j.attendance.attendance[0]?.month).toBe("2026-11");
    expect(j.attendance.attendance[38]?.month).toBe("2023-09");
  });
});
