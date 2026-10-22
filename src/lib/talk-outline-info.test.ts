import { describe, it, expect } from "vitest";
import { FIELDS_BY_KIND, talkSyncPatch, talkOutlineInfoRows, sanitizeTalk } from "./talk-outline-info";

const t = (_k: string, d: string) => d;

describe("talk outline", () => {
  it("campos por tipo", () => {
    expect(FIELDS_BY_KIND.public_talk).toEqual(["talk_title", "song"]);
    expect(FIELDS_BY_KIND.service_initial).toEqual(["talk_title", "song", "prayer"]);
    expect(FIELDS_BY_KIND.service_final).toEqual(["talk_title", "song", "next_congregation"]);
    expect(FIELDS_BY_KIND.event_talk).toEqual(["talk_title", "song", "next_theme", "next_speaker"]);
    expect(FIELDS_BY_KIND.pioneer_meeting).toEqual(["talk_title", "opening_prayer", "closing_prayer"]);
    expect(FIELDS_BY_KIND.elders_meeting).toEqual(["talk_title", "opening_prayer", "closing_prayer"]);
  });
  it("sincronização puxa da origem certa", () => {
    const src = { weekend_opening_song: "10", weekend_closing_song: "20", midweek_final_song: "30", midweek_closing_prayer: "Ana", pioneer_opening_prayer: "P1", elders_closing_prayer: "E2" };
    expect(talkSyncPatch("public_talk", src)).toEqual({ song: "10" });
    expect(talkSyncPatch("service_final", src)).toEqual({ song: "20" });
    expect(talkSyncPatch("service_initial", src)).toEqual({ song: "30", prayer: "Ana" });
    expect(talkSyncPatch("pioneer_meeting", src)).toEqual({ opening_prayer: "P1" });
    expect(talkSyncPatch("elders_meeting", src)).toEqual({ closing_prayer: "E2" });
    expect(talkSyncPatch("event_talk", src)).toEqual({});
  });
  it("balão omite vazios e esboço sem tipo não mostra nada", () => {
    expect(talkOutlineInfoRows(undefined, t)).toEqual([]);
    expect(talkOutlineInfoRows({ kind: null, song: "5" }, t)).toEqual([]);
    expect(talkOutlineInfoRows({ kind: "public_talk", talk_title: "Fé", song: " " }, t)).toEqual([["Tipo", "Discurso Público"], ["Título", "Fé"]]);
  });
  it("sanitize ignora lixo", () => {
    expect(sanitizeTalk({ kind: "x", song: 3, prayer: "a" })).toEqual({ kind: null, prayer: "a" });
  });
});
