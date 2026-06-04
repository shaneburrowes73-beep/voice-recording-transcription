import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { submissionSchema } from '@/lib/submission-schema';
import { sendConfirmationEmail } from '@/lib/send-confirmation-email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function triggerTranscription(submissionId: string, audioFileUrls: string[]): Promise<void> {
  try {
    await supabaseAdmin
      .from('voice_recording_transcription_submissions')
      .update({ transcript_status: 'processing' })
      .eq('id', submissionId);

    const transcribeSecret = process.env.TRANSCRIBE_API_SECRET || '';
    const transcriptParts: string[] = [];
    const correctedParts: string[] = [];

    for (const storagePath of audioFileUrls) {
      const { data: signedData, error: signErr } = await supabaseAdmin
        .storage
        .from('voice-submissions')
        .createSignedUrl(storagePath.replace('voice-submissions/', ''), 300);

      if (signErr || !signedData?.signedUrl) {
        console.error('Signed URL error for', storagePath, signErr);
        transcriptParts.push(`[Could not access file: ${storagePath}]`);
        continue;
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://voice-recording-transcription.vercel.app';
      const transcribeRes = await fetch(`${baseUrl}/api/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(transcribeSecret ? { Authorization: `Bearer ${transcribeSecret}` } : {}),
        },
        body: JSON.stringify({ storage_url: signedData.signedUrl }),
      });

      if (!transcribeRes.ok) {
        const errText = await transcribeRes.text();
        console.error('Transcribe failed for', storagePath, errText);
        transcriptParts.push(`[Transcription failed for file ${storagePath}]`);
        continue;
      }

      const result = await transcribeRes.json() as {
        transcript: string;
        corrected_transcript: string;
        corrections_applied: number;
      };

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
      .eq('id', submissionId);

  } catch (err: any) {
    console.error('triggerTranscription error:', err);
    await supabaseAdmin
      .from('voice_recording_transcription_submissions')
      .update({ transcript_status: 'failed' })
      .eq('id', submissionId);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = submissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
    }

    const p = parsed.data;
    const userAgent = req.headers.get('user-agent') || null;
    const ipCountry = req.headers.get('x-vercel-ip-country') || null;

    const { data, error } = await supabaseAdmin
      .from('voice_recording_transcription_submissions')
      .insert({
        first_name: p.firstName,
        last_name: p.lastName,
        email_address: p.emailAddress,
        phone_whatsapp: p.phoneWhatsapp || null,
        age_range: p.ageRange || null,
        gender: p.gender || null,
        birthplace: p.birthplace || null,
        total_years_lived_in_country: p.totalYearsLivedInCountry ?? null,
        current_occupation: p.currentOccupation || null,
        native_speaker_of_dialect: p.nativeSpeakerOfDialect || null,
        content_type: p.contentType || null,
        audio_duration_seconds: p.audioDurationSeconds ?? null,
        topics_covered: p.topicsCovered || null,
        audio_file_urls: p.audioFileUrls,
        willing_to_provide_additional_content: p.willingToProvideAdditionalContent || null,
        consent_given: p.consentGiven,
        any_other_relevant_information: p.anyOtherRelevantInformation || null,
        additional_notes: p.additionalNotes || null,
        user_agent: userAgent,
        ip_country: ipCountry,
        transcript_status: 'pending',
      } as any)
      .select('id')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 });
    }

    const submissionId = (data as any).id;

    triggerTranscription(submissionId, p.audioFileUrls).catch(err =>
      console.error('Background transcription error:', err)
    );

    try {
      await sendConfirmationEmail({
        toEmail: p.emailAddress,
        toName: p.firstName,
        submissionId,
        numFiles: p.audioFileUrls.length,
      });
    } catch (emailErr) {
      console.error('Email send failed (submission still saved):', emailErr);
    }

    return NextResponse.json({ submissionId });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
