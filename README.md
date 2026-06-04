# Voice Transcript Suite

**AISolutions — Police Force Supplementary Dictation Tool**

A modular speech-to-text web application built for police forces.

## Modules

| Module | Description | Standalone |
|--------|-------------|------------|
| 🎙 Voice Capture | Record, transcribe, AI grammar check | ✅ |
| ✅ Approval Flow | Submit → supervisor review → approve/reject | ✅ |
| 🗄 Data Storage | Search, filter, export CSV, send via Gmail | ✅ |

## Tech Stack
- **Frontend** — React + Vite
- **Speech** — Web Speech API
- **Grammar** — Claude AI (Anthropic)
- **Storage** — Google Sheets via Apps Script
- **Email** — Gmail MCP
- **Deploy** — Vercel (auto-deploy from GitHub)

## Quick Start
```bash
git clone https://github.com/shaneburrowes73-beep/voice-transcript.git
cd voice-transcript
npm install
cp .env.example .env.local
npm run dev
```

## Module Config
Edit `src/config.js`:
```js
export const MODULE_CONFIG = {
  voiceCapture: true,
  approvalFlow: true,
  dataStorage:  true,
};
```

## Env Variables
| Variable | Description |
|----------|-------------|
| `VITE_ANTHROPIC_KEY` | Anthropic API key |
| `VITE_SHEETS_URL` | Google Apps Script Web App URL |

---
© AISolutions. Internal use only.