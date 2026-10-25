// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { OutlineTopic } from "@/components/notes/extensions/outline-topic";

describe("convertHeadingsToTopics", () => {
  it("transforma cada H3 em tópico e lê os minutos do título", () => {
    const editor = new Editor({
      extensions: [StarterKit, OutlineTopic],
      content: "<p>Intro</p><h3>Ponto 1 (5 min)</h3><p>a</p><h3>Ponto 2</h3><p>b</p>",
    });
    expect(editor.commands.convertHeadingsToTopics()).toBe(true);
    const html = editor.getHTML();
    expect(html.match(/data-type="outline-topic"/g)?.length).toBe(2);
    expect(html).toContain('data-minutes="5"');
    expect(html).toContain("<p>Intro</p>");
    editor.destroy();
  });
});
