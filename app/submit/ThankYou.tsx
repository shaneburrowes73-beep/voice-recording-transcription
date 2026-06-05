'use client';

import React, { useEffect, useState, useRef } from 'react';

type TranscriptStatus = 'pending' | 'processing' | 'done' | 'failed';

interface FileTranscript {
  file_index: number;
  filename: string | null;
  transcript_edited: string | null;
  corrected_transcript: string | null;
  transcript_status: TranscriptStatus;
}

interface StatusResponse {
  transcript_status: TranscriptStatus;
  transcribed_at: string | null;
  file_transcripts: FileTranscript[];
}

const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS  = 120000;

export function ThankYou({ submissionId, onSubmitAnother }: { submissionId: string; onSubmitAnother: () => void }) {
  const [overallStatus, setOverallStatus] = useState<TranscriptStatus>('processing');
  const [fileTranscripts, setFileTranscripts] = useState<FileTranscript[]>([]);
  const [editTexts, setEditTexts] = useState<Record<number, string>>({});
  const [savedIndexes, setSavedIndexes] = useState<Record<number, boolean>>({});
  const [timedOut, setTimedOut] = useState(false);
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      if (Date.now() - startRef.current > POLL_TIMEOUT_MS) {
        clearInterval(pollRef.current!);
        setTimedOut(true);
        setOverallStatus('failed');
        return;
      }
      try {
        const res = await fetch(`/api/submissions/status?id=${submissionId}`);
        if (!res.ok) return;
        const data: StatusResponse = await res.json();
        if (cancelled) return;
        setOverallStatus(data.transcript_status);
        if (data.file_transcripts?.length) {
          setFileTranscripts(data.file_transcripts);
          setEditTexts(prev => {
            const next = { ...prev };
            data.file_transcripts.forEach(ft => {
              if (ft.transcript_status === 'done' && next[ft.file_index] === undefined) {
                next[ft.file_index] = ft.transcript_edited || ft.corrected_transcript || '';
              }
            });
            return next;
          });
        }
        if (data.transcript_status === 'done' || data.transcript_status === 'failed') {
          clearInterval(pollRef.current!);
        }
      } catch { /* keep polling */ }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(pollRef.current!); };
  }, [submissionId]);

  const handleSave = async (fileIndex: number) => {
    await fetch('/api/submissions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: submissionId, file_index: fileIndex, transcript_edited: editTexts[fileIndex] }),
    });
    setSavedIndexes(prev => ({ ...prev, [fileIndex]: true }));
    setTimeout(() => setSavedIndexes(prev => ({ ...prev, [fileIndex]: false })), 2500);
  };

  const anotherBtn: React.CSSProperties = {
    padding: '10px 22px', background: '#dc2626', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14,
  };

  const isSingle = fileTranscripts.length === 1;

  return (
    <div style={{ fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' }}>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 14, color: '#059669', lineHeight: 1 }}>✓</div>
        <h2 style={{ marginTop: 0, fontSize: 26, color: '#111827', marginBottom: 8, fontWeight: 700 }}>
          Submission received!
        </h2>
        <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.6, marginBottom: 16 }}>
          Your audio has been saved securely.{' '}
          {overallStatus === 'processing' || overallStatus === 'pending'
            ? "We're transcribing it now — this usually takes under a minute."
            : 'Please review and correct the transcript below.'}
        </p>
        <div style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', display: 'inline-block', textAlign: 'left' }}>
          <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 3, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Reference ID</div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#374151', wordBreak: 'break-all' }}>{submissionId}</div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24 }}>

        {(
