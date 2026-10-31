// Modelos de carta convite (Grandes Eventos). Guardados só no aparelho, por usuário.
// O quadro da designação nunca vem do modelo: é montado a partir do evento e da parte.
import { formatEventDate, inviteLink, nextSpeakerName, type InviteEvent, type InvitePart } from "./invite";

export interface LetterTemplate {
  id: string;
  name: string;
  headerTitle: string;     // ex.: nome do superintendente
  headerSubtitle: string;  // ex.: circuito
  headerAddress: string;
  headerPhone: string;
  refLine: string;         // "DESIGNAÇÃO — ..."
  salutation: string;      // "Amado irmão:"
  opening: string;         // parágrafo de abertura
  remindersTitle: string;
  highlight: string;       // faixa cinza
  reminders: string;       // faixa verde (uma linha por parágrafo)
  rehearsal: string;       // data e local do ensaio
  rehearsalNote: string;
  closing: string;
  signoff: string;
  signature: string;
  updatedAt: string;
}

export const DEFAULT_TEMPLATE_ID = "modelo-padrao";

export function defaultTemplate(): LetterTemplate {
  return {
    id: DEFAULT_TEMPLATE_ID,
    name: "Assembleia de circuito",
    headerTitle: "Wanderson Rodrigues",
    headerSubtitle: "IBE-01",
    headerAddress: "Rua 1, Bl 03, nº 22A, AP 202, Cidade do Sequele, Icolo & Bengo – Angola",
    headerPhone: "Tel.: +244 944 683 823 / 958 190 228",
    refLine: "DESIGNAÇÃO — Escola do Ministério do Reino 2027",
    salutation: "Amado irmão:",
    opening: "Por ser um exemplo como ancião e por sua habilidade como orador e instrutor, você foi escolhido para ter uma participação neste evento especial. Por isso, assim como Esdras, 'prepare seu coração' para ensinar. Dessa forma, assim como Jesus, você conseguirá fazer 'arder o coração' da assistência por 'abrir plenamente as Escrituras' e, certamente, todos 'ficarão maravilhados', pois Jeová lhe dará a 'língua dos instruídos' para que saiba dizer a palavra certa. (Esd. 7:10; Luc. 24:32; Mat. 13:54; Isa. 50:4) Abaixo veja informações importantes sobre a sua designação:",
    remindersTitle: "INFORMAÇÕES & LEMBRETES:",
    highlight: "O esboço e os vídeos necessários para preparar o seu discurso vão aparecer em breve no JW Documents, na secção “Partilhado consigo”; se não aparecer em dois dias, me informe imediatamente.",
    reminders: [
      "Preparação: Antes de começar a se preparar, leia novamente as páginas 56-61, 174-178 e 258-262 do livro Beneficie-se. Transmita a matéria de forma simples e lógica. Use perguntas intrigantes e ilustrações significativas baseadas em coisas que a assistência conhece. Você pode usar imagens que já saíram em nossas publicações para destacar pontos importantes.",
      "Participação da assistência: Quando for necessária participação da assistência, faça as perguntas específicas indicadas no esboço. No entanto, a consideração não é apenas uma sessão de perguntas e respostas. Ensine e explique a matéria.",
      "• Entrevistas e demonstrações: Escolha participantes que sejam exemplos como ancião em tudo e que tenham franqueza no falar; as entrevistas devem ser realistas e tocar o coração da assistência.",
    ].join("\n"),
    rehearsal: "Data e Local do Ensaio: Quinta-feira, às 19:00, Salão do Reino.",
    rehearsalNote: "Observação: Quem tem necessidades especiais terá prioridade.",
    closing: "Torne sua participação assunto de oração a Jeová e estamos certos de que Ele abençoará seus esforços.",
    signoff: "Seu irmão,",
    signature: "Wanderson Rodrigues, SC IBE-01",
    updatedAt: new Date().toISOString(),
  };
}

const listKey = (userId: string) => `bigEvents.letterTemplates.${userId}`;
const choiceKey = (userId: string) => `bigEvents.eventTemplate.${userId}`;

export function loadTemplates(userId: string): LetterTemplate[] {
  try {
    const raw = JSON.parse(localStorage.getItem(listKey(userId)) ?? "null");
    if (Array.isArray(raw) && raw.length) {
      const base = defaultTemplate();
      return raw.filter((t) => t && typeof t.id === "string").map((t) => ({ ...base, ...t }));
    }
  } catch { /* usa padrão */ }
  return [defaultTemplate()];
}
export function saveTemplates(userId: string, list: LetterTemplate[]) {
  try { localStorage.setItem(listKey(userId), JSON.stringify(list)); } catch { /* cheio */ }
}
export function loadEventChoice(userId: string): Record<string, string> {
  try { const r = JSON.parse(localStorage.getItem(choiceKey(userId)) ?? "{}"); return r && typeof r === "object" ? r : {}; } catch { return {}; }
}
export function saveEventChoice(userId: string, map: Record<string, string>) {
  try { localStorage.setItem(choiceKey(userId), JSON.stringify(map)); } catch { /* */ }
}
export function templateForEvent(list: LetterTemplate[], choice: Record<string, string>, eventId: string): LetterTemplate {
  return list.find((t) => t.id === choice[eventId]) ?? list[0] ?? defaultTemplate();
}

export interface LetterModel {
  tpl: LetterTemplate;
  date: string;
  recipientName: string;
  recipientCong: string;
  box: string[];           // linhas do quadro (automáticas)
  linkUrl: string;
  pinLine: string | null;
}

const withCong = (name: string, cong?: string | null) => (cong?.trim() ? `${name} — ${cong.trim()}` : name);

export function longDatePt(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

export function buildLetterModel(
  tpl: LetterTemplate, ev: InviteEvent, part: InvitePart, all: InvitePart[], pin: string | null, today = new Date(),
): LetterModel {
  const personal = ev.link_mode === "personal" && !!(part.personal_code || part.personal_token);
  const token = personal ? (part.personal_code || part.personal_token)! : (ev.public_code || ev.public_token);
  const head = [part.outline_number ? `Parte Nº ${part.outline_number}` : part.part_type_label, part.part_time, part.duration_min ? `${part.duration_min} min` : null].filter(Boolean).join(" · ");
  const box: string[] = [];
  box.push(`${ev.name}${ev.event_date ? ` — ${formatEventDate(ev.event_date)}` : ""}`);
  if (ev.location) box.push(`Local: ${ev.location}`);
  if (part.speaker_name) box.push(`Orador: ${withCong(part.speaker_name, part.speaker_congregation)}`);
  box.push(`Sua designação: ${head}`);
  if (part.theme) box.push(`Tema: ${part.theme}`);
  if (part.instructions) box.push(`Informações para você: ${part.instructions}`);
  if (part.show_next_speaker) { const n = nextSpeakerName(all, part.id); if (n) box.push(`Próximo orador: ${n}`); }
  if (ev.extra_info) box.push(`Informações: ${ev.extra_info}`);
  return {
    tpl, date: longDatePt(today),
    recipientName: part.speaker_name?.trim() ?? "",
    recipientCong: part.speaker_congregation?.trim() ?? "",
    box, linkUrl: inviteLink("", token),
    pinLine: !personal && pin ? `PIN: ${pin} (digite este PIN para acessar a área de confirmação)` : null,
  };
}

/** Nome do arquivo: discurso pelo número; oração/presidência pelo tipo. */
export function letterFileBase(part: InvitePart): string {
  const n = part.outline_number?.trim();
  const lead = n ? (/^\d$/.test(n) ? `0${n}` : n) : (part.part_type_label?.trim() || part.theme?.trim() || "Parte");
  return [lead, part.speaker_name?.trim(), part.speaker_congregation?.trim()].filter(Boolean).join(" - ")
    .replace(/[\\/:*?"<>|\u0000-\u001F]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 90) || "Convite";
}
