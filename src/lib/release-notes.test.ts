import { describe, expect, it } from "vitest";
import {
  RELEASE_HISTORY,
  RELEASE_NOTES,
  RELEASE_NOTES_VERSION,
  WHATS_NEW_AUTO_SHOW,
} from "./release-notes";
import { APP_VERSION } from "./app-update-check";
import { shouldAutoOpenWhatsNew } from "./whats-new";
import pkg from "../../package.json";

describe("release notes por versão", () => {
  it("a versão atual é 5.3.0 em todos os lugares", () => {
    expect(RELEASE_NOTES_VERSION).toBe("5.3.0");
    expect(APP_VERSION).toBe("5.3.0");
    expect(pkg.version).toBe("5.3.0");
  });
  it("a primeira entrada do histórico é a versão atual", () => {
    expect(RELEASE_HISTORY[0].version).toBe(RELEASE_NOTES_VERSION);
    expect(RELEASE_NOTES).toBe(RELEASE_HISTORY[0].sections);
  });
  it("versões não se repetem", () => {
    const v = RELEASE_HISTORY.map((r) => r.version);
    expect(new Set(v).size).toBe(v.length);
  });
  it("o aviso automático de novidades abre nesta versão (5.3.0)", () => {
    expect(WHATS_NEW_AUTO_SHOW).toBe(true);
    // Mesmo aparelho atualizado, sem a janela vista e com uso anterior: não abre.
    expect(
      shouldAutoOpenWhatsNew(
        {
          installed: RELEASE_NOTES_VERSION,
          notesVersion: RELEASE_NOTES_VERSION,
          seen: null,
          hadPreviousUse: true,
        },
        WHATS_NEW_AUTO_SHOW,
      ),
    ).toBe(true);
    // Com a chave ligada, a mesma situação abriria (a regra continua viva).
    expect(
      shouldAutoOpenWhatsNew(
        {
          installed: RELEASE_NOTES_VERSION,
          notesVersion: RELEASE_NOTES_VERSION,
          seen: null,
          hadPreviousUse: true,
        },
        true,
      ),
    ).toBe(true);
  });
});

import { splitByAudience as _split } from "./release-notes";
describe("novidades por perfil", () => {
  const secs = [
    { title: "A", items: [], audience: ["super" as const] },
    { title: "B", items: [], audience: ["elder" as const] },
    { title: "C", items: [] },
  ];
  it("ancião vê as suas e as de todos primeiro", () => {
    const r = _split(secs, "elder");
    expect(r.mine.map((s) => s.title)).toEqual(["B", "C"]);
    expect(r.others.map((s) => s.title)).toEqual(["A"]);
  });
  it("sem perfil mostra tudo", () => {
    expect(_split(secs, null).others).toEqual([]);
  });
});
