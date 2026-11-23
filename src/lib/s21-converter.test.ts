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
  toRows: (l: Pub[]) => { reports: unknown[][] };
  toTswin: (l: Pub[], d: Date) => string;
});

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

  it("publicador comum não leva horas; P.A. leva só no mês marcado", () => {
    const r = S21.toRows([card("pub")]).reports;
    expect(r[1]?.[2]).toBeNull(); // setembro, sem P.A.
    expect(r[2]?.[2]).toBe(30); // outubro, P.A.
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
});
