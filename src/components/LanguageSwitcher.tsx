import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { changeLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";
import { cn } from "@/lib/utils";

type Variant = "default" | "inverted";

interface Props {
  className?: string;
  variant?: Variant;
}

const FLAGS: Record<SupportedLanguage, string> = {
  pt: "🇧🇷",
  en: "🇺🇸",
  es: "🇪🇸",
};

export function LanguageSwitcher({ className, variant = "default" }: Props) {
  const { t, i18n } = useTranslation();
  const current = (SUPPORTED_LANGUAGES as readonly string[]).includes(i18n.language)
    ? (i18n.language as SupportedLanguage)
    : "pt";

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <Globe
        className={cn(
          "h-4 w-4",
          variant === "inverted" ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      />
      <Select value={current} onValueChange={(v) => changeLanguage(v as SupportedLanguage)}>
        <SelectTrigger
          className={cn(
            "h-9 w-auto min-w-[140px]",
            variant === "inverted"
              ? "bg-white/10 border-white/20 text-primary-foreground hover:bg-white/20"
              : "",
          )}
          aria-label={t("common.language")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES.map((lng) => (
            <SelectItem key={lng} value={lng}>
              <span className="mr-2">{FLAGS[lng]}</span>
              {t(`languages.${lng}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
