import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isOfflineMode } from "@/lib/connection-mode";

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
  circuit: string | null;
}

export interface Congregation {
  id: string;
  name: string;
  invite_code: string;
  superintendent_id: string;
  is_active?: boolean;
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

  const PROFILE_CACHE_KEY = (uid: string) => `visita-sc:auth-profile:${uid}`;

  const loadUserData = async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null); setRole(null); setElderPosition(null); setCongregation(null);
      return;
    }
    // Em Modo Offline: hidrata exclusivamente do cache local (sem rede).
    if (isOfflineMode()) {
      try {
        const raw = localStorage.getItem(PROFILE_CACHE_KEY(uid));
        if (raw) {
          const cached = JSON.parse(raw) as {
            profile: Profile | null;
            role: AppRole | null;
            elderPosition: ElderPosition | null;
            congregation: Congregation | null;
          };
          setProfile(cached.profile);
          setRole(cached.role);
          setElderPosition(cached.elderPosition);
          setCongregation(cached.congregation);
        }
      } catch { /* noop */ }
      return;
    }
    const [{ data: p }, { data: rs }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role, congregation_id, elder_position").eq("user_id", uid).order("created_at", { ascending: true }).limit(5),
    ]);
    setProfile(p as Profile | null);
    // Pick the most privileged role (superintendent over elder) to be resilient to duplicate rows.
    const roles = (rs ?? []) as Array<{ role: AppRole; congregation_id: string | null; elder_position: ElderPosition | null }>;
    const r = roles.find((x) => x.role === "superintendent") ?? roles[0] ?? null;
    const newRole = (r?.role as AppRole) ?? null;
    const newPosition = (r?.elder_position as ElderPosition | null) ?? null;
    setRole(newRole);
    setElderPosition(newPosition);
    let newCong: Congregation | null = null;
    if (p?.congregation_id) {
      const { data: c } = await supabase.from("congregations")
        .select("id,name,superintendent_id,is_active")
        .eq("id", p.congregation_id).maybeSingle();
      // invite_code is hidden from non-owner clients; default to "" so the type stays stable
      newCong = c ? ({ ...(c as Omit<Congregation, "invite_code">), invite_code: "" }) : null;
    }
    setCongregation(newCong);
    // Snapshot do estado de auth para hidratar em Modo Offline.
    try {
      localStorage.setItem(PROFILE_CACHE_KEY(uid), JSON.stringify({
        profile: p ?? null, role: newRole, elderPosition: newPosition, congregation: newCong,
      }));
    } catch { /* quota */ }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      // Em Modo Offline, ignoramos qualquer evento que possa derrubar a
      // sessão (TOKEN_REFRESHED falho, SIGNED_OUT por token expirado).
      // Só SIGNED_IN é processado (login manual).
      if (isOfflineMode() && event !== "SIGNED_IN") return;
      setSession(s);
      setUser(s?.user ?? null);
      // Em SIGNED_IN reentramos no estado "carregando" para que a UI não
      // avalie needsOnboarding com role/congregation desatualizados — isso
      // causava o card de onboarding piscar logo após login/cadastro.
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        setLoading(true);
        setTimeout(() => {
          loadUserData(s?.user?.id).finally(() => setLoading(false));
        }, 0);
      } else {
        setTimeout(() => loadUserData(s?.user?.id), 0);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      loadUserData(s?.user?.id).finally(() => setLoading(false));
    });
    return () => subscription.unsubscribe();
  }, []);

  const refresh = async () => { await loadUserData(user?.id); };
  const signOut = async () => {
    // Em Modo Offline, NUNCA executar logout — sem internet, o usuário não
    // conseguirá voltar a entrar (primeiro login exige rede). Bloqueia tanto
    // tentativas manuais quanto qualquer caminho que chame signOut.
    if (isOfflineMode()) {
      try {
        const { toast } = await import("sonner");
        const { default: i18n } = await import("@/i18n");
        toast.warning(i18n.t("connection.cannotLogoutOffline"));
      } catch { /* noop */ }
      return;
    }
    await supabase.auth.signOut();
  };

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
