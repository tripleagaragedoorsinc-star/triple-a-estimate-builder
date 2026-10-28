import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { fetchMember } from "@/lib/data";
import { mockMembers } from "@/lib/mockData";
import type { AuthSession, UserRole } from "@/types";

interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  isMock: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  isRecovery: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const hasRecoveryHash = window.location.hash.includes("type=recovery");

    supabase.auth.getSession().then(({ data }) => {
      if (hasRecoveryHash) {
        setIsRecovery(true);
        setLoading(false);
        return;
      }
      if (data.session?.user) {
        fetchMember(data.session.user.id)
          .then((member) => {
            if (member && member.active) {
              setSession({
                user_id: member.user_id,
                email: member.email,
                role: member.role,
                full_name: member.full_name,
              });
            }
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
        setLoading(false);
        return;
      }
      if (event === "SIGNED_OUT" || !s?.user) {
        setSession(null);
        setLoading(false);
        return;
      }
      if (supabase) {
        fetchMember(s.user.id)
          .then((member) => {
            if (member && member.active) {
              setSession({
                user_id: member.user_id,
                email: member.email,
                role: member.role,
                full_name: member.full_name,
              });
            } else {
              setSession(null);
              void supabase!.auth.signOut();
            }
          })
          .catch(() => setLoading(false));
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      const member = mockMembers.find((m) => m.email === email);
      if (member && member.active) {
        setSession({
          user_id: member.user_id,
          email: member.email,
          role: member.role,
          full_name: member.full_name,
        });
        return { error: null };
      }
      return { error: "Invalid credentials. Try avic@tripleagaragedoorsinc.com" };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    if (!supabase) {
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    if (!supabase) return { error: "Password reset is not available in demo mode." };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/",
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const updatePassword = async (password: string) => {
    if (!supabase) return { error: "Not available in demo mode." };
    if (password.length < 12) return { error: "Use at least 12 characters." };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
    setIsRecovery(false);
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{ session, loading, isMock: !isSupabaseConfigured, signIn, signOut, resetPassword, updatePassword, isRecovery }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useRole(): UserRole | null {
  return useAuth().session?.role ?? null;
}
