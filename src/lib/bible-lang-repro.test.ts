import { describe, it, expect } from "vitest";
import { resolveBibleLang } from "./bible-lang";

const b = (...names: string[]) => names.map((displayName) => ({ displayName }));

describe("resolveBibleLang Repro", () => {
  it("French Bible with Révélation is misdetected as English", () => {
    // This represents a typical French Bible book list
    const fr = b("Genèse", "Exode", "Matthieu", "Jean", "Actes", "Révélation");
    const result = resolveBibleLang("fr", fr);
    console.log("Detected language for French books:", result);
    // If the bug exists, result.lang will be "en" instead of "fr"
    expect(result.lang).toBe("fr");
  });
});