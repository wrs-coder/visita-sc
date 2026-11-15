/** Contador de palavras e tempo de fala do esboço. */
export const SPEAKING_WPM = 130;

const WORD_RE = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;

/** Palavras de verdade (números contam; pontuação e símbolos soltos não). */
export function countWords(text: string): number {
  if (!text) return 0;
  return text.match(WORD_RE)?.length ?? 0;
}

/** Minutos de fala estimados a 130 palavras por minuto (0 quando vazio, mínimo 1). */
export function speakingMinutes(words: number, wpm = SPEAKING_WPM): number {
  if (words <= 0) return 0;
  return Math.max(1, Math.round(words / wpm));
}
