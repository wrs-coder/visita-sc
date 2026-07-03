import { describe, it, expect } from "vitest";
import {
  isLikelyValidUrl,
  toDisplaySrc,
  serializeAttachments,
  parseAttachmentsFromContent,
  normalizeAttachment,
  type NoteAttachment,
} from "./outline-attachments";

describe("isLikelyValidUrl", () => {
  it("aceita http/https", () => {
    expect(isLikelyValidUrl("http://x")).toBe(true);
    expect(isLikelyValidUrl("https://jw.org/x")).toBe(true);
  });
  it("aceita deep-link jwlibrary://", () => {
    expect(isLikelyValidUrl("jwlibrary://finder?docid=1")).toBe(true);
  });
  it("rejeita lixo", () => {
    expect(isLikelyValidUrl("foo")).toBe(false);
    expect(isLikelyValidUrl("")).toBe(false);
  });
});

describe("toDisplaySrc (sem Capacitor no ambiente de teste)", () => {
  it("passa http(s) direto", () => {
    expect(toDisplaySrc("https://a/b.jpg")).toBe("https://a/b.jpg");
  });
  it("passa blob/data direto", () => {
    expect(toDisplaySrc("blob:xyz")).toBe("blob:xyz");
    expect(toDisplaySrc("data:image/png;base64,aa")).toBe("data:image/png;base64,aa");
  });
  it("devolve a URI original quando não há convertFileSrc", () => {
    expect(toDisplaySrc("file:///data/a.jpg")).toBe("file:///data/a.jpg");
  });
  it("vazio → string vazia", () => {
    expect(toDisplaySrc(undefined)).toBe("");
    expect(toDisplaySrc(null)).toBe("");
  });
});

describe("normalizeAttachment", () => {
  it("aceita foto com uri", () => {
    const a = normalizeAttachment({
      id: "1",
      kind: "photo",
      title: "Capa",
      uri: "file:///x.jpg",
      created_at: 123,
    });
    expect(a?.kind).toBe("photo");
    expect(a?.uri).toBe("file:///x.jpg");
  });
  it("descarta foto sem uri", () => {
    expect(normalizeAttachment({ id: "1", kind: "photo", title: "x" })).toBeNull();
  });
  it("descarta link sem url", () => {
    expect(normalizeAttachment({ id: "1", kind: "video", title: "x" })).toBeNull();
  });
  it("descarta kind desconhecido", () => {
    expect(normalizeAttachment({ id: "1", kind: "audio", url: "https://x" })).toBeNull();
  });
});

describe("round-trip content_json (Supabase)", () => {
  const list: NoteAttachment[] = [
    { id: "a1", kind: "photo", title: "Capa", uri: "file:///a.jpg", created_at: 1 },
    { id: "a2", kind: "video", title: "Ilustração", url: "https://jw.org/v/1", created_at: 2 },
    { id: "a3", kind: "publication", title: "Cântico 120", url: "jwlibrary://finder?docid=1", created_at: 3 },
  ];

  it("serialize → JSON → parse preserva todos os tipos", () => {
    const cj = { content: "x", attachments: serializeAttachments(list) };
    const roundTripped = JSON.parse(JSON.stringify(cj));
    const parsed = parseAttachmentsFromContent(roundTripped);
    expect(parsed).toHaveLength(3);
    expect(parsed.map((a) => a.kind)).toEqual(["photo", "video", "publication"]);
    expect(parsed[0].uri).toBe("file:///a.jpg");
    expect(parsed[1].url).toBe("https://jw.org/v/1");
    expect(parsed[2].url).toBe("jwlibrary://finder?docid=1");
  });

  it("parseAttachmentsFromContent tolera content_json vazio/legacy", () => {
    expect(parseAttachmentsFromContent(null)).toEqual([]);
    expect(parseAttachmentsFromContent({})).toEqual([]);
    expect(parseAttachmentsFromContent({ attachments: null })).toEqual([]);
  });

  it("descarta entradas corrompidas sem derrubar as boas", () => {
    const mixed = [
      list[0],
      { id: "bad", kind: "audio" }, // desconhecido
      list[1],
      null,
      { kind: "photo" }, // sem uri
      list[2],
    ];
    const parsed = parseAttachmentsFromContent({ attachments: mixed });
    expect(parsed).toHaveLength(3);
    expect(parsed.map((a) => a.id)).toEqual(["a1", "a2", "a3"]);
  });
});
