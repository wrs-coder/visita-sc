import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "superintendent" | "elder";
export type ElderPosition = "coordenador" | "secretario" | "sup_servico" | "corpo";

export const ELDER_POSITION_LABELS: Record<ElderPosition, string> = {
  coordenador: "Coordenador do corpo de anciãos",
  secretario: "Secretário",
  sup_servico: "Superintendente de Serviço",
  corpo: "Corpo de anciãos",
};

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  congregation_id: string | null;
}

export interface Congregation {
  id: string;
  name: string;
  invite_code: string;
  superintendent_id: string;
}

interface AuthContextValue {
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  elderPosition: ElderPosition | null;
  canEdit: boolean;
  congregation: Congregation | null;
  needsOnboarding: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [elderPosition, setElderPosition] = useState<ElderPosition | null>(null);
  const [congregation, setCongregation] = useState<Congregation | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null); setRole(null); setElderPosition(null); setCongregation(null);
      return;
    }
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role, congregation_id, elder_position").eq("user_id", uid).maybeSingle(),
    ]);
    setProfile(p as Profile | null);
    setRole((r?.role as AppRole) ?? null);
    setElderPosition(((r as { elder_position?: ElderPosition } | null)?.elder_position) ?? null);
    if (p?.congregation_id) {
      const { data: c } = await supabase.from("congregations")
        .select("id,name,superintendent_id")
        .eq("id", p.congregation_id).maybeSingle();
      // invite_code is hidden from non-owner clients; default to "" so the type stays stable
      setCongregation(c ? ({ ...(c as Omit<Congregation, "invite_code">), invite_code: "" }) : null);
    } else {
      setCongregation(null);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      // defer to avoid recursive deadlocks
      setTimeout(() => loadUserData(s?.user?.id), 0);
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      loadUserData(s?.user?.id).finally(() => setLoading(false));
    });
    return () => subscription.unsubscribe();
  }, []);

  const refresh = async () => { await loadUserData(user?.id); };
  const signOut = async () => { await supabase.auth.signOut(); };

  // Super may have role but no active congregation yet — that's NOT onboarding,
  // they go to /congregacoes to set one up. Elders must have a congregation AND a position.
  const needsOnboarding = !!user && (!role || (role === "elder" && (!profile?.congregation_id || !elderPosition)));

  const canEdit = role === "superintendent" ||
    (role === "elder" && elderPosition !== null && elderPosition !== "corpo");

  return (
    <AuthContext.Provider value={{ loading, user, session, profile, role, elderPosition, canEdit, congregation, needsOnboarding, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
