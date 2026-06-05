import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { data: submissions, error } = await supabaseAdmin
    .from('voice_recording_transcription_submissions')
    .select(`
      id, submitted_at, first_name, last_name, email_address,
      age_range, gender, birthplace, native_speaker_of_dialect,
      content_type, topics_covered, audio_file_urls,
      transcript_status, transcribed_at,
      transcript_approved, approved_at
    `)
    .order('submitted_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (submissions || []).map(s => s.id);
  const { data: transcripts } = ids.length
    ? await supabaseAdmin
        .from('submission_transcripts')
        .select('submission_id, file_index, filename, storage_path, raw_transcript, corrected_transcript, transcript_edited, transcript_status, transcript_approved, approved_at, transcribed_at')
        .in('submission_id', ids)
        .order('file_index', { ascending: true })
    : { data: [] };

  const bySubmission: Record<string, any[]> = {};
  for (const t of transcripts || []) {
    if (!bySubmission[t.submission_id]) bySubmission[t.submission_id] = [];
    bySubmission[t.submission_id].push(t);
  }

  const result = (submissions || []).map(s => ({
    ...s,
    file_transcripts: bySubmission[s.id] || [],
  }));

  return NextResponse.json({ submissions: result });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, file_index, transcript_edited, transcript_approved } = body as {
    id: string;
    file_index?: number;
    transcript_edited?: string;
    transcript_approved?: boolean;
  };

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  if (file_index !== undefined) {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (transcript_edited !== undefined) updates.transcript_edited = transcript_edited;
    if (transcript_approved !== undefined) {
      updates.transcript_approved = transcript_approved;
      updates.approved_at = transcript_approved ? new Date().toISOString() : null;
    }
    const { error } = await supabaseAdmin
      .from('submission_transcripts')
      .update(updates)
      .eq('submission_id', id)
      .eq('file_index', file_index);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (transcript_approved !== undefined) {
    const approved_at = transcript_approved ? new Date().toISOString() : null;
    await supabaseAdmin
      .from('submission_transcripts')
      .update({ transcript_approved, approved_at, updated_at: new Date().toISOString() })
      .eq('submission_id', id);
    await supabaseAdmin
      .from('voice_recording_transcription_submissions')
      .update({ transcript_approved, approved_at })
      .eq('id', id);
  }

  return NextResponse.json({ ok: true });
}
