'use client';

// =============================================================================
// FeedbackStatus.tsx — universal component, identical across all 4 feedback projects
// =============================================================================
// Drop this file at: components/FeedbackStatus.tsx in each project repo.
// The per-project config is in app/feedback-status/page.tsx (artifact + table).
//
// IMPORTANT: This page CANNOT query Supabase directly with the anon key, because
// the SELECT RLS policy on feedback tables requires an authenticated user. So we
// call a server-side API on the ai-solutions dashboard that uses the service_role
// key to bypass RLS.
//
// Required env var on the project: NEXT_PUBLIC_DASHBOARD_API_URL
// =============================================================================

import { useState } from 'react';

interface FeedbackItem {
  id: string;
  created_at: string;
  rag_score?: string;
  compliance_score?: number;
  usability_score?: number;
  value_add_score?: number;
  general_feedback?: string;
  status?: string;
}

export interface FeedbackStatusProps {
  artifactName: string;
  tableName: string;
}

export default function FeedbackStatus({ artifactName, tableName }: FeedbackStatusProps) {
  const [email, setEmail] = useState('');
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [looked, setLooked] = useState(false);

  async function load() {
    if (!email) return;
    setLoading(true);
    setErr(null);
    try {
      const apiBase = process.env.NEXT_PUBLIC_DASHBOARD_API_URL?.replace('/artifacts', '');
      if (!apiBase) {
        throw new Error('NEXT_PUBLIC_DASHBOARD_API_URL is not set on this project');
      }
      const url = `${apiBase}/feedback-status?email=${encodeURIComponent(
        email
      )}&table=${encodeURIComponent(tableName)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Lookup failed (${res.status})`);
      }
      const data = await res.json();
      setItems((data.items as FeedbackItem[]) || []);
      setLooked(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Lookup failed');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 720, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h2 style={{ marginTop: 0 }}>Your feedback on {artifactName}</h2>
      <p style={{ color: '#6b7280' }}>Enter the email you used to submit feedback.</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          onKeyDown={(e) => {
            if (e.key === 'Enter') load();
          }}
          style={{
            flex: 1,
            padding: 8,
            border: '1px solid #d1d5db',
            borderRadius: 4,
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={load}
          disabled={loading || !email}
          style={{
            padding: '8px 16px',
            background: '#1f2937',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: loading || !email ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            fontWeight: 500,
          }}
        >
          {loading ? 'Loading…' : 'Look up'}
        </button>
      </div>

      {err && (
        <div
          style={{
            padding: 10,
            background: '#fee2e2',
            color: '#b91c1c',
            borderRadius: 4,
            marginBottom: 12,
          }}
        >
          {err}
        </div>
      )}

      {looked && items.length === 0 && !err && (
        <p>
          No feedback found for that email.{' '}
          <a href="/feedback" style={{ color: '#1f2937' }}>
            Submit feedback →
          </a>
        </p>
      )}

      {items.map((item) => {
        const ragColors =
          item.rag_score === 'GREEN'
            ? { bg: '#dcfce7', fg: '#15803d' }
            : item.rag_score === 'AMBER'
            ? { bg: '#fef3c7', fg: '#b45309' }
            : { bg: '#fee2e2', fg: '#b91c1c' };
        return (
          <div
            key={item.id}
            style={{
              padding: 16,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>Submitted {new Date(item.created_at).toLocaleDateString()}</strong>
              {item.rag_score && (
                <span
                  style={{
                    padding: '2px 10px',
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 600,
                    background: ragColors.bg,
                    color: ragColors.fg,
                  }}
                >
                  {item.rag_score}
                </span>
              )}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                marginBottom: 8,
              }}
            >
              <div>
                <small style={{ color: '#6b7280' }}>Compliance</small>
                <br />
                <strong>{item.compliance_score?.toFixed(1) ?? '—'}/10</strong>
              </div>
              <div>
                <small style={{ color: '#6b7280' }}>Usability</small>
                <br />
                <strong>{item.usability_score?.toFixed(1) ?? '—'}/10</strong>
              </div>
              <div>
                <small style={{ color: '#6b7280' }}>Value-add</small>
                <br />
                <strong>{item.value_add_score?.toFixed(1) ?? '—'}/10</strong>
              </div>
            </div>
            {item.general_feedback && (
              <p style={{ fontSize: 14, color: '#374151' }}>{item.general_feedback}</p>
            )}
            <div style={{ fontSize: 12, color: '#6b7280' }}>Status: {item.status ?? '—'}</div>
          </div>
        );
      })}
    </div>
  );
}
