import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/submissions/signed-read-url  { objectPath: string }
// Returns a short-lived signed read URL for a file in voice-submissions bucket.
// Used by the workspace upload → transcribe flow so /api/transcribe can fetch the file.
export async function POST(req: Request) {
  const { objectPath } = await req.json() as { objectPath?: string };
  if (!objectPath) return NextResponse.json({ error: 'objectPath required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .storage
    .from('voice-submissions')
    .createSignedUrl(objectPath, 300); // 5-minute expiry

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message || 'Could not create signed URL' }, { status: 500 });
  }

  return NextResponse.json({ signedReadUrl: data.signedUrl });
}
