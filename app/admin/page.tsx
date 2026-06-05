'use client';

import React, { useEffect, useState, useCallback } from 'react';

type TranscriptStatus = 'pending' | 'processing' | 'done' | 'failed';

interface FileTranscript {
  file_index: number;
  filename: string | null;
  storage_path?: string;
  raw_transcript: string | null;
  corrected_transcript: string | null;
  transcript_edited: string | null;
  transcript_status: TranscriptStatus;
  transcript_approved: boolean;
  approved_at: string | null;
  transcribed_at: string | null;
}

interface Submission {
  id: string;
  submitted_at: string;
  first_name: string;
  last_name: string;
  email_address: string;
  age_range: string | null;
  gender: string | null;
  birthplace: string | null;
  native_speaker_of_dialect: string | null;
  content_type: string | null;
  topics_covered: string | null;
  audio_file_urls: string[];
  transcript_status: TranscriptStatus;
  transcribed_at: string | null;
  transcript_approved: boolean;
  approved_at: string | null;
  file_transcripts: FileTranscript[];
}

function StatusBadge({ status, approved }: { status: TranscriptStatus; approved: boolean }) {
  if (approved) return <span style={{ background: '#064e3b', color: '#6ee7b7', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase' }}>✓ Approved</span>;
  const map: Record<TranscriptStatus, { bg: string; fg: string; label: string }> = {
    pending:    { bg: '#1e293b', fg: '#94a3b8', label: '⏳ Pending' },
    processing: { bg: '#1e3a5f', fg: '#60a5fa', label: '⚡ Processing' },
    done:       { bg: '#1c3326', fg: '#4ade80', label: '✓ Ready' },
    failed:     { bg: '#3b1c1c', fg: '#f87171', label: '✗ Failed' },
  };
  const s = map[status] || map.pending;
  return <span style={{ background: s.bg, color: s.fg, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{s.label}</span>;
}

function FileTab({ ft, submissionId, onSave, onApprove }: {
  ft: FileTranscript;
  submissionId: string;
  onSave: (fileIndex: number, text: string) => Promise<void>;
  onApprove: (fileIndex: number, approved: boolean) => Promise<void>;
}) {
  const [editText, setEditText] = useState(ft.transcript_edited || ft.corrected_transcript || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const original = ft.transcript_edited || ft.corrected_transcript || '';

  useEffect(() => {
    setEditText(ft.transcript_edited || ft.corrected_transcript || '');
  }, [ft.transcript_edited, ft.corrected_transcript]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(ft.file_index, editText);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  if (ft.transcript_status === 'processing') return <div style={{ textAlign: 'center', padding: '24px 0', color: '#60a5fa', fontSize: 14 }}>⚡ Transcribing…</div>;
  if (ft.transcript_status === 'pending') return <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: 14 }}>Not yet transcribed.</div>;
  if (ft.transcript_status === 'failed') return <div style={{ background: '#3b1c1c', border: '1px solid #7f1d1d', borderRadius: 8, padding: 14, color: '#fca5a5', fontSize: 13 }}>{ft.raw_transcript || 'Transcription failed.'}</div>;

  return (
    <div>
      <textarea
        value={editText}
        onChange={e => setEditText(e.target.value)}
        disabled={ft.transcript_approved}
        rows={8}
        style={{ width: '100%', boxSizing: 'border-box', background: ft.transcript_approved ? '#0f172a' : '#1e293b', border: `1px solid ${ft.transcript_approved ? '#1e293b' : '#334155'}`, color: ft.transcript_approved ? '#64748b' : '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 13, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit', cursor: ft.transcript_approved ? 'not-allowed' : 'text', marginBottom: 10 }}
      />
      {ft.raw_transcript && ft.raw_transcript !== editText && (
        <details style={{ marginBottom: 12 }}>
          <summary style={{ color: '#475569', fontSize: 11, cursor: 'pointer', userSelect: 'none' }}>Show original Whisper output</summary>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, padding: 10, marginTop: 6, color: '#475569', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 160, overflowY: 'auto' }}>{ft.raw_transcript}</div>
        </details>
      )}
      {!ft.transcript_approved && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} disabled={saving || editText === original}
            style={{ flex: 1, background: (!saving && editText !== original) ? '#1e3a5f' : '#1e293b', border: '1px solid #2563eb', color: (!saving && editText !== original) ? '#93c5fd' : '#475569', padding: '8px 0', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: (!saving && editText !== original) ? 'pointer' : 'not-allowed' }}>
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save edits'}
          </button>
          <button onClick={() => onApprove(ft.file_index, true)}
            style={{ flex: 1, background: '#064e3b', border: '1px solid #059669', color: '#6ee7b7', padding: '8px 0', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: '
