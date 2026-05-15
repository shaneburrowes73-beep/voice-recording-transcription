# Voice Recording & Transcription — API Integrations

**Last Updated:** 2026-05-15
**Status:** Active

---

## 1. Supabase PostgreSQL (Data Storage)

**Service:** Supabase PostgreSQL
**Version:** 14.x (managed)
**Authentication:** Service role key (server-side only)
**Rate Limits:** Unlimited writes for service role; soft limit 1000 concurrent connections

**Purpose:**
- Store submission metadata (contact info, demographics, consent, audio file URLs)
- Track submissions per user email for resubmission detection (future)
- Audit trail of all submissions

**Configuration:**
- Database: Supabase project `AI-solutions-tracker`
- Host: izxsbtpepvjcmwjagvgz.supabase.co (check PROJECT-CONFIG.md for current)
- Port: 5432 (secure)
- User: postgres (via service role key)

**Tables:**
- `voice_recording_transcription_submissions` — Main submissions table (22 fields)

**RLS Policies:**
- Table RLS: Enabled, no public policies, service-role bypass only
- Service role key bypasses RLS entirely (intentional design)

**Monitoring:**
- Check connection logs in Supabase dashboard weekly
- Monitor query performance via Supabase admin panel
- Automated backups: daily (7-day retention, managed by Supabase)

**Error Handling:**
- If connection fails: API returns 500, user sees "Submission failed"
- Retry strategy: Client should retry with exponential backoff (not yet implemented)
- Fallback: Manual email to aisolutions@aisolutionsnet.net for offline submissions

**Cost Model:**
- Supabase free tier: 500MB database, sufficient for ~50k submissions at ~10KB each
- Current usage (2026-05-15): <1% of quota
- Next tier at: 500MB + $25/month for 50GB

**Current Status:**
- ✓ Connected and operational
- ✓ Schema deployed (001_voice_submissions.sql)
- ✓ RLS configured
- ✓ Backup working

---

## 2. Supabase Storage (Audio File Storage)

**Service:** Supabase Storage (S3-compatible)
**Authentication:** Anon key (client-side uploads with RLS policy)
**Rate Limits:** Unlimited uploads for authenticated; soft limits on concurrent requests

**Purpose:**
- Store audio files uploaded by users
- Serve files for research team access

**Configuration:**
- Bucket: `voice-submissions` (private, RLS-protected)
- Region: Default Supabase region
- Access: RLS policy controls who can upload/download

**RLS Policies:**
- Policy 1: `Allow unauthenticated upload to voice-submissions` — Anon users can INSERT (upload) only
- Policy 2: `Service role has full access` — Admin operations via service role
- Policy 3: `Deny public read/update/delete` — Prevents unauthorized access

**Upload Mechanism:**
- Client-side: Browser calls `supabaseBrowser.storage.from('voice-submissions').upload(path, file)`
- Server-side: Service role can manage files via `supabaseAdmin.storage`
- Path format: `{UUID}/{Timestamp}-{Filename}` (prevents collisions, enables tracking)

**Monitoring:**
- Bucket size: Check Supabase dashboard (settings → storage → usage)
- File count: Manual count via browser or API (not yet automated)
- Failed uploads: Logged in Vercel runtime logs

**Error Handling:**
- If bucket missing: API returns 500, migration 002 creates bucket
- If RLS policy fails: Upload rejected with 403 error
- If file too large: Rejected at client-side validation (25 MB max) before upload attempt

**Cost Model:**
- Supabase free tier: 1GB storage, sufficient for ~100 audio files (10MB average)
- Current usage (2026-05-15): <1% of quota
- Next tier at: 1GB + $25/month for 100GB

**Current Status:**
- ✓ Bucket created
- ✓ RLS policies deployed (002_voice_submissions_storage_rls.sql)
- ✓ Client upload working

---

## 3. Gmail SMTP (Transactional Email)

**Service:** Gmail SMTP
**Provider:** Google (smtp.gmail.com:465)
**Authentication:** App Password (not personal password)
**Rate Limits:** 300 emails/day per account, soft limit on concurrent connections

**Purpose:**
- Send confirmation emails to submitters
- CC notifications to admin inbox

**Configuration:**
- Host: smtp.gmail.com
- Port: 465 (secure/TLS)
- Auth:
  - Username: `alerts@aisolutionsnet.net` (shared account, not personal)
  - Password: Gmail app password (generated in Gmail settings)

**Credentials Storage:**
- `GMAIL_SMTP_USER` = alerts@aisolutionsnet.net (in Vercel env)
- `GMAIL_SMTP_APP_PASSWORD` = (in Vercel env + 1Password vault)

**Email Templates:**
- Subject: "Voice Recording & Transcription — Submission Received"
- Body: Plain text confirmation with reference ID
- From: "AI Solutions" <alerts@aisolutionsnet.net>
- CC: aisolutions@aisolutionsnet.net (configurable via SUBMISSION_NOTIFY_EMAIL env var)

**Monitoring:**
- Gmail delivery status: Limited (Gmail shows delivery receipts only, not bounces)
- Failed sends: Logged in Vercel runtime logs, non-blocking (submission succeeds regardless)
- Volume: Approximately 1 email per submission, max ~300/day under rate limit

**Error Handling:**
- If SMTP fails: Error logged, submission still succeeds (graceful degradation)
- If rate limit hit: Nodemailer will error and retry (currently not persisted)
- If app password revoked: Emails fail silently (need to regenerate in Gmail settings)

**Cost Model:**
- Gmail SMTP: Free (included with Gmail account)
- Current usage (2026-05-15): 0 emails sent (testing phase)

**Current Status:**
- ✓ SMTP transport configured
- ✓ Credentials set in Vercel
- ✓ Ready for testing

**Rotation Schedule:**
- App password: Rotate quarterly (generate new password in Gmail, update Vercel + 1Password)
- Last rotated: N/A (new setup)
- Next due: 2026-08-15

---

## 4. Vercel Deployment Platform

**Service:** Vercel (Next.js hosting)
**Framework:** Next.js 14 (App Router)
**Runtime:** Node.js (serverless functions)

**Purpose:**
- Deploy Next.js application
- Host API routes (/api/submit, /api/submit-upload-url)
- Serve static assets

**Configuration:**
- Project: voice-recording-transcription
- Repository: shaneburrowes73-beep/voice-recording-transcription
- Environment variables: Set in Vercel dashboard
- Deployment Protection: Disabled (required for public /submit page)

**Environment Variables (no actual values):**
- `NEXT_PUBLIC_SUPABASE_URL` = (Supabase project URL)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (Supabase public anon key)
- `SUPABASE_SERVICE_ROLE_KEY` = (Supabase private service role key)
- `GMAIL_SMTP_USER` = alerts@aisolutionsnet.net
- `GMAIL_SMTP_APP_PASSWORD` = (Gmail app password)
- `SUBMISSION_NOTIFY_EMAIL` = aisolutions@aisolutionsnet.net

**Monitoring:**
- Build logs: View in Vercel dashboard (Deployments tab)
- Runtime logs: Access via Vercel CLI or dashboard (Runtime Logs)
- Performance: Vercel Analytics dashboard

**Error Handling:**
- Failed builds: Check build logs; usually missing env vars or dependency issues
- Runtime errors: Check Vercel runtime logs or view in browser console
- 500 errors: Check Vercel logs; likely API route error

**Cost Model:**
- Vercel Pro Trial: Free for now (pending plan decision)
- Current usage: 1 project, minimal traffic

**Current Status:**
- ✓ Project created and linked to GitHub
- ✓ Deployed at voice-recording-transcription-*.vercel.app
- ✓ Environment variables set

---

## 5. GitHub (Version Control)

**Service:** GitHub
**Organization:** shaneburrowes73-beep
**Repository:** voice-recording-transcription

**Purpose:**
- Source code version control
- CI/CD pipeline trigger (Vercel auto-deploys on push to main)
- Audit trail of all code changes

**Configuration:**
- Branch: feature/barbadian-mvp (development)
- Protected: No (can be enabled after first release)
- Auto-deploy: Yes (Vercel deploys on push to main)

**Access:**
- Owner: shaneburrowes73-beep (project account)
- Developers: Added as collaborators with Write access

**Monitoring:**
- Commit history: View on GitHub
- Actions: Not yet configured (could add automated tests)

**Current Status:**
- ✓ Repository created
- ✓ Linked to Vercel
- ✓ Code committed and deployed

---

## Integration Dependency Map

```
User Browser
    ↓
Vercel (Next.js API routes)
    ↓
├─ Supabase PostgreSQL (submissions table)
├─ Supabase Storage (audio files, RLS-protected)
└─ Gmail SMTP (confirmation emails)
```

**Failure Scenarios:**
- Supabase down: Submission fails with 500
- Storage RLS policy broken: Upload fails with 403
- Gmail SMTP down: Submission succeeds, email fails (non-critical)
- Vercel down: Entire site unreachable

**Recovery Procedures:**
1. Check each service's status page
2. Verify credentials are set correctly
3. Review logs in Vercel/Supabase dashboards
4. Test with curl/Postman if available

---

## Testing Integrations

**Test Supabase Connection:**
```bash
# From local machine with psql installed
psql -h izxsbtpepvjcmwjagvgz.supabase.co -U postgres -d postgres
# Enter service role key as password when prompted
# Run: SELECT 1; -- Should return 1
```

**Test Storage RLS Policy:**
1. Open /submit page
2. Select audio file
3. Check Vercel runtime logs for upload success
4. Verify file appears in Supabase Storage browser

**Test Email:**
1. Submit form with valid email
2. Check inbox for confirmation email within 30 seconds
3. Verify CC went to aisolutions@aisolutionsnet.net

**Test API Directly:**
```bash
# Test submission
curl -X POST https://voice-recording-transcription.vercel.app/api/submit \
  -H "Content-Type: application/json" \
  -d '{...submission payload...}'

# Expected: 200 with { "submissionId": "uuid" }
```

---

## Next Steps

- [ ] Enable GitHub Code Scanning (CodeQL)
- [ ] Enable Dependabot alerts
- [ ] Add automated tests for API routes
- [ ] Configure Supabase audit logs
- [ ] Set up monitoring alerts for 5xx errors
- [ ] Implement email delivery tracking
- [ ] Implement data retention/deletion policy

---

**Document Owner:** Shane Burrowes
**Last Updated:** 2026-05-15
