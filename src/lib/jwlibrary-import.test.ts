import { describe, it, expect } from "vitest";
import { mergeWal, rowToNote, type JwRow } from "./jwlibrary-import";
import { sanitizeWs } from "./guest-workspace-store";

const row = (p: Partial<JwRow>): JwRow => ({ guid: "g1", book: 1, chapter: 12, blockType: 2, block: 3, title: "T", content: "C", modified: "2026-01-01", tags: null, ...p });

describe("jwlibrary import", () => {
  it("maps book number to app book id and keeps the verse", () => {
    const n = rowToNote(row({ book: 40, chapter: 6, block: 33 }))!;
    expect(n.bookId).toBe("B40"); expect(n.chapter).toBe(6); expect(n.verse).toBe(33); expect(n.id).toBe("jw-g1");
  });
  it("chapter-only notes have no verse", () => { expect(rowToNote(row({ blockType: 1, block: 7 }))!.verse).toBeNull(); });
  it("rejects books outside 1-66 and invalid chapters", () => {
    expect(rowToNote(row({ book: 67 }))).toBeNull();
    expect(rowToNote(row({ book: 1, chapter: 51 }))).toBeNull();
  });
  it("drops notes without title and text, keeps title-only", () => {
    expect(rowToNote(row({ title: " ", content: null }))).toBeNull();
    expect(rowToNote(row({ content: null }))!.text).toBe("");
  });
  it("splits tags", () => { expect(rowToNote(row({ tags: "a\u001fb" }))!.tags).toEqual(["a", "b"]); });

  it("applies only committed WAL frames", () => {
    const ps = 512; const db = new Uint8Array(ps * 2);
    const wal = new Uint8Array(32 + 2 * (24 + ps)); const dv = new DataView(wal.buffer);
    dv.setUint32(0, 0x377f0682); dv.setUint32(8, ps); dv.setUint32(16, 7); dv.setUint32(20, 9);
    const frame = (i: number, pg: number, commit: number, fill: number) => {
      const o = 32 + i * (24 + ps); dv.setUint32(o, pg); dv.setUint32(o + 4, commit); dv.setUint32(o + 8, 7); dv.setUint32(o + 12, 9);
      wal.fill(fill, o + 24, o + 24 + ps);
    };
    frame(0, 2, 3, 0xaa); frame(1, 1, 0, 0xbb); // 2nd frame never committed
    const out = mergeWal(db, wal);
    expect(out.length).toBe(ps * 3); expect(out[ps]).toBe(0xaa); expect(out[0]).toBe(0);
  });

  it("old backups without jwNotes still open", () => { expect(sanitizeWs({ items: [] }).jwNotes).toEqual([]); });
});
