'use client';

import React, { useState } from 'react';
import { getWorkspaceClient } from '@/lib/workspace-auth';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { error: err } = await getWorkspaceClient().auth.resetPasswordForEmail(email, {
        redirectTo: 'https://voice-recording-transcription.vercel.app/reset-password/confirm',
      });
      if (err) throw new Error(err.message);
      setSent(true);
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
      <nav style={{ background: '#0f1f4b', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#0f1f4b' }}>AI</div>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>Voice Transcript</span>
        </a>
        <a href="/login" style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>← Back to sign in</a>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e6f0', borderRadius: 16, padding: '36px 32px', width: '100%', maxWidth: 400 }}>

          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔑</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f1f4b', marginBottom: 6 }}>Reset your password</h1>
            <p style={{ fontSize: 13, color: '#5a6480', lineHeight: 1.6 }}>
              Enter the email address on your account and we'll send you a reset link.
            </p>
          </div>

          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '20px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>✉️</div>
                <div style={{ fontWeight: 700, color: '#166534', marginBottom: 6 }}>Check your email</div>
                <div style={{ fontSize: 13, color: '#15803d', lineHeight: 1.6 }}>
                  We've sent a password reset link to <strong>{email}</strong>. It expires in 1 hour.
                </div>
              </div>
              <a href="/login" style={{ color: '#0f1f4b', fontSize: 13, fontWeight: 600, textDecoration: 'underline' }}>Back to sign in</a>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Email address</label>
                <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
              </div>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#b91c1c' }}>{error}</div>
              )}

              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '13px 0', background: loading ? '#9ca3af' : '#0f1f4b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', marginBottom: 16 }}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>

              <p style={{ textAlign: 'center', fontSize: 13, color: '#5a6480' }}>
                Remembered it?{' '}
                <a href="/login" style={{ color: '#0f1f4b', fontWeight: 600, textDecoration: 'underline' }}>Sign in</a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
