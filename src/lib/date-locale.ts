import { ptBR, enUS, es } from "date-fns/locale";
import type { Locale } from "date-fns";

export function getDateLocale(lang: string | undefined): Locale {
  if (!lang) return ptBR;
  if (lang.startsWith("en")) return enUS;
  if (lang.startsWith("es")) return es;
  return ptBR;
}
