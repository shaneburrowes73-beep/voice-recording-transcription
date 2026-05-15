## Portfolio Dependencies

### Skills & Security Hardening
- **Source:** https://github.com/shaneburrowes73-beep/ai-solutions
- **Skills Location:** /skills/ (36 Cowork skills)
- **Security Policies:** /security/phase-1/ (credential detection), /security/phase-2/ (RLS policies)
- **Authority:** RAIDD entries D-20260515-004, PDEP-01, R-20260515-001
- **Do NOT:** Store skills in AppData, duplicate security policies, hardcode credentials
- **Instead:** Reference GitHub as single source of truth

### Credentials Storage
- **Vault:** 1Password (AI Solutions shared vault)
- **Never:** Commit .env files, hardcode API keys, store secrets in code
- **Always:** Use Vercel environment variables or 1Password references

### Skill Sync Validation
- Run: `git clone https://github.com/shaneburrowes73-beep/ai-solutions.git`
- Verify: 36 skill folders exist in `skills/`
- If using Cowork: Skills auto-load from installed location; DO NOT modify locally
