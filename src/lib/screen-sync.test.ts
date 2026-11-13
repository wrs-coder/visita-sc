import { describe, expect, it } from "vitest";
import { screenSyncTarget, SCREEN_TABLES } from "./screen-sync";
import { MIRROR_TABLES } from "./mirror-tables";

describe("sincronizar por tela", () => {
  it("toda tela mapeada só usa tabelas do aparelho", () => {
    for (const k of Object.keys(SCREEN_TABLES)) for (const t of SCREEN_TABLES[k].tables) expect(MIRROR_TABLES).toContain(t);
  });
  it("Grandes Eventos (em Congregações) baixa partes e respostas", () => {
    expect(screenSyncTarget("/congregacoes")?.tables).toContain("circuit_big_event_parts");
  });
  it("tela sem mapa cai no Sincronizar tudo", () => {
    expect(screenSyncTarget("/perfil")).toBeNull();
  });
});
