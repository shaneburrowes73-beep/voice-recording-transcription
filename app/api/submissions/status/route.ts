import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/submissions/status?id=<uuid>
// Public-safe — returns only transcript fields, no PII.
// Called by ThankYou.tsx to poll until transcript_status === 'done'.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('voice_recording_transcription_submissions')
    .select('transcript_status, corrected_transcript, transcript_edited, transcribed_at')
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    transcript_status:    data.transcript_status,
    corrected_transcript: data.corrected_transcript,
    transcript_edited:    data.transcript_edited,
    transcribed_at:       data.transcribed_at,
  });
}
