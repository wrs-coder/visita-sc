import { beforeEach, describe, expect, it } from "vitest";
import { __resetLocalDbForTests, getRows } from "@/lib/local-db";
import { readOneWithMirror, readWithMirror } from "@/lib/local-first";

type Meal = { id: string; visit_id: string; updated_at: string; host_name?: string };

const rows: Meal[] = [
  { id: "a", visit_id: "v1", updated_at: "2026-01-02T00:00:00Z", host_name: "Ana" },
  { id: "b", visit_id: "v2", updated_at: "2026-01-01T00:00:00Z", host_name: "Bia" },
];

describe("local-first", () => {
  beforeEach(() => {
    __resetLocalDbForTests();
  });

  it("usa o servidor quando disponível e espelha o resultado", async () => {
    const res = await readWithMirror<Meal>({
      table: "meals",
      remote: async () => ({ data: rows, error: null }),
    });
    expect(res.source).toBe("remote");
    expect(res.rows).toHaveLength(2);
    // espelhamento é assíncrono
    await new Promise((r) => setTimeout(r, 10));
    expect(await getRows("meals")).toHaveLength(2);
  });

  it("cai para o espelho local quando o servidor falha", async () => {
    await readWithMirror<Meal>({ table: "meals", remote: async () => ({ data: rows, error: null }) });
    await new Promise((r) => setTimeout(r, 10));

    const res = await readWithMirror<Meal>({
      table: "meals",
      remote: async () => ({ data: null, error: new Error("offline") }),
      filter: (r) => r.visit_id === "v1",
    });
    expect(res.source).toBe("local");
    expect(res.rows.map((r) => r.id)).toEqual(["a"]);
  });

  it("devolve lista vazia quando não há nada local", async () => {
    const res = await readWithMirror<Meal>({
      table: "vazia",
      remote: async () => {
        throw new Error("boom");
      },
    });
    expect(res).toEqual({ rows: [], source: "local" });
  });

  it("leitura de uma linha usa o espelho por id", async () => {
    await readWithMirror<Meal>({ table: "meals", remote: async () => ({ data: rows, error: null }) });
    await new Promise((r) => setTimeout(r, 10));

    const res = await readOneWithMirror<Meal>({
      table: "meals",
      id: "b",
      remote: async () => ({ data: null, error: new Error("offline") }),
    });
    expect(res.source).toBe("local");
    expect(res.row?.id).toBe("b");
  });
});
