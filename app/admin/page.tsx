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
            style={{ flex: 1, background: '#064e3b', border: '1px solid #059669', color: '#6ee7b7', padding: '8px 0', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ✓ Approve
          </button>
        </div>
      )}
      {ft.transcript_approved && (
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: '#064e3b', border: '1px solid #059669', color: '#6ee7b7', padding: '8px 0', borderRadius: 6, fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
            ✓ Approved {ft.approved_at ? `· ${new Date(ft.approved_at).toLocaleDateString('en-GB')}` : ''}
          </div>
          <button onClick={() => onApprove(ft.file_index, false)}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '8px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
            Revoke
          </button>
        </div>
      )}
    </div>
  );
}

function SubmissionPanel({ sub, onClose, onSaveFile, onApproveFile, onRetranscribe }: {
  sub: Submission;
  onClose: () => void;
  onSaveFile: (subId: string, fileIndex: number, text: string) => Promise<void>;
  onApproveFile: (subId: string, fileIndex: number, approved: boolean) => Promise<void>;
  onRetranscribe: (id: string) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [retranscribing, setRetranscribing] = useState(false);
  const fmt = (d: string) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const fileCount = sub.audio_file_urls.length;

  const handleRetranscribe = async () => {
    setRetranscribing(true);
    await onRetranscribe(sub.id);
    setRetranscribing(false);
  };

  const tabs = Array.from({ length: fileCount }, (_, i) => {
    const ft = sub.file_transcripts.find(t => t.file_index === i);
    const rawName = sub.audio_file_urls[i]?.split('/').pop() || `File ${i + 1}`;
    const label = ft?.filename || rawName.replace(/^\d+-/, '');
    return { index: i, label, ft };
  });

  const allApproved = tabs.length > 0 && tabs.every(t => t.ft?.transcript_approved);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ width: 580, maxWidth: '95vw', height: '100vh', overflowY: 'auto', background: '#0f172a', borderLeft: '1px solid #1e293b', padding: 28, boxSizing: 'border-box' }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ color: '#64748b', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Submission</div>
            <div style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700 }}>{sub.first_name} {sub.last_name}</div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{sub.email_address}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #1e293b', color: '#94a3b8', cursor: 'pointer', borderRadius: 6, padding: '5px 10px', fontSize: 12 }}>✕ Close</button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {[sub.age_range, sub.gender, sub.birthplace, sub.native_speaker_of_dialect, sub.content_type].filter(Boolean).map((v, i) => (
            <span key={i} style={{ background: '#1e293b', color: '#94a3b8', fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>{v}</span>
          ))}
        </div>

        {sub.topics_covered && (
          <div style={{ background: '#1e293b', borderRadius: 6, padding: '8px 12px', marginBottom: 16, color: '#94a3b8', fontSize: 12 }}>
            <span style={{ color: '#64748b', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>Topics: </span>{sub.topics_covered}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <StatusBadge status={sub.transcript_status} approved={allApproved} />
          <button onClick={handleRetranscribe} disabled={retranscribing}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#64748b', fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: retranscribing ? 'wait' : 'pointer' }}>
            {retranscribing ? 'Starting…' : '↻ Re-transcribe all'}
          </button>
        </div>

        {fileCount > 1 && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
            {tabs.map(t => (
              <button key={t.index} onClick={() => setActiveTab(t.index)}
                style={{ background: activeTab === t.index ? '#1e3a5f' : '#0f172a', border: `1px solid ${activeTab === t.index ? '#2563eb' : '#1e293b'}`, color: activeTab === t.index ? '#93c5fd' : '#475569', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.index + 1}. {t.label.length > 20 ? t.label.slice(0, 20) + '…' : t.label}
                {t.ft?.transcript_approved ? ' ✓' : ''}
              </button>
            ))}
          </div>
        )}

        {tabs[activeTab] && (
          <div>
            {fileCount > 1 && (
              <div style={{ color: '#475569', fontSize: 11, marginBottom: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Recording {activeTab + 1} of {fileCount} — {tabs[activeTab].label}
              </div>
            )}
            {tabs[activeTab].ft ? (
              <FileTab
                ft={tabs[activeTab].ft!}
                submissionId={sub.id}
                onSave={(fi, text) => onSaveFile(sub.id, fi, text)}
                onApprove={(fi, approved) => onApproveFile(sub.id, fi, approved)}
              />
            ) : (
              <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                No transcript yet. Click ↻ Re-transcribe all to run Whisper.
              </div>
            )}
          </div>
        )}

        <div style={{ borderTop: '1px solid #1e293b', paddingTop: 14, marginTop: 16 }}>
          <div style={{ color: '#475569', fontSize: 11 }}>Submitted: {fmt(sub.submitted_at)}</div>
          {sub.transcribed_at && <div style={{ color: '#475569', fontSize: 11, marginTop: 3 }}>Transcribed: {fmt(sub.transcribed_at)}</div>}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done' | 'approved'>('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch('/api/submissions');
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setSubmissions(json.submissions || []);
      setSelected(prev => prev ? (json.submissions || []).find((s: Submission) => s.id === prev.id) || prev : null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  useEffect(() => {
    const hasProcessing = submissions.some(s =>
      s.transcript_status === 'processing' ||
      s.file_transcripts?.some(f => f.transcript_status === 'processing')
    );
    if (!hasProcessing) return;
    const timer = setInterval(fetchSubmissions, 4000);
    return () => clearInterval(timer);
  }, [submissions, fetchSubmissions]);

  const handleSaveFile = async (subId: string, fileIndex: number, text: string) => {
    await fetch('/api/submissions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: subId, file_index: fileIndex, transcript_edited: text }) });
    await fetchSubmissions();
  };

  const handleApproveFile = async (subId: string, fileIndex: number, approved: boolean) => {
    await fetch('/api/submissions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: subId, file_index: fileIndex, transcript_approved: approved }) });
    await fetchSubmissions();
  };

  const handleRetranscribe = async (id: string) => {
    await fetch('/api/submissions/retranscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, transcript_status: 'processing' as TranscriptStatus } : s));
  };

  const counts = {
    all: submissions.length,
    pending: submissions.filter(s => s.transcript_status === 'pending' || s.transcript_status === 'failed').length,
    done: submissions.filter(s => s.transcript_status === 'done' && !s.transcript_approved).length,
    approved: submissions.filter(s => s.transcript_approved).length,
  };

  const filtered = submissions.filter(s => {
    if (filter === 'pending' && s.transcript_status !== 'pending' && s.transcript_status !== 'failed') return false;
    if (filter === 'done' && (s.transcript_status !== 'done' || s.transcript_approved)) return false;
    if (filter === 'approved' && !s.transcript_approved) return false;
    if (search) return (s.first_name + ' ' + s.last_name + ' ' + s.email_address).toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: '#060b14', color: '#e2e8f0', fontFamily: '"DM Mono", "Fira Code", "Courier New", monospace' }}>
      <div style={{ borderBottom: '1px solid #1e293b', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#080e1a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
          <span style={{ color: '#64748b', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Voice Transcription</span>
          <span style={{ color: '#1e293b' }}>|</span>
          <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>Submission Admin</span>
        </div>
        <button onClick={fetchSubmissions} style={{ background: 'none', border: '1px solid #1e293b', color: '#475569', fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>↻ Refresh</button>
      </div>

      <div style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {(['all', 'pending', 'done', 'approved'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? '#1e3a5f' : '#0f172a', border: `1px solid ${filter === f ? '#2563eb' : '#1e293b'}`, color: filter === f ? '#93c5fd' : '#475569', fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'inherit' }}>
              {f} <span style={{ opacity: 0.6 }}>({counts[f]})</span>
            </button>
          ))}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name / email…" style={{ marginLeft: 'auto', background: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0', padding: '5px 12px', borderRadius: 6, fontSize: 12, outline: 'none', fontFamily: 'inherit', minWidth: 180 }} />
        </div>

        {error && <div style={{ background: '#3b1c1c', border: '1px solid #7f1d1d', color: '#fca5a5', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
        {loading && <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', paddingTop: 60 }}>Loading…</div>}

        {!loading && (
          <div style={{ border: '1px solid #1e293b', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 80px 110px 24px', padding: '8px 14px', background: '#0a1120', borderBottom: '1px solid #1e293b' }}>
              {['Submitter', 'Email', 'Date', 'Files', 'Status', ''].map((h, i) => (
                <div key={i} style={{ color: '#334155', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>
            {filtered.length === 0 && <div style={{ color: '#334155', fontSize: 13, textAlign: 'center', padding: '40px 14px' }}>No submissions match this filter.</div>}
            {filtered.map((sub, i) => (
              <div key={sub.id} onClick={() => setSelected(sub)}
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 80px 110px 24px', padding: '12px 14px', cursor: 'pointer', background: selected?.id === sub.id ? '#0d1a2d' : i % 2 === 0 ? '#080e1a' : '#060b14', borderBottom: '1px solid #1e293b' }}>
                <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{sub.first_name} {sub.last_name}</div>
                <div style={{ color: '#64748b', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.email_address}</div>
                <div style={{ color: '#475569', fontSize: 11 }}>{fmt(sub.submitted_at)}</div>
                <div style={{ color: '#475569', fontSize: 11 }}>{sub.audio_file_urls.length} file{sub.audio_file_urls.length !== 1 ? 's' : ''}</div>
                <div><StatusBadge status={sub.transcript_status} approved={sub.transcript_approved} /></div>
                <div style={{ color: '#334155', fontSize: 11 }}>→</div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <div style={{ marginTop: 12, color: '#334155', fontSize: 11, textAlign: 'right' }}>
            {filtered.length} of {submissions.length} · {counts.approved} approved · {counts.done} awaiting review
          </div>
        )}
      </div>

      {selected && (
        <SubmissionPanel
          sub={selected}
          onClose={() => setSelected(null)}
          onSaveFile={handleSaveFile}
          onApproveFile={handleApproveFile}
          onRetranscribe={handleRetranscribe}
        />
      )}
    </div>
  );
}
