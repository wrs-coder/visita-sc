import { describe, expect, it } from "vitest";
import { RELEASE_HISTORY, RELEASE_NOTES, RELEASE_NOTES_VERSION } from "./release-notes";
import { APP_VERSION } from "./app-update-check";
import pkg from "../../package.json";

describe("release notes por versão", () => {
  it("a versão atual é 5.0.6 em todos os lugares", () => {
    expect(RELEASE_NOTES_VERSION).toBe("5.0.6");
    expect(APP_VERSION).toBe("5.0.6");
    expect(pkg.version).toBe("5.0.6");
  });
  it("a primeira entrada do histórico é a versão atual", () => {
    expect(RELEASE_HISTORY[0].version).toBe(RELEASE_NOTES_VERSION);
    expect(RELEASE_NOTES).toBe(RELEASE_HISTORY[0].sections);
  });
  it("versões não se repetem", () => {
    const v = RELEASE_HISTORY.map((r) => r.version);
    expect(new Set(v).size).toBe(v.length);
  });
});
