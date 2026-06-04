# Security Policy

## Supported versions

Latest main branch only.

## Reporting a vulnerability

Report privately to AISolutions@aisolutionsnet.net — do NOT open a public GitHub issue.

Include: description, steps to reproduce, potential impact.
We respond within 48 hours and resolve within 14 days.

## Measures in place

- Passwords hashed with bcrypt cost factor 12
- JWT tokens with issuer and audience validation
- Rate limiting on all auth endpoints
- Parameterised queries — SQL injection not possible
- Content Security Policy headers
- X-Frame-Options DENY — clickjacking blocked
- HSTS 2-year max-age
- Private GitHub repository
- Environment variables in Vercel only — never in code
- CORS restricted to production domain