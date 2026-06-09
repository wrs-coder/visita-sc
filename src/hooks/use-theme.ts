import { useEffect, useState } from "react";
import { getTheme, setTheme, subscribeTheme, type ThemeMode } from "@/lib/theme";

export function useTheme(): [ThemeMode, (mode: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>(() => getTheme());

  useEffect(() => {
    const unsub = subscribeTheme(setMode);
    // sincroniza caso outra aba tenha alterado
    setMode(getTheme());
    return unsub;
  }, []);

  return [mode, setTheme];
}
