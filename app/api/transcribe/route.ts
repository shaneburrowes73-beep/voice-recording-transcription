/**
 * POST /api/transcribe
 *
 * Transcribes audio using OpenAI Whisper, then applies Barbadian dialect
 * post-processing corrections.
 *
 * Accepts either:
 *   A) JSON body: { "storage_url": "https://..." }
 *      — downloads the file from Supabase Storage (server-side, bypasses RLS)
 *      — use this when audio was already uploaded via /api/submit-upload-url
 *
 *   B) multipart/form-data: field "audio" containing the audio blob
 *      — use this for direct/real-time recording from the police app
 *
 * Returns:
 *   { transcript, corrected_transcript, corrections_applied, accent, processing_time_ms }
 *
 * Env vars required:
 *   OPENAI_API_KEY          — OpenAI API key (Vercel env, production only)
 *   SUPABASE_SERVICE_ROLE_KEY — for storage downloads (already set)
 *   NEXT_PUBLIC_SUPABASE_URL  — for storage downloads (already set)
 *
 * Auth: this route is NOT public — requires a valid bearer token.
 *   TRANSCRIBE_API_SECRET — set in Vercel env, pass as Authorization: Bearer <token>
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Vercel serverless body size limit — increase for audio files up to ~10MB
export const config = {
  api: { bodyParser: { sizeLimit: '25mb' } },
};

async function getAudioBuffer(req: Request): Promise<{ buffer: Buffer; filename: string; mimeType: string } | null> {
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    // Direct audio blob upload
    const formData = await req.formData();
    const file = formData.get('audio') as File | null;
    if (!file) return null;
    const arrayBuffer = await file.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      filename: file.name || 'audio.webm',
      mimeType: file.type || 'audio/webm',
    };
  }

  if (contentType.includes('application/json')) {
    // Supabase Storage URL — download server-side
    const body = await req.json();
    const { storage_url } = body as { storage_url?: string };
    if (!storage_url) return null;

    const res = await fetch(storage_url);
    if (!res.ok) throw new Error(`Storage fetch failed: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();

    // Determine file type from URL or content-type
    const urlPath = new URL(storage_url).pathname;
    const ext = urlPath.split('.').pop()?.toLowerCase() || 'webm';
    const mimeMap: Record<string, string> = {
      webm: 'audio/webm', mp3: 'audio/mpeg', mp4: 'audio/mp4',
      m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg',
    };
    return {
      buffer: Buffer.from(arrayBuffer),
      filename: `audio.${ext}`,
      mimeType: mimeMap[ext] || 'audio/webm',
    };
  }

  return null;
}

export async function POST(req: Request) {
  const start = Date.now();

  // Auth check
  const secret = process.env.TRANSCRIBE_API_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') || '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const audio = await getAudioBuffer(req);
    if (!audio) {
      return NextResponse.json(
        { error: 'Provide either multipart/form-data with "audio" field, or JSON with "storage_url"' },
        { status: 400 }
      );
    }

    // Call OpenAI Whisper
    const formData = new FormData();
    const blob = new Blob([audio.buffer], { type: audio.mimeType });
    formData.append('file', blob, audio.filename);
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    // Whisper prompt to help with Barbadian context
    formData.append(
      'prompt',
      'Barbadian English dialect. May include Creole expressions such as: wuh, leh, wunna, gine, duh, nuff, pon, bout, dem, dey, doan.'
    );

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!whisperRes.ok) {
      const err = await whisperRes.text();
      console.error('Whisper API error:', err);
      return NextResponse.json({ error: 'Transcription failed', detail: err }, { status: 502 });
    }

    const whisperData = await whisperRes.json() as { text: string };
    const base_transcript = whisperData.text.trim();

    // Apply Barbadian dialect corrections
    // Dynamic import so the lexicon is tree-shaken on non-Node runtimes
    const { applyBarbadianCorrections } = await import('@/lib/barbadian-lexicon');
    const { corrected_transcript, corrections_applied, correction_details } =
      applyBarbadianCorrections(base_transcript);

    const processing_time_ms = Date.now() - start;

    return NextResponse.json({
      transcript: base_transcript,
      corrected_transcript,
      corrections_applied,
      correction_details,
      accent: 'Barbadian',           // Phase 1: assume Barbadian; swap for CNN classifier in Phase 2
      model: 'whisper-1',
      processing_time_ms,
    });

  } catch (err: any) {
    console.error('Transcribe route error:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
