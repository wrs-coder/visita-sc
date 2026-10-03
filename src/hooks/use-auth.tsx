import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isOfflineMode, setMode } from "@/lib/connection-mode";
import { clearOfflineSession, readOfflineSession, OFFLINE_SESSION_EVENT } from "@/lib/offline-session";
import { sameLocalDay } from "@/lib/local-day";
import { ensureLocalDataOwner } from "@/lib/local-owner";
import { clearVault, touchVaultOnline, updateVaultProfile } from "@/lib/offline-credentials";

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
  signOut: () => Promise<boolean>;
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
    // Isolamento por conta: se o dispositivo tinha dados de OUTRO usuário,
    // apaga todo o cache derivado da nuvem antes de hidratar qualquer coisa.
    let switchedAccount = false;
    try { switchedAccount = await ensureLocalDataOwner(uid); } catch { /* noop */ }
    if (switchedAccount) {
      setProfile(null); setRole(null); setElderPosition(null); setCongregation(null);
    }
    // Offline-first: se a preparação diária já foi concluída, hidrata do
    // snapshot local mesmo estando online, sem tocar no banco em cada abertura.
    const hydrated = switchedAccount ? false : hydrateCachedUserData(uid);
    if (!switchedAccount && (isOfflineMode() || (hydrated && isWarmupFreshForUser(uid)))) {
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
    const snapshot = { profile: p ?? null, role: newRole, elderPosition: newPosition, congregation: newCong };
    try {
      localStorage.setItem(PROFILE_CACHE_KEY(uid), JSON.stringify(snapshot));
    } catch { /* quota */ }
    // Mantém o retrato guardado no cofre offline em dia (quando existir).
    void updateVaultProfile(snapshot, uid).catch(() => undefined);
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
    // Sem sessão do servidor, mas com o cofre offline aberto neste aparelho:
    // reconhece o usuário a partir do retrato local já baixado.
    const enterOfflineSession = (): boolean => {
      const local = readOfflineSession();
      if (!local || !getCachedUserData(local.userId)) return false;
      setMode("offline");
      setSession(null);
      setUser({
        id: local.userId,
        email: local.email ?? undefined,
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date(local.at).toISOString(),
      } as User);
      hydrateCachedUserData(local.userId);
      setLoading(false);
      return true;
    };
    const onOfflineSession = () => { enterOfflineSession(); };
    window.addEventListener(OFFLINE_SESSION_EVENT, onOfflineSession);

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!s && enterOfflineSession()) return;
      setSession(s);
      setUser(s?.user ?? null);
      // Renova o prazo do acesso offline sempre que há sessão válida.
      if (s?.access_token && s.refresh_token && s.user && !isOfflineMode()) {
        void touchVaultOnline(
          { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at ?? null },
          s.user.id,
        ).catch(() => undefined);
      }
      loadUserData(s?.user?.id).finally(() => setLoading(false));
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener(OFFLINE_SESSION_EVENT, onOfflineSession);
    };
  }, []);

  const refresh = async () => { await loadUserData(user?.id); };
  const signOut = async (): Promise<boolean> => {
    const online = typeof navigator === "undefined" || navigator.onLine !== false;
    // Sem internet, NUNCA executar logout — o usuário não conseguiria voltar.
    if (isOfflineMode() && !online) {
      try {
        toast.warning(i18n.t("connection.cannotLogoutOffline"));
      } catch { /* noop */ }
      return false;
    }
    // Com internet: desliga o Modo Offline (ex.: ligado pela entrada via PIN)
    // e tenta enviar alterações pendentes antes de sair.
    if (isOfflineMode()) setMode("online");
    try {
      const { flushQueue } = await import("@/lib/offline-queue");
      await flushQueue();
    } catch { /* segue com a saída */ }
    try { sessionStorage.setItem("visita-sc:logout-intent", "1"); } catch { /* noop */ }
    try { await clearVault(); } catch { /* noop */ }
    clearOfflineSession();
    try { await supabase.auth.signOut(); } catch { /* sessão local já limpa abaixo */ }
    // Entrada via PIN não tem sessão do servidor: limpa o estado manualmente.
    setSession(null); setUser(null);
    setProfile(null); setRole(null); setElderPosition(null); setCongregation(null);
    setLoading(false);
    return true;
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
