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
    const base =
      "flex flex-col items-center justify-center gap-1 h-14 rounded-xl border text-xs font-semibold transition min-w-0";
    const on = "bg-sidebar-accent border-sidebar-accent-foreground/30 text-sidebar-accent-foreground";
    const off = "bg-sidebar-accent/20 border-sidebar-border text-sidebar-foreground/80 hover:bg-sidebar-accent/50";
    return (
      <>
        <button
          type="button"
          aria-pressed={isDark}
          aria-label={label}
          title={label}
          onClick={() => setMode(isDark ? "light" : "dark")}
          className={`${base} ${isDark ? on : off} ${className ?? ""}`}
        >
          {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          <span className="truncate max-w-full px-1">{t("theme.darkShort", { defaultValue: "Escuro" })}</span>
        </button>
        <button
          type="button"
          aria-pressed={oled}
          aria-label={oledLabel}
          title={oledLabel}
          disabled={!isDark}
          onClick={() => setOled(!oled)}
          className={`${base} ${isDark && oled ? on : off} disabled:opacity-40 disabled:pointer-events-none`}
        >
          <span className={`h-4 w-4 rounded-full border border-current ${isDark && oled ? "bg-current" : ""}`} />
          <span className="truncate max-w-full px-1">{t("theme.oledShort", { defaultValue: "Preto" })}</span>
        </button>
      </>
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
