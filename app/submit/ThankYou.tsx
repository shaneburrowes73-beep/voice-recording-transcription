'use client';

import React, { useEffect, useState, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type TranscriptStatus = 'pending' | 'processing' | 'done' | 'failed';

interface SubmissionData {
  transcript_status: TranscriptStatus;
  corrected_transcript: string | null;
  transcript_edited: string | null;
  transcribed_at: string | null;
}

// ─── How long to poll before giving up (ms) ───────────────────────────────────
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS  = 120000; // 2 minutes

// ─── ThankYou ─────────────────────────────────────────────────────────────────
export function ThankYou({
  submissionId,
  onSubmitAnother,
}: {
  submissionId: string;
  onSubmitAnother: () => void;
}) {
  const [status, setStatus]         = useState<TranscriptStatus>('processing');
  const [transcript, setTranscript] = useState<string>('');
  const [editText, setEditText]     = useState<string>('');
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [timedOut, setTimedOut]     = useState(false);
  const pollRef                     = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef                    = useRef(Date.now());

  // ── Poll /api/submissions/status until done or failed ──────────────────────
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;

      // Time-out guard
      if (Date.now() - startRef.current > POLL_TIMEOUT_MS) {
        clearInterval(pollRef.current!);
        setTimedOut(true);
        setStatus('failed');
        return;
      }

      try {
        const res = await fetch(`/api/submissions/status?id=${submissionId}`);
        if (!res.ok) return;
        const data: SubmissionData = await res.json();

        if (cancelled) return;
        setStatus(data.transcript_status);

        if (data.transcript_status === 'done') {
          clearInterval(pollRef.current!);
          const text = data.transcript_edited || data.corrected_transcript || '';
          setTranscript(text);
          setEditText(text);
        }

        if (data.transcript_status === 'failed') {
          clearInterval(pollRef.current!);
        }
      } catch {
        // Network hiccup — keep polling
      }
    };

    // Kick off immediately, then every POLL_INTERVAL_MS
    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(pollRef.current!);
    };
  }, [submissionId]);

  // ── Save edited transcript ──────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: submissionId, transcript_edited: editText }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  // ── Shared styles ───────────────────────────────────────────────────────────
  const S = {
    wrap: {
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    } as React.CSSProperties,
    tick: {
      fontSize: 48,
      marginBottom: 16,
      color: '#059669',
      lineHeight: 1,
    } as React.CSSProperties,
    h2: {
      marginTop: 0,
      fontSize: 26,
      color: '#111827',
      marginBottom: 8,
      fontWeight: 700,
    } as React.CSSProperties,
    sub: {
      color: '#6b7280',
      fontSize: 15,
      lineHeight: 1.6,
      marginBottom: 20,
    } as React.CSSProperties,
    refBox: {
      background: '#f3f4f6',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: '10px 14px',
      marginBottom: 28,
      textAlign: 'left' as const,
    } as React.CSSProperties,
    refLabel: {
      fontSize: 11,
      color: '#9ca3af',
      marginBottom: 4,
      letterSpacing: '0.05em',
      textTransform: 'uppercase' as const,
    } as React.CSSProperties,
    refId: {
      fontFamily: 'monospace',
      fontSize: 13,
      color: '#374151',
      wordBreak: 'break-all' as const,
    } as React.CSSProperties,
    sectionLabel: {
      fontSize: 13,
      fontWeight: 600,
      color: '#374151',
      marginBottom: 8,
      display: 'block',
    } as React.CSSProperties,
    textarea: {
      width: '100%',
      boxSizing: 'border-box' as const,
      border: '1px solid #d1d5db',
      borderRadius: 8,
      padding: '12px 14px',
      fontSize: 14,
      lineHeight: 1.7,
      color: '#111827',
      background: '#fff',
      resize: 'vertical' as const,
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      outline: 'none',
      marginBottom: 12,
    } as React.CSSProperties,
    saveBtn: (active: boolean) => ({
      padding: '10px 22px',
      background: active ? '#1d4ed8' : '#9ca3af',
      color: '#fff',
      border: 'none',
      borderRadius: 6,
      cursor: active ? 'pointer' : 'not-allowed',
      fontWeight: 600,
      fontSize: 14,
      marginRight: 12,
      transition: 'background 0.2s',
    } as React.CSSProperties),
    anotherBtn: {
      padding: '10px 22px',
      background: '#dc2626',
      color: '#fff',
      border: 'none',
      borderRadius: 6,
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: 14,
      transition: 'background 0.2s',
    } as React.CSSProperties,
    note: {
      fontSize: 13,
      color: '#6b7280',
      marginTop: 10,
      lineHeight: 1.5,
    } as React.CSSProperties,
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={S.wrap}>

      {/* ── Header ── */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={S.tick}>✓</div>
        <h2 style={S.h2}>Submission received!</h2>
        <p style={S.sub}>
          Your audio has been saved securely. We're now transcribing it — this usually takes under a minute.
        </p>
        <div style={S.refBox}>
          <div style={S.refLabel}>Reference ID</div>
          <div style={S.refId}>{submissionId}</div>
        </div>
      </div>

      {/* ── Transcript section ── */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24 }}>
