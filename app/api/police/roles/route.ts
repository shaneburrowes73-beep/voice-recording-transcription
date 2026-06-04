import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getSecurityHeaders, checkRateLimit, sanitise } from '@/lib/police-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: getSecurityHeaders() });
}

export async function GET(req: Request) {
  const headers = getSecurityHeaders();
  if (!checkRateLimit(req, 30, 60 * 1000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });

  const { searchParams } = new URL(req.url);
  const orgSlug = sanitise(searchParams.get('orgSlug') || 'barbados-police', 60);

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const roles = await sql`
      SELECT r.name, r.level, r.is_supervisor, r.is_admin
      FROM roles r JOIN organisations o ON r.org_id = o.id
      WHERE o.slug = ${orgSlug} ORDER BY r.level ASC
    `;
    return NextResponse.json({ success: true, roles }, { headers });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500, headers });
  }
}
