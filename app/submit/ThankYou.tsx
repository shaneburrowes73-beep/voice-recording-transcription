'use client';

import React, { useEffect, useState, useRef } from 'react';

type TranscriptStatus = 'pending' | 'processing' | 'done' | 'failed';

interface SubmissionData {
  transcript_status: TranscriptStatus;
  corrected_transcript: string | null;
  transcript_edited: string | null;
  transcribed_at: string | null;
}

const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS  = 120000;

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
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
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
        // network hiccup — keep polling
      }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(pollRef.current!);
    };
  }, [submissionId]);

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

  const base: React.CSSProperties = {
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  };

  const saveBtnStyle: React.CSSProperties = {
    padding: '10px 22px',
    background: (!saving && editText !== transcript) ? '#1d4ed8' : '#9ca3af',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: (!saving && editText !== transcript) ? 'pointer' : 'not-allowed',
    fontWeight: 600,
    fontSize: 14,
    transition: 'background 0.2s',
  };

  const anotherBtnStyle: React.CSSProperties = {
    padding: '10px 22px',
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    transition: 'background 0.2s',
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    padding: '12px 14px',
    fontSize: 14,
    lineHeight: 1.7,
    color: '#111827',
    background: '#fff',
    resize: 'vertical',
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    outline: 'none',
    marginBottom: 12,
  };

  return (
    <div style={base}>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 16, color: '#059669', lineHeight: 1 }}>✓</div>
        <h2 style={{ marginTop: 0, fontSize: 26, color: '#111827', marginBottom: 8, fontWeight: 700 }}>
          Submission received!
        </h2>
        <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>
          Your audio has been saved securely. We're now transcribing it — this usually takes under a minute.
        </p>
        <div style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', marginBottom: 28, textAlign: 'left' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Reference ID</div>
          <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#374151', wordBreak: 'break-all' }}>{submissionId}</div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24 }}>

        {(status === 'pending' || status === 'processing') && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚡</div>
            <div style={{ color: '#374151', fontWeight: 600, marginBottom: 6 }}>Transcribing your audio…</div>
            <div style={{ color: '#9ca3af', fontSize: 14 }}>This page will update automatically. Please keep it open.</div>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 6 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: '50%', background: '#d1d5db',
                  animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
            <style>{`@keyframes pulse { 0%,80%,100%{opacity:0.3;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }`}</style>
          </div>
        )}

        {status === 'done' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 18, color: '#059669' }}>✓</span>
              <span style={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>Transcript ready</span>
              <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>— please review and correct any errors below</span>
            </div>

            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'block' }}>
              Your transcript
            </label>
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              rows={10}
              style={textareaStyle}
              placeholder="Transcript will appear here…"
            />

            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 10, lineHeight: 1.5 }}>
              Whisper has applied Barbadian dialect corrections automatically. Please read through and fix anything that doesn't look right — your edits help improve future accuracy.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              <button
                onClick={handleSave}
                disabled={saving || editText === transcript}
                style={saveBtnStyle}
              >
                {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save corrections'}
              </button>
              <button onClick={onSubmitAnother} style={anotherBtnStyle}>
                Submit another recording
              </button>
            </div>

            {saved && (
              <p style={{ fontSize: 13, color: '#059669', marginTop: 8, lineHeight: 1.5 }}>
                ✓ Your corrections have been saved. Thank you!
              </p>
            )}
          </div>
        )}

        {status === 'failed' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 20, marginBottom: 20 }}>
            <div style={{ fontWeight: 600, color: '#b91c1c', marginBottom: 6 }}>
              {timedOut ? 'Transcription is taking longer than expected' : 'Transcription could not be completed'}
            </div>
            <div style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6 }}>
              {timedOut
                ? 'Your recording was saved successfully. Our team will process the transcript shortly.'
                : 'Your recording was saved successfully. Our team has been notified and will process the transcript manually.'}
            </div>
            <div style={{ marginTop: 16 }}>
              <button onClick={onSubmitAnother} style={anotherBtnStyle}>Submit another recording</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
