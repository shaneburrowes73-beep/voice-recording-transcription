import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getSecurityHeaders, checkRateLimit, sanitise, isValidEmail } from '@/lib/police-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: getSecurityHeaders() });
}

export async function POST(req: Request) {
  const headers = getSecurityHeaders();

  if (!checkRateLimit(req, 10, 15 * 60 * 1000))
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers }); }

  const email    = sanitise(body.email, 255).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password)
    return NextResponse.json({ error: 'Email and password required' }, { status: 400, headers });
  if (!isValidEmail(email))
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401, headers });
  if (password.length > 128)
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401, headers });

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const users = await sql`
      SELECT u.*, o.name as org_name, o.slug as org_slug, o.modules, o.user_id_label, o.transcript_label
      FROM users u JOIN organisations o ON u.org_id = o.id
      WHERE u.email = ${email}
    `;

    const dummyHash = '$2b$12$invalidhashpaddingtopreventimingtattack000000000000000';
    const candidateHash = users.length ? (users[0] as any).password_hash : dummyHash;
    const valid = await bcrypt.compare(password, candidateHash);

    if (!users.length || !valid)
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401, headers });

    const u = users[0] as any;
    if (u.status === 'suspended')
      return NextResponse.json({ error: 'Account suspended. Contact your administrator.' }, { status: 403, headers });

    const token = jwt.sign(
      { userId: u.id, email: u.email, role: u.role, orgId: u.org_id, orgSlug: u.org_slug },
      process.env.JWT_SECRET!,
      { expiresIn: '7d', issuer: 'voice-transcript', audience: 'voice-transcript-app' }
    );
    const tokenHash  = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await sql`INSERT INTO user_sessions(user_id, token_hash, expires_at) VALUES(${u.id}, ${tokenHash}, ${expiresAt})`;
    await sql`UPDATE users SET last_login = NOW() WHERE id = ${u.id}`;

    return NextResponse.json({
      success: true, token,
      user: { id: u.id, fullName: u.full_name, badgeNo: u.badge_no, email: u.email, role: u.role },
      org:  { name: u.org_name, slug: u.org_slug, modules: u.modules, userIdLabel: u.user_id_label, transcriptLabel: u.transcript_label },
    }, { headers });
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500, headers });
  }
}
