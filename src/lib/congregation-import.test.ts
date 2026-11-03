import { describe, it, expect } from "vitest";
import { parseCsv, linesToItems, splitNumber, generateCode, displayName, docxXmlToLines, xlsxToLines, CODE_RE } from "./congregation-import";
import { abbreviateBookName } from "./book-abbrev";

describe("congregation import", () => {
  it("lê o CSV do JW.org com número e circuito", () => {
    const csv = '\uFEFF"Congregação","Circuito","Número da congregação","HLC"\n"Cabiri","IBE-01-A","18911","x"\n"Funda 01","IBE-01-A","20139","y\nz"\n';
    const r = parseCsv(csv);
    expect(r.circuit).toBe("IBE-01-A");
    expect(r.items.map((i) => [i.name, i.number])).toEqual([["Cabiri", "18911"], ["Funda 01", "20139"]]);
  });
  it("número antes ou depois do nome", () => {
    expect(splitNumber("Cabiri  (18911)")).toEqual({ name: "Cabiri", number: "18911" });
    expect(splitNumber("(20122) Cidade do Sequele 02")).toEqual({ name: "Cidade do Sequele 02", number: "20122" });
  });
  it("título vem desmarcado e repetidas somem", () => {
    const items = linesToItems(["CONGREGAÇÕES:", "Kilunda (20673)", "Kilunda (20673)", ""]);
    expect(items).toHaveLength(2);
    expect(items[0].likelyTitle).toBe(true);
    expect(items[1].likelyTitle).toBe(false);
  });
  it("lê Word e Excel", () => {
    expect(docxXmlToLines('<w:p><w:r><w:t>Rio Seco </w:t></w:r><w:r><w:t>(21899)</w:t></w:r></w:p>')).toEqual(["Rio Seco (21899)"]);
    expect(xlsxToLines("<sst><si><t>Funda 02 (21008)</t></si></sst>", '<row r="4"><c r="A4" t="s"><v>0</v></c></row>')).toEqual(["Funda 02 (21008)"]);
  });
  it("código de 5 números, único", () => {
    const used = new Set<string>();
    for (let i = 0; i < 200; i++) { const c = generateCode(used); expect(c).toMatch(/^\d{5}$/); expect(used.has(c)).toBe(false); used.add(c); }
    expect(CODE_RE.test("1234567")).toBe(false);
  });
  it("manter ou tirar o número", () => {
    expect(displayName("Cabiri", "18911", true)).toBe("Cabiri (18911)");
    expect(displayName("Cabiri", "18911", false)).toBe("Cabiri");
  });
  it("abrevia nomes longos de livros", () => {
    expect(abbreviateBookName("1 Tessalonicenses")).toBe("1 Tes");
    expect(abbreviateBookName("Deuteronômio")).toBe("Deut");
    expect(abbreviateBookName("Jó")).toBe("Jó");
  });
});
