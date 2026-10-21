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
  /** "sidebar": linha no menu lateral, abaixo do botão de Modo Online. */
  variant?: "default" | "sidebar";
}

export function ThemeToggle({ className, compact = false, variant = "default" }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useTheme();
  const isDark = mode === "dark";
  const [oled, setOledState] = useState(false);
  useEffect(() => {
    setOledState(getOled());
    return subscribeOled(setOledState);
  }, []);
  const label = t("theme.darkMode", { defaultValue: "Modo escuro" });
  const oledLabel = t("theme.oled", { defaultValue: "Preto puro" });

  if (variant === "sidebar") {
    return (
      <div className={`rounded-xl border border-sidebar-border bg-sidebar-accent/30 text-sidebar-foreground ${className ?? ""}`}>
        <label className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium cursor-pointer">
          {isDark ? <Moon className="h-4 w-4 shrink-0" /> : <Sun className="h-4 w-4 shrink-0" />}
          <span className="flex-1">{label}</span>
          <Switch
            checked={isDark}
            onCheckedChange={(v) => setMode(v ? "dark" : "light")}
            aria-label={t("theme.toggle", { defaultValue: "Alternar modo escuro" })}
            className="no-touch-min"
          />
        </label>
        {isDark && (
          <label className="flex items-center gap-3 px-3 pb-2.5 text-sm cursor-pointer">
            <span className="h-4 w-4 shrink-0" />
            <span className="flex-1 opacity-80">{oledLabel}</span>
            <Switch checked={oled} onCheckedChange={setOled} aria-label={oledLabel} className="no-touch-min" />
          </label>
        )}
      </div>
    );
  }

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
