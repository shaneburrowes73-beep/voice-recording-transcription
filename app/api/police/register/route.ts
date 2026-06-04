import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { getSecurityHeaders, checkRateLimit, sanitise, isValidEmail } from '@/lib/police-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: getSecurityHeaders() });
}

export async function POST(req: Request) {
  const headers = getSecurityHeaders();
  if (!checkRateLimit(req, 5, 15 * 60 * 1000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers }); }

  const fullName = sanitise(body.fullName, 100);
  const badgeNo  = sanitise(body.badgeNo, 30);
  const email    = sanitise(body.email, 255).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const role     = sanitise(body.role, 60);
  const orgSlug  = sanitise(body.orgSlug || 'barbados-police', 60);

  if (!fullName || !badgeNo || !email || !password || !role)
    return NextResponse.json({ error: 'All fields are required' }, { status: 400, headers });
  if (!isValidEmail(email))
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400, headers });
  if (password.length > 128)
    return NextResponse.json({ error: 'Password too long' }, { status: 400, headers });

  const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
  if (!strong.test(password))
    return NextResponse.json({ error: 'Password must be 8+ characters with uppercase, lowercase, number and symbol' }, { status: 400, headers });

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const org = await sql`SELECT id FROM organisations WHERE slug = ${orgSlug}`;
    if (!org.length) return NextResponse.json({ error: 'Organisation not found' }, { status: 404, headers });
    const orgId = (org[0] as any).id;
    const validRole = await sql`SELECT name FROM roles WHERE org_id = ${orgId} AND LOWER(name) = LOWER(${role})`;
    const resolvedRole = validRole.length ? (validRole[0] as any).name : role;
    const hash = await bcrypt.hash(password, 12);
    const user = await sql`
      INSERT INTO users(org_id, full_name, badge_no, email, password_hash, role)
      VALUES(${orgId}, ${fullName}, ${badgeNo}, ${email}, ${hash}, ${resolvedRole})
      RETURNING id, full_name, badge_no, email, role, status, created_at
    `;
    return NextResponse.json({ success: true, user: user[0] }, { status: 201, headers });
  } catch (err: any) {
    if (err.message?.includes('unique'))
      return NextResponse.json({ error: 'Email or badge number already registered' }, { status: 409, headers });
    return NextResponse.json({ error: 'Registration failed' }, { status: 500, headers });
  }
}
