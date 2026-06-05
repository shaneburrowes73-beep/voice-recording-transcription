/**
 * lib/workspace-auth.ts
 * Supabase Auth client for the generic customer workspace.
 * Uses the dedicated voice-transcript-platform project (ncaczdtftyogsgxzburu),
 * same as the police app — different org slug, same infrastructure.
 */
'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url  = process.env.NEXT_PUBLIC_CLIENT_SUPABASE_URL  || '';
const anon = process.env.NEXT_PUBLIC_CLIENT_SUPABASE_ANON_KEY || '';

// Singleton — reused across the workspace
let _client: SupabaseClient | null = null;
export function getWorkspaceClient(): SupabaseClient {
  if (!_client) _client = createClient(url, anon);
  return _client;
}

export interface WorkspaceUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  orgId: string;
  orgName: string;
  isSupervisor: boolean;
  isAdmin: boolean;
}

export async function getCurrentUser(): Promise<WorkspaceUser | null> {
  const sb = getWorkspaceClient();
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return null;

  const { data: profile } = await sb
    .from('user_profiles')
    .select('full_name, role, org_id, organisations(name)')
    .eq('id', session.user.id)
    .single();

  if (!profile) return null;

  const { data: roleData } = await sb
    .from('roles')
    .select('is_supervisor, is_admin')
    .eq('org_id', profile.org_id)
    .eq('name', profile.role)
    .single();

  return {
    id: session.user.id,
    email: session.user.email || '',
    fullName: profile.full_name,
    role: profile.role,
    orgId: profile.org_id,
    orgName: (profile as any).organisations?.name || 'Voice Transcript',
    isSupervisor: roleData?.is_supervisor || false,
    isAdmin: roleData?.is_admin || false,
  };
}

export async function signIn(email: string, password: string) {
  const sb = getWorkspaceClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signUp(opts: {
  email: string;
  password: string;
  fullName: string;
  role: string;
  orgSlug?: string;
}) {
  const sb = getWorkspaceClient();

  // Resolve org
  const { data: org, error: orgErr } = await sb
    .from('organisations')
    .select('id, name')
    .eq('slug', opts.orgSlug || 'trial')
    .single();

  if (orgErr || !org) throw new Error('Organisation not found');

  // Create auth user
  const { data, error } = await sb.auth.signUp({
    email: opts.email,
    password: opts.password,
    options: { data: { fullName: opts.fullName, role: opts.role, orgSlug: opts.orgSlug || 'trial' } },
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Sign-up failed');

  // Create profile row
  const { error: profileErr } = await sb
    .from('user_profiles')
    .insert({ id: data.user.id, org_id: org.id, full_name: opts.fullName, role: opts.role });

  if (profileErr) console.error('Profile insert error:', profileErr.message);

  return data.user;
}

export async function signOut() {
  await getWorkspaceClient().auth.signOut();
}
