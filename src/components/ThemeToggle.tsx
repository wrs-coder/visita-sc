import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/use-theme";
import { getOled, setOled, subscribeOled } from "@/lib/theme";

interface Props {
  className?: string;
  /** Renderiza apenas o switch (sem rótulo) — para colocar em headers compactos. */
  compact?: boolean;
}

export function ThemeToggle({ className, compact = false }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useTheme();
  const isDark = mode === "dark";
  const [oled, setOledState] = useState(false);
  useEffect(() => {
    setOledState(getOled());
    return subscribeOled(setOledState);
  }, []);
  const label = isDark
    ? t("theme.dark", { defaultValue: "Modo escuro" })
    : t("theme.light", { defaultValue: "Modo claro" });
  const oledLabel = t("theme.oled", { defaultValue: "Preto puro" });

  return (
    <div className={`inline-flex flex-col items-end gap-1 ${className ?? ""}`}>
      <div className="inline-flex items-center gap-2">
        {!compact && (
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            {label}
          </span>
        )}
        <Switch
          checked={isDark}
          onCheckedChange={(v) => setMode(v ? "dark" : "light")}
          aria-label={t("theme.toggle", { defaultValue: "Alternar modo escuro" })}
          className="no-touch-min"
        />
      </div>
      {isDark && (
        <div className="inline-flex items-center gap-2">
          {!compact && <span className="text-xs text-muted-foreground">{oledLabel}</span>}
          <Switch
            checked={oled}
            onCheckedChange={setOled}
            aria-label={oledLabel}
            className="no-touch-min"
          />
        </div>
      )}
    </div>
  );
}
