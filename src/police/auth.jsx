'use client';
/**
 * auth.jsx — Police app authentication via Supabase Auth.
 *
 * Replaces the previous custom JWT / Neon implementation.
 * User metadata (fullName, badgeNo, role, orgSlug) is stored in
 * Supabase Auth's user_metadata at sign-up time.
 *
 * After login, the org record is fetched from the `organisations` table
 * using the orgSlug stored in user_metadata.
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const AuthCtx = createContext(null);

async function fetchOrg(orgSlug) {
  if (!orgSlug) return null;
  const { data } = await supabase
    .from('organisations')
    .select('*')
    .eq('slug', orgSlug)
    .single();
  return data || null;
}

function userFromSupabase(sbUser) {
  if (!sbUser) return null;
  const m = sbUser.user_metadata || {};
  return {
    id:       sbUser.id,
    email:    sbUser.email,
    fullName: m.fullName  || m.full_name  || sbUser.email,
    badgeNo:  m.badgeNo   || m.badge_no   || '',
    role:     m.role      || 'Field Officer',
    orgSlug:  m.orgSlug   || 'barbados-police',
  };
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [org,     setOrg]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const u = userFromSupabase(session.user);
        const o = await fetchOrg(u.orgSlug);
        setUser(u); setOrg(o);
      }
      setLoading(false);
    });

    // Keep state in sync with Supabase session changes (tab focus, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const u = userFromSupabase(session.user);
          const o = await fetchOrg(u.orgSlug);
          setUser(u); setOrg(o);
        } else {
          setUser(null); setOrg(null);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const u = userFromSupabase(data.user);
    const o = await fetchOrg(u.orgSlug);
    setUser(u); setOrg(o);
    return { user: u, org: o };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null); setOrg(null);
  };

  const register = async ({ fullName, badgeNo, email, password, role, orgSlug = 'barbados-police' }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { fullName, badgeNo, role, orgSlug },
        // emailRedirectTo not needed for police intranet — disable email confirmation
        // in Supabase dashboard: Auth → Settings → Disable email confirmations
      },
    });
    if (error) throw new Error(error.message);
    return data;
  };

  return (
    <AuthCtx.Provider value={{ user, org, loading, login, logout, register }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
