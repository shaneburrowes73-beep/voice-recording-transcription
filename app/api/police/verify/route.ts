import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getSecurityHeaders, checkRateLimit } from '@/lib/police-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: getSecurityHeaders() });
}

export async function POST(req: Request) {
  const headers = getSecurityHeaders();
  if (!checkRateLimit(req, 60, 60 * 1000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });

  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer '))
    return NextResponse.json({ error: 'No token provided' }, { status: 401, headers });
  const token = auth.slice(7);
  if (token.length > 2048)
    return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers });

  try {
    jwt.verify(token, process.env.JWT_SECRET!, { issuer: 'voice-transcript', audience: 'voice-transcript-app' });
    const sql = neon(process.env.DATABASE_URL!);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const rows = await sql`
      SELECT s.*, u.full_name, u.badge_no, u.role, u.status, u.email,
             o.name as org_name, o.slug as org_slug, o.modules, o.user_id_label, o.transcript_label
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      JOIN organisations o ON u.org_id = o.id
      WHERE s.token_hash = ${tokenHash} AND s.expires_at > NOW()
    `;
    if (!rows.length)
      return NextResponse.json({ error: 'Session expired' }, { status: 401, headers });
    const s = rows[0] as any;
    if (s.status === 'suspended')
      return NextResponse.json({ error: 'Account suspended' }, { status: 403, headers });
    await sql`UPDATE user_sessions SET last_active = NOW() WHERE token_hash = ${tokenHash}`;
    return NextResponse.json({
      success: true,
      user: { id: s.user_id, fullName: s.full_name, badgeNo: s.badge_no, email: s.email, role: s.role },
      org:  { name: s.org_name, slug: s.org_slug, modules: s.modules, userIdLabel: s.user_id_label, transcriptLabel: s.transcript_label },
    }, { headers });
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401, headers });
  }
}
