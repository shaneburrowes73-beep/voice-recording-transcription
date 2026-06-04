// Police app config — env vars use NEXT_PUBLIC_ prefix for Next.js client-side access.
// Add these to Vercel env vars for voice-recording-transcription project:
//   NEXT_PUBLIC_OPENAI_KEY    (same value as VITE_OPENAI_KEY on voice-transcript-police)
//   NEXT_PUBLIC_SHEETS_URL    (same value as VITE_SHEETS_URL on voice-transcript-police)

export const MODULE_CONFIG = {
  voiceCapture:   true,
  approvalFlow:   true,
  dataStorage:    true,
  orgManagement:  true,
};

export const OPENAI_KEY = process.env.NEXT_PUBLIC_OPENAI_KEY  || '';
export const SHEETS_URL = process.env.NEXT_PUBLIC_SHEETS_URL  || '';
