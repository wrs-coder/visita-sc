/**
 * Nó TipTap "outlineTopic": agrupa blocos comuns (parágrafos, títulos, listas,
 * tabelas…) sob um título. Como o conteúdo continua sendo blocos normais,
 * formatação, recuo, alinhamento e textos bíblicos funcionam igual ao resto.
 */
import { Node, mergeAttributes } from "@tiptap/core";
import { Fragment, type Node as PMNode } from "@tiptap/pm/model";
import { OUTLINE_TOPIC_TYPE, makeTopicId } from "@/lib/outline-topics";
import { normalizeMinutes, parseTopicMinutes } from "@/lib/outline-schedule";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    outlineTopic: {
      setOutlineTopic: (title: string) => ReturnType;
      unsetOutlineTopic: () => ReturnType;
      renameOutlineTopic: (title: string) => ReturnType;
      setOutlineTopicMinutes: (minutes: number | null) => ReturnType;
      /** Transforma cada subtítulo (H3) do nível principal em tópico com controle de tempo. */
      convertHeadingsToTopics: () => ReturnType;
    };
  }
}

export interface OutlineTopicOptions {
  labels: {
    rename: string;
    remove: string;
    defaultTitle: string;
    titlePrompt: string;
    timeOff?: string;
    minutesPrompt?: string;
  };
}

const TRAILING_TIME = /\(\s*\d{1,3}\s*min(?:utos?)?\.?\s*\)\s*$/i;

/**
 * Subtítulo com tempo, ex. "UM LEMBRETE AMOROSO (4 min)": linha curta terminando
 * em "(N min)" que seja título, negrito ou toda em maiúsculas.
 */
export function isTimedTitleBlock(node: PMNode): boolean {
  const isHeading = node.type.name === "heading";
  if (!isHeading && node.type.name !== "paragraph") return false;
  const text = node.textContent.trim();
  if (!text || text.length > 120 || !TRAILING_TIME.test(text) || parseTopicMinutes(text) === null) return false;
  if (isHeading) return true;
  const words = text.replace(TRAILING_TIME, "");
  if (/\p{L}/u.test(words) && words === words.toLocaleUpperCase("pt-BR")) return true;
  let allBold = true;
  node.descendants((n) => {
    if (n.isText && n.text?.trim() && !n.marks.some((m) => m.type.name === "bold")) allBold = false;
    return allBold;
  });
  return allBold;
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
      minutes: {
        default: null,
        parseHTML: (el) => normalizeMinutes(el.getAttribute("data-minutes")),
        renderHTML: (attrs) => {
          const m = normalizeMinutes(attrs.minutes);
          return m ? { "data-minutes": String(m) } : {};
        },
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
      setOutlineTopicMinutes:
        (minutes) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { minutes: normalizeMinutes(minutes) }),
      convertHeadingsToTopics:
        () =>
        ({ state, tr, dispatch }) => {
          const topicType = state.schema.nodes[this.name];
          const paragraph = state.schema.nodes.paragraph;
          const out: PMNode[] = [];
          let group: { title: string; blocks: PMNode[] } | null = null;
          let converted = 0;
          const flush = () => {
            if (!group) return;
            const blocks = group.blocks.length ? group.blocks : [paragraph.create()];
            out.push(topicType.create(
              { id: makeTopicId(), title: group.title.slice(0, 120), minutes: parseTopicMinutes(group.title) },
              blocks,
            ));
            group = null;
          };
          state.doc.forEach((child) => {
            const isH3 = (child.type.name === "heading" && child.attrs.level === 3) || isTimedTitleBlock(child);
            const isBoundary = child.type.name === "heading" && Number(child.attrs.level) <= 3;
            if (isH3) {
              flush();
              group = { title: child.textContent.trim() || this.options.labels.defaultTitle, blocks: [] };
              converted++;
            } else if (isBoundary || child.type === topicType) {
              flush();
              out.push(child);
            } else if (group) {
              (group as { blocks: PMNode[] }).blocks.push(child);
            } else {
              out.push(child);
            }
          });
          flush();
          if (!converted) return false;
          if (dispatch) {
            tr.replaceWith(0, state.doc.content.size, Fragment.fromArray(out));
            dispatch(tr);
          }
          return true;
        },
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

      // Controle de tempo do tópico: minutos usados nos modos esboço/tela cheia.
      const timeBtn = mkBtn("", () => {
        const currentMin = normalizeMinutes(current.attrs.minutes);
        const suggested = currentMin ?? parseTopicMinutes(String(current.attrs.title ?? ""));
        const next = window.prompt(
          labels.minutesPrompt ?? "Minutos deste tópico (vazio = sem controle de tempo)",
          suggested ? String(suggested) : "",
        );
        if (next === null) return;
        if (selectInside()) editor.commands.setOutlineTopicMinutes(normalizeMinutes(next.trim()));
      });

      header.append(titleEl, timeBtn, renameBtn, removeBtn);
      const contentDOM = document.createElement("div");
      contentDOM.className = "px-2 py-1";
      dom.append(header, contentDOM);

      const paint = () => {
        titleEl.textContent = String(current.attrs.title || labels.defaultTitle);
        const m = normalizeMinutes(current.attrs.minutes);
        timeBtn.textContent = m ? `⏱ ${m} min` : `⏱ ${labels.timeOff ?? "tempo"}`;
        timeBtn.classList.toggle("text-primary", !!m);
        timeBtn.classList.toggle("font-semibold", !!m);
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
