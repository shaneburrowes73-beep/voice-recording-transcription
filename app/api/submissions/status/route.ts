import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('voice_recording_transcription_submissions')
    .select('transcript_status, transcribed_at')
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: transcripts } = await supabaseAdmin
    .from('submission_transcripts')
    .select('file_index, filename, transcript_edited, corrected_transcript, transcript_status')
    .eq('submission_id', id)
    .order('file_index', { ascending: true });

  return NextResponse.json({
    transcript_status: data.transcript_status,
    transcribed_at: data.transcribed_at,
    file_transcripts: transcripts || [],
  });
}
