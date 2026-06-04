import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import { getSecurityHeaders, checkRateLimit } from '@/lib/police-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: getSecurityHeaders() });
}

export async function POST(req: Request) {
  const headers = getSecurityHeaders();
  if (!checkRateLimit(req, 20, 60 * 1000))
    return NextResponse.json({ success: true }, { headers });

  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ success: true }, { headers });
  const token = auth.slice(7);
  if (token.length > 2048) return NextResponse.json({ success: true }, { headers });

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const th = crypto.createHash('sha256').update(token).digest('hex');
    await sql`DELETE FROM user_sessions WHERE token_hash = ${th}`;
  } catch {}

  return NextResponse.json({ success: true }, { headers });
}
