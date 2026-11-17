import { describe, it, expect } from "vitest";
import { defaultTemplate } from "./letter-template";
import { buildLetterShareFile, parseLetterShareFile } from "./letter-template-share";

const mine = { ...defaultTemplate(), id: "m1", name: "Convite", headerTitle: "Bruno", headerSubtitle: "MG-037", headerAddress: "Rua 2", headerPhone: "31 9999", signature: "Bruno, SC MG-037", opening: "Meu texto" };

describe("partilhar Modelos de cartas", () => {
  it("o arquivo exportado não leva Timbre nem Assinatura", () => {
    const json = JSON.stringify(buildLetterShareFile([mine]));
    for (const v of ["Bruno", "MG-037", "Rua 2", "31 9999"]) expect(json).not.toContain(v);
    expect(json).toContain("Meu texto");
  });
  it("importar cria modelo novo com o timbre e a assinatura de quem recebe", () => {
    const other = { ...mine, headerTitle: "Ana", headerSubtitle: "SP-1", headerAddress: "", headerPhone: "11", signature: "Ana, SC SP-1" };
    const file = JSON.parse(JSON.stringify(buildLetterShareFile([mine])));
    const [t] = parseLetterShareFile(file, [other]);
    expect(t.id).not.toBe("m1");
    expect(t.headerTitle).toBe("Ana");
    expect(t.signature).toBe("Ana, SC SP-1");
    expect(t.opening).toBe("Meu texto");
    expect(t.name).toBe("Convite (importado)");
  });
  it("recusa arquivo de outro tipo", () => {
    expect(() => parseLetterShareFile({ foo: 1 }, [])).toThrow();
  });
});
