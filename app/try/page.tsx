'use client';

import React, { useState, useRef } from 'react';

type Step = 'idle' | 'recording' | 'recorded' | 'transcribing' | 'done' | 'failed';

interface TranscriptResult {
  transcript: string;
  corrected_transcript: string;
  corrections_applied: number;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

export default function TryPage() {
  const [step, setStep] = useState<Step>('idle');
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [editText, setEditText] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    setError('');
    setResult(null);
    setEditText('');
    setSaved(false);
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
      mediaRecorderRef.current = mr;
      setStep('recording');
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds(s => {
          if (s >= 119) { stopRecording(); return s; }
          return s + 1;
        });
      }, 1000);
    } catch (_e) {
      setError('Microphone access denied. Please allow microphone access in your browser and try again.');
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current!);
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }
      const data = await res.json() as TranscriptResult;
      setResult(data);
      setEditText(data.corrected_transcript || data.transcript || '');
      setStep('done');
    } catch (e: any) {
      setError(e.message || 'Transcription failed. Please try again.');
      setStep('failed');
    }
  };

  const reset = () => {
    setStep('idle');
    setSeconds(0);
    setResult(null);
    setEditText('');
    setError('');
    setSaved(false);
    blobRef.current = null;
  };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const page: React.CSSProperties = {
    minHeight: '100vh',
    background: '#f8f9fc',
    fontFamily: '"Segoe UI", system-ui, sans-serif',
  };

  const nav: React.CSSProperties = {
    background: '#0f1f4b',
    padding: '14px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const card: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e2e6f0',
    borderRadius: 16,
    padding: 32,
    maxWidth: 680,
    margin: '40px auto',
  };

  const recBtn: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 28px',
    borderRadius: 10,
    border: 'none',
    background: step === 'recording' ? '#dc2626' : '#0f1f4b',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    animation: step === 'recording' ? 'recPulse 1.5s ease-in-out infinite' : 'none',
  };

  return (
    <div style={page}>
      <style>{`
        @keyframes recPulse{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,0.4)}50%{box-shadow:0 0 0 12px rgba(220,38,38,0)}}
        @keyframes dotBlink{0%,100%{opacity:1}50%{opacity:0.2}}
        * { box-sizing: border-box; }
      `}</style>

      {/* Nav */}
      <nav style={nav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#0f1f4b' }}>AI</div>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>Voice Transcript</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 4px' }}>|</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Try it free</span>
        </div>
        <a href="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>← Back to home</a>
      </nav>

      <div style={{ padding: '0 20px 60px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', padding: '48px 20px 8px' }}>
          <h1 style={{ fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 800, color: '#0f1f4b', marginBottom: 12 }}>
            Try Voice Transcript
          </h1>
          <p style={{ color: '#5a6480', fontSize: 16, maxWidth: 520, margin: '0 auto' }}>
            Record your voice, transcribe it with Barbadian dialect correction, then edit and review — the full workflow, right here, no account needed.
          </p>
        </div>

        {/* Main card */}
        <div style={card}>

          {/* Progress indicator */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
            {(['Record', 'Transcribe', 'Review'] as const).map((label, i) => {
              const stepIndex = step === 'idle' ? 0 : step === 'recording' ? 0 : step === 'recorded' ? 1 : step === 'transcribing' ? 1 : 2;
              const active = i === stepIndex;
              const done = i < stepIndex || (step === 'done' && i <= 2);
              return (
                <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ height: 4, borderRadius: 4, background: done || active ? '#0f1f4b' : '#e2e6f0', marginBottom: 6, transition: 'background 0.3s' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: active || done ? '#0f1f4b' : '#9ca3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                </div>
              );
            })}
          </div>

          {/* ── STEP 1: RECORD ── */}
          {(step === 'idle' || step === 'recording' || step === 'recorded' || step === 'failed') && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f1f4b', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Step 1 — Record your voice
              </div>
              <p style={{ fontSize: 14, color: '#5a6480', marginBottom: 20, lineHeight: 1.6 }}>
                Speak naturally — try a few sentences in your normal voice. If you speak Bajan dialect, even better. The AI is tuned for it.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                {step !== 'recording' ? (
                  <button style={recBtn} onClick={startRecording}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff' }} />
                    {step === 'recorded' || step === 'failed' ? 'Record again' : 'Start recording'}
                  </button>
                ) : (
                  <button style={recBtn} onClick={stopRecording}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: '#fff' }} />
                    Stop recording
                  </button>
                )}
                {step === 'recording' && (
                  <span style={{ color: '#dc2626', fontSize: 14, fontWeight: 600, animation: 'dotBlink 1s ease-in-out infinite' }}>
                    ● {formatTime(seconds)}
                  </span>
                )}
                {step === 'recorded' && (
                  <span style={{ color: '#0d9e6e', fontSize: 13, fontWeight: 600 }}>✓ Recording saved</span>
                )}
              </div>

              {error && (
                <div style={{ marginTop: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#b91c1c', fontSize: 13 }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: TRANSCRIBE ── */}
          {(step === 'recorded' || step === 'transcribing') && (
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 28, marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f1f4b', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Step 2 — Transcribe
              </div>
              <p style={{ fontSize: 14, color: '#5a6480', marginBottom: 20, lineHeight: 1.6 }}>
                Whisper AI will transcribe your recording, then the Barbadian dialect lexicon will correct common misreadings of Bajan words and phrases.
              </p>
              <button
                onClick={transcribe}
                disabled={step === 'transcribing'}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 10, border: 'none', background: step === 'transcribing' ? '#9ca3af' : '#0d9e6e', color: '#fff', fontSize: 14, fontWeight: 600, cursor: step === 'transcribing' ? 'wait' : 'pointer' }}>
                {step === 'transcribing' ? '⚡ Transcribing…' : '⚡ Transcribe now'}
              </button>
            </div>
          )}

          {/* ── STEP 3: REVIEW ── */}
          {step === 'done' && result && (
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f1f4b', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Step 3 — Review and correct
              </div>

              {result.corrections_applied > 0 && (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#166534' }}>
                  ✓ {result.corrections_applied} Barbadian dialect correction{result.corrections_applied !== 1 ? 's' : ''} applied automatically
                </div>
              )}

              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'block' }}>
                Your transcript — edit anything that looks wrong
              </label>
              <textarea
                value={editText}
                onChange={e => { setEditText(e.target.value); setSaved(false); }}
                rows={8}
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '12px 14px', fontSize: 14, lineHeight: 1.7, color: '#111827', background: '#fff', resize: 'vertical', fontFamily: 'inherit', outline: 'none', marginBottom: 16 }}
              />

              {result.transcript !== result.corrected_transcript && (
                <details style={{ marginBottom: 20 }}>
                  <summary style={{ fontSize: 13, color: '#9ca3af', cursor: 'pointer', userSelect: 'none' }}>
                    Show original Whisper output (before dialect correction)
                  </summary>
                  <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', marginTop: 8, fontSize: 13, color: '#6b7280', lineHeight: 1.7 }}>
                    {result.transcript}
                  </div>
                </details>
              )}

              {/* Mock approval UI */}
              <div style={{ background: '#f8f9fc', border: '1px solid #e2e6f0', borderRadius: 10, padding: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f1f4b', marginBottom: 10 }}>Approval workflow preview</div>
                <p style={{ fontSize: 13, color: '#5a6480', marginBottom: 14, lineHeight: 1.6 }}>
                  In a full deployment, this transcript would be submitted to a supervisor for review and approval. Every action is logged with timestamp and identity.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ padding: '8px 16px', background: '#0f1f4b', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Submit for approval</div>
                  <div style={{ padding: '8px 16px', background: '#f3f4f6', color: '#9ca3af', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Save draft</div>
                </div>
                <p style={{ fontSize: 12, color: '#c9a84c', marginTop: 10, fontWeight: 600 }}>↑ Unlock these features — create a free account below</p>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={reset} style={{ padding: '10px 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Try another recording
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Sign-up nudge */}
        <div style={{ maxWidth: 680, margin: '0 auto', background: '#0f1f4b', borderRadius: 16, padding: '32px 28px', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ color: '#c9a84c', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Get full access</div>
            <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Ready to use this for real?</h3>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.6 }}>
              Create a free account and get your own workspace — upload audio files, manage transcripts, invite team members, and run the full approval workflow.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
            <a href="mailto:AISolutions@aisolutionsnet.net?subject=Voice Transcript — Free Account Request" style={{ padding: '12px 24px', background: '#c9a84c', color: '#0f1f4b', borderRadius: 10, fontWeight: 700, fontSize: 14, textAlign: 'center', whiteSpace: 'nowrap' }}>
              Request free account
            </a>
            <a href="mailto:AISolutions@aisolutionsnet.net?subject=Voice Transcript Demo Request" style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: 10, fontWeight: 600, fontSize: 14, textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}>
              Request a full demo
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
