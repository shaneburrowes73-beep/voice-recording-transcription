import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { transcribeSubmission } from '@/lib/transcribe-audio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { id } = await req.json() as { id?: string };
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('voice_recording_transcription_submissions')
    .select('id, audio_file_urls')
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  if (!data.audio_file_urls?.length) return NextResponse.json({ error: 'No audio files' }, { status: 400 });

  transcribeSubmission(id, data.audio_file_urls).catch(err =>
    console.error('Retranscribe error:', err?.message || err)
  );

  return NextResponse.json({ ok: true, message: 'Transcription started' });
}
