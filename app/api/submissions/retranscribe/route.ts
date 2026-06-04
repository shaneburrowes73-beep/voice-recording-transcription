import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { id } = await req.json() as { id?: string };
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('voice_recording_transcription_submissions')
    .select('id, audio_file_urls, transcript_status')
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  if (!data.audio_file_urls?.length) return NextResponse.json({ error: 'No audio files on this submission' }, { status: 400 });

  await supabaseAdmin
    .from('voice_recording_transcription_submissions')
    .update({ transcript_status: 'processing' })
    .eq('id', id);

  const transcribeSecret = process.env.TRANSCRIBE_API_SECRET || '';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://voice-recording-transcription.vercel.app';

  (async () => {
    try {
      const transcriptParts: string[] = [];
      const correctedParts: string[] = [];

      for (const storagePath of data.audio_file_urls) {
        const { data: signedData, error: signErr } = await supabaseAdmin
          .storage
          .from('voice-submissions')
          .createSignedUrl(storagePath.replace('voice-submissions/', ''), 300);

        if (signErr || !signedData?.signedUrl) {
          transcriptParts.push(`[Could not access file: ${storagePath}]`);
          continue;
        }

        const transcribeRes = await fetch(`${baseUrl}/api/transcribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(transcribeSecret ? { Authorization: `Bearer ${transcribeSecret}` } : {}),
          },
          body: JSON.stringify({ storage_url: signedData.signedUrl }),
        });

        if (!transcribeRes.ok) {
          transcriptParts.push(`[Transcription failed]`);
          continue;
        }

        const result = await transcribeRes.json() as { transcript: string; corrected_transcript: string };
        transcriptParts.push(result.transcript || '');
        correctedParts.push(result.corrected_transcript || result.transcript || '');
      }

      const rawTranscript = transcriptParts.join('\n\n---\n\n');
      const correctedTranscript = correctedParts.join('\n\n---\n\n');

      await supabaseAdmin
        .from('voice_recording_transcription_submissions')
        .update({
          raw_transcript: rawTranscript,
          corrected_transcript: correctedTranscript,
          transcript_edited: correctedTranscript,
          transcript_status: 'done',
          transcribed_at: new Date().toISOString(),
        })
        .eq('id', id);
    } catch (err) {
      console.error('retranscribe error:', err);
      await supabaseAdmin
        .from('voice_recording_transcription_submissions')
        .update({ transcript_status: 'failed' })
        .eq('id', id);
    }
  })();

  return NextResponse.json({ ok: true, message: 'Transcription started' });
}
