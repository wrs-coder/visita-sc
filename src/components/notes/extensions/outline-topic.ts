/**
 * Nó TipTap "outlineTopic": agrupa blocos comuns (parágrafos, títulos, listas,
 * tabelas…) sob um título. Como o conteúdo continua sendo blocos normais,
 * formatação, recuo, alinhamento e textos bíblicos funcionam igual ao resto.
 */
import { Node, mergeAttributes } from "@tiptap/core";
import { OUTLINE_TOPIC_TYPE, makeTopicId } from "@/lib/outline-topics";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    outlineTopic: {
      setOutlineTopic: (title: string) => ReturnType;
      unsetOutlineTopic: () => ReturnType;
      renameOutlineTopic: (title: string) => ReturnType;
    };
  }
}

export interface OutlineTopicOptions {
  labels: { rename: string; remove: string; defaultTitle: string; titlePrompt: string };
}

export const OutlineTopic = Node.create<OutlineTopicOptions>({
  name: "outlineTopic",
  group: "block",
  content: "block+",
  defining: true,

  addOptions() {
    return {
      labels: { rename: "Renomear tópico", remove: "Remover tópico", defaultTitle: "Tópico", titlePrompt: "Título do tópico" },
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-topic-id"),
        renderHTML: (attrs) => ({ "data-topic-id": attrs.id || makeTopicId() }),
      },
      title: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-title") || "",
        renderHTML: (attrs) => ({ "data-title": String(attrs.title ?? "").slice(0, 120) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: `div[data-type="${OUTLINE_TOPIC_TYPE}"]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": OUTLINE_TOPIC_TYPE }), 0];
  },

  addCommands() {
    return {
      setOutlineTopic:
        (title) =>
        ({ commands }) =>
          commands.wrapIn(this.name, { id: makeTopicId(), title: title.slice(0, 120) }),
      unsetOutlineTopic:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
      renameOutlineTopic:
        (title) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { title: title.slice(0, 120) }),
    };
  },

  addNodeView() {
    const labels = this.options.labels;
    return ({ node, getPos, editor }) => {
      let current = node;
      const dom = document.createElement("div");
      dom.setAttribute("data-type", OUTLINE_TOPIC_TYPE);
      dom.className = "my-2 rounded-md border border-dashed border-primary/50 bg-muted/30";

      const header = document.createElement("div");
      header.contentEditable = "false";
      header.className = "flex items-center gap-2 px-2 py-1 border-b border-border select-none";

      const titleEl = document.createElement("span");
      titleEl.className = "flex-1 min-w-0 truncate font-semibold text-foreground";

      const mkBtn = (text: string, onClick: () => void) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = text;
        b.className = "text-[11px] rounded px-1.5 py-0.5 text-muted-foreground hover:text-foreground hover:bg-muted";
        b.addEventListener("mousedown", (e) => e.preventDefault());
        b.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        });
        return b;
      };

      const selectInside = () => {
        const pos = typeof getPos === "function" ? getPos() : null;
        if (typeof pos !== "number") return false;
        editor.chain().focus().setTextSelection(pos + 2).run();
        return true;
      };

      const renameBtn = mkBtn(labels.rename, () => {
        const next = window.prompt(labels.titlePrompt, String(current.attrs.title ?? ""));
        if (next === null) return;
        if (selectInside()) editor.commands.renameOutlineTopic(next.trim() || labels.defaultTitle);
      });
      const removeBtn = mkBtn(labels.remove, () => {
        if (selectInside()) editor.commands.unsetOutlineTopic();
      });

      header.append(titleEl, renameBtn, removeBtn);
      const contentDOM = document.createElement("div");
      contentDOM.className = "px-2 py-1";
      dom.append(header, contentDOM);

      const paint = () => {
        titleEl.textContent = String(current.attrs.title || labels.defaultTitle);
      };
      paint();

      return {
        dom,
        contentDOM,
        update: (updated) => {
          if (updated.type !== current.type) return false;
          current = updated;
          paint();
          return true;
        },
        ignoreMutation: (m) => header.contains(m.target as globalThis.Node),
        stopEvent: (e) => header.contains(e.target as globalThis.Node),
      };
    };
  },
});
