import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  if (localStorage.getItem(KEY) === id) return;
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
  const { role, congregation, user } = useAuth();
  const [overrideId, setOverrideId] = useState<string | null>(() =>
    getActiveCongregationOverride(),
  );

  useEffect(() => {
    const handler = () => setOverrideId(getActiveCongregationOverride());
    window.addEventListener(EVT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const shouldFetchOverride =
    role === "superintendent" && !!overrideId && congregation?.id !== overrideId;

  const { data: override } = useQuery({
    queryKey: ["congregations", "byId", overrideId],
    enabled: shouldFetchOverride,
    queryFn: async () => {
      const { data } = await supabase
        .from("congregations")
        .select("id,name,superintendent_id")
        .eq("id", overrideId!)
        .maybeSingle();
      return data
        ? ({ ...(data as Omit<Congregation, "invite_code">), invite_code: "" } as Congregation)
        : null;
    },
  });

  const { data: firstSuperCongregation } = useQuery({
    queryKey: ["congregations", "firstSuperintendentFallback", user?.id],
    enabled: role === "superintendent" && !!user?.id && !overrideId,
    queryFn: async () => {
      const { data } = await supabase
        .from("congregations")
        .select("id,name,superintendent_id,is_active")
        .order("name")
        .limit(1)
        .maybeSingle();
      return data
        ? ({ ...(data as Omit<Congregation, "invite_code">), invite_code: "" } as Congregation)
        : null;
    },
  });

  if (role === "superintendent") {
    if (overrideId) return override ?? null;
    return firstSuperCongregation ?? null;
  }
  return congregation;
}
