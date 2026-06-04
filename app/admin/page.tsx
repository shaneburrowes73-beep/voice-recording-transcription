'use client';

import React, { useEffect, useState, useCallback } from 'react';

type TranscriptStatus = 'pending' | 'processing' | 'done' | 'failed';

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
  raw_transcript: string | null;
  corrected_transcript: string | null;
  transcript_edited: string | null;
  transcript_status: TranscriptStatus;
  transcribed_at: string | null;
  transcript_approved: boolean;
  approved_at: string | null;
}

function StatusBadge({ status, approved }: { status: TranscriptStatus; approved: boolean }) {
  if (approved) return (
    <span style={{ background: '#064e3b', color: '#6ee7b7', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
      ✓ Approved
    </span>
  );
  const map: Record<TranscriptStatus, { bg: string; fg: string; label: string }> = {
    pending:    { bg: '#1e293b', fg: '#94a3b8', label: '⏳ Pending' },
    processing: { bg: '#1e3a5f', fg: '#60a5fa', label: '⚡ Processing' },
    done:       { bg: '#1c3326', fg: '#4ade80', label: '✓ Ready' },
    failed:     { bg: '#3b1c1c', fg: '#f87171', label: '✗ Failed' },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ background: s.bg, color: s.fg, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
      {s.label}
    </span>
  );
}

function SubmissionPanel({ sub, onClose, onSave, onRetranscribe, onApprove }: {
  sub: Submission;
  onClose: () => void;
  onSave: (id: string, text: string) => Promise<void>;
  onRetranscribe: (id: string) => Promise<void>;
  onApprove: (id: string, approved: boolean) => Promise<void>;
}) {
  const [editText, setEditText] = useState(sub.transcript_edited || sub.corrected_transcript || '');
  const [saving, setSaving] = useState(false);
  const [retranscribing, setRetranscribing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setEditText(sub.transcript_edited || sub.corrected_transcript || '');
  }, [sub.transcript_edited, sub.corrected_transcript]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(sub.id, editText);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  const handleRetranscribe = async () => {
    setRetranscribing(true);
    await onRetranscribe(sub.id);
    setRetranscribing(false);
  };

  const fmt = (d: string) => new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ width: 560, maxWidth: '95vw', height: '100vh', overflowY: 'auto', background: '#0f172a', borderLeft: '1px solid #1e293b', padding: 32, boxSizing: 'border-box' }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <div style={{ color: '#64748b', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Submission</div>
            <div style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 700 }}>{sub.first_name} {sub.last_name}</div>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>{sub.email_address}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #1e293b', color: '#94a3b8', cursor: 'pointer', borderRadius: 6, padding: '6px 12px', fontSize: 13 }}>✕ Close</button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {[sub.age_range, sub.gender, sub.birthplace, sub.native_speaker_of_dialect, sub.content_type].filter(Boolean).map((v, i) => (
            <span key={i} style={{ background: '#1e293b', color: '#94a3b8', fontSize: 12, padding: '3px 10px', borderRadius: 12 }}>{v}</span>
          ))}
          <span style={{ background: '#1e293b', color: '#94a3b8', fontSize: 12, padding: '3px 10px', borderRadius: 12 }}>
            {sub.audio_file_urls.length} audio file{sub.audio_file_urls.length !== 1 ? 's' : ''}
          </span>
        </div>

        {sub.topics_covered && (
          <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: '#94a3b8', fontSize: 13 }}>
            <span style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Topics: </span>
            {sub.topics_covered}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <StatusBadge status={sub.transcript_status} approved={sub.transcript_approved} />
          <div style={{ display: 'flex', gap: 8 }}>
            {(sub.transcript_status === 'pending' || sub.transcript_status === 'failed') && (
              <button onClick={handleRetranscribe} disabled={retranscribing} style={{ background: '#1e3a5f', border: '1px solid #2563eb', color: '#60a5fa', fontSize: 12, padding: '5px 12px', borderRadius: 6, cursor: retranscribing ? 'wait' : 'pointer', fontWeight: 600 }}>
                {retranscribing ? 'Starting…' : '⚡ Transcribe'}
              </button>
            )}
            {sub.transcript_status === 'done' && (
              <button onClick={handleRetranscribe} disabled={retranscribing} style={{ background: '#1e293b', border: '1px solid #334155', color: '#64748b', fontSize: 12, padding: '5px 12px', borderRadius: 6, cursor: retranscribing ? 'wait' : 'pointer' }}>
                {retranscribing ? 'Starting…' : '↻ Re-transcribe'}
              </button>
            )}
          </div>
        </div>

        {sub.transcript_status === 'processing' && (
          <div style={{ background: '#1e293b', borderRadius: 8, padding: 20, color: '#60a5fa', fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
            ⚡ Transcription in progress — refresh in a few seconds…
          </div>
        )}

        {sub.transcript_status === 'done' && (
          <>
            <div style={{ marginBottom: 8 }}>
              <label style={{ color: '#64748b', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Transcript (editable)
              </label>
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                disabled={sub.transcript_approved}
                rows={10}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: sub.transcript_approved ? '#0f172a' : '#1e293b',
                  border: `1px solid ${sub.transcript_approved ? '#1e293b' : '#334155'}`,
                  color: sub.transcript_approved ? '#64748b' : '#e2e8f0',
                  borderRadius: 8, padding: 14, fontSize: 14, lineHeight: 1.7,
                  resize: 'vertical', fontFamily: 'inherit',
                  cursor: sub.transcript_approved ? 'not-allowed' : 'text',
                }}
              />
            </div>

            {sub.raw_transcript && sub.raw_transcript !== editText && (
              <details style={{ marginBottom: 16 }}>
                <summary style={{ color: '#475569', fontSize: 12, cursor: 'pointer', userSelect: 'none' }}>Show original Whisper output</summary>
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, padding: 12, marginTop: 8, color: '#475569', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto' }}>
                  {sub.raw_transcript}
                </div>
              </details>
            )}

            {!sub.transcript_approved && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <button onClick={handleSave} disabled={saving} style={{ flex: 1, background: saving ? '#1e293b' : '#1e3a5f', border: '1px solid #2563eb', color: saving ? '#64748b' : '#93c5fd', padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}>
                  {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save edits'}
                </button>
                <button onClick={() => onApprove(sub.id, true)} style={{ flex: 1, background: '#064e3b', border: '1px solid #059669', color: '#6ee7b7', padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  ✓ Approve transcript
                </button>
              </div>
            )}

            {sub.transcript_approved && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div style={{ flex: 1, background: '#064e3b', border: '1px solid #059669', color: '#6ee7b7', padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                  ✓ Approved {sub.approved_at ? `· ${fmt(sub.approved_at)}` : ''}
                </div>
                <button onClick={() => onApprove(sub.id, false)} style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '10px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                  Revoke
                </button>
              </div>
            )}
          </>
        )}

        {sub.transcript_status === 'pending' && (
          <div style={{ background: '#1e293b', borderRadius: 8, padding: 20, color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
            No transcript yet. Click ⚡ Transcribe to run Whisper on this submission.
          </div>
        )}

        {sub.transcript_status === 'failed' && (
          <div style={{ background: '#3b1c1c', border: '1px solid #7f1d1d', borderRadius: 8, padding: 16, color: '#fca5a5', fontSize: 14, marginBottom: 20 }}>
            Transcription failed. Click ⚡ Transcribe to retry.
          </div>
        )}

        <div style={{ borderTop: '1px solid #1e293b', paddingTop: 16, marginTop: 8 }}>
          <div style={{ color: '#475569', fontSize: 12 }}>Submitted: {fmt(sub.submitted_at)}</div>
          {sub.transcribed_at && <div style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>Transcribed: {fmt(sub.transcribed_at)}</div>}
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
      if (!res.ok) throw new Error('Failed to load submissions');
      const json = await res.json();
      setSubmissions(json.submissions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  useEffect(() => {
    const hasProcessing = submissions.some(s => s.transcript_status === 'processing');
    if (!hasProcessing) return;
    const timer = setInterval(fetchSubmissions, 4000);
    return () => clearInterval(timer);
  }, [submissions, fetchSubmissions]);

  const handleSave = async (id: string, transcript_edited: string) => {
    await fetch('/api/submissions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, transcript_edited }) });
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, transcript_edited } : s));
    setSelected(prev => prev?.id === id ? { ...prev, transcript_edited } : prev);
  };

  const handleRetranscribe = async (id: string) => {
    await fetch('/api/submissions/retranscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, transcript_status: 'processing' } : s));
    setSelected(prev => prev?.id === id ? { ...prev, transcript_status: 'processing' as TranscriptStatus } : prev);
  };

  const handleApprove = async (id: string, approved: boolean) => {
    await fetch('/api/submissions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, transcript_approved: approved }) });
    const approved_at = approved ? new Date().toISOString() : null;
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, transcript_approved: approved, approved_at } : s));
    setSelected(prev => prev?.id === id ? { ...prev, transcript_approved: approved, approved_at } : prev);
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
    if (search) {
      const q = search.toLowerCase();
      return (s.first_name + ' ' + s.last_name + ' ' + s.email_address + ' ' + (s.topics_covered || '')).toLowerCase().includes(q);
    }
    return true;
  });

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: '#060b14', color: '#e2e8f0', fontFamily: '"DM Mono", "Fira Code", "Courier New", monospace' }}>
      <div style={{ borderBottom: '1px solid #1e293b', padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#080e1a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
          <span style={{ color: '#64748b', fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Voice Transcription</span>
          <span style={{ color: '#1e293b' }}>|</span>
          <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>Submission Admin</span>
        </div>
        <button onClick={fetchSubmissions} style={{ background: 'none', border: '1px solid #1e293b', color: '#475569', fontSize: 12, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', letterSpacing: '0.05em' }}>
          ↻ Refresh
        </button>
      </div>

      <div style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {(['all', 'pending', 'done', 'approved'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? '#1e3a5f' : '#0f172a', border: `1px solid ${filter === f ? '#2563eb' : '#1e293b'}`, color: filter === f ? '#93c5fd' : '#475569', fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'inherit' }}>
              {f} <span style={{ opacity: 0.6 }}>({counts[f]})</span>
            </button>
          ))}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name / email…" style={{ marginLeft: 'auto', background: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0', padding: '6px 14px', borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'inherit', minWidth: 200 }} />
        </div>

        {error && <div style={{ background: '#3b1c1c', border: '1px solid #7f1d1d', color: '#fca5a5', padding: 14, borderRadius: 8, marginBottom: 20, fontSize: 14 }}>{error}</div>}
        {loading && <div style={{ color: '#475569', fontSize: 14, textAlign: 'center', paddingTop: 60 }}>Loading submissions…</div>}

        {!loading && (
          <div style={{ border: '1px solid #1e293b', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 130px 90px 110px 30px', padding: '10px 16px', background: '#0a1120', borderBottom: '1px solid #1e293b' }}>
              {['Submitter', 'Email', 'Date', 'Files', 'Status', ''].map((h, i) => (
                <div key={i} style={{ color: '#334155', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>

            {filtered.length === 0 && <div style={{ color: '#334155', fontSize: 14, textAlign: 'center', padding: '48px 16px' }}>No submissions match this filter.</div>}

            {filtered.map((sub, i) => (
              <div key={sub.id} onClick={() => setSelected(sub)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 130px 90px 110px 30px', padding: '14px 16px', cursor: 'pointer', background: selected?.id === sub.id ? '#0d1a2d' : i % 2 === 0 ? '#080e1a' : '#060b14', borderBottom: '1px solid #1e293b' }}>
                <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>{sub.first_name} {sub.last_name}</div>
                <div style={{ color: '#64748b', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.email_address}</div>
                <div style={{ color: '#475569', fontSize: 12 }}>{fmt(sub.submitted_at)}</div>
                <div style={{ color: '#475569', fontSize: 12 }}>{sub.audio_file_urls.length} file{sub.audio_file_urls.length !== 1 ? 's' : ''}</div>
                <div><StatusBadge status={sub.transcript_status} approved={sub.transcript_approved} /></div>
                <div style={{ color: '#334155', fontSize: 12 }}>→</div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <div style={{ marginTop: 16, color: '#334155', fontSize: 12, textAlign: 'right', letterSpacing: '0.05em' }}>
            {filtered.length} of {submissions.length} submissions · {counts.approved} approved · {counts.done} awaiting review
          </div>
        )}
      </div>

      {selected && (
        <SubmissionPanel
          sub={selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          onRetranscribe={handleRetranscribe}
          onApprove={handleApprove}
        />
      )}
    </div>
  );
}
