import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/net-policy", () => ({ withNetworkWindow: (fn: () => unknown) => fn() }));
import { freshIfEmpty } from "./fresh-if-empty";
describe("freshIfEmpty", () => {
  it("cópia vazia: confirma na nuvem e usa a lista que veio", async () => {
    const read = vi.fn<() => Promise<{ ok: boolean; n: number }>>().mockResolvedValueOnce({ ok: true, n: 0 }).mockResolvedValueOnce({ ok: true, n: 3 });
    const r = await freshIfEmpty(read, (x) => x.n === 0, () => true);
    expect(r?.n).toBe(3);
  });
  it("sem internet: fica com a cópia", async () => {
    const read = vi.fn<() => Promise<{ ok: boolean; n: number }>>().mockResolvedValue({ ok: true, n: 0 });
    await freshIfEmpty(read, (x) => x.n === 0, () => false);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
