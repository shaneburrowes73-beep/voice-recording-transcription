/**
 * lib/transcribe-audio.ts
 * Shared transcription logic — called directly by submit and retranscribe routes.
 * Avoids serverless self-HTTP-call issues by not fetching /api/transcribe internally.
 */

import { applyBarbadianCorrections } from '@/lib/barbadian-lexicon';
import { supabaseAdmin } from '@/lib/supabase-admin';

export interface TranscribeResult {
  raw_transcript: string;
  corrected_transcript: string;
  corrections_applied: number;
}

export async function transcribeStoragePath(storagePath: string): Promise<TranscribeResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const objectPath = storagePath.replace(/^voice-submissions\//, '');

  const { data: signedData, error: signErr } = await supabaseAdmin
    .storage
    .from('voice-submissions')
    .createSignedUrl(objectPath, 300);

  if (signErr || !signedData?.signedUrl) {
    throw new Error(`Signed URL error: ${signErr?.message || 'no URL returned'}`);
  }

  const audioRes = await fetch(signedData.signedUrl);
  if (!audioRes.ok) {
    throw new Error(`Storage download failed: ${audioRes.status} ${audioRes.statusText}`);
  }

  const arrayBuffer = await audioRes.arrayBuffer();

  const ext = storagePath.split('.').pop()?.toLowerCase() || 'webm';
  const mimeMap: Record<string, string> = {
    webm: 'audio/webm', mp3: 'audio/mpeg', mp4: 'audio/mp4',
    m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg',
  };
  const mimeType = mimeMap[ext] || 'audio/webm';
  const filename = `audio.${ext}`;

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(arrayBuffer)], { type: mimeType });
  formData.append('file', blob, filename);
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');
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
    const errText = await whisperRes.text();
    throw new Error(`Whisper API error ${whisperRes.status}: ${errText}`);
  }

  const whisperData = await whisperRes.json() as { text: string };
  const raw_transcript = whisperData.text.trim();
  const { corrected_transcript, corrections_applied } = applyBarbadianCorrections(raw_transcript);

  return { raw_transcript, corrected_transcript, corrections_applied };
}

export async function transcribeSubmission(submissionId: string, audioFileUrls: string[]): Promise<void> {
  await supabaseAdmin
    .from('voice_recording_transcription_submissions')
    .update({ transcript_status: 'processing' })
    .eq('id', submissionId);

  const rawParts: string[] = [];
  const correctedParts: string[] = [];
  let anySuccess = false;

  for (const storagePath of audioFileUrls) {
    try {
      const result = await transcribeStoragePath(storagePath);
      rawParts.push(result.raw_transcript);
      correctedParts.push(result.corrected_transcript);
      anySuccess = true;
      console.log(`Transcribed ${storagePath}: ${result.raw_transcript.slice(0, 80)}`);
    } catch (err: any) {
      console.error(`Transcription failed for ${storagePath}:`, err.message);
      rawParts.push(`[Failed: ${err.message}]`);
      correctedParts.push('');
    }
  }

  const raw_transcript = rawParts.join('\n\n---\n\n');
  const corrected_transcript = correctedParts.filter(Boolean).join('\n\n---\n\n');

  if (anySuccess) {
    await supabaseAdmin
      .from('voice_recording_transcription_submissions')
      .update({
        raw_transcript,
        corrected_transcript,
        transcript_edited: corrected_transcript,
        transcript_status: 'done',
        transcribed_at: new Date().toISOString(),
      })
      .eq('id', submissionId);
  } else {
    await supabaseAdmin
      .from('voice_recording_transcription_submissions')
      .update({ raw_transcript, transcript_status: 'failed' })
      .eq('id', submissionId);
  }
}
