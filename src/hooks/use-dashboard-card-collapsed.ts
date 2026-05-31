import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "visita-sc:dashboard:collapsed:v1";

type Store = Record<string, boolean>;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

export function useDashboardCardCollapsed(
  id: string,
  defaultCollapsed = false,
): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    const s = readStore();
    return id in s ? !!s[id] : defaultCollapsed;
  });

  useEffect(() => {
    const s = readStore();
    if (id in s && s[id] !== collapsed) setCollapsed(!!s[id]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      const s = readStore();
      s[id] = next;
      writeStore(s);
      return next;
    });
  }, [id]);

  return [collapsed, toggle];
}
