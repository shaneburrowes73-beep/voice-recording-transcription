'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, signOut, getWorkspaceClient, WorkspaceUser } from '@/lib/workspace-auth';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Transcript {
  id: string;
  created_at: string;
  officer_name: string;
  officer_role: string;
  raw_text: string | null;
  corrected_text: string | null;
  notes: string | null;
  status: 'Saved' | 'Pending' | 'Approved' | 'Rejected';
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  user_id: string;
}

const MAX_FILE_MB = 25;
const ACCEPTED = '.mp3,.wav,.m4a,.mp4,.ogg,.webm,.aac';
const ACCEPTED_TYPES = ['audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/m4a','audio/x-m4a','audio/ogg','audio/webm','audio/aac'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}
function fmt(d: string) {
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fileSizeMB(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(1);
}

function StatusChip({ status }: { status: Transcript['status'] }) {
  const map = {
    Saved:    { bg: '#f3f4f6', color: '#6b7280', label: 'Saved' },
    Pending:  { bg: '#fef3c7', color: '#92400e', label: '⏳ Pending' },
    Approved: { bg: '#dcfce7', color: '#166534', label: '✓ Approved' },
    Rejected: { bg: '#fee2e2', color: '#991b1b', label: '✗ Rejected' },
  };
  const s = map[status] || map.Saved;
  return <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>;
}

// ─── Input panel (record live OR upload file) ─────────────────────────────────
function InputPanel({ user, onSaved }: { user: WorkspaceUser; onSaved: () => void }) {
  const [inputMode, setInputMode] = useState<'record' | 'upload'>('record');

  // Record state
  const [recStep, setRecStep] = useState<'idle' | 'recording' | 'recorded' | 'transcribing' | 'review' | 'saving'>('idle');
  const [seconds, setSeconds] = useState(0);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recBlobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStep, setUploadStep] = useState<'idle' | 'uploading' | 'transcribing' | 'review' | 'saving'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shared review state
  const [transcript, setTranscript] = useState('');
  const [rawText, setRawText] = useState('');
  const [corrections, setCorrections] = useState(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const sb = getWorkspaceClient();

  const resetAll = () => {
    setRecStep('idle'); setUploadStep('idle');
    setSeconds(0); setUploadFile(null); setUploadProgress(0);
    setTranscript(''); setRawText(''); setCorrections(0);
    setNotes(''); setError(''); setUploadError('');
    recBlobRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Live recording ──────────────────────────────────────────────────────────
  const startRec = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        recBlobRef.current = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' });
        setRecStep('recorded');
      };
      mr.start(250);
      mrRef.current = mr;
      setRecStep('recording');
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => { if (s >= 299) { stopRec(); return s; } return s + 1; }), 1000);
    } catch (_e) {
      setError('Microphone access denied. Please allow access and try again.');
    }
  };

  const stopRec = () => {
    clearInterval(timerRef.current!);
    if (mrRef.current?.state !== 'inactive') mrRef.current?.stop();
  };

  const transcribeBlob = async (blob: Blob, filename: string) => {
    const fd = new FormData();
    const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'mp4' : 'webm';
    fd.append('audio', blob, `${filename}.${ext}`);
    const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Error ${res.status}`); }
    return await res.json() as { transcript: string; corrected_transcript: string; corrections_applied: number };
  };

  const transcribeRecording = async () => {
    if (!recBlobRef.current) return;
    setRecStep('transcribing'); setError('');
    try {
      const data = await transcribeBlob(recBlobRef.current, 'recording');
      setRawText(data.transcript || '');
      setTranscript(data.corrected_transcript || data.transcript || '');
      setCorrections(data.corrections_applied || 0);
      setRecStep('review');
    } catch (e: any) {
      setError(e.message || 'Transcription failed');
      setRecStep('recorded');
    }
  };

  // ── File upload ─────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadError('');
    if (!ACCEPTED_TYPES.includes(f.type) && !f.name.match(/\.(mp3|wav|m4a|mp4|ogg|webm|aac)$/i)) {
      setUploadError('Unsupported file type. Please use MP3, WAV, M4A, MP4, OGG, WebM or AAC.');
      return;
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setUploadError(`File too large. Maximum size is ${MAX_FILE_MB} MB.`);
      return;
    }
    setUploadFile(f);
    setUploadStep('idle');
    setTranscript(''); setRawText(''); setCorrections(0); setNotes('');
  };

  const transcribeUpload = async () => {
    if (!uploadFile) return;
    setUploadStep('uploading'); setUploadError(''); setUploadProgress(0);

    try {
      // Step 1 — get a signed upload URL from Supabase Storage
      const urlRes = await fetch('/api/submit-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: uploadFile.name, fileSize: uploadFile.size, mimeType: uploadFile.type || 'audio/mpeg' }),
      });
      if (!urlRes.ok) { const e = await urlRes.json().catch(() => ({})); throw new Error(e.error || 'Could not get upload URL'); }
      const { signedUrl, storagePath } = await urlRes.json();

      // Step 2 — upload directly to Supabase Storage via the signed URL
      setUploadProgress(20);
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': uploadFile.type || 'audio/mpeg' },
        body: uploadFile,
      });
      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);
      setUploadProgress(60);

      // Step 3 — transcribe via the storage path
      setUploadStep('transcribing');
      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storage_url: `voice-submissions/${storagePath}` }),
      });
      if (!transcribeRes.ok) { const e = await transcribeRes.json().catch(() => ({})); throw new Error(e.error || 'Transcription failed'); }
      const data = await transcribeRes.json() as { transcript: string; corrected_transcript: string; corrections_applied: number };
      setUploadProgress(100);
      setRawText(data.transcript || '');
      setTranscript(data.corrected_transcript || data.transcript || '');
      setCorrections(data.corrections_applied || 0);
      setUploadStep('review');
    } catch (e: any) {
      setUploadError(e.message || 'Something went wrong');
      setUploadStep('idle');
    }
  };

  // ── Save transcript ─────────────────────────────────────────────────────────
  const save = async (submitForApproval: boolean) => {
    const step = inputMode === 'record' ? recStep : uploadStep;
    if (inputMode === 'record') setRecStep('saving'); else setUploadStep('saving');
    try {
      const { error: err } = await sb.from('transcripts').insert({
        org_id: user.orgId, user_id: user.id,
        officer_name: user.fullName, officer_role: user.role,
        raw_text: rawText, corrected_text: transcript,
        notes: notes.trim() || null,
        status: submitForApproval ? 'Pending' : 'Saved',
      });
      if (err) throw new Error(err.message);
      onSaved();
      resetAll();
    } catch (e: any) {
      setError(e.message || 'Save failed');
      if (inputMode === 'record') setRecStep('review'); else setUploadStep('review');
    }
  };

  const isReview = recStep === 'review' || uploadStep === 'review';
  const isSaving = recStep === 'saving' || uploadStep === 'saving';

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 22px', borderRadius: 10, border: 'none',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  };

  return (
    <div>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f1f4b', marginBottom: 20 }}>New Transcript</h2>

      {/* Input mode toggle */}
      <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 10, padding: 4, marginBottom: 24, gap: 4, maxWidth: 340 }}>
        {(['record', 'upload'] as const).map(m => (
          <button key={m} onClick={() => { setInputMode(m); resetAll(); }}
            style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: inputMode === m ? '#fff' : 'transparent', color: inputMode === m ? '#0f1f4b' : '#9ca3af', boxShadow: inputMode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
            {m === 'record' ? '🎙️ Live record' : '📁 Upload file'}
          </button>
        ))}
      </div>

      {/* ── LIVE RECORD MODE ── */}
      {inputMode === 'record' && (
        <>
          {/* Step 1 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Step 1 — Record</div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 1.6 }}>Speak naturally. Max 5 minutes per recording.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              {recStep !== 'recording' ? (
                <button style={{ ...btnBase, background: '#0f1f4b', color: '#fff' }} onClick={startRec} disabled={recStep === 'transcribing' || isSaving}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff' }} />
                  {recStep === 'idle' ? 'Start recording' : 'Record again'}
                </button>
              ) : (
                <button style={{ ...btnBase, background: '#dc2626', color: '#fff', animation: 'recPulse 1.5s ease-in-out infinite' }} onClick={stopRec}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#fff' }} />
                  Stop recording
                </button>
              )}
              {recStep === 'recording' && <span style={{ color: '#dc2626', fontSize: 14, fontWeight: 600 }}>● {formatTime(seconds)}</span>}
              {(recStep === 'recorded' || recStep === 'review' || isSaving) && <span style={{ color: '#059669', fontSize: 13, fontWeight: 600 }}>✓ Recording ready</span>}
            </div>
          </div>

          {/* Step 2 — Transcribe */}
          {(recStep === 'recorded' || recStep === 'transcribing') && (
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Step 2 — Transcribe</div>
              <button onClick={transcribeRecording} disabled={recStep === 'transcribing'}
                style={{ ...btnBase, background: recStep === 'transcribing' ? '#9ca3af' : '#059669', color: '#fff', cursor: recStep === 'transcribing' ? 'wait' : 'pointer' }}>
                {recStep === 'transcribing' ? '⚡ Transcribing…' : '⚡ Transcribe now'}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── UPLOAD MODE ── */}
      {inputMode === 'upload' && (
        <>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Step 1 — Select audio file</div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 1.6 }}>Supported: MP3, WAV, M4A, MP4, OGG, WebM, AAC — up to {MAX_FILE_MB} MB.</p>

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { const evt = { target: { files: [f] } } as any; handleFileChange(evt); } }}
              style={{ border: '2px dashed #d1d5db', borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: uploadFile ? '#f0fdf4' : '#f9fafb', transition: 'all 0.2s' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{uploadFile ? '✓' : '📁'}</div>
              {uploadFile ? (
                <div>
                  <div style={{ fontWeight: 600, color: '#166534', fontSize: 14 }}>{uploadFile.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>{fileSizeMB(uploadFile.size)} MB</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>Click to choose a file</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>or drag and drop here</div>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept={ACCEPTED} onChange={handleFileChange} style={{ display: 'none' }} />
            </div>

            {uploadError && (
              <div style={{ marginTop: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#b91c1c' }}>{uploadError}</div>
            )}
          </div>

          {/* Step 2 — Transcribe upload */}
          {uploadFile && !uploadError && (uploadStep === 'idle' || uploadStep === 'uploading' || uploadStep === 'transcribing') && (
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Step 2 — Transcribe</div>

              {(uploadStep === 'uploading' || uploadStep === 'transcribing') ? (
                <div>
                  <div style={{ fontSize: 13, color: '#374151', fontWeight: 600, marginBottom: 8 }}>
                    {uploadStep === 'uploading' ? '↑ Uploading file…' : '⚡ Transcribing…'}
                  </div>
                  <div style={{ height: 6, background: '#e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${uploadProgress}%`, background: '#059669', transition: 'width 0.4s', borderRadius: 6 }} />
                  </div>
                </div>
              ) : (
                <button onClick={transcribeUpload}
                  style={{ ...btnBase, background: '#059669', color: '#fff' }}>
                  ⚡ Transcribe file
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* ── SHARED REVIEW STEP ── */}
      {isReview && (
        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Step 3 — Review & submit</div>

          {corrections > 0 && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 13, color: '#166534' }}>
              ✓ {corrections} Barbadian dialect correction{corrections !== 1 ? 's' : ''} applied automatically
            </div>
          )}

          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Transcript — edit if needed</label>
          <textarea value={transcript} onChange={e => setTranscript(e.target.value)} rows={7}
            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 13, lineHeight: 1.7, color: '#111827', background: '#fff', resize: 'vertical', fontFamily: 'inherit', outline: 'none', marginBottom: 14 }} />

          {rawText && rawText !== transcript && (
            <details style={{ marginBottom: 16 }}>
              <summary style={{ fontSize: 12, color: '#9ca3af', cursor: 'pointer', userSelect: 'none' }}>Show original Whisper output</summary>
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', marginTop: 6, fontSize: 12, color: '#6b7280', lineHeight: 1.7 }}>{rawText}</div>
            </details>
          )}

          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any additional context…"
            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 13, lineHeight: 1.6, color: '#111827', background: '#fff', resize: 'vertical', fontFamily: 'inherit', outline: 'none', marginBottom: 18 }} />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => save(true)} disabled={isSaving || !transcript.trim()}
              style={{ padding: '11px 22px', background: isSaving || !transcript.trim() ? '#9ca3af' : '#0f1f4b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: isSaving || !transcript.trim() ? 'not-allowed' : 'pointer' }}>
              {user.isSupervisor ? '✓ Save & approve' : '→ Submit for approval'}
            </button>
            <button onClick={() => save(false)} disabled={isSaving || !transcript.trim()}
              style={{ padding: '11px 22px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: isSaving || !transcript.trim() ? 'not-allowed' : 'pointer' }}>
              Save draft
            </button>
            <button onClick={resetAll} disabled={isSaving}
              style={{ padding: '11px 22px', background: 'transparent', color: '#9ca3af', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              Start over
            </button>
          </div>
        </div>
      )}

      {error && <div style={{ marginTop: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#b91c1c' }}>{error}</div>}
    </div>
  );
}

// ─── Records panel ─────────────────────────────────────────────────────────────
function RecordsPanel({ user, refresh }: { user: WorkspaceUser; refresh: number }) {
  const [records, setRecords] = useState<Transcript[]>([]);
  const [selected, setSelected] = useState<Transcript | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected' | 'Saved'>('All');
  const sb = getWorkspaceClient();

  const fetchRecords = useCallback(async () => {
    const { data } = await sb.from('transcripts').select('*').eq('org_id', user.orgId).order('created_at', { ascending: false });
    setRecords(data || []);
  }, [user.orgId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords, refresh]);

  const decide = async (status: 'Approved' | 'Rejected') => {
    if (!selected) return;
    setDeciding(true);
    await sb.from('transcripts').update({ status, review_note: reviewNote.trim() || null, reviewed_by: user.fullName, reviewed_at: new Date().toISOString() }).eq('id', selected.id);
    await fetchRecords();
    setSelected(null); setReviewNote(''); setDeciding(false);
  };

  const counts = {
    All: records.length,
    Pending: records.filter(r => r.status === 'Pending').length,
    Approved: records.filter(r => r.status === 'Approved').length,
    Rejected: records.filter(r => r.status === 'Rejected').length,
    Saved: records.filter(r => r.status === 'Saved').length,
  };
  const visible = records.filter(r => filter === 'All' || r.status === filter);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f1f4b' }}>Transcripts</h2>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{records.length} total</span>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['All', 'Pending', 'Approved', 'Rejected', 'Saved'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '5px 12px', border: `1px solid ${filter === f ? '#0f1f4b' : '#e5e7eb'}`, borderRadius: 20, fontSize: 12, fontWeight: 600, background: filter === f ? '#0f1f4b' : '#fff', color: filter === f ? '#fff' : '#6b7280', cursor: 'pointer' }}>
            {f} <span style={{ opacity: 0.7 }}>({counts[f]})</span>
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 14 }}>
          No {filter === 'All' ? '' : filter.toLowerCase()} transcripts yet.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.map(r => (
          <div key={r.id} onClick={() => { setSelected(r); setReviewNote(''); }}
            style={{ background: selected?.id === r.id ? '#f0f4ff' : '#fff', border: `1px solid ${selected?.id === r.id ? '#c7d2fe' : '#e5e7eb'}`, borderRadius: 12, padding: '16px 18px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 600, color: '#0f1f4b', fontSize: 14 }}>{r.officer_name}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.officer_role} · {fmt(r.created_at)}</div>
              </div>
              <StatusChip status={r.status} />
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {r.corrected_text || r.raw_text || '(empty)'}
            </div>
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }} onClick={() => setSelected(null)}>
          <div style={{ width: 520, maxWidth: '95vw', height: '100vh', overflowY: 'auto', background: '#fff', padding: 28, boxSizing: 'border-box', borderLeft: '1px solid #e5e7eb' }} onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 700, color: '#0f1f4b', fontSize: 17 }}>{selected.officer_name}</div>
                <div style={{ fontSize: 13, color: '#9ca3af' }}>{selected.officer_role} · {fmt(selected.created_at)}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: '#6b7280' }}>✕ Close</button>
            </div>

            <div style={{ marginBottom: 16 }}><StatusChip status={selected.status} /></div>

            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Transcript</label>
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px', fontSize: 13, lineHeight: 1.7, color: '#111827', marginBottom: 16, whiteSpace: 'pre-wrap', maxHeight: 320, overflowY: 'auto' }}>
              {selected.corrected_text || selected.raw_text || '(empty)'}
            </div>

            {selected.notes && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Notes</label>
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#374151' }}>{selected.notes}</div>
              </div>
            )}

            {selected.review_note && (
              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
                <strong>Review note:</strong> {selected.review_note}
                <div style={{ fontSize: 11, marginTop: 4, color: '#a16207' }}>— {selected.reviewed_by} · {selected.reviewed_at ? fmt(selected.reviewed_at) : ''}</div>
              </div>
            )}

            {user.isSupervisor && selected.status === 'Pending' && (
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 18, marginTop: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Review note (optional)</label>
                <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={3} placeholder="Add context for the submitter…"
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical', marginBottom: 12 }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => decide('Rejected')} disabled={deciding}
                    style={{ flex: 1, padding: '11px 0', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: deciding ? 'wait' : 'pointer' }}>
                    ✗ Reject
                  </button>
                  <button onClick={() => decide('Approved')} disabled={deciding}
                    style={{ flex: 1, padding: '11px 0', background: '#0f1f4b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: deciding ? 'wait' : 'pointer' }}>
                    ✓ Approve
                  </button>
                </div>
              </div>
            )}

            {user.isSupervisor && selected.status === 'Approved' && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#166534', fontWeight: 600 }}>
                ✓ Approved by {selected.reviewed_by} · {selected.reviewed_at ? fmt(selected.reviewed_at) : ''}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main workspace ───────────────────────────────────────────────────────────
export default function WorkspacePage() {
  const router = useRouter();
  const [user, setUser] = useState<WorkspaceUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'record' | 'records'>('record');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    getCurrentUser().then(u => {
      if (!u) { router.replace('/login'); return; }
      setUser(u); setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', color: '#6b7280', fontSize: 14 }}>
      Loading workspace…
    </div>
  );

  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fc', fontFamily: '"Segoe UI", system-ui, sans-serif' }}>
      <style>{`@keyframes recPulse{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,0.4)}50%{box-shadow:0 0 0 12px rgba(220,38,38,0)}} *{box-sizing:border-box}`}</style>

      <nav style={{ background: '#0f1f4b', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#0f1f4b' }}>AI</div>
          <div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Voice Transcript</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{user.orgName}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{user.fullName}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{user.role}</div>
          </div>
          <button onClick={async () => { await signOut(); router.push('/'); }}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px' }}>

        <div style={{ display: 'flex', gap: 4, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {[{ key: 'record', label: '🎙️ New transcript' }, { key: 'records', label: '🗄️ My transcripts' }].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key as any)}
              style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === key ? '#0f1f4b' : 'transparent', color: tab === key ? '#fff' : '#6b7280', transition: 'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '28px 24px' }}>
          {tab === 'record' && <InputPanel user={user} onSaved={() => { setTab('records'); setRefresh(r => r + 1); }} />}
          {tab === 'records' && <RecordsPanel user={user} refresh={refresh} />}
        </div>

        <div style={{ marginTop: 20, background: 'linear-gradient(135deg, #0f1f4b, #1a3070)', borderRadius: 12, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ color: '#c9a84c', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Trial workspace</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>Upgrade to get your own organisation, team members, and custom branding.</div>
          </div>
          <a href="mailto:AISolutions@aisolutionsnet.net?subject=Voice Transcript Upgrade Request"
            style={{ background: '#c9a84c', color: '#0f1f4b', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', textDecoration: 'none' }}>
            Upgrade plan →
          </a>
        </div>
      </div>
    </div>
  );
}
