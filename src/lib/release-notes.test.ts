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
  it("a versão atual é 5.0.9 em todos os lugares", () => {
    expect(RELEASE_NOTES_VERSION).toBe("5.0.9");
    expect(APP_VERSION).toBe("5.0.9");
    expect(pkg.version).toBe("5.0.9");
  });
  it("a primeira entrada do histórico é a versão atual", () => {
    expect(RELEASE_HISTORY[0].version).toBe(RELEASE_NOTES_VERSION);
    expect(RELEASE_NOTES).toBe(RELEASE_HISTORY[0].sections);
  });
  it("versões não se repetem", () => {
    const v = RELEASE_HISTORY.map((r) => r.version);
    expect(new Set(v).size).toBe(v.length);
  });
  it("o aviso automático de novidades fica desligado nesta versão", () => {
    expect(WHATS_NEW_AUTO_SHOW).toBe(false);
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
    ).toBe(false);
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
