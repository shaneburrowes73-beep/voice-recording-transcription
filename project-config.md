# Voice Recording & Transcription — Project Configuration

**Project Name:** Voice Recording & Transcription
**Project ID:** voice-recording-transcription
**Status:** Active (MVP Phase)
**Owner:** Shane Burrowes
**Last Updated:** 2026-05-15

---

## Project Overview

Web application for collecting audio recordings and demographic data from Barbadian speakers. Supports up to 5 audio files per submission (25 MB each), with direct browser-to-cloud uploads and transactional email confirmations. Built on Next.js 14, Supabase, and Vercel.

**Purpose:** Gather audio data for voice recording and transcription research focused on Barbadian English speakers.

**Target Users:** Barbadian English speakers willing to submit audio recordings for research purposes.

---

## Code Repository

- **GitHub URL:** https://github.com/shaneburrowes73-beep/voice-recording-transcription
- **Branch Strategy:**
  - `main` — Production-ready code, deployed to Vercel
  - `feature/barbadian-mvp` — Current development branch
  - Feature branches off `main` for new features
- **Deployment Pipeline:** GitHub push → Vercel auto-deploys on main branch
- **Last Deployed:** 2026-05-15 (feature/barbadian-mvp)

---

## Live URL

- **Production:** https://voice-recording-transcription.vercel.app
- **Submission Page:** https://voice-recording-transcription.vercel.app/submit
- **Feedback Page:** https://voice-recording-transcription.vercel.app/feedback
- **Status Page:** https://voice-recording-transcription.vercel.app/feedback-status

---

## Technology Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| **Runtime** | Node.js | 18.x | Vercel serverless |
| **Framework** | Next.js | 14.x | App Router, SSR + API routes |
| **Language** | TypeScript | 5.x | Full type safety |
| **Styling** | Inline CSS | — | Minimal dependencies |
| **Validation** | Zod | 3.x | Runtime schema validation |
| **Database** | Supabase PostgreSQL | 14.x | Managed, RLS-enabled |
| **Storage** | Supabase Storage | — | S3-compatible, RLS-protected |
| **Email** | Nodemailer + Gmail | — | Transactional emails |
| **Deployment** | Vercel | Pro Trial | Next.js native hosting |

---

## Data & Infrastructure

### Database
- **Type:** PostgreSQL (managed by Supabase)
- **Host:** izxsbtpepvjcmwjagvgz.supabase.co
- **Database:** postgres
- **Tables:**
  - `voice_recording_transcription_submissions` (22 fields, ~50k row capacity)
- **RLS Status:** Enabled, service-role bypass only
- **Backup:** Daily automatic (7-day retention, managed by Supabase)
- **Disaster Recovery:** Supabase handles; manual restore possible via SQL export

### Storage
- **Type:** Supabase Storage (S3-compatible)
- **Bucket:** voice-submissions (private, RLS-protected)
- **Capacity:** 1GB free tier (sufficient for ~100 audio files)
- **Access:** RLS policy allows unauthenticated uploads only, no public read/delete
- **File Path Format:** `{UUID}/{Timestamp}-{Filename}` (prevents collisions)

### API Integrations
- **Supabase REST API** — Data queries, file uploads
- **Gmail SMTP** — Transactional email (alerts@aisolutionsnet.net)
- **Vercel Functions** — Serverless backend logic

---

## Access & Credentials

| Credential | Location | Rotation | Last Rotated |
|------------|----------|----------|--------------|
| Supabase Service Role Key | 1Password + Vercel env | 90 days | N/A (new) |
| Supabase Anon Key | .env.example (public) | Never | N/A (static) |
| Gmail SMTP Password | 1Password + Vercel env | 90 days | N/A (new) |
| GitHub PAT (if needed) | 1Password (developer) | 90 days | N/A (if created) |

**1Password Vault:** AI Solutions / voice-recording-transcription

**Who Has Access:**
- Shane Burrowes (owner): All credentials
- AI Solutions team (admins): All credentials via 1Password
- Developers (via GitHub): Only public keys

**Emergency Access:** Contact AI Solutions admin (AISolutions@aisolutionsnet.net)

---

## Key Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Monthly Cost** | <$25 | ~$0 (free tier) | ✓ On target |
| **Uptime SLA** | 99.9% | 100% | ✓ On target |
| **Page Load Time** | <2s | ~1.5s | ✓ On target |
| **Database Latency** | <100ms | ~50ms | ✓ On target |
| **Max Concurrent Users** | 100 | 1 (MVP) | ✓ Within limits |
| **Storage Capacity** | 1GB | <10MB | ✓ Plenty of room |

---

## Project Phases

### Phase 0: Planning ✓
- Project definition and scope
- Technology stack selection
- Data schema design

### Phase 1: Infrastructure ✓
- Supabase setup (PostgreSQL, Storage, RLS)
- GitHub repository creation
- Vercel deployment setup

### Phase 2: Application Code ✓
- Form UI (5 sections, 22 fields)
- File upload mechanism (direct to Storage)
- API routes (/submit, /submit-upload-url)
- Email confirmation logic
- Data validation (Zod schema)

### Phase 3: Testing & Fixes ✓
- Smoke test suite (9 steps)
- Fix RLS policy and storage uploads
- Verify email delivery
- Clean up test data

### Phase 4: Beta Deployment → NOW
- Deploy feature/barbadian-mvp to production
- Send tester email with /submit URL
- Gather feedback from test users
- Fix any issues reported

### Phase 5: Launch
- Final approval
- Market/announce to target audience
- Monitor for issues
- Plan Phase 2 (automated transcription, advanced filtering)

---

## Implementation Status

### ✓ Completed
- [x] Supabase schema (001_voice_submissions.sql)
- [x] Storage RLS policy (002_voice_submissions_storage_rls.sql)
- [x] Next.js app structure
- [x] Form UI (5 sections, all 22 fields)
- [x] Client-side file upload (direct to Storage)
- [x] Submission API route (/api/submit)
- [x] Email confirmation (Nodemailer + Gmail)
- [x] Data validation (Zod schema)
- [x] Environment configuration
- [x] Vercel deployment
- [x] GitHub repository

### ⏳ In Progress
- [ ] Beta testing (testers using /submit)
- [ ] User feedback collection

### 📋 Pending
- [ ] Phase 2 automation (n8n workflows for transcription)
- [ ] Advanced filtering/search
- [ ] User accounts/login
- [ ] Admin dashboard for researchers
- [ ] Automated data retention policy
- [ ] GDPR compliance features

---

## Known Issues

| Issue | Status | Impact | ETA Fix |
|-------|--------|--------|---------|
| File deselection bug | Known | Can't clear failed uploads | Phase 2 |
| No branding/styling | Known | Looks plain | Phase 2 |
| Limited error messages | Known | Users need better feedback | Phase 1.5 |
| No retry on network failure | Known | Single upload attempt | Phase 2 |

---

## Documentation

- **[SECURITY_CHECKLIST.md](./docs/SECURITY_CHECKLIST.md)** — Security controls, compliance, incident response
- **[API_INTEGRATIONS.md](./docs/API_INTEGRATIONS.md)** — All external services, rate limits, monitoring
- **[README.md](./README.md)** — Setup instructions for developers
- **[RAIDD.md](./docs/RAIDD.md)** — Risks, Assumptions, Issues, Decisions, Dependencies (TBD)

**Location:** `/docs/` folder at project root

---

## Performance Targets

| Metric | Target | Monitoring |
|--------|--------|-----------|
| First Contentful Paint (FCP) | <1.5s | Vercel Analytics |
| Time to Interactive (TTI) | <2s | Vercel Analytics |
| Database Query Time | <100ms | Supabase dashboard |
| File Upload Speed | 5-10 MB/s (typical broadband) | Browser DevTools |
| Form Submission Latency | <500ms | API route logs |

---

## Scaling Plan

**Current Tier:** Supabase Free Tier
- Database: 500MB, 1M rows
- Storage: 1GB, unlimited files
- Estimated capacity: 50k-100k submissions

**Next Tier (if needed):** Supabase Pro ($25/month)
- Database: 8GB
- Storage: 100GB
- Timeline: When free tier approaches 80% capacity

---

## Team & Roles

| Role | Person | Email | Responsibilities |
|------|--------|-------|-----------------|
| Owner | Shane Burrowes | AISolutions@aisolutionsnet.net | Overall project direction, deployments |
| Admin | AI Solutions Team | AISolutions@aisolutionsnet.net | Credentials, access management |
| Developers | (TBD) | (TBD) | Code changes, feature development |
| Testers | (TBD) | (TBD) | Beta testing, feedback |

---

## Monthly Review Checklist

- [ ] Verify credentials rotated within past 90 days
- [ ] Check database capacity vs. storage limits
- [ ] Review cost projections
- [ ] Scan GitHub for security alerts
- [ ] Monitor Vercel analytics for performance issues
- [ ] Check user feedback for bug reports
- [ ] Update this document with status changes

---

## Appendix: Environment Variables

See `.env.example` for the complete list. All variables are required for local development and production deployment.

**Public Variables** (safe to commit):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Private Variables** (never commit, store in Vercel/1Password):
- `SUPABASE_SERVICE_ROLE_KEY`
- `GMAIL_SMTP_USER`
- `GMAIL_SMTP_APP_PASSWORD`
- `SUBMISSION_NOTIFY_EMAIL`

---

**Approvals:**
- Owner: Shane Burrowes ✓
- Status: APPROVED for deployment

**Version History:**
| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-05-15 | 1.0 | Initial creation | Claude |

---

**Last Updated:** 2026-05-15
**Next Review:** 2026-06-15
