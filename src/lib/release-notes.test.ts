import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  RELEASE_HISTORY,
  RELEASE_NOTES,
  RELEASE_NOTES_VERSION, splitByAudience,
  WHATS_NEW_AUTO_SHOW,
  hasReleaseForAudience,
} from "./release-notes";
import { APP_VERSION } from "./app-update-check";
import { shouldAutoOpenWhatsNew } from "./whats-new";
import pkg from "../../package.json";

describe("release notes por versão", () => {
  it("app, Android e novidades na 6.0.2, código 51", () => {
    expect(RELEASE_NOTES_VERSION).toBe("6.0.2");
    expect(APP_VERSION).toBe("6.0.2");
    expect(pkg.version).toBe("6.0.2");
    const gradle = readFileSync("android/app/build.gradle", "utf8");
    expect(gradle.match(/versionCode\s+(\d+)/)?.[1]).toBe("51");
    expect(gradle.match(/versionName\s+"([^"]+)"/)?.[1]).toBe("6.0.2");
    const login = readFileSync("src/components/auth/LoginForm.tsx", "utf8");
    expect(login.match(/const APP_VERSION = "([^"]+)"/)?.[1]).toBe("6.0.2");
  });
  it("a primeira entrada do histórico é a versão atual", () => {
    expect(RELEASE_HISTORY[0]?.version).toBe(RELEASE_NOTES_VERSION);
    expect(RELEASE_NOTES).toBe(RELEASE_HISTORY[0]?.sections);
  });
  it("versões não se repetem", () => {
    const v = RELEASE_HISTORY.map((r) => r.version);
    expect(new Set(v).size).toBe(v.length);
  });
  it("6.0.2 abre uma vez após atualizar um aparelho já usado", () => {
    expect(
      shouldAutoOpenWhatsNew(
        { installed: APP_VERSION, notesVersion: RELEASE_NOTES_VERSION, seen: null, hadPreviousUse: true },
        WHATS_NEW_AUTO_SHOW,
      ),
    ).toBe(true);
  });
  it("6.0.2: aviso automático exclusivo do SC", () => {
    expect(WHATS_NEW_AUTO_SHOW).toBe(true);
    expect(hasReleaseForAudience(RELEASE_NOTES, "super")).toBe(true);
    expect(hasReleaseForAudience(RELEASE_NOTES, "elder")).toBe(false);
    expect(hasReleaseForAudience(RELEASE_NOTES, "wife")).toBe(false);
    expect(hasReleaseForAudience(RELEASE_NOTES, null)).toBe(false);
    expect(splitByAudience(RELEASE_NOTES, "elder").mine).toEqual([]);
    expect(
      shouldAutoOpenWhatsNew(
        { installed: "5.6.0", notesVersion: RELEASE_NOTES_VERSION, seen: null, hadPreviousUse: true },
        WHATS_NEW_AUTO_SHOW,
      ),
    ).toBe(false);
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
  it("não repete novidades já vistas", () => {
    expect(shouldAutoOpenWhatsNew({ installed: "6.0.2", notesVersion: "6.0.2", seen: "6.0.2", hadPreviousUse: true }, true)).toBe(false);
  });
  it("não abre automaticamente em instalação nova", () => {
    expect(shouldAutoOpenWhatsNew({ installed: "6.0.2", notesVersion: "6.0.2", seen: null, hadPreviousUse: false }, true)).toBe(false);
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
