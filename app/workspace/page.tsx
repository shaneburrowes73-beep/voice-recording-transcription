'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCurrentUser, signOut, getWorkspaceClient, WorkspaceUser,
  getTeamMembers, updateMemberRole, getOrgStats, TeamMember,
} from '@/lib/workspace-auth';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Transcript {
  id: string; created_at: string; officer_name: string; officer_role: string;
  raw_text: string | null; corrected_text: string | null; notes: string | null;
  status: 'Saved' | 'Pending' | 'Approved' | 'Rejected';
  review_note: string | null; reviewed_by: string | null;
  reviewed_at: string | null; user_id: string;
}
interface OrgStats { total: number; pending: number; approved: number; rejected: number; saved: number; members: number; }

const MAX_FILE_MB = 25;
const ACCEPTED = '.mp3,.wav,.m4a,.mp4,.ogg,.webm,.aac';
const ACCEPTED_TYPES = ['audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/m4a','audio/x-m4a','audio/ogg','audio/webm','audio/aac'];
const ROLES = ['Member', 'Supervisor', 'Admin'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(s: number) { const m = Math.floor(s/60),sec=s%60; return `${m}:${sec<10?'0':''}${sec}`; }
function fmtDate(d: string) { return new Date(d).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
function fmtDateShort(d: string) { return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }

function StatusChip({ status }: { status: Transcript['status'] }) {
  const m = { Saved:{bg:'#f3f4f6',c:'#6b7280',l:'Saved'}, Pending:{bg:'#fef3c7',c:'#92400e',l:'⏳ Pending'}, Approved:{bg:'#dcfce7',c:'#166534',l:'✓ Approved'}, Rejected:{bg:'#fee2e2',c:'#991b1b',l:'✗ Rejected'} };
  const s = m[status]||m.Saved;
  return <span style={{background:s.bg,color:s.c,fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,textTransform:'uppercase',letterSpacing:'0.04em'}}>{s.l}</span>;
}

// ─── Dashboard panel ──────────────────────────────────────────────────────────
function DashboardPanel({ user }: { user: WorkspaceUser }) {
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [invite, setInvite] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getOrgStats(user.orgId).then(setStats);
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://voice-recording-transcription.vercel.app';
    setInvite(`${base}/login?invite=1`);
  }, [user.orgId]);

  const copyInvite = () => {
    navigator.clipboard.writeText(invite);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statCards = stats ? [
    { label: 'Total transcripts', value: stats.total,    color: '#0f1f4b', bg: '#f0f4ff' },
    { label: 'Pending approval',  value: stats.pending,  color: '#92400e', bg: '#fef3c7' },
    { label: 'Approved',          value: stats.approved, color: '#166534', bg: '#dcfce7' },
    { label: 'Team members',      value: stats.members,  color: '#1e40af', bg: '#eff6ff' },
  ] : [];

  return (
    <div>
      <h2 style={{fontSize:17,fontWeight:700,color:'#0f1f4b',marginBottom:20}}>Dashboard</h2>

      {/* Stat cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:28}}>
        {stats ? statCards.map(s => (
          <div key={s.label} style={{background:s.bg,borderRadius:12,padding:'18px 16px'}}>
            <div style={{fontSize:28,fontWeight:800,color:s.color,marginBottom:4}}>{s.value}</div>
            <div style={{fontSize:12,color:s.color,fontWeight:600,opacity:0.75}}>{s.label}</div>
          </div>
        )) : [0,1,2,3].map(i => (
          <div key={i} style={{background:'#f3f4f6',borderRadius:12,padding:'18px 16px',height:72}} />
        ))}
      </div>

      {/* Quick actions */}
      <div style={{borderTop:'1px solid #f3f4f6',paddingTop:24,marginBottom:24}}>
        <div style={{fontSize:13,fontWeight:700,color:'#374151',marginBottom:14}}>Quick actions</div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <a href="#record" onClick={e=>{e.preventDefault();(window as any).__setTab?.('record');}}
            style={{display:'flex',alignItems:'center',gap:8,padding:'10px 18px',background:'#0f1f4b',color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',textDecoration:'none'}}>
            🎙️ New recording
          </a>
          <a href="#record" onClick={e=>{e.preventDefault();(window as any).__setTab?.('record');}}
            style={{display:'flex',alignItems:'center',gap:8,padding:'10px 18px',background:'#f3f4f6',color:'#374151',border:'1px solid #e5e7eb',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',textDecoration:'none'}}>
            📁 Upload file
          </a>
        </div>
      </div>

      {/* Invite link */}
      <div style={{borderTop:'1px solid #f3f4f6',paddingTop:24}}>
        <div style={{fontSize:13,fontWeight:700,color:'#374151',marginBottom:6}}>Invite team members</div>
        <p style={{fontSize:13,color:'#6b7280',marginBottom:12,lineHeight:1.6}}>
          Share this link with colleagues. They'll register and join your organisation automatically.
        </p>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:200,background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#374151',fontFamily:'monospace',wordBreak:'break-all'}}>
            {invite}
          </div>
          <button onClick={copyInvite}
            style={{padding:'10px 18px',background:copied?'#059669':'#0f1f4b',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',transition:'background 0.2s'}}>
            {copied ? '✓ Copied' : 'Copy link'}
          </button>
        </div>
        <p style={{fontSize:11,color:'#9ca3af',marginTop:8}}>
          Note: On the trial plan all users share one organisation. Upgrade for private team spaces.
        </p>
      </div>
    </div>
  );
}

// ─── Input panel (live record + file upload) ───────────────────────────────────
function InputPanel({ user, onSaved }: { user: WorkspaceUser; onSaved: () => void }) {
  const [inputMode, setInputMode] = useState<'record'|'upload'>('record');
  // Record
  const [recStep, setRecStep] = useState<'idle'|'recording'|'recorded'|'transcribing'|'review'|'saving'>('idle');
  const [seconds, setSeconds] = useState(0);
  const mrRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recBlobRef = useRef<Blob|null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  // Upload
  const [uploadFile, setUploadFile] = useState<File|null>(null);
  const [uploadStep, setUploadStep] = useState<'idle'|'uploading'|'transcribing'|'review'|'saving'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Shared
  const [transcript, setTranscript] = useState('');
  const [rawText, setRawText] = useState('');
  const [corrections, setCorrections] = useState(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const sb = getWorkspaceClient();

  const resetAll = () => {
    setRecStep('idle'); setUploadStep('idle'); setSeconds(0);
    setUploadFile(null); setUploadProgress(0); setUploadError('');
    setTranscript(''); setRawText(''); setCorrections(0); setNotes(''); setError('');
    recBlobRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Recording ───────────────────────────────────────────────────────────────
  const startRec = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' });
        recBlobRef.current = blob;
        // Save audio to Supabase Storage immediately so it's never lost
        try {
          const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'mp4' : 'webm';
          const urlRes = await fetch('/api/submit-upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: `live-recording.${ext}`, fileSize: blob.size, mimeType: blob.type || 'audio/webm' }),
          });
          if (urlRes.ok) {
            const { signedUrl } = await urlRes.json();
            await fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': blob.type || 'audio/webm' }, body: blob });
          }
        } catch (_e) { /* Storage save failed — blob still in memory, transcription will proceed */ }
        setRecStep('recorded');
      };
      mr.start(250);
      mrRef.current = mr;
      setRecStep('recording'); setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => { if (s >= 299) { stopRec(); return s; } return s+1; }), 1000);
    } catch (_e) { setError('Microphone access denied. Please allow access and try again.'); }
  };

  const stopRec = () => {
    clearInterval(timerRef.current!);
    if (mrRef.current?.state !== 'inactive') mrRef.current?.stop();
  };

  const transcribeBlob = async () => {
    if (!recBlobRef.current) return;
    setRecStep('transcribing'); setError('');
    try {
      const blob = recBlobRef.current;
      const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'mp4' : 'webm';
      const fd = new FormData();
      fd.append('audio', blob, `recording.${ext}`);
      const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error||`Error ${res.status}`); }
      const data = await res.json();
      setRawText(data.transcript||''); setTranscript(data.corrected_transcript||data.transcript||''); setCorrections(data.corrections_applied||0);
      setRecStep('review');
    } catch (e: any) { setError(e.message||'Transcription failed'); setRecStep('recorded'); }
  };

  // ── File upload ─────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploadError('');
    if (!ACCEPTED_TYPES.includes(f.type) && !f.name.match(/\.(mp3|wav|m4a|mp4|ogg|webm|aac)$/i)) { setUploadError('Unsupported file type.'); return; }
    if (f.size > MAX_FILE_MB * 1024 * 1024) { setUploadError(`File too large. Max ${MAX_FILE_MB} MB.`); return; }
    setUploadFile(f); setUploadStep('idle'); setTranscript(''); setRawText(''); setCorrections(0); setNotes('');
  };

  const transcribeUpload = async () => {
    if (!uploadFile) return;
    setUploadStep('uploading'); setUploadError(''); setUploadProgress(10);
    try {
      // 1 — get signed upload URL
      const urlRes = await fetch('/api/submit-upload-url', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ fileName: uploadFile.name, fileSize: uploadFile.size, mimeType: uploadFile.type||'audio/mpeg' }),
      });
      if (!urlRes.ok) { const e = await urlRes.json().catch(()=>({})); throw new Error(e.error||'Could not get upload URL'); }
      const { signedUrl, objectPath } = await urlRes.json();
      setUploadProgress(30);

      // 2 — upload to Supabase Storage
      const upRes = await fetch(signedUrl, { method: 'PUT', headers: {'Content-Type': uploadFile.type||'audio/mpeg'}, body: uploadFile });
      if (!upRes.ok) throw new Error(`Upload failed: ${upRes.status}`);
      setUploadProgress(60);

      // 3 — get a signed read URL for the transcribe route
      setUploadStep('transcribing');
      const readRes = await fetch('/api/submissions/signed-read-url', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ objectPath }),
      });
      let transcribeBody: BodyInit;
      let transcribeHeaders: Record<string,string> = {};
      if (readRes.ok) {
        const { signedReadUrl } = await readRes.json();
        transcribeBody = JSON.stringify({ storage_url: signedReadUrl });
        transcribeHeaders['Content-Type'] = 'application/json';
      } else {
        // Fallback — send the file directly
        const fd = new FormData();
        fd.append('audio', uploadFile, uploadFile.name);
        transcribeBody = fd;
      }
      const tRes = await fetch('/api/transcribe', { method: 'POST', headers: transcribeHeaders, body: transcribeBody });
      if (!tRes.ok) { const e = await tRes.json().catch(()=>({})); throw new Error(e.error||'Transcription failed'); }
      const data = await tRes.json();
      setUploadProgress(100);
      setRawText(data.transcript||''); setTranscript(data.corrected_transcript||data.transcript||''); setCorrections(data.corrections_applied||0);
      setUploadStep('review');
    } catch (e: any) { setUploadError(e.message||'Something went wrong'); setUploadStep('idle'); }
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const save = async (submitForApproval: boolean) => {
    if (inputMode === 'record') setRecStep('saving'); else setUploadStep('saving');
    try {
      const { error: err } = await sb.from('transcripts').insert({
        org_id: user.orgId, user_id: user.id,
        officer_name: user.fullName, officer_role: user.role,
        raw_text: rawText, corrected_text: transcript,
        notes: notes.trim()||null,
        status: submitForApproval ? 'Pending' : 'Saved',
      });
      if (err) throw new Error(err.message);
      onSaved(); resetAll();
    } catch (e: any) {
      setError(e.message||'Save failed');
      if (inputMode === 'record') setRecStep('review'); else setUploadStep('review');
    }
  };

  const isReview = recStep === 'review' || uploadStep === 'review';
  const isSaving = recStep === 'saving' || uploadStep === 'saving';
  const btn: React.CSSProperties = { display:'flex',alignItems:'center',gap:8,padding:'12px 22px',borderRadius:10,border:'none',fontSize:14,fontWeight:600,cursor:'pointer' };

  return (
    <div>
      <h2 style={{fontSize:17,fontWeight:700,color:'#0f1f4b',marginBottom:20}}>New Transcript</h2>

      {/* Mode toggle */}
      <div style={{display:'flex',background:'#f3f4f6',borderRadius:10,padding:4,marginBottom:24,gap:4,maxWidth:320}}>
        {(['record','upload'] as const).map(m => (
          <button key={m} onClick={() => { setInputMode(m); resetAll(); }}
            style={{flex:1,padding:'8px 0',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',background:inputMode===m?'#fff':'transparent',color:inputMode===m?'#0f1f4b':'#9ca3af',boxShadow:inputMode===m?'0 1px 3px rgba(0,0,0,0.1)':'none',transition:'all 0.15s'}}>
            {m==='record'?'🎙️ Live record':'📁 Upload file'}
          </button>
        ))}
      </div>

      {/* Live record */}
      {inputMode === 'record' && (
        <div style={{marginBottom:24}}>
          <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:12}}>Step 1 — Record</div>
          <p style={{fontSize:13,color:'#6b7280',marginBottom:14,lineHeight:1.6}}>Speak naturally. Max 5 minutes. Your recording is saved to storage as soon as you stop.</p>
          <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
            {recStep !== 'recording' ? (
              <button style={{...btn,background:'#0f1f4b',color:'#fff'}} onClick={startRec} disabled={recStep==='transcribing'||isSaving}>
                <div style={{width:10,height:10,borderRadius:'50%',background:'#fff'}} />
                {recStep==='idle'?'Start recording':'Record again'}
              </button>
            ) : (
              <button style={{...btn,background:'#dc2626',color:'#fff',animation:'recPulse 1.5s ease-in-out infinite'}} onClick={stopRec}>
                <div style={{width:10,height:10,borderRadius:2,background:'#fff'}} />
                Stop recording
              </button>
            )}
            {recStep==='recording' && <span style={{color:'#dc2626',fontSize:14,fontWeight:600}}>● {fmtTime(seconds)}</span>}
            {(recStep==='recorded'||recStep==='review'||isSaving) && <span style={{color:'#059669',fontSize:13,fontWeight:600}}>✓ Recording saved</span>}
          </div>
          {(recStep==='recorded'||recStep==='transcribing') && (
            <div style={{borderTop:'1px solid #f3f4f6',paddingTop:20,marginTop:20}}>
              <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:12}}>Step 2 — Transcribe</div>
              <button onClick={transcribeBlob} disabled={recStep==='transcribing'}
                style={{...btn,background:recStep==='transcribing'?'#9ca3af':'#059669',color:'#fff',cursor:recStep==='transcribing'?'wait':'pointer'}}>
                {recStep==='transcribing'?'⚡ Transcribing…':'⚡ Transcribe now'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* File upload */}
      {inputMode === 'upload' && (
        <div style={{marginBottom:24}}>
          <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:12}}>Step 1 — Select audio file</div>
          <p style={{fontSize:13,color:'#6b7280',marginBottom:14,lineHeight:1.6}}>MP3, WAV, M4A, MP4, OGG, WebM, AAC — up to {MAX_FILE_MB} MB.</p>
          <div onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f=e.dataTransfer.files[0]; if(f){const ev={target:{files:[f]}} as any; handleFileChange(ev);} }}
            style={{border:'2px dashed #d1d5db',borderRadius:12,padding:'28px 20px',textAlign:'center',cursor:'pointer',background:uploadFile?'#f0fdf4':'#f9fafb'}}>
            <div style={{fontSize:28,marginBottom:8}}>{uploadFile?'✓':'📁'}</div>
            {uploadFile ? (
              <div>
                <div style={{fontWeight:600,color:'#166534',fontSize:14}}>{uploadFile.name}</div>
                <div style={{fontSize:12,color:'#6b7280',marginTop:3}}>{(uploadFile.size/1024/1024).toFixed(1)} MB</div>
              </div>
            ) : (
              <div>
                <div style={{fontWeight:600,color:'#374151',fontSize:14}}>Click to choose a file</div>
                <div style={{fontSize:12,color:'#9ca3af',marginTop:3}}>or drag and drop here</div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept={ACCEPTED} onChange={handleFileChange} style={{display:'none'}} />
          </div>
          {uploadError && <div style={{marginTop:10,background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#b91c1c'}}>{uploadError}</div>}
          {uploadFile && !uploadError && (uploadStep==='idle'||uploadStep==='uploading'||uploadStep==='transcribing') && (
            <div style={{borderTop:'1px solid #f3f4f6',paddingTop:20,marginTop:20}}>
              <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:12}}>Step 2 — Transcribe</div>
              {uploadStep==='uploading'||uploadStep==='transcribing' ? (
                <div>
                  <div style={{fontSize:13,color:'#374151',fontWeight:600,marginBottom:8}}>{uploadStep==='uploading'?'↑ Uploading…':'⚡ Transcribing…'}</div>
                  <div style={{height:6,background:'#e5e7eb',borderRadius:6,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${uploadProgress}%`,background:'#059669',transition:'width 0.4s',borderRadius:6}} />
                  </div>
                </div>
              ) : (
                <button onClick={transcribeUpload} style={{...btn,background:'#059669',color:'#fff'}}>⚡ Transcribe file</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Shared review step */}
      {isReview && (
        <div style={{borderTop:'1px solid #f3f4f6',paddingTop:20}}>
          <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:12}}>Step 3 — Review & submit</div>
          {corrections > 0 && (
            <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:13,color:'#166534'}}>
              ✓ {corrections} Barbadian dialect correction{corrections!==1?'s':''} applied
            </div>
          )}
          <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>Transcript — edit if needed</label>
          <textarea value={transcript} onChange={e => setTranscript(e.target.value)} rows={7}
            style={{width:'100%',border:'1px solid #d1d5db',borderRadius:8,padding:'10px 12px',fontSize:13,lineHeight:1.7,color:'#111827',background:'#fff',resize:'vertical',fontFamily:'inherit',outline:'none',marginBottom:14}} />
          {rawText && rawText !== transcript && (
            <details style={{marginBottom:16}}>
              <summary style={{fontSize:12,color:'#9ca3af',cursor:'pointer',userSelect:'none'}}>Show original Whisper output</summary>
              <div style={{background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:8,padding:'10px 14px',marginTop:6,fontSize:12,color:'#6b7280',lineHeight:1.7}}>{rawText}</div>
            </details>
          )}
          <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any additional context…"
            style={{width:'100%',border:'1px solid #d1d5db',borderRadius:8,padding:'10px 12px',fontSize:13,lineHeight:1.6,color:'#111827',background:'#fff',resize:'vertical',fontFamily:'inherit',outline:'none',marginBottom:18}} />
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <button onClick={() => save(true)} disabled={isSaving||!transcript.trim()}
              style={{padding:'11px 22px',background:isSaving||!transcript.trim()?'#9ca3af':'#0f1f4b',color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:isSaving||!transcript.trim()?'not-allowed':'pointer'}}>
              {user.isSupervisor?'✓ Save & approve':'→ Submit for approval'}
            </button>
            <button onClick={() => save(false)} disabled={isSaving||!transcript.trim()}
              style={{padding:'11px 22px',background:'#f3f4f6',color:'#374151',border:'1px solid #e5e7eb',borderRadius:10,fontSize:13,fontWeight:600,cursor:isSaving||!transcript.trim()?'not-allowed':'pointer'}}>
              Save draft
            </button>
            <button onClick={resetAll} disabled={isSaving}
              style={{padding:'11px 22px',background:'transparent',color:'#9ca3af',border:'none',borderRadius:10,fontSize:13,cursor:'pointer'}}>
              Start over
            </button>
          </div>
        </div>
      )}
      {error && <div style={{marginTop:16,background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#b91c1c'}}>{error}</div>}
    </div>
  );
}

// ─── Records panel ─────────────────────────────────────────────────────────────
function RecordsPanel({ user, refresh }: { user: WorkspaceUser; refresh: number }) {
  const [records, setRecords] = useState<Transcript[]>([]);
  const [selected, setSelected] = useState<Transcript|null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [filter, setFilter] = useState<'All'|'Pending'|'Approved'|'Rejected'|'Saved'>('All');
  const [search, setSearch] = useState('');
  const sb = getWorkspaceClient();

  const fetchRecords = useCallback(async () => {
    const { data } = await sb.from('transcripts').select('*').eq('org_id', user.orgId).order('created_at', { ascending: false });
    setRecords(data||[]);
  }, [user.orgId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords, refresh]);

  const decide = async (status: 'Approved'|'Rejected') => {
    if (!selected) return;
    setDeciding(true);
    await sb.from('transcripts').update({ status, review_note: reviewNote.trim()||null, reviewed_by: user.fullName, reviewed_at: new Date().toISOString() }).eq('id', selected.id);
    await fetchRecords();
    setSelected(null); setReviewNote(''); setDeciding(false);
  };

  const counts: Record<string,number> = {
    All: records.length,
    Pending: records.filter(r=>r.status==='Pending').length,
    Approved: records.filter(r=>r.status==='Approved').length,
    Rejected: records.filter(r=>r.status==='Rejected').length,
    Saved: records.filter(r=>r.status==='Saved').length,
  };

  const visible = records.filter(r => {
    if (filter !== 'All' && r.status !== filter) return false;
    if (search) return (r.officer_name + ' ' + (r.corrected_text||'')).toLowerCase().includes(search.toLowerCase());
    return true;
  });

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h2 style={{fontSize:17,fontWeight:700,color:'#0f1f4b'}}>Transcripts</h2>
        <span style={{fontSize:12,color:'#9ca3af'}}>{records.length} total</span>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        {(['All','Pending','Approved','Rejected','Saved'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{padding:'5px 12px',border:`1px solid ${filter===f?'#0f1f4b':'#e5e7eb'}`,borderRadius:20,fontSize:12,fontWeight:600,background:filter===f?'#0f1f4b':'#fff',color:filter===f?'#fff':'#6b7280',cursor:'pointer'}}>
            {f} <span style={{opacity:0.7}}>({counts[f]})</span>
          </button>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or transcript…"
        style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:8,padding:'8px 12px',fontSize:13,outline:'none',marginBottom:16,fontFamily:'inherit'}} />

      {visible.length === 0 && (
        <div style={{textAlign:'center',padding:'40px 0',color:'#9ca3af',fontSize:14}}>No transcripts match this filter.</div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {visible.map(r => (
          <div key={r.id} onClick={() => { setSelected(r); setReviewNote(''); }}
            style={{background:selected?.id===r.id?'#f0f4ff':'#fff',border:`1px solid ${selected?.id===r.id?'#c7d2fe':'#e5e7eb'}`,borderRadius:12,padding:'16px 18px',cursor:'pointer'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
              <div>
                <div style={{fontWeight:600,color:'#0f1f4b',fontSize:14}}>{r.officer_name}</div>
                <div style={{fontSize:12,color:'#9ca3af'}}>{r.officer_role} · {fmtDate(r.created_at)}</div>
              </div>
              <StatusChip status={r.status} />
            </div>
            <div style={{fontSize:13,color:'#6b7280',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
              {r.corrected_text||r.raw_text||'(empty)'}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div style={{position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'flex-start',justifyContent:'flex-end',background:'rgba(0,0,0,0.5)',backdropFilter:'blur(3px)'}} onClick={() => setSelected(null)}>
          <div style={{width:520,maxWidth:'95vw',height:'100vh',overflowY:'auto',background:'#fff',padding:28,boxSizing:'border-box',borderLeft:'1px solid #e5e7eb'}} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
              <div>
                <div style={{fontWeight:700,color:'#0f1f4b',fontSize:17}}>{selected.officer_name}</div>
                <div style={{fontSize:13,color:'#9ca3af'}}>{selected.officer_role} · {fmtDate(selected.created_at)}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{background:'none',border:'1px solid #e5e7eb',borderRadius:8,padding:'5px 10px',cursor:'pointer',fontSize:12,color:'#6b7280'}}>✕ Close</button>
            </div>
            <div style={{marginBottom:16}}><StatusChip status={selected.status} /></div>
            <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>Transcript</label>
            <div style={{background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:8,padding:'12px 14px',fontSize:13,lineHeight:1.7,color:'#111827',marginBottom:16,whiteSpace:'pre-wrap',maxHeight:320,overflowY:'auto'}}>
              {selected.corrected_text||selected.raw_text||'(empty)'}
            </div>
            {selected.notes && (
              <div style={{marginBottom:16}}>
                <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>Notes</label>
                <div style={{background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#374151'}}>{selected.notes}</div>
              </div>
            )}
            {selected.review_note && (
              <div style={{background:'#fef3c7',border:'1px solid #fde68a',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:13,color:'#92400e'}}>
                <strong>Review note:</strong> {selected.review_note}
                <div style={{fontSize:11,marginTop:4,color:'#a16207'}}>— {selected.reviewed_by} · {selected.reviewed_at?fmtDate(selected.reviewed_at):''}</div>
              </div>
            )}
            {user.isSupervisor && selected.status === 'Pending' && (
              <div style={{borderTop:'1px solid #f3f4f6',paddingTop:18,marginTop:8}}>
                <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>Review note (optional)</label>
                <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={3} placeholder="Add context for the submitter…"
                  style={{width:'100%',border:'1px solid #d1d5db',borderRadius:8,padding:'10px 12px',fontSize:13,fontFamily:'inherit',outline:'none',resize:'vertical',marginBottom:12}} />
                <div style={{display:'flex',gap:10}}>
                  <button onClick={() => decide('Rejected')} disabled={deciding}
                    style={{flex:1,padding:'11px 0',background:'#fef2f2',border:'1px solid #fecaca',color:'#b91c1c',borderRadius:10,fontSize:13,fontWeight:700,cursor:deciding?'wait':'pointer'}}>✗ Reject</button>
                  <button onClick={() => decide('Approved')} disabled={deciding}
                    style={{flex:1,padding:'11px 0',background:'#0f1f4b',color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:deciding?'wait':'pointer'}}>✓ Approve</button>
                </div>
              </div>
            )}
            {user.isSupervisor && selected.status === 'Approved' && (
              <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#166534',fontWeight:600}}>
                ✓ Approved by {selected.reviewed_by} · {selected.reviewed_at?fmtDate(selected.reviewed_at):''}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Team panel ───────────────────────────────────────────────────────────────
function TeamPanel({ user }: { user: WorkspaceUser }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string|null>(null);
  const [invite, setInvite] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getTeamMembers(user.orgId).then(m => { setMembers(m); setLoading(false); });
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    setInvite(`${base}/login?invite=1`);
  }, [user.orgId]);

  const changeRole = async (memberId: string, newRole: string) => {
    setUpdating(memberId);
    try {
      await updateMemberRole(memberId, newRole);
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    } catch (_e) { /* silently fail — refresh to get true state */ }
    setUpdating(null);
  };

  const copyInvite = () => { navigator.clipboard.writeText(invite); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h2 style={{fontSize:17,fontWeight:700,color:'#0f1f4b'}}>Team</h2>
        <span style={{fontSize:12,color:'#9ca3af'}}>{members.length} member{members.length!==1?'s':''}</span>
      </div>

      {/* Invite section */}
      <div style={{background:'#f0f4ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'18px 18px',marginBottom:24}}>
        <div style={{fontSize:13,fontWeight:700,color:'#0f1f4b',marginBottom:6}}>Invite a team member</div>
        <p style={{fontSize:13,color:'#4338ca',marginBottom:12,lineHeight:1.5}}>Share this link. New members register and join your organisation automatically.</p>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:180,background:'#fff',border:'1px solid #c7d2fe',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#374151',fontFamily:'monospace',wordBreak:'break-all'}}>{invite}</div>
          <button onClick={copyInvite}
            style={{padding:'9px 16px',background:copied?'#059669':'#4f46e5',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
            {copied?'✓ Copied':'Copy link'}
          </button>
        </div>
      </div>

      {/* Member list */}
      {loading ? (
        <div style={{color:'#9ca3af',fontSize:14,textAlign:'center',padding:'24px 0'}}>Loading team…</div>
      ) : members.length === 0 ? (
        <div style={{color:'#9ca3af',fontSize:14,textAlign:'center',padding:'24px 0'}}>No team members yet. Share the invite link above.</div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {members.map(m => (
            <div key={m.id} style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:12,padding:'16px 18px',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
              <div style={{width:40,height:40,borderRadius:'50%',background:'#0f1f4b',color:'#c9a84c',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,flexShrink:0}}>
                {m.full_name.charAt(0).toUpperCase()}
              </div>
              <div style={{flex:1,minWidth:120}}>
                <div style={{fontWeight:600,color:'#0f1f4b',fontSize:14}}>{m.full_name}</div>
                <div style={{fontSize:12,color:'#9ca3af'}}>
                  Joined {fmtDateShort(m.created_at)}
                  {m.last_active ? ` · Last active ${fmtDateShort(m.last_active)}` : ''}
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                {m.status === 'suspended' && (
                  <span style={{fontSize:11,background:'#fee2e2',color:'#991b1b',padding:'2px 8px',borderRadius:20,fontWeight:700}}>Suspended</span>
                )}
                {user.isAdmin && m.id !== user.id ? (
                  <select value={m.role} onChange={e => changeRole(m.id, e.target.value)}
                    disabled={updating === m.id}
                    style={{padding:'6px 10px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:12,fontWeight:600,color:'#374151',background:'#fff',cursor:'pointer',outline:'none'}}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : (
                  <span style={{fontSize:12,fontWeight:600,color:'#4b5563',background:'#f3f4f6',padding:'5px 10px',borderRadius:8}}>{m.role}</span>
                )}
                {m.id === user.id && <span style={{fontSize:11,color:'#9ca3af',fontStyle:'italic'}}>(you)</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{marginTop:20,padding:'14px 16px',background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:10,fontSize:12,color:'#6b7280',lineHeight:1.6}}>
        <strong style={{color:'#374151'}}>Role permissions:</strong> Members can create and submit transcripts. Supervisors can approve or reject. Admins can change team member roles.
        {!user.isAdmin && <div style={{marginTop:6,color:'#9ca3af'}}>Contact your Admin to change your role.</div>}
      </div>
    </div>
  );
}

// ─── Pricing panel ─────────────────────────────────────────────────────────────
function PricingPanel() {
  const plans = [
    {
      name: 'Trial', price: 'Free', period: 'forever',
      highlight: false, current: true,
      features: ['Shared trial workspace','Live record & file upload','Whisper transcription','Barbadian dialect correction','Basic approval workflow','Up to 10 transcripts/month'],
      cta: 'Current plan', ctaDisabled: true,
    },
    {
      name: 'Professional', price: '$149', period: 'per month',
      highlight: true, current: false,
      features: ['Private organisation','Up to 10 team members','Unlimited transcripts','Custom branding','Priority support','CSV export','Audit log'],
      cta: 'Request upgrade', ctaDisabled: false,
    },
    {
      name: 'Enterprise', price: 'Custom', period: 'per year',
      highlight: false, current: false,
      features: ['Dedicated infrastructure','Unlimited team members','White-label deployment','Your own domain','SLA guarantee','Training & onboarding','Dedicated account manager'],
      cta: 'Contact us', ctaDisabled: false,
    },
  ];

  return (
    <div>
      <h2 style={{fontSize:17,fontWeight:700,color:'#0f1f4b',marginBottom:6}}>Plans & Pricing</h2>
      <p style={{fontSize:13,color:'#6b7280',marginBottom:28,lineHeight:1.6}}>
        Upgrade to get your own private organisation, custom branding, and dedicated infrastructure.
      </p>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:16,marginBottom:28}}>
        {plans.map(p => (
          <div key={p.name} style={{background:p.highlight?'#0f1f4b':'#fff',border:`2px solid ${p.highlight?'#c9a84c':'#e5e7eb'}`,borderRadius:16,padding:'24px 22px',position:'relative'}}>
            {p.highlight && <div style={{position:'absolute',top:-12,left:'50%',transform:'translateX(-50%)',background:'#c9a84c',color:'#0f1f4b',fontSize:11,fontWeight:800,padding:'4px 14px',borderRadius:20,whiteSpace:'nowrap',letterSpacing:'0.04em'}}>MOST POPULAR</div>}
            {p.current && <div style={{position:'absolute',top:-12,left:'50%',transform:'translateX(-50%)',background:'#e5e7eb',color:'#6b7280',fontSize:11,fontWeight:700,padding:'4px 14px',borderRadius:20,whiteSpace:'nowrap'}}>CURRENT PLAN</div>}
            <div style={{fontSize:15,fontWeight:800,color:p.highlight?'#c9a84c':'#0f1f4b',marginBottom:6}}>{p.name}</div>
            <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:16}}>
              <span style={{fontSize:32,fontWeight:800,color:p.highlight?'#fff':'#0f1f4b'}}>{p.price}</span>
              {p.price !== 'Custom' && <span style={{fontSize:13,color:p.highlight?'rgba(255,255,255,0.6)':'#9ca3af'}}>{p.period}</span>}
            </div>
            <ul style={{listStyle:'none',padding:0,margin:'0 0 24px',display:'flex',flexDirection:'column',gap:8}}>
              {p.features.map(f => (
                <li key={f} style={{display:'flex',alignItems:'flex-start',gap:8,fontSize:13,color:p.highlight?'rgba(255,255,255,0.85)':'#374151'}}>
                  <span style={{color:p.highlight?'#c9a84c':'#059669',flexShrink:0,marginTop:1}}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            {p.ctaDisabled ? (
              <div style={{textAlign:'center',padding:'11px 0',background:'rgba(255,255,255,0.1)',borderRadius:10,fontSize:13,color:p.highlight?'rgba(255,255,255,0.5)':'#9ca3af',fontWeight:600}}>{p.cta}</div>
            ) : (
              <a href={`mailto:AISolutions@aisolutionsnet.net?subject=Voice Transcript ${p.name} Plan Request`}
                style={{display:'block',textAlign:'center',padding:'11px 0',background:p.highlight?'#c9a84c':'#0f1f4b',color:p.highlight?'#0f1f4b':'#fff',borderRadius:10,fontSize:13,fontWeight:700,textDecoration:'none'}}>
                {p.cta} →
              </a>
            )}
          </div>
        ))}
      </div>

      <div style={{background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:12,padding:'18px 20px'}}>
        <div style={{fontSize:13,fontWeight:700,color:'#374151',marginBottom:6}}>Need something specific?</div>
        <p style={{fontSize:13,color:'#6b7280',marginBottom:12,lineHeight:1.6}}>
          Government agencies, police forces and healthcare providers often have custom requirements around data residency, white-labelling, and procurement. We handle all of that.
        </p>
        <a href="mailto:AISolutions@aisolutionsnet.net?subject=Voice Transcript — Enterprise Enquiry"
          style={{fontSize:13,color:'#4f46e5',fontWeight:600,textDecoration:'none'}}>
          Talk to us about enterprise deployment →
        </a>
      </div>
    </div>
  );
}

// ─── Main workspace page ──────────────────────────────────────────────────────
type Tab = 'dashboard' | 'record' | 'records' | 'team' | 'pricing';

export default function WorkspacePage() {
  const router = useRouter();
  const [user, setUser] = useState<WorkspaceUser|null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [refresh, setRefresh] = useState(0);

  // Expose tab setter for quick-action links inside Dashboard
  useEffect(() => { (window as any).__setTab = setTab; return () => { delete (window as any).__setTab; }; }, []);

  useEffect(() => {
    getCurrentUser().then(u => {
      if (!u) { router.replace('/login'); return; }
      setUser(u); setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui',color:'#6b7280',fontSize:14}}>Loading workspace…</div>
  );
  if (!user) return null;

  const tabs: { key: Tab; label: string; adminOnly?: boolean }[] = [
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'record',    label: '🎙️ New transcript' },
    { key: 'records',   label: '🗄️ Transcripts' },
    { key: 'team',      label: '👥 Team' },
    { key: 'pricing',   label: '💳 Plans' },
  ];

  return (
    <div style={{minHeight:'100vh',background:'#f8f9fc',fontFamily:'"Segoe UI", system-ui, sans-serif'}}>
      <style>{`@keyframes recPulse{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,0.4)}50%{box-shadow:0 0 0 12px rgba(220,38,38,0)}} *{box-sizing:border-box}`}</style>

      {/* Nav */}
      <nav style={{background:'#0f1f4b',padding:'12px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:32,height:32,borderRadius:6,background:'#c9a84c',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14,color:'#0f1f4b'}}>AI</div>
          <div>
            <div style={{color:'#fff',fontWeight:600,fontSize:14}}>Voice Transcript</div>
            <div style={{color:'rgba(255,255,255,0.5)',fontSize:11}}>{user.orgName} · Trial</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div style={{textAlign:'right'}}>
            <div style={{color:'#fff',fontSize:13,fontWeight:500}}>{user.fullName}</div>
            <div style={{color:'rgba(255,255,255,0.5)',fontSize:11}}>{user.role}</div>
          </div>
          <button onClick={async () => { await signOut(); router.push('/'); }}
            style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'rgba(255,255,255,0.7)',padding:'6px 14px',borderRadius:8,fontSize:12,cursor:'pointer'}}>
            Sign out
          </button>
        </div>
      </nav>

      <div style={{maxWidth:760,margin:'0 auto',padding:'28px 20px'}}>

        {/* Tab bar */}
        <div style={{display:'flex',gap:2,background:'#fff',border:'1px solid #e5e7eb',borderRadius:12,padding:4,marginBottom:24,overflowX:'auto'}}>
          {tabs.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              style={{flex:'1 0 auto',padding:'9px 10px',border:'none',borderRadius:10,fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',background:tab===key?'#0f1f4b':'transparent',color:tab===key?'#fff':'#6b7280',transition:'all 0.15s'}}>
              {label}
            </button>
          ))}
        </div>

        {/* Content card */}
        <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:16,padding:'28px 24px'}}>
          {tab === 'dashboard' && <DashboardPanel user={user} />}
          {tab === 'record'    && <InputPanel user={user} onSaved={() => { setTab('records'); setRefresh(r => r+1); }} />}
          {tab === 'records'   && <RecordsPanel user={user} refresh={refresh} />}
          {tab === 'team'      && <TeamPanel user={user} />}
          {tab === 'pricing'   && <PricingPanel />}
        </div>
      </div>
    </div>
  );
}
