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

// ─── Team management helpers ──────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  created_at: string;
  last_active: string | null;
}

export async function getTeamMembers(orgId: string): Promise<TeamMember[]> {
  const sb = getWorkspaceClient();
  // Join user_profiles with auth.users via RPC (service role needed for email)
  // We expose email via a safe view — fall back to profile data only
  const { data } = await sb
    .from('user_profiles')
    .select('id, full_name, role, status, created_at, last_active')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });
  return (data || []).map((p: any) => ({
    id: p.id,
    email: '',            // email not exposed via RLS — shown as placeholder
    full_name: p.full_name,
    role: p.role,
    status: p.status,
    created_at: p.created_at,
    last_active: p.last_active,
  }));
}

export async function updateMemberRole(memberId: string, newRole: string): Promise<void> {
  const sb = getWorkspaceClient();
  const { error } = await sb
    .from('user_profiles')
    .update({ role: newRole })
    .eq('id', memberId);
  if (error) throw new Error(error.message);
}

export async function getOrgStats(orgId: string) {
  const sb = getWorkspaceClient();
  const [transcripts, members] = await Promise.all([
    sb.from('transcripts').select('status').eq('org_id', orgId),
    sb.from('user_profiles').select('id').eq('org_id', orgId),
  ]);
  const rows = transcripts.data || [];
  return {
    total:    rows.length,
    pending:  rows.filter(r => r.status === 'Pending').length,
    approved: rows.filter(r => r.status === 'Approved').length,
    rejected: rows.filter(r => r.status === 'Rejected').length,
    saved:    rows.filter(r => r.status === 'Saved').length,
    members:  (members.data || []).length,
  };
}

export async function generateInviteLink(orgSlug: string): Promise<string> {
  // Returns a pre-filled registration link — no magic-link email needed for MVP
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://voice-recording-transcription.vercel.app';
  return `${base}/login?org=${orgSlug}&invite=1`;
}
