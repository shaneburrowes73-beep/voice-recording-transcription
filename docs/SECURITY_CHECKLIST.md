# Voice Recording & Transcription — Security Checklist

**Last Updated:** 2026-05-15
**Status:** In Review

---

## 1. Authentication & Authorization

- [x] **Supabase RLS enabled on submissions table** — Service-role bypass only, no public access
- [x] **Storage RLS policy configured** — Unauthenticated users can only INSERT (upload) to `voice-submissions` bucket
- [x] **Browser client uses anon key** — Never exposes service role key to frontend
- [x] **Server API routes use service role key** — Protected as Vercel environment variable
- [ ] **Email verification for submissions** — Optional phase 2: verify email before processing

**Details:** Storage bucket `voice-submissions` has granular RLS:
- Policy 1: `Allow unauthenticated upload to voice-submissions` — anon users can INSERT only
- Policy 2: `Service role has full access` — admin operations via service role
- Policy 3: `Deny public read/update/delete` — prevents unauthorized reads/deletes

**Verification:**
```sql
-- Test policy allows unauthenticated upload
SELECT current_user; -- should be 'authenticated' or 'anon'
INSERT INTO storage.objects (bucket_id, name, owner, path, metadata)
  VALUES ('voice-submissions', 'test.wav', null, 'test.wav', '{}');
-- Should succeed with RLS policy
```

---

## 2. Data Protection

- [x] **Encryption in transit** — HTTPS via Vercel + Supabase
- [x] **Encryption at rest** — Supabase manages database encryption
- [x] **Audio files stored in Supabase Storage** — Encrypted at rest, served via HTTPS
- [ ] **PII hashing** — Future: hash phone/email for non-core features
- [ ] **Data retention policy** — TBD (when/if to delete old submissions)

**Details:** Audio files stored as binary objects in `voice-submissions` bucket with content-type preservation.

---

## 3. Access Control

- [x] **Supabase service role key** — Rotated quarterly, stored in 1Password + Vercel env
- [x] **Supabase anon key** — Public, no sensitive operations possible with it
- [x] **Gmail SMTP credentials** — Stored in Vercel env vars, never in code
- [x] **n8n workflows** — Not yet implemented; will use secure credential storage
- [ ] **IP whitelisting** — Future: restrict Vercel deployment to known IPs

**Credentials Reference:**
- `NEXT_PUBLIC_SUPABASE_URL` = (Public, stored in Vercel + .env.example)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (Public, stored in Vercel + .env.example)
- `SUPABASE_SERVICE_ROLE_KEY` = (Private, stored in 1Password + Vercel env only)
- `GMAIL_SMTP_USER` = `alerts@aisolutionsnet.net` (Stored in Vercel env)
- `GMAIL_SMTP_APP_PASSWORD` = (Gmail app password, stored in 1Password + Vercel env only)

**Verification:**
```bash
# Confirm no credentials in code
grep -r "sk_live\|rls_\|app_password" app/ lib/ --exclude-dir=node_modules

# Confirm Vercel env vars are set
vercel env pull
cat .env.local | grep SUPABASE
```

---

## 4. Deployment Security

- [x] **Environment variables not in code** — All secrets in Vercel settings
- [x] **GitHub branch protection** — Requires approval before merge to main
- [x] **Vercel Deployment Protection disabled** — Required for public submission page
- [ ] **Code Scanning (CodeQL)** — GitHub Actions not yet configured
- [ ] **Dependabot alerts** — GitHub Dependabot not yet enabled

**Next Steps:**
```bash
# Enable GitHub Code Scanning
gh repo edit --enable-code-scanning

# Enable Dependabot
gh repo edit --enable-dependabot
```

---

## 5. Monitoring & Logging

- [x] **Submission logging** — All submissions recorded with timestamp, IP country, user agent
- [x] **API error logging** — Server routes log errors with context
- [ ] **Supabase audit logs** — Not yet configured
- [ ] **Email delivery tracking** — Gmail delivery receipts only (not detailed)
- [ ] **Security incident alerting** — Future: alert on suspicious patterns

**Current Logging:**
- Database: `user_agent`, `ip_country` captured per submission
- API: Server-side error logging in Vercel runtime logs (accessible via Vercel dashboard)

---

## 6. Incident Response

**If file upload fails:**
1. Check Vercel runtime logs for RLS policy error
2. Verify `voice-submissions` bucket exists and has correct policies
3. Check that Supabase RLS policy 1 is active (`Allow unauthenticated upload...`)
4. Retry upload; if persists, contact admin

**If email doesn't send:**
1. Verify `GMAIL_SMTP_USER` and `GMAIL_SMTP_APP_PASSWORD` in Vercel env
2. Check Gmail account for 2FA enabled (required for app passwords)
3. Check n8n logs if automated workflows fail
4. Fall back to manual email notification

**If submission data is compromised:**
1. Rotate all credentials immediately
2. Audit Supabase logs for unauthorized access (requires Supabase logs feature)
3. Notify affected users via email
4. Disable submissions temporarily if needed

**Contacts:**
- Primary: Shane Burrowes (owner)
- Backup: AI Solutions admin team

---

## 7. Compliance & Data Retention

- [x] **Consent checkbox required** — Users must agree to data collection
- [x] **Consent recorded in database** — `consent_given` boolean per submission
- [ ] **GDPR compliance** — Data retention policy TBD
- [ ] **Local law compliance** — Barbados data protection laws TBD
- [ ] **Right to deletion** — Not yet implemented; future feature

**Current Compliance Status:**
- Consent is captured and stored
- No automatic retention/deletion policy in place
- Manual reviews of data required quarterly

**Future Work:**
- Define data retention period (recommend 2-3 years for audio research)
- Implement automatic deletion after retention period
- Create GDPR-compliant data export for users
- Document local regulatory requirements

---

## 8. Network Security

- [x] **CORS headers set** — Vercel default (no public CORS)
- [x] **CSRF protection** — Forms use same-origin submissions
- [x] **SQL injection prevention** — Supabase parameterized queries + Zod validation
- [ ] **DDoS protection** — Vercel provides basic protection; enhanced plan available
- [ ] **WAF (Web Application Firewall)** — Future: enterprise feature

**Current Configuration:**
- Vercel enforces HTTPS only
- Same-origin form submission prevents CSRF
- Zod validation prevents malformed data
- Supabase uses parameterized queries

---

## Quarterly Review Checklist

- [ ] Verify all credentials rotated within past 90 days
- [ ] Review Supabase RLS policies for changes/gaps
- [ ] Check GitHub security alerts (Dependabot)
- [ ] Audit submission logs for suspicious patterns
- [ ] Test incident response procedures
- [ ] Update this document with new findings

---

**Document Owner:** Shane Burrowes
**Next Review:** 2026-08-15
