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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

function fmt(d: string) {
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

// ─── Record panel ─────────────────────────────────────────────────────────────
function RecordPanel({ user, onSaved }: { user: WorkspaceUser; onSaved: () => void }) {
  const [step, setStep] = useState<'idle' | 'recording' | 'recorded' | 'transcribing' | 'review' | 'saving'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [corrections, setCorrections] = useState(0);
  const [rawText, setRawText] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sb = getWorkspaceClient();

  const startRec = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        blobRef.current = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' });
        setStep('recorded');
      };
      mr.start(250);
      mrRef.current = mr;
      setStep('recording');
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

  const transcribe = async () => {
    if (!blobRef.current) return;
    setStep('transcribing');
    setError('');
    try {
      const fd = new FormData();
      const ext = blobRef.current.type.includes('ogg') ? 'ogg' : blobRef.current.type.includes('mp4') ? 'mp4' : 'webm';
      fd.append('audio', blobRef.current, `recording.${ext}`);
      const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Error ${res.status}`); }
      const data = await res.json();
      setRawText(data.transcript || '');
      setTranscript(data.corrected_transcript || data.transcript || '');
      setCorrections(data.corrections_applied || 0);
      setStep('review');
    } catch (e: any) {
      setError(e.message || 'Transcription failed');
      setStep('recorded');
    }
  };

  const save = async (submitForApproval: boolean) => {
    setStep('saving');
    try {
      const { error: err } = await sb.from('transcripts').insert({
        org_id: user.orgId,
        user_id: user.id,
        officer_name: user.fullName,
        officer_role: user.role,
        raw_text: rawText,
        corrected_text: transcript,
        notes: notes.trim() || null,
        status: submitForApproval ? 'Pending' : 'Saved',
      });
      if (err) throw new Error(err.message);
      onSaved();
      // Reset
      setStep('idle');
      setTranscript(''); setRawText(''); setNotes(''); setSeconds(0); setCorrections(0);
    } catch (e: any) {
      setError(e.message || 'Save failed');
      setStep('review');
    }
  };

  const recBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '13px 24px', borderRadius: 10, border: 'none',
    background: step === 'recording' ? '#dc2626' : '#0f1f4b',
    color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
    animation: step === 'recording' ? 'recPulse 1.5s ease-in-out infinite' : 'none',
  };

  return (
    <div>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f1f4b', marginBottom: 20 }}>New Recording</h2>

      {/* Step 1 — Record */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          Step 1 — Record
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {step !== 'recording' ? (
            <button style={recBtnStyle} onClick={startRec} disabled={step === 'transcribing' || step === 'saving'}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff' }} />
              {step === 'idle' ? 'Start recording' : 'Record again'}
            </button>
          ) : (
            <button style={recBtnStyle} onClick={stopRec}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#fff' }} />
              Stop recording
            </button>
          )}
          {step === 'recording' && (
            <span style={{ color: '#dc2626', fontSize: 14, fontWeight: 600 }}>● {formatTime(seconds)}</span>
          )}
          {(step === 'recorded' || step === 'review' || step === 'saving') && (
            <span style={{ color: '#059669', fontSize: 13, fontWeight: 600 }}>✓ Recording ready</span>
          )}
        </div>
      </div>

      {/* Step 2 — Transcribe */}
      {(step === 'recorded' || step === 'transcribing') && (
        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            Step 2 — Transcribe
          </div>
          <button onClick={transcribe} disabled={step === 'transcribing'}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 10, border: 'none', background: step === 'transcribing' ? '#9ca3af' : '#059669', color: '#fff', fontSize: 14, fontWeight: 600, cursor: step === 'transcribing' ? 'wait' : 'pointer' }}>
            {step === 'transcribing' ? '⚡ Transcribing…' : '⚡ Transcribe now'}
          </button>
        </div>
      )}

      {/* Step 3 — Review & Save */}
      {(step === 'review' || step === 'saving') && (
        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            Step 3 — Review & submit
          </div>

          {corrections > 0 && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 13, color: '#166534' }}>
              ✓ {corrections} Barbadian dialect correction{corrections !== 1 ? 's' : ''} applied
            </div>
          )}

          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Transcript — edit if needed</label>
          <textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            rows={7}
            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 13, lineHeight: 1.7, color: '#111827', background: '#fff', resize: 'vertical', fontFamily: 'inherit', outline: 'none', marginBottom: 14 }}
          />

          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Notes (optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Any additional context…"
            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 13, lineHeight: 1.6, color: '#111827', background: '#fff', resize: 'vertical', fontFamily: 'inherit', outline: 'none', marginBottom: 18 }}
          />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => save(true)} disabled={step === 'saving' || !transcript.trim()}
              style={{ padding: '11px 22px', background: step === 'saving' || !transcript.trim() ? '#9ca3af' : '#0f1f4b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: step === 'saving' || !transcript.trim() ? 'not-allowed' : 'pointer' }}>
              {user.isSupervisor ? '✓ Save & approve' : '→ Submit for approval'}
            </button>
            <button onClick={() => save(false)} disabled={step === 'saving' || !transcript.trim()}
              style={{ padding: '11px 22px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: step === 'saving' || !transcript.trim() ? 'not-allowed' : 'pointer' }}>
              Save draft
            </button>
          </div>
        </div>
      )}

      {error && <div style={{ marginTop: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#b91c1c' }}>{error}</div>}
    </div>
  );
}

// ─── Records panel ────────────────────────────────────────────────────────────
function RecordsPanel({ user, refresh }: { user: WorkspaceUser; refresh: number }) {
  const [records, setRecords] = useState<Transcript[]>([]);
  const [selected, setSelected] = useState<Transcript | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const sb = getWorkspaceClient();

  const fetchRecords = useCallback(async () => {
    const q = sb.from('transcripts').select('*').eq('org_id', user.orgId).order('created_at', { ascending: false });
    const { data } = await q;
    setRecords(data || []);
  }, [user.orgId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords, refresh]);

  const decide = async (status: 'Approved' | 'Rejected') => {
    if (!selected) return;
    setDeciding(true);
    await sb.from('transcripts').update({
      status,
      review_note: reviewNote.trim() || null,
      reviewed_by: user.fullName,
      reviewed_at: new Date().toISOString(),
    }).eq('id', selected.id);
    await fetchRecords();
    setSelected(null); setReviewNote(''); setDeciding(false);
  };

  const visible = records.filter(r => filter === 'All' || r.status === filter);

  return (
    <div>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f1f4b', marginBottom: 20 }}>Transcripts</h2>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '5px 14px', border: `1px solid ${filter === f ? '#0f1f4b' : '#e5e7eb'}`, borderRadius: 20, fontSize: 12, fontWeight: 600, background: filter === f ? '#0f1f4b' : '#fff', color: filter === f ? '#fff' : '#6b7280', cursor: 'pointer' }}>
            {f} <span style={{ opacity: 0.7 }}>({(f === 'All' ? records : records.filter(r => r.status === f)).length})</span>
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
            style={{ background: selected?.id === r.id ? '#f0f4ff' : '#fff', border: `1px solid ${selected?.id === r.id ? '#c7d2fe' : '#e5e7eb'}`, borderRadius: 12, padding: '16px 18px', cursor: 'pointer', transition: 'all 0.15s' }}>
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

            <div style={{ marginBottom: 12 }}><StatusChip status={selected.status} /></div>

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

            {/* Supervisor approval */}
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
      setUser(u);
      setLoading(false);
    });
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', color: '#6b7280', fontSize: 14 }}>
      Loading workspace…
    </div>
  );

  if (!user) return null;

  const pending = 0; // Would fetch count in production

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fc', fontFamily: '"Segoe UI", system-ui, sans-serif' }}>
      <style>{`
        @keyframes recPulse{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,0.4)}50%{box-shadow:0 0 0 12px rgba(220,38,38,0)}}
        * { box-sizing: border-box; }
      `}</style>

      {/* Nav */}
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
          <button onClick={handleSignOut} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Sign out</button>
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px' }}>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {[
            { key: 'record', label: '🎙️ New recording' },
            { key: 'records', label: '🗄️ My transcripts' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key as any)}
              style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === key ? '#0f1f4b' : 'transparent', color: tab === key ? '#fff' : '#6b7280', transition: 'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Content card */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '28px 24px' }}>
          {tab === 'record' && (
            <RecordPanel user={user} onSaved={() => { setTab('records'); setRefresh(r => r + 1); }} />
          )}
          {tab === 'records' && (
            <RecordsPanel user={user} refresh={refresh} />
          )}
        </div>

        {/* Trial banner */}
        <div style={{ marginTop: 20, background: 'linear-gradient(135deg, #0f1f4b, #1a3070)', borderRadius: 12, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ color: '#c9a84c', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Trial workspace</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>Upgrade to get your own organisation, team members, and custom branding.</div>
          </div>
          <a href="mailto:AISolutions@aisolutionsnet.net?subject=Voice Transcript Upgrade Request" style={{ background: '#c9a84c', color: '#0f1f4b', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', textDecoration: 'none' }}>
            Upgrade plan →
          </a>
        </div>
      </div>
    </div>
  );
}
