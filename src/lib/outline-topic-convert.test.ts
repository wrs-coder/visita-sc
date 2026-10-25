// @vitest-environment happy-dom
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

  it("reconhece subtítulo JW em negrito com tempo e ignora negrito sem tempo", () => {
    const editor = new Editor({
      extensions: [StarterKit, OutlineTopic],
      content: "<p><b>Frase forte</b></p><p><strong>UM LEMBRETE AMOROSO (4 min)</strong></p><p>a</p><p><b>Destaque</b></p>",
    });
    expect(editor.commands.convertHeadingsToTopics()).toBe(true);
    const html = editor.getHTML();
    expect(html.match(/data-type="outline-topic"/g)?.length).toBe(1);
    expect(html).toContain('data-minutes="4"');
    expect(html).toContain('data-title="UM LEMBRETE AMOROSO (4 min)"');
    expect(html.indexOf("Frase forte")).toBeLessThan(html.indexOf("outline-topic"));
    editor.destroy();
  });

  it("reconhece maiúsculas sem negrito e H2 com tempo; ignora frase comum", () => {
    const editor = new Editor({
      extensions: [StarterKit, OutlineTopic],
      content: "<p>Leia por 4 min hoje</p><p>UM LEMBRETE AMOROSO (4 min)</p><p>a</p><h2>Conclusão (3 min.)</h2><p>b</p>",
    });
    expect(editor.commands.convertHeadingsToTopics()).toBe(true);
    const html = editor.getHTML();
    expect(html.match(/data-type="outline-topic"/g)?.length).toBe(2);
    expect(html).toContain('data-minutes="4"');
    expect(html).toContain('data-minutes="3"');
    expect(html).toContain("<p>Leia por 4 min hoje</p>");
    editor.destroy();
  });
});
