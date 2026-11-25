import { describe, it, expect } from "vitest";
import { createPendingPatches } from "./pending-patches";

describe("pending patches", () => {
  it("keeps the saved time when a stale read returns the old one", () => {
    const p = createPendingPatches();
    p.set("a", { meeting_time: "15:30" });
    expect(p.overlay([{ id: "a", meeting_time: "14:00:00" }])[0]?.["meeting_time"]).toBe("15:30");
  });
  it("drops the patch once the server shows the saved time", () => {
    const p = createPendingPatches();
    p.set("a", { meal_time: "12:15" });
    p.overlay([{ id: "a", meal_time: "12:15:00" }]);
    expect(p.overlay([{ id: "a", meal_time: "11:30:00" }])[0]?.["meal_time"]).toBe("11:30:00");
  });
  it("expires after the time limit", () => {
    let t = 0;
    const p = createPendingPatches(1000, () => t);
    p.set("a", { meal_time: "12:15" });
    t = 2000;
    expect(p.overlay([{ id: "a", meal_time: "11:30:00" }])[0]?.["meal_time"]).toBe("11:30:00");
  });
});
