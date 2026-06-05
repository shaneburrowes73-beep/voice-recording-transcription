'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp, getWorkspaceClient } from '@/lib/workspace-auth';

type Mode = 'login' | 'register';

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^a-zA-Z\d]/.test(pw)) s++;
  return s;
}
const strengthLabel = ['', 'Weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
const strengthColor = ['', '#dc2626', '#dc2626', '#f59e0b', '#059669', '#065f46'];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState({ email: '', password: '', fullName: '', role: '' });
  const [roles, setRoles] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const pw = form.password;
  const pws = strength(pw);

  // Check if already logged in
  useEffect(() => {
    getWorkspaceClient().auth.getSession().then(({ data: { session } }) => {
      if (session?.user) router.replace('/workspace');
    });
    // Load roles for trial org
    getWorkspaceClient()
      .from('roles')
      .select('name, level')
      .eq('org_id', '9d74f7a9-b937-4a05-b69e-429cacffca37')
      .order('level', { ascending: true })
      .then(({ data }) => {
        if (data) setRoles(data.map((r: any) => r.name));
      });
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(form.email, form.password);
        router.push('/workspace');
      } else {
        if (!form.fullName.trim()) throw new Error('Full name is required');
        if (!form.role) throw new Error('Please select a role');
        if (pws < 2) throw new Error('Password is too weak');
        await signUp({ email: form.email, password: form.password, fullName: form.fullName, role: form.role });
        setSuccess('Account created! Check your email to confirm, then sign in.');
        setMode('login');
        setForm(f => ({ ...f, password: '', fullName: '', role: '' }));
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    }
    setLoading(false);
  };

  const inp: React.CSSProperties = {
    padding: '12px 14px', borderRadius: 10, border: '1px solid #e5e7eb',
    fontSize: 14, width: '100%', boxSizing: 'border-box',
    background: '#f9fafb', color: '#111', fontFamily: 'inherit', outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fc', fontFamily: '"Segoe UI", system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <nav style={{ background: '#0f1f4b', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#0f1f4b' }}>AI</div>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>Voice Transcript</span>
        </a>
        <a href="/try" style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>Try without account →</a>
      </nav>

      {/* Card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e6f0', borderRadius: 16, padding: '36px 32px', width: '100%', maxWidth: 420 }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#0f1f4b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 22 }}>🎙️</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f1f4b', marginBottom: 4 }}>
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </h1>
            <p style={{ fontSize: 13, color: '#5a6480' }}>
              {mode === 'login' ? 'Access your Voice Transcript workspace' : 'Join Voice Transcript — free trial'}
            </p>
          </div>

          {/* Toggle */}
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 10, padding: 4, marginBottom: 24, gap: 4 }}>
            {(['login', 'register'] as Mode[]).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: mode === m ? '#fff' : 'transparent', color: mode === m ? '#0f1f4b' : '#9ca3af', boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                {m === 'login' ? 'Sign in' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>

            {/* Register extras */}
            {mode === 'register' && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Full name *</label>
                  <input style={inp} type="text" value={form.fullName} onChange={set('fullName')} placeholder="Your full name" required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Role *</label>
                  <select style={{ ...inp, cursor: 'pointer' }} value={form.role} onChange={set('role')} required>
                    <option value="">Select your role…</option>
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Email *</label>
              <input style={inp} type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
            </div>

            {/* Password */}
            <div style={{ marginBottom: mode === 'register' ? 6 : 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Password *</label>
              <div style={{ position: 'relative' }}>
                <input style={{ ...inp, paddingRight: 44 }} type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'} required />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14 }}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Password strength */}
            {mode === 'register' && pw && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ height: 4, borderRadius: 4, background: '#e5e7eb', overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{ height: '100%', width: `${(pws / 5) * 100}%`, background: strengthColor[pws], transition: 'all 0.3s', borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: 11, color: strengthColor[pws], fontWeight: 600 }}>{strengthLabel[pws]}</div>
              </div>
            )}

            {/* Errors / success */}
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#b91c1c' }}>{error}</div>}
            {success && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#166534' }}>{success}</div>}

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '13px 0', background: loading ? '#9ca3af' : '#0f1f4b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', marginBottom: 16 }}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create free account'}
            </button>

            {mode === 'login' && (
              <p style={{ textAlign: 'center', fontSize: 13, color: '#5a6480' }}>
                Don't have an account?{' '}
                <button type="button" onClick={() => setMode('register')} style={{ background: 'none', border: 'none', color: '#0f1f4b', fontWeight: 600, cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>
                  Register free
                </button>
              </p>
            )}
          </form>

          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20, marginTop: 8, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#9ca3af' }}>
              Are you with the Barbados Police Force?{' '}
              <a href="/police" style={{ color: '#0f1f4b', fontWeight: 600, textDecoration: 'underline' }}>Sign in here →</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
