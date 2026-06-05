'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getWorkspaceClient } from '@/lib/workspace-auth';

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
const strengthColor  = ['', '#dc2626', '#dc2626', '#f59e0b', '#059669', '#065f46'];

export default function ResetPasswordConfirmPage() {
  const router = useRouter();
  const [password, setPassword]   = useState('');
  const [confirm,  setConfirm]    = useState('');
  const [showPw,   setShowPw]     = useState(false);
  const [loading,  setLoading]    = useState(false);
  const [error,    setError]      = useState('');
  const [done,     setDone]       = useState(false);
  const [ready,    setReady]      = useState(false);

  const pws = strength(password);

  // Supabase sends the recovery token via URL hash — the client picks it up
  // automatically via onAuthStateChange with event = PASSWORD_RECOVERY
  useEffect(() => {
    const sb = getWorkspaceClient();
    const { data: { subscription } } = sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (pws < 2) { setError('Password is too weak. Use at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const { error: err } = await getWorkspaceClient().auth.updateUser({ password });
      if (err) throw new Error(err.message);
      setDone(true);
      setTimeout(() => router.replace('/workspace'), 2500);
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
      <nav style={{ background: '#0f1f4b', padding: '14px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#0f1f4b' }}>AI</div>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>Voice Transcript</span>
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e6f0', borderRadius: 16, padding: '36px 32px', width: '100%', maxWidth: 400 }}>

          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f1f4b', marginBottom: 6 }}>Set new password</h1>
            <p style={{ fontSize: 13, color: '#5a6480' }}>Choose a strong password for your account.</p>
          </div>

          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '20px 16px' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
                <div style={{ fontWeight: 700, color: '#166534', marginBottom: 4 }}>Password updated</div>
                <div style={{ fontSize: 13, color: '#15803d' }}>Taking you to your workspace…</div>
              </div>
            </div>
          ) : !ready ? (
            <div style={{ textAlign: 'center', color: '#5a6480', fontSize: 14, padding: '20px 0' }}>
              Verifying reset link…
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>New password</label>
                <div style={{ position: 'relative' }}>
                  <input style={{ ...inp, paddingRight: 44 }} type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" required autoFocus />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14 }}>
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
                {password && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ height: 4, borderRadius: 4, background: '#e5e7eb', overflow: 'hidden', marginBottom: 3 }}>
                      <div style={{ height: '100%', width: `${(pws / 5) * 100}%`, background: strengthColor[pws], transition: 'all 0.3s', borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 11, color: strengthColor[pws], fontWeight: 600 }}>{strengthLabel[pws]}</div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Confirm password</label>
                <input style={{ ...inp, borderColor: confirm && confirm !== password ? '#fca5a5' : '#e5e7eb' }} type={showPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password" required />
                {confirm && confirm !== password && (
                  <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>Passwords do not match</div>
                )}
              </div>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#b91c1c' }}>{error}</div>
              )}

              <button type="submit" disabled={loading || pws < 2 || password !== confirm}
                style={{ width: '100%', padding: '13px 0', background: loading || pws < 2 || password !== confirm ? '#9ca3af' : '#0f1f4b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading || pws < 2 || password !== confirm ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Updating…' : 'Set new password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
