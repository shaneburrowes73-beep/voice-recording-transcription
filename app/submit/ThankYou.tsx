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
const POLL_TIMEOUT_MS = 120000;

export function ThankYou({
  submissionId,
  onSubmitAnother,
}: {
  submissionId: string;
  onSubmitAnother: () => void;
}) {
  const [overallStatus, setOverallStatus] = useState<TranscriptStatus>('processing');
  const [fileTranscripts, setFileTranscripts] = useState<FileTranscript[]>([]);
  const [editTexts, setEditTexts] = useState<Record<number, string>>({});
  const [savedIndexes, setSavedIndexes] = useState<Record<number, boolean>>({});
  const [timedOut, setTimedOut] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
        if (data.file_transcripts && data.file_transcripts.length > 0) {
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
      } catch (_e) {
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

  const handleSave = async (fileIndex: number) => {
    await fetch('/api/submissions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: submissionId,
        file_index: fileIndex,
        transcript_edited: editTexts[fileIndex],
      }),
    });
    setSavedIndexes(prev => ({ ...prev, [fileIndex]: true }));
    setTimeout(() => setSavedIndexes(prev => ({ ...prev, [fileIndex]: false })), 2500);
  };

  const isSingle = fileTranscripts.length === 1;

  const anotherBtnStyle: React.CSSProperties = {
    padding: '10px 22px',
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
  };

  return (
    <div style={{ fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' }}>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 14, color: '#059669', lineHeight: 1 }}>
          {'✓'}
        </div>
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
          <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 3, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Reference ID
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#374151', wordBreak: 'break-all' }}>
            {submissionId}
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24 }}>

        {(overallStatus === 'pending' || overallStatus === 'processing') && fileTranscripts.every(ft => ft.transcript_status !== 'done') && (
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            <div style={{ fontSize: 26, marginBottom: 10 }}>{'⚡'}</div>
            <div style={{ color: '#374151', fontWeight: 600, marginBottom: 5 }}>Transcribing your audio…</div>
            <div style={{ color: '#9ca3af', fontSize: 13 }}>This page will update automatically. Please keep it open.</div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 6 }}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#d1d5db',
                    animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
            <style>{`@keyframes pulse{0%,80%,100%{opacity:0.3;transform:scale(0.8)}40%{opacity:1;transform:scale(1)}}`}</style>
          </div>
        )}

        {fileTranscripts.map((ft, idx) => {
          const editVal = editTexts[ft.file_index] !== undefined ? editTexts[ft.file_index] : '';
          const original = ft.transcript_edited || ft.corrected_transcript || '';
          const label = ft.filename || ('Recording ' + (ft.file_index + 1));
          const isLast = idx === fileTranscripts.length - 1;

          return (
            <div
              key={ft.file_index}
              style={{
                marginBottom: isLast ? 0 : 28,
                borderBottom: isLast ? 'none' : '1px solid #f3f4f6',
                paddingBottom: isLast ? 0 : 24,
              }}
            >
              {!isSingle && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{
                    background: '#1f2937',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {ft.file_index + 1}
                  </span>
                  <span style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{label}</span>
                </div>
              )}

              {(ft.transcript_status === 'pending' || ft.transcript_status === 'processing') && (
                <div style={{ color: '#6b7280', fontSize: 13, padding: '12px 0' }}>
                  {'⚡'} Transcribing…
                </div>
              )}

              {ft.transcript_status === 'failed' && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 14, color: '#b91c1c', fontSize: 13 }}>
                  Could not transcribe this recording. Your file was saved — our team will process it manually.
                </div>
              )}

              {ft.transcript_status === 'done' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ color: '#059669', fontSize: 15 }}>{'✓'}</span>
                    <span style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>Transcript ready</span>
                    <span style={{ color: '#9ca3af', fontSize: 12 }}>— correct any errors below</span>
                  </div>
                  <textarea
                    value={editVal}
                    onChange={e => setEditTexts(prev => ({ ...prev, [ft.file_index]: e.target.value }))}
                    rows={7}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      padding: '10px 12px',
                      fontSize: 13,
                      lineHeight: 1.7,
                      color: '#111827',
                      background: '#fff',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      outline: 'none',
                      marginBottom: 8,
                    }}
                  />
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px', lineHeight: 1.5 }}>
                    Whisper has applied Barbadian dialect corrections automatically. Please fix anything that looks wrong — your edits help improve future accuracy.
                  </p>
                  <button
                    onClick={() => handleSave(ft.file_index)}
                    disabled={editVal === original}
                    style={{
                      padding: '8px 18px',
                      background: editVal !== original ? '#1d4ed8' : '#9ca3af',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: editVal !== original ? 'pointer' : 'not-allowed',
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    {savedIndexes[ft.file_index] ? '✓ Saved' : 'Save corrections'}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {overallStatus === 'failed' && fileTranscripts.length === 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 18, marginBottom: 20 }}>
            <div style={{ fontWeight: 600, color: '#b91c1c', marginBottom: 6 }}>
              {timedOut ? 'Transcription is taking longer than expected' : 'Transcription could not be completed'}
            </div>
            <div style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6 }}>
              Your recordings were saved. Our team will process them shortly.
            </div>
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <button onClick={onSubmitAnother} style={anotherBtnStyle}>
            Submit another recording
          </button>
        </div>

      </div>
    </div>
  );
}
