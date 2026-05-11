'use client';

// =============================================================================
// FeedbackForm.tsx — universal component, identical across all 4 feedback projects
// =============================================================================
// Drop at: components/FeedbackForm.tsx in each project repo.
// Also requires: lib/sendNotification.ts (universal helper).
// Per-project config is in app/feedback/page.tsx (questions + table + name).
// =============================================================================

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { sendFeedbackNotification } from '@/lib/sendNotification';

export interface SmartQuestion {
  key: string;
  label: string;
}

export interface FeedbackFormProps {
  artifactName: string;
  tableName: string;
  questions: [SmartQuestion, SmartQuestion, SmartQuestion];
}

export default function FeedbackForm({ artifactName, tableName, questions }: FeedbackFormProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [email, setEmail] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleScore(qKey: string, value: number) {
    setAnswers({ ...answers, [qKey]: value });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || Object.keys(answers).length < 3) {
      setError('Please answer all 3 questions and provide your email');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      // Lazy-instantiate supabase client at submit time (not module load)
      // so that build-time pre-rendering doesn't fail when env vars aren't yet injected.
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      // Upsert tester (RLS-safe: avoids SELECT which requires auth)
      const { data: tester, error: testerErr } = await supabase
        .from('tester_users')
        .upsert(
          { email, role: 'tester', status: 'active' },
          { onConflict: 'email', ignoreDuplicates: false }
        )
        .select('id')
        .single();

      if (testerErr || !tester) {
        throw new Error('Could not register tester: ' + (testerErr?.message || 'unknown'));
      }
      const testerId = tester.id;

      // Compute scores — column type is numeric(3,2). Store Likert 1-10 directly.
      const [q1Val, q2Val, q3Val] = questions.map((q) => answers[q.key] || 0);
      const usability = q1Val;
      const compliance = q2Val;
      const valueAdd = q3Val;
      const composite = 0.4 * compliance + 0.4 * usability + 0.2 * valueAdd;
      const ragScore: 'GREEN' | 'AMBER' | 'RED' =
        composite >= 8.0 ? 'GREEN' : composite >= 6.0 ? 'AMBER' : 'RED';

      // Insert feedback row
      const insertRow: Record<string, unknown> = {
        tester_id: testerId,
        general_feedback: comment,
        compliance_score: compliance,
        usability_score: usability,
        value_add_score: valueAdd,
        rag_score: ragScore,
        status: 'submitted',
      };
      questions.forEach((q) => {
        insertRow[q.key] = answers[q.key];
      });

      const { data: feedbackRow, error: feedbackErr } = await supabase
        .from(tableName)
        .insert(insertRow)
        .select('id')
        .single();

      if (feedbackErr) {
        throw new Error('Could not submit feedback: ' + feedbackErr.message);
      }

      // Fire-and-forget notification (uses lib/sendNotification helper)
      sendFeedbackNotification({
        tester_email: email,
        artifact_name: artifactName,
        rag_score: ragScore,
        status_change: 'submitted',
        feedback_id: feedbackRow?.id as string | undefined,
      });

      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div style={{ padding: 24, maxWidth: 560, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <h2 style={{ marginTop: 0 }}>Thanks — your feedback is recorded.</h2>
        <p>You will receive an email confirmation shortly.</p>
        <p>
          <a href="/feedback-status" style={{ color: '#1f2937' }}>
            View your feedback status →
          </a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ padding: 24, maxWidth: 560, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h2 style={{ marginTop: 0 }}>Feedback on {artifactName}</h2>
      <p style={{ color: '#6b7280' }}>3 quick questions on a 1-10 scale.</p>

      {questions.map((q, i) => (
        <div key={q.key} style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
            {i + 1}. {q.label}
          </label>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleScore(q.key, n)}
                style={{
                  flex: 1,
                  padding: 8,
                  border: '1px solid #d1d5db',
                  background: answers[q.key] === n ? '#1f2937' : '#fff',
                  color: answers[q.key] === n ? '#fff' : '#111',
                  cursor: 'pointer',
                  borderRadius: 4,
                  fontFamily: 'inherit',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
          Anything else? (optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: 8,
            border: '1px solid #d1d5db',
            borderRadius: 4,
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
          Your email (required, for follow-up)
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: '100%',
            padding: 8,
            border: '1px solid #d1d5db',
            borderRadius: 4,
            fontFamily: 'inherit',
          }}
        />
      </div>

      {error && (
        <div
          style={{
            padding: 10,
            background: '#fee2e2',
            color: '#b91c1c',
            borderRadius: 4,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: '10px 16px',
          background: '#1f2937',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontWeight: 500,
          fontFamily: 'inherit',
        }}
      >
        {submitting ? 'Submitting…' : 'Submit feedback'}
      </button>
    </form>
  );
}
