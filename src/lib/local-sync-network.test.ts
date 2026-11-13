import { beforeEach, describe, expect, it } from "vitest";
import { __resetLocalDbForTests } from "./local-db";
import { syncTables, type PullFn } from "./local-sync";
import { isNetworkWindowOpen, preferNetworkNow } from "./net-policy";

describe("syncTables vai de verdade à nuvem", () => {
  beforeEach(() => __resetLocalDbForTests());

  it("abre a janela de rede durante o download e fecha depois", async () => {
    const during: boolean[] = [];
    const pull: PullFn = async () => {
      during.push(preferNetworkNow());
      return [{ id: "ev1", updated_at: "2026-11-13T13:06:14Z" }];
    };
    await syncTables({ tables: ["circuit_big_events", "circuit_big_event_parts"], pull });
    expect(during).toEqual([true, true]);
    expect(isNetworkWindowOpen()).toBe(false);
  });
});
