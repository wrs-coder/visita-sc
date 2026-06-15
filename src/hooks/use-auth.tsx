import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isOfflineMode } from "@/lib/connection-mode";
import { sameLocalDay } from "@/lib/local-day";
import i18n from "@/i18n";

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

type CachedAuthData = {
  profile: Profile | null;
  role: AppRole | null;
  elderPosition: ElderPosition | null;
  congregation: Congregation | null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [elderPosition, setElderPosition] = useState<ElderPosition | null>(null);
  const [congregation, setCongregation] = useState<Congregation | null>(null);
  const [loading, setLoading] = useState(true);

  const PROFILE_CACHE_KEY = (uid: string) => `visita-sc:auth-profile:${uid}`;

  const getCachedUserData = (uid: string): CachedAuthData | null => {
    try {
      const raw = localStorage.getItem(PROFILE_CACHE_KEY(uid));
      return raw ? (JSON.parse(raw) as CachedAuthData) : null;
    } catch {
      return null;
    }
  };

  const hydrateCachedUserData = (uid: string): boolean => {
    const cached = getCachedUserData(uid);
    if (!cached) return false;
    setProfile(cached.profile);
    setRole(cached.role);
    setElderPosition(cached.elderPosition);
    setCongregation(cached.congregation);
    return true;
  };

  const isWarmupFreshForUser = (uid: string): boolean => {
    try {
      const raw = localStorage.getItem("visita-sc:last-warmup");
      if (!raw) return false;
      const s = JSON.parse(raw) as { at?: number; userId?: string | null };
      if (s.userId && s.userId !== uid) return false;
      return sameLocalDay(s.at);
    } catch {
      return false;
    }
  };

  const hasFreshAuthSnapshot = (uid?: string | null): boolean => {
    if (!uid) return false;
    return isWarmupFreshForUser(uid) && !!getCachedUserData(uid);
  };

  const loadUserData = async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null); setRole(null); setElderPosition(null); setCongregation(null);
      return;
    }
    // Offline-first: se a preparação diária já foi concluída, hidrata do
    // snapshot local mesmo estando online, sem tocar no banco em cada abertura.
    const hydrated = hydrateCachedUserData(uid);
    if (isOfflineMode() || (hydrated && isWarmupFreshForUser(uid))) {
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
      // Missão 05A — Persistência absoluta de sessão.
      // Em Modo Offline: ignora qualquer evento que não seja SIGNED_IN.
      if (isOfflineMode() && event !== "SIGNED_IN") return;

      // Ignora eventos "ruidosos" que não mudam identidade do usuário —
      // TOKEN_REFRESHED ocorre a cada ~1h e no foco da aba; INITIAL_SESSION
      // dispara a cada montagem do listener. A sessão já está estável.
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") return;

      // SIGNED_OUT que NÃO veio do botão "Sair" (refresh-token recusado por
      // flutuação de rede, 401 de uma chamada qualquer): NUNCA derruba a
      // sessão local. Preserva o estado atual e loga para diagnose.
      if (event === "SIGNED_OUT") {
        const deliberate = sessionStorage.getItem("visita-sc:logout-intent") === "1";
        if (!deliberate) {
          console.warn("[auth] SIGNED_OUT não deliberado ignorado — sessão preservada");
          return;
        }
        sessionStorage.removeItem("visita-sc:logout-intent");
      }

      setSession(s);
      setUser(s?.user ?? null);
      if (event === "SIGNED_IN") {
        if (!hasFreshAuthSnapshot(s?.user?.id)) setLoading(true);
        setTimeout(() => {
          loadUserData(s?.user?.id).finally(() => setLoading(false));
        }, 0);
      } else if (event === "USER_UPDATED") {
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
    // conseguirá voltar a entrar (primeiro login exige rede).
    if (isOfflineMode()) {
      try {
        toast.warning(i18n.t("connection.cannotLogoutOffline"));
      } catch { /* noop */ }
      return;
    }
    // Marca intenção deliberada — o listener acima usa esta flag para
    // distinguir um logout real do botão "Sair" de um SIGNED_OUT espúrio
    // disparado por refresh-token vencido.
    try { sessionStorage.setItem("visita-sc:logout-intent", "1"); } catch { /* noop */ }
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
