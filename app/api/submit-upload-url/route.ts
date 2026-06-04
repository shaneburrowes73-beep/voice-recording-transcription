import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ACCEPTED_AUDIO_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '@/lib/submission-schema';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fileName, fileSize, mimeType } = body as {
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
    };

    if (!fileName || !fileSize || !mimeType) {
      return NextResponse.json({ error: 'Missing fileName, fileSize, or mimeType' }, { status: 400 });
    }
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: `File too large. Max ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.` }, { status: 400 });
    }
    if (!ACCEPTED_AUDIO_MIME_TYPES.includes(mimeType as any)) {
      return NextResponse.json({ error: `Unsupported file type: ${mimeType}` }, { status: 400 });
    }

    // Generate a per-submission folder + unique filename
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    const objectPath = `${randomUUID()}/${Date.now()}-${safeName}`;

    // Debug: Check if Supabase client is properly initialized
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      console.error('[submit-upload-url] Missing Supabase credentials', { urlExists: !!url, keyExists: !!key });
      return NextResponse.json({
        error: 'Server configuration error: Missing Supabase credentials',
        debug: { urlExists: !!url, keyExists: !!key }
      }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin.storage
      .from('voice-submissions')
      .createSignedUploadUrl(objectPath);

    if (error || !data) {
      console.error('[submit-upload-url] Supabase error:', error);
      return NextResponse.json({
        error: error?.message || 'Failed to create signed URL',
        debug: error
      }, { status: 500 });
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      objectPath: data.path,
    });
  } catch (err: any) {
    console.error('[submit-upload-url] Exception:', err);
    return NextResponse.json({
      error: err?.message || 'Unknown error',
      debug: err?.toString()
    }, { status: 500 });
  }
}
