import { useEffect, useState } from "react";
import { useAuth, type Congregation } from "./use-auth";
import { supabase } from "@/integrations/supabase/client";

const KEY = "active_congregation_id";
const EVT = "active-congregation-changed";

export function getActiveCongregationOverride(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function setActiveCongregationOverride(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(KEY, id);
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVT));
}

/**
 * Resolves the effective congregation for the current user.
 * - Superintendents may override via dropdown (stored in localStorage).
 * - Other users always get the congregation from auth context.
 */
export function useActiveCongregation(): Congregation | null {
  const { role, congregation } = useAuth();
  const [override, setOverride] = useState<Congregation | null>(null);
  const [overrideId, setOverrideId] = useState<string | null>(() => getActiveCongregationOverride());

  useEffect(() => {
    const handler = () => setOverrideId(getActiveCongregationOverride());
    window.addEventListener(EVT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  useEffect(() => {
    if (role !== "superintendent" || !overrideId) { setOverride(null); return; }
    if (congregation?.id === overrideId) { setOverride(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("congregations").select("id,name,superintendent_id").eq("id", overrideId).maybeSingle();
      if (cancelled) return;
      setOverride(data ? { ...(data as Omit<Congregation, "invite_code">), invite_code: "" } : null);
    })();
    return () => { cancelled = true; };
  }, [overrideId, role, congregation?.id]);

  if (role === "superintendent" && overrideId && override) return override;
  return congregation;
}
