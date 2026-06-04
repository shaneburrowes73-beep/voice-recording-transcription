import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('voice_recording_transcription_submissions')
    .select(`
      id, submitted_at, first_name, last_name, email_address,
      age_range, gender, birthplace, native_speaker_of_dialect,
      content_type, topics_covered, audio_file_urls,
      raw_transcript, corrected_transcript, transcript_edited,
      transcript_status, transcribed_at,
      transcript_approved, approved_at
    `)
    .order('submitted_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submissions: data });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, transcript_edited, transcript_approved } = body as {
    id: string;
    transcript_edited?: string;
    transcript_approved?: boolean;
  };

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (transcript_edited !== undefined) updates.transcript_edited = transcript_edited;
  if (transcript_approved !== undefined) {
    updates.transcript_approved = transcript_approved;
    updates.approved_at = transcript_approved ? new Date().toISOString() : null;
  }

  const { error } = await supabaseAdmin
    .from('voice_recording_transcription_submissions')
    .update(updates)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
