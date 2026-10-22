// Quantidade de capítulos dos 66 livros (só números) e ordens de leitura.
export const CHAPTERS = [50,40,27,36,34,24,21,4,31,24,22,25,29,36,10,13,10,42,150,31,12,8,66,52,5,48,12,14,3,9,1,4,7,3,3,3,2,14,4,28,16,24,21,28,16,16,13,6,6,4,4,5,3,6,4,3,1,13,5,5,3,5,1,1,1,22];
export const TOTAL_CHAPTERS = CHAPTERS.reduce((a, b) => a + b, 0);

export const bookId = (order: number) => `B${String(order).padStart(2, "0")}`;
export const chaptersOf = (id: string) => CHAPTERS[Number(id.slice(1)) - 1] ?? 0;

const CHRONO = [1,18,2,3,4,5,6,7,8,9,10,13,19,11,20,21,22,14,12,32,30,28,23,33,29,34,36,35,24,25,31,26,27,15,37,38,17,16,39,40,41,42,43,44,59,48,52,53,46,47,45,49,50,51,57,58,56,54,60,61,55,65,62,63,64,66];

export type ReadingPlan = "canon" | "chrono" | "year" | "custom";
/** Meta personalizada: livros escolhidos e ritmo opcional. */
export interface CustomPlan { books: string[]; perDay: number | null; endDate: string | null }
export const ALL_BOOKS = CHAPTERS.map((_, i) => bookId(i + 1));

export function bookOrder(plan: ReadingPlan, custom?: CustomPlan | null): string[] {
  if (plan === "custom") { const set = new Set(custom?.books ?? []); return ALL_BOOKS.filter((b) => set.has(b)); }
  return (plan === "chrono" ? CHRONO : CHAPTERS.map((_, i) => i + 1)).map(bookId);
}

export function chapterSequence(plan: ReadingPlan, custom?: CustomPlan | null): string[] {
  return bookOrder(plan, custom).flatMap((b) => Array.from({ length: chaptersOf(b) }, (_, i) => `${b}:${i + 1}`));
}

export function isValidChapterKey(k: string): boolean {
  const m = /^B(\d\d):(\d+)$/.exec(k);
  if (!m) return false;
  const n = Number(m[2]);
  return n >= 1 && n <= chaptersOf(`B${m[1]}`);
}

/** Dia (1..365) do plano anual e os capítulos daquele dia. */
export function yearPlanDay(startDate: string, today: Date): { day: number; keys: string[] } {
  const start = new Date(`${startDate}T00:00:00`);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.floor((t.getTime() - start.getTime()) / 86_400_000);
  const day = Math.min(365, Math.max(1, (Number.isFinite(diff) ? diff : 0) + 1));
  const seq = chapterSequence("canon");
  const from = Math.floor(((day - 1) * seq.length) / 365);
  const to = Math.floor((day * seq.length) / 365);
  return { day, keys: seq.slice(from, to) };
}

export interface Highlight { id: string; ref: string; bookId: string | null; text: string; date: string }

export function filterHighlights(list: Highlight[], book: string | null, q: string): Highlight[] {
  const s = q.trim().toLowerCase();
  return list.filter((h) => (!book || h.bookId === book) && (!s || h.text.toLowerCase().includes(s) || h.ref.toLowerCase().includes(s)));
}

const dayIndex = (startDate: string, today: Date) => {
  const start = new Date(`${startDate}T00:00:00`);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d = Math.floor((t.getTime() - start.getTime()) / 86_400_000);
  return Math.max(0, Number.isFinite(d) ? d : 0);
};

/** Capítulos de hoje na meta personalizada (null = meta livre, sem ritmo). */
export function customPlanDay(custom: CustomPlan, startDate: string, today: Date): { day: number; keys: string[] } | null {
  const seq = chapterSequence("custom", custom);
  if (!seq.length) return null;
  let per = custom.perDay;
  if (!per && custom.endDate) {
    const total = dayIndex(startDate, new Date(`${custom.endDate}T00:00:00`)) + 1;
    per = Math.ceil(seq.length / Math.max(1, total));
  }
  if (!per) return null;
  const i = dayIndex(startDate, today);
  const from = Math.min(seq.length, i * per);
  return { day: i + 1, keys: seq.slice(from, from + per) };
}
